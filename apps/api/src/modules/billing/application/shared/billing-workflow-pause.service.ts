import { Injectable } from "@nestjs/common";
import {
  Prisma,
  RepositoryScanJobStatus,
  OutboxStatus,
  WorkflowBillingPauseSource,
} from "@prisma/client";
import {
  BILLING_WORKFLOW_PAUSE_SOURCES,
  BILLING_WORKFLOW_PAUSE_REASONS,
  type BillingWorkflowPauseRequest,
} from "@lcsp/contracts/billing";
import {
  buildOutboxMessageInput,
  OUTBOX_AGGREGATE_TYPES,
} from "@lcsp/contracts/outbox";
import { ASSESSMENT_PIPELINE_LIVENESS_WINDOW_SECONDS } from "@lcsp/contracts/evidence";
import {
  AUDIT_ACTOR_TYPES,
  AUDIT_REDACTION_STATUSES,
} from "@lcsp/contracts/audit";
import { PrismaService } from "../../../../infrastructure/prisma/prisma.service.js";
import { OutboxRepository } from "../../../../platform/outbox/outbox.repository.js";
import {
  BillingDomainError,
  OwnershipMismatchError,
} from "../../domain/billing.errors.js";

const PAUSE_SOURCE_EVENTS = {
  [WorkflowBillingPauseSource.SCANNER]: BILLING_WORKFLOW_PAUSE_SOURCES.scanner,
  [WorkflowBillingPauseSource.ENGINEERING]:
    BILLING_WORKFLOW_PAUSE_SOURCES.engineering,
  [WorkflowBillingPauseSource.INTERVIEW]:
    BILLING_WORKFLOW_PAUSE_SOURCES.interview,
} as const;

function toPauseSource(
  event: BillingWorkflowPauseRequest["sourceEvent"],
): WorkflowBillingPauseSource {
  for (const [source, sourceEvent] of Object.entries(PAUSE_SOURCE_EVENTS)) {
    if (event === sourceEvent) return source as WorkflowBillingPauseSource;
  }
  throw new BillingDomainError("Unsupported billing pause source");
}

