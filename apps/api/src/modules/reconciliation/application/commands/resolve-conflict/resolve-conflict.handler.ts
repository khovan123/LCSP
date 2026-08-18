import { randomUUID } from "node:crypto";

import {
  AUDIT_ACTOR_TYPES,
  AUDIT_DECISIONS,
  AUDIT_REDACTION_STATUSES,
  AUDIT_RESOURCE_TYPES,
} from "@lcsp/contracts/audit";
import { AUTH_ERROR_CODES } from "@lcsp/contracts/auth";
import {
  buildOutboxMessageInput,
  OUTBOX_AGGREGATE_TYPES,
} from "@lcsp/contracts/outbox";
import { PBAC_ACTIONS, SUBJECT_ROLES } from "@lcsp/contracts/pbac";
import {
  CONFLICT_RECORD_STATUSES,
  SCAN_ERROR_CODES,
  SCAN_EVENT_TYPES,
} from "@lcsp/contracts/scan";
import { HttpStatus } from "@nestjs/common";
import { CommandHandler, type ICommandHandler } from "@nestjs/cqrs";
import type {
  ConflictRecordStatus as PrismaConflictRecordStatus,
  Prisma,
} from "@prisma/client";

import {
  fromPrismaConflictRecordStatus,
  toPrismaConflictRecordStatus,
} from "../../../../../infrastructure/prisma/prisma-enum-mappers.js";
import { PrismaService } from "../../../../../infrastructure/prisma/prisma.service.js";
import { AuditWriterService } from "../../../../../platform/audit/audit-writer.service.js";
import { OutboxRepository } from "../../../../../platform/outbox/outbox.repository.js";
import { problemException } from "../../../../../platform/problems/problem-factory.js";
import { ResolveConflictCommand } from "./resolve-conflict.command.js";

const RESOLUTION_NOTE_MAX_LENGTH = 2000;

type ConflictResolutionSnapshot = {
  decisionId: string;
  decisionRef: string;
  resolutionVersion: number;
  aiUsageFlowId: string;
  evidenceRefs: string[];
  technicalEvidenceReportId: string | null;
  technicalEvidenceReportVersion: string | null;
  technicalEvidenceReportHash: unknown;
  technicalProfileId: string | null;
  technicalProfileVersion: string | null;
};

export type ResolveConflictDto = {
  conflict_id: string;
  status:
    | typeof CONFLICT_RECORD_STATUSES.resolved
    | typeof CONFLICT_RECORD_STATUSES.dismissed;
  resolved_at: string;
  all_conflicts_resolved: boolean;
  correlationId: string;
};

