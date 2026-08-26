import { HttpStatus } from "@nestjs/common";
import { CommandHandler, type ICommandHandler } from "@nestjs/cqrs";
import { randomUUID } from "node:crypto";

import { ASSESSMENT_STATUS_CODES } from "@lcsp/contracts/assessment";
import {
  AUDIT_ACTOR_TYPES,
  AUDIT_DECISIONS,
  AUDIT_REDACTION_STATUSES,
  AUDIT_RESOURCE_TYPES,
} from "@lcsp/contracts/audit";
import { AUTH_ERROR_CODES } from "@lcsp/contracts/auth";
import {
  GITHUB_INTEGRATION_ERROR_CODES,
  GITHUB_INTEGRATION_EVENT_TYPES,
  REPOSITORY_SCAN_JOB_STATUSES,
  REPOSITORY_SCAN_TRIGGER_SOURCES,
} from "@lcsp/contracts/github-integration";
import {
  buildOutboxMessageInput,
  OUTBOX_AGGREGATE_TYPES,
} from "@lcsp/contracts/outbox";
import { PBAC_ACTIONS, SUBJECT_ROLES } from "@lcsp/contracts/pbac";
import {
  SCAN_EVENT_TYPES,
  type ArchitectureScopePayload,
} from "@lcsp/contracts/scan";

import {
  fromPrismaAssessmentStatus,
  toPrismaRepositoryScanJobStatus,
  toPrismaRepositoryScanTriggerSource,
} from "../../../../../infrastructure/prisma/prisma-enum-mappers.js";
import { PrismaService } from "../../../../../infrastructure/prisma/prisma.service.js";
import { AuditWriterService } from "../../../../../platform/audit/audit-writer.service.js";
import { OutboxRepository } from "../../../../../platform/outbox/outbox.repository.js";
import { problemException } from "../../../../../platform/problems/problem-factory.js";
import { TriggerMultiRepoScanCommand } from "./trigger-multi-repo-scan.command.js";

export type TriggerMultiRepoScanResponseDto = {
  scanJobIds: string[];
  repoCount: number;
  correlationId: string;
};