@Injectable()
export class BillingWorkflowPauseService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly outbox: OutboxRepository,
  ) {}

  async pause(input: BillingWorkflowPauseRequest) {
    if (input.reservationId) {
      const reservation = await this.prisma.billingReservation.findUnique({
        where: { id: input.reservationId },
        select: { assessmentId: true },
      });
      if (reservation?.assessmentId !== input.assessmentId)
        throw new OwnershipMismatchError(
          "Pause reservation does not belong to assessment",
        );
    }
    // Billing is reissued by the server outbox on resume, never replayed from
    // the spent reservation. The checkpoint retains the original pinned job.
    const { billing: _billing, ...payload } = input.payload;
    if (payload.assessmentId && payload.assessmentId !== input.assessmentId)
      throw new OwnershipMismatchError(
        "Pause payload does not belong to assessment",
      );
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${input.assessmentId}))`;
      const pause = await tx.workflowBillingPause.upsert({
        where: { dispatchKey: input.dispatchKey },
        update: {},
        create: {
          assessmentId: input.assessmentId,
          dispatchKey: input.dispatchKey,
          sourceEvent: toPauseSource(input.sourceEvent),
          payload: {
            ...payload,
            assessmentId: input.assessmentId,
          } as Prisma.InputJsonObject,
        },
      });
      if (pause.assessmentId !== input.assessmentId)
        throw new OwnershipMismatchError("Pause dispatch identity conflict");
      if (
        input.sourceEvent === BILLING_WORKFLOW_PAUSE_SOURCES.scanner &&
        pause.resumedAt === null
      ) {
        if (typeof payload.scanJobId !== "string")
          throw new BillingDomainError("Paused scan has no pinned scan job");
        const updated = await tx.repositoryScanJob.updateMany({
          where: {
            id: payload.scanJobId,
            assessmentId: input.assessmentId,
            status: {
              in: [
                RepositoryScanJobStatus.QUEUED,
                RepositoryScanJobStatus.RUNNING,
              ],
            },
          },
          data: {
            status: RepositoryScanJobStatus.WAITING_FOR_CREDITS,
            blockedReason: BILLING_WORKFLOW_PAUSE_REASONS.creditsRequired,
          },
        });
        if (updated.count === 0) {
          const job = await tx.repositoryScanJob.findUnique({
            where: { id: payload.scanJobId },
          });
          if (
            job?.assessmentId !== input.assessmentId ||
            job.status !== RepositoryScanJobStatus.WAITING_FOR_CREDITS
          )
            throw new BillingDomainError("Scan is no longer pausable");
        }
      }
      return { pauseId: pause.id };
    });
  }

  async hasPendingResume(assessmentId: string): Promise<boolean> {
    const pause = await this.prisma.workflowBillingPause.findFirst({
      where: { assessmentId, resumedAt: { not: null } },
      orderBy: { resumedAt: "desc" },
    });
    if (!pause) return false;
    const queued = await this.prisma.outboxMessage.findFirst({
      where: {
        aggregateId: assessmentId,
        payload: { path: ["causationId"], equals: pause.id },
      },
      select: { status: true, publishedAt: true },
    });
    return (
      queued !== null &&
      (queued.status === OutboxStatus.PENDING ||
        queued.status === OutboxStatus.FAILED ||
        (queued.status === OutboxStatus.PUBLISHED &&
          queued.publishedAt !== null &&
          Date.now() - queued.publishedAt.getTime() <
            ASSESSMENT_PIPELINE_LIVENESS_WINDOW_SECONDS * 1_000))
    );
  }

  async resume(
    assessmentId: string,
    userId: string,
    correlationId: string,
  ): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${assessmentId}))`;
      const pause = await tx.workflowBillingPause.findFirst({
        where: { assessmentId, resumedAt: null },
        orderBy: { pausedAt: "asc" },
      });
      if (!pause) return false;
      const assessment = await tx.assessment.findUnique({
        where: { id: assessmentId },
        select: { ownerId: true },
      });
      if (assessment?.ownerId !== userId)
        throw new OwnershipMismatchError(
          "Only the assessment owner may resume billing pause",
        );
      const payload = pause.payload as Prisma.JsonObject;
      const event = buildOutboxMessageInput({
        aggregateType: OUTBOX_AGGREGATE_TYPES.assessment,
        aggregateId: assessmentId,
        eventType: PAUSE_SOURCE_EVENTS[pause.sourceEvent],
        assessmentId,
        correlationId,
        causationId: pause.id,
        actor: { id: userId, type: AUDIT_ACTOR_TYPES.user },
        result: PAUSE_SOURCE_EVENTS[pause.sourceEvent],
        redactionStatus: AUDIT_REDACTION_STATUSES.none,
        idempotencyKey: `billing-pause:${pause.id}:resume`,
        payload: { ...payload, assessmentId, correlationId },
      });
      if (pause.sourceEvent === WorkflowBillingPauseSource.SCANNER) {
        if (typeof payload.scanJobId !== "string")
          throw new BillingDomainError("Paused scan has no pinned scan job");
        // Do not revive terminal jobs or replace their snapshot/identity.
        const updated = await tx.repositoryScanJob.updateMany({
          where: {
            id: payload.scanJobId,
            assessmentId,
            status: RepositoryScanJobStatus.WAITING_FOR_CREDITS,
          },
          data: {
            status: RepositoryScanJobStatus.QUEUED,
            correlationId,
            blockedReason: null,
          },
        });
        if (updated.count !== 1)
          throw new BillingDomainError("Paused scan is no longer resumable");
      }
      await this.outbox.enqueue(event, tx);
      await tx.workflowBillingPause.update({
        where: { id: pause.id },
        data: { resumedAt: new Date() },
      });
      return true;
    });
  }
}