@CommandHandler(ResolveConflictCommand)
export class ResolveConflictHandler implements ICommandHandler<ResolveConflictCommand> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditWriter: AuditWriterService,
    private readonly outboxRepository: OutboxRepository,
  ) {}

  async execute(command: ResolveConflictCommand): Promise<ResolveConflictDto> {
    await this.assertManagerOnly(command);
    const resolution = parseResolution(
      command.resolution,
      command.correlationId,
    );
    const resolutionNote = parseResolutionNote(
      command.resolutionNote,
      resolution,
      command.correlationId,
    );
    const resolvedAt = new Date();

    const result = await this.prisma.$transaction(async (tx) => {
      const conflict = await tx.conflictRecord.findFirst({
        where: {
          id: command.conflictId,
          assessmentId: command.assessmentId,
          organizationId: command.organizationId,
        },
        select: {
          id: true,
          aiUsageFlowId: true,
          assessmentId: true,
          organizationId: true,
          status: true,
          evidenceRefs: true,
        },
      });

      if (!conflict) {
        throw problemException(
          SCAN_ERROR_CODES.conflictNotFound,
          command.correlationId,
          { status: HttpStatus.NOT_FOUND },
        );
      }

      if (
        fromPrismaConflictRecordStatus(conflict.status) !==
        CONFLICT_RECORD_STATUSES.pending
      ) {
        throw problemException(
          SCAN_ERROR_CODES.conflictAlreadyResolved,
          command.correlationId,
          { status: HttpStatus.CONFLICT },
        );
      }

      const snapshot = await this.appendReconciliationDecision(
        command,
        tx,
        conflict,
        resolution,
        resolutionNote,
        resolvedAt,
      );

      await tx.conflictRecord.update({
        where: { id: conflict.id },
        data: {
          status: toPrismaConflictRecordStatus(resolution),
          resolvedAt,
          resolvedById: command.resolvedById,
          resolutionNote,
        },
      });

      const remainingPending = await tx.conflictRecord.count({
        where: {
          assessmentId: command.assessmentId,
          organizationId: command.organizationId,
          status: toPrismaConflictRecordStatus(
            CONFLICT_RECORD_STATUSES.pending,
          ),
        },
      });
      const allConflictsResolved = remainingPending === 0;

      await this.auditWriter.writeInTx(
        {
          eventType:
            resolution === CONFLICT_RECORD_STATUSES.dismissed
              ? SCAN_EVENT_TYPES.conflictDismissedAudit
              : SCAN_EVENT_TYPES.conflictResolvedAudit,
          actorId: command.resolvedById,
          organizationId: command.organizationId,
          assessmentId: command.assessmentId,
          resourceType: AUDIT_RESOURCE_TYPES.conflictRecord,
          resourceId: conflict.id,
          correlationId: command.correlationId,
          causationId: conflict.id,
          decision: AUDIT_DECISIONS.allow,
          result: resolution,
          redactionStatus: AUDIT_REDACTION_STATUSES.none,
          policyId: command.authorization.policyId,
          policyVersion: command.authorization.policyVersion,
          payload: {
            conflictId: conflict.id,
            assessmentId: command.assessmentId,
            resolution,
            resolvedById: command.resolvedById,
            correlationId: command.correlationId,
            reconciliationDecisionRef: snapshot.decisionRef,
            resolutionVersion: snapshot.resolutionVersion,
            evidenceRefs: snapshot.evidenceRefs,
            technicalEvidenceReportId: snapshot.technicalEvidenceReportId,
            technicalProfileId: snapshot.technicalProfileId,
          },
        },
        tx,
      );

      if (allConflictsResolved) {
        await this.enqueueAllResolvedEvent(command, tx, snapshot);
      }

      return allConflictsResolved;
    });

    return {
      conflict_id: command.conflictId,
      status: resolution,
      resolved_at: resolvedAt.toISOString(),
      all_conflicts_resolved: result,
      correlationId: command.correlationId,
    };
  }

  private async appendReconciliationDecision(
    command: ResolveConflictCommand,
    tx: Prisma.TransactionClient,
    conflict: {
      id: string;
      aiUsageFlowId: string;
      assessmentId: string;
      organizationId: string;
      status: PrismaConflictRecordStatus;
      evidenceRefs: unknown;
    },
    resolution:
      | typeof CONFLICT_RECORD_STATUSES.resolved
      | typeof CONFLICT_RECORD_STATUSES.dismissed,
    resolutionNote: string | null,
    resolvedAt: Date,
  ): Promise<ConflictResolutionSnapshot> {
    const evidenceRefs = evidenceRefsOnly(conflict.evidenceRefs);
    const evidenceSnapshot = await this.loadEvidenceSnapshot(tx, conflict);
    const version = await tx.reconciliationDecision.aggregate({
      where: {
        assessmentId: command.assessmentId,
        organizationId: command.organizationId,
      },
      _max: { resolutionVersion: true },
    });
    const resolutionVersion = (version._max.resolutionVersion ?? 0) + 1;
    const decisionId = randomUUID();
    const decisionRef = `reconciliation-decision:${decisionId}`;

    await tx.reconciliationDecision.create({
      data: {
        id: decisionId,
        conflictRecordId: conflict.id,
        aiUsageFlowId: conflict.aiUsageFlowId,
        assessmentId: conflict.assessmentId,
        organizationId: conflict.organizationId,
        resolution: toPrismaConflictRecordStatus(resolution),
        resolutionVersion,
        actorId: command.resolvedById,
        rationale: resolutionNote,
        evidenceRefs: evidenceRefs as Prisma.InputJsonValue,
        technicalEvidenceReportId: evidenceSnapshot.technicalEvidenceReportId,
        technicalEvidenceReportVersion:
          evidenceSnapshot.technicalEvidenceReportVersion,
        technicalProfileId: evidenceSnapshot.technicalProfileId,
        technicalProfileVersion: evidenceSnapshot.technicalProfileVersion,
        originalConflictStatus: conflict.status,
        resolvedAt,
        ...(evidenceSnapshot.technicalEvidenceReportHash === null
          ? {}
          : {
              technicalEvidenceReportHash:
                evidenceSnapshot.technicalEvidenceReportHash as Prisma.InputJsonValue,
            }),
      },
    });

    return {
      decisionId,
      decisionRef,
      resolutionVersion,
      aiUsageFlowId: conflict.aiUsageFlowId,
      evidenceRefs,
      ...evidenceSnapshot,
    };
  }

  private async loadEvidenceSnapshot(
    tx: Prisma.TransactionClient,
    conflict: {
      aiUsageFlowId: string;
      assessmentId: string;
      organizationId: string;
    },
  ): Promise<
    Pick<
      ConflictResolutionSnapshot,
      | "technicalEvidenceReportId"
      | "technicalEvidenceReportVersion"
      | "technicalEvidenceReportHash"
      | "technicalProfileId"
      | "technicalProfileVersion"
    >
  > {
    const flow = await tx.aIUsageFlow.findFirst({
      where: {
        id: conflict.aiUsageFlowId,
        assessmentId: conflict.assessmentId,
        organizationId: conflict.organizationId,
      },
      select: { technicalProfileId: true },
    });
    const profile = flow
      ? await tx.technicalProfile.findFirst({
          where: {
            id: flow.technicalProfileId,
            assessmentId: conflict.assessmentId,
            organizationId: conflict.organizationId,
          },
          select: {
            id: true,
            evidenceReportId: true,
            schemaVersion: true,
            providerVersion: true,
          },
        })
      : null;
    const report = profile
      ? await tx.technicalEvidenceReport.findFirst({
          where: {
            id: profile.evidenceReportId,
            assessmentId: conflict.assessmentId,
            organizationId: conflict.organizationId,
          },
          select: {
            id: true,
            schemaVersion: true,
            configHash: true,
          },
        })
      : null;

    return {
      technicalEvidenceReportId: report?.id ?? null,
      technicalEvidenceReportVersion: report?.schemaVersion ?? null,
      technicalEvidenceReportHash: report?.configHash ?? null,
      technicalProfileId: profile?.id ?? null,
      technicalProfileVersion: profile
        ? `${profile.schemaVersion}:${profile.providerVersion}`
        : null,
    };
  }

  private async assertManagerOnly(
    command: ResolveConflictCommand,
  ): Promise<void> {
    const allowed =
      command.subjectRole === SUBJECT_ROLES.manager &&
      command.authorization.selectedAction === PBAC_ACTIONS.conflictResolve &&
      command.authorization.policyId !== null &&
      command.authorization.policyVersion !== null;

    if (allowed) return;

    await this.auditWriter.write({
      eventType: SCAN_EVENT_TYPES.conflictResolvedAudit,
      actorId: command.resolvedById,
      organizationId: command.organizationId,
      assessmentId: command.assessmentId,
      resourceType: AUDIT_RESOURCE_TYPES.conflictRecord,
      resourceId: command.conflictId,
      correlationId: command.correlationId,
      decision: AUDIT_DECISIONS.deny,
      reasonCode: AUTH_ERROR_CODES.pbacDenied,
      policyId: command.authorization.policyId,
      policyVersion: command.authorization.policyVersion,
      payload: {
        assessmentId: command.assessmentId,
        conflictId: command.conflictId,
        action: PBAC_ACTIONS.conflictResolve,
        result: AUDIT_DECISIONS.deny,
      },
    });

    throw problemException(AUTH_ERROR_CODES.pbacDenied, command.correlationId, {
      status: HttpStatus.FORBIDDEN,
    });
  }

  private async enqueueAllResolvedEvent(
    command: ResolveConflictCommand,
    tx: Prisma.TransactionClient,
    snapshot: ConflictResolutionSnapshot,
  ): Promise<void> {
    const outboxEvent = buildOutboxMessageInput({
      aggregateType: OUTBOX_AGGREGATE_TYPES.assessment,
      aggregateId: command.assessmentId,
      eventType: SCAN_EVENT_TYPES.reconciliationAllConflictsResolved,
      organizationId: command.organizationId,
      assessmentId: command.assessmentId,
      correlationId: command.correlationId,
      causationId: command.conflictId,
      actor: { id: command.resolvedById, type: AUDIT_ACTOR_TYPES.user },
      result: SCAN_EVENT_TYPES.reconciliationAllConflictsResolved,
      redactionStatus: AUDIT_REDACTION_STATUSES.none,
      idempotencyKey: `${command.assessmentId}:${SCAN_EVENT_TYPES.reconciliationAllConflictsResolved}:${command.correlationId}`,
      payload: {
        assessmentId: command.assessmentId,
        lastResolvedConflictId: command.conflictId,
        aiUsageFlowId: snapshot.aiUsageFlowId,
        lastReconciliationDecisionRef: snapshot.decisionRef,
        resolutionVersion: snapshot.resolutionVersion,
        evidenceRefs: snapshot.evidenceRefs,
        technicalEvidenceReportId: snapshot.technicalEvidenceReportId,
        technicalEvidenceReportVersion: snapshot.technicalEvidenceReportVersion,
        technicalProfileId: snapshot.technicalProfileId,
        technicalProfileVersion: snapshot.technicalProfileVersion,
        correlationId: command.correlationId,
      },
    });
    await this.outboxRepository.enqueue(outboxEvent, tx);
  }
}