@CommandHandler(TriggerMultiRepoScanCommand)
export class TriggerMultiRepoScanHandler implements ICommandHandler<TriggerMultiRepoScanCommand> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditWriter: AuditWriterService,
    private readonly outbox: OutboxRepository,
  ) {}

  async execute(
    command: TriggerMultiRepoScanCommand,
  ): Promise<TriggerMultiRepoScanResponseDto> {
    const pbac = command.pbacContext;

    // 1. Validate assessment ownership and state
    const assessment = await this.prisma.assessment.findUnique({
      where: { id: command.assessmentId, organizationId: pbac.organizationId },
      select: {
        id: true,
        organizationId: true,
        ownerId: true,
        status: true,
        globalArchitectureDeclaration: true,
      },
    });

    if (!assessment || assessment.organizationId !== pbac.organizationId) {
      throw problemException(
        GITHUB_INTEGRATION_ERROR_CODES.snapshotNotFound,
        command.correlationId,
        { status: HttpStatus.NOT_FOUND },
      );
    }

    const isManagerOwner =
      pbac.subjectRole === SUBJECT_ROLES.manager &&
      pbac.userId === assessment.ownerId;

    if (!isManagerOwner) {
      throw problemException(
        AUTH_ERROR_CODES.pbacDenied,
        command.correlationId,
        { status: HttpStatus.FORBIDDEN },
      );
    }

    const assessmentStatus = fromPrismaAssessmentStatus(assessment.status);
    if (
      assessmentStatus !== ASSESSMENT_STATUS_CODES.wizardSubmitted &&
      assessmentStatus !== ASSESSMENT_STATUS_CODES.readyForReview
    ) {
      throw problemException(
        GITHUB_INTEGRATION_ERROR_CODES.assessmentStateInvalid,
        command.correlationId,
        { status: HttpStatus.CONFLICT },
      );
    }

    // 2. Load repository scope (new multi-repo model, with legacy fallback)
    const repositoryScopes =
      await this.prisma.assessmentRepositoryScope.findMany({
        where: { assessmentId: command.assessmentId },
        include: {
          repositoryConnection: {
            select: {
              id: true,
              repositoryName: true,
              repositoryFullName: true,
              defaultBranch: true,
            },
          },
        },
      });

    // Legacy fallback: if no new scope, use RepositoryConnection.assessmentId
    let repoConnections: {
      connectionId: string;
      repositoryFullName: string;
      declaration: string;
    }[];

    if (repositoryScopes.length > 0) {
      repoConnections = repositoryScopes.map((scope) => ({
        connectionId: scope.repositoryConnectionId,
        repositoryFullName: scope.repositoryConnection.repositoryFullName,
        declaration: scope.repoArchitectureDeclaration || "",
      }));
    } else {
      // Legacy: repos connected directly to this assessment
      const legacyConnections = await this.prisma.repositoryConnection.findMany(
        {
          where: { assessmentId: command.assessmentId, status: "ACTIVE" },
          select: { id: true, repositoryFullName: true },
        },
      );
      repoConnections = legacyConnections.map((c) => ({
        connectionId: c.id,
        repositoryFullName: c.repositoryFullName,
        declaration: "",
      }));
    }

    if (repoConnections.length === 0) {
      throw problemException(
        GITHUB_INTEGRATION_ERROR_CODES.snapshotNotFound,
        command.correlationId,
        { status: HttpStatus.UNPROCESSABLE_ENTITY },
      );
    }

    // 3. Build the architecture scope payload (attached to every job)
    const architectureScope: ArchitectureScopePayload = {
      globalDeclaration: assessment.globalArchitectureDeclaration || "",
      repos: repoConnections,
    };

    // 4. For each repo: find latest snapshot, create scan job + outbox event
    const createdJobIds: string[] = [];
    const triggerSource = REPOSITORY_SCAN_TRIGGER_SOURCES.manual;
    const jobStatus = REPOSITORY_SCAN_JOB_STATUSES.queued;

    for (const repo of repoConnections) {
      const snapshot = await this.prisma.repositorySnapshot.findFirst({
        where: { connectionId: repo.connectionId },
        orderBy: { createdAt: "desc" },
        select: { id: true, commitSha: true },
      });

      if (!snapshot) {
        // Skip repos without any snapshot yet; they cannot be scanned
        continue;
      }

      const newScanJobId = randomUUID();
      const priorJob = await this.prisma.repositoryScanJob.findFirst({
        where: {
          assessmentId: command.assessmentId,
          snapshotId: snapshot.id,
        },
        orderBy: { createdAt: "desc" },
        select: { id: true },
      });

      // Idempotency key scoped per repo to avoid collision across jobs in the same batch
      const idempotencyKey = `${command.idempotencyKey}:${repo.connectionId}`;

      const existingJob = await this.prisma.repositoryScanJob.findUnique({
        where: { idempotencyKey },
      });
      if (existingJob) {
        createdJobIds.push(existingJob.id);
        continue;
      }

      const event = buildOutboxMessageInput({
        aggregateType: OUTBOX_AGGREGATE_TYPES.repositoryScanJob,
        aggregateId: newScanJobId,
        eventType: GITHUB_INTEGRATION_EVENT_TYPES.scanTriggered,
        organizationId: pbac.organizationId,
        assessmentId: command.assessmentId,
        correlationId: command.correlationId,
        causationId: command.correlationId,
        actor: { id: pbac.userId, type: AUDIT_ACTOR_TYPES.user },
        result: SCAN_EVENT_TYPES.scanRerunTriggeredAudit,
        redactionStatus: AUDIT_REDACTION_STATUSES.none,
        authorizationAction: PBAC_ACTIONS.scanTrigger,
        idempotencyKey,
        payload: {
          scanJobId: newScanJobId,
          assessmentId: command.assessmentId,
          snapshotId: snapshot.id,
          commitSha: snapshot.commitSha,
          organizationId: pbac.organizationId,
          repositoryFullName: repo.repositoryFullName,
          triggerSource,
          idempotencyKey,
          correlationId: command.correlationId,
          replacesScanJobId: priorJob?.id,
          // Architecture scope — optional field; workers that don't recognise it ignore it
          architectureScope,
        },
      });

      await this.prisma.$transaction(async (tx) => {
        await tx.repositoryScanJob.create({
          data: {
            id: newScanJobId,
            assessmentId: command.assessmentId,
            snapshotId: snapshot.id,
            organizationId: pbac.organizationId,
            idempotencyKey,
            triggerSource: toPrismaRepositoryScanTriggerSource(triggerSource),
            status: toPrismaRepositoryScanJobStatus(jobStatus),
            correlationId: command.correlationId,
          },
        });
        await this.outbox.enqueue(event, tx);
      });

      createdJobIds.push(newScanJobId);
    }

    // 5. Audit
    await this.auditWriter.write({
      eventType: SCAN_EVENT_TYPES.scanRerunTriggeredAudit,
      actorId: pbac.userId,
      organizationId: pbac.organizationId,
      assessmentId: command.assessmentId,
      resourceType: AUDIT_RESOURCE_TYPES.repositoryScanJob,
      resourceId: createdJobIds[0] ?? command.assessmentId,
      correlationId: command.correlationId,
      causationId: command.correlationId,
      decision: AUDIT_DECISIONS.allow,
      result: SCAN_EVENT_TYPES.scanRerunTriggeredAudit,
      redactionStatus: AUDIT_REDACTION_STATUSES.none,
      payload: {
        createdJobIds,
        repoCount: repoConnections.length,
        assessmentId: command.assessmentId,
        correlationId: command.correlationId,
        architectureScopeAttached: true,
      },
    });

    return {
      scanJobIds: createdJobIds,
      repoCount: repoConnections.length,
      correlationId: command.correlationId,
    };
  }
}