function evidenceRefsOnly(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function parseResolution(
  value: unknown,
  correlationId: string,
):
  | typeof CONFLICT_RECORD_STATUSES.resolved
  | typeof CONFLICT_RECORD_STATUSES.dismissed {
  if (
    value === CONFLICT_RECORD_STATUSES.resolved ||
    value === CONFLICT_RECORD_STATUSES.dismissed
  ) {
    return value;
  }

  throw problemException(
    SCAN_ERROR_CODES.conflictSchemaInvalid,
    correlationId,
    {
      status: HttpStatus.UNPROCESSABLE_ENTITY,
    },
  );
}

function parseResolutionNote(
  value: unknown,
  resolution:
    | typeof CONFLICT_RECORD_STATUSES.resolved
    | typeof CONFLICT_RECORD_STATUSES.dismissed,
  correlationId: string,
): string | null {
  if (resolution === CONFLICT_RECORD_STATUSES.dismissed) {
    if (
      typeof value !== "string" ||
      value.trim().length === 0 ||
      value.length > RESOLUTION_NOTE_MAX_LENGTH
    ) {
      throw problemException(
        SCAN_ERROR_CODES.conflictSchemaInvalid,
        correlationId,
        { status: HttpStatus.UNPROCESSABLE_ENTITY },
      );
    }
    return value;
  }

  if (value === undefined || value === null) return null;
  if (typeof value !== "string" || value.length > RESOLUTION_NOTE_MAX_LENGTH) {
    throw problemException(
      SCAN_ERROR_CODES.conflictSchemaInvalid,
      correlationId,
      {
        status: HttpStatus.UNPROCESSABLE_ENTITY,
      },
    );
  }
  return value;
}
