import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from "@nestjs/common";
import { CommandHandler, type ICommandHandler } from "@nestjs/cqrs";
import type { Prisma } from "@prisma/client";
import {
  AUDIT_DECISIONS,
  AUDIT_REDACTION_STATUSES,
} from "@lcsp/contracts/audit";
import { AUTH_ERROR_CODES } from "@lcsp/contracts/auth";
import { buildOutboxMessageInput } from "@lcsp/contracts/outbox";
import {
  PBAC_ACTIONS,
  SUBJECT_ROLES,
} from "@lcsp/contracts/pbac";
import {
  CONFLICT_RECORD_STATUSES,
  SCAN_ERROR_CODES,
  SCAN_EVENT_TYPES,
} from "@lcsp/contracts/scan";

import { PrismaService } from "../../../../../infrastructure/prisma/prisma.service.js";
import { AuditWriterService } from "../../../../../platform/audit/audit-writer.service.js";
import { OutboxRepository } from "../../../../../platform/outbox/outbox.repository.js";
import { ResolveConflictCommand } from "./resolve-conflict.command.js";

const RESOLUTION_NOTE_MAX_LENGTH = 2000;

export type ResolveConflictDto = {
  conflict_id: string;
  status:
    | typeof CONFLICT_RECORD_STATUSES.resolved
    | typeof CONFLICT_RECORD_STATUSES.dismissed;
  resolved_at: string;
  all_conflicts_resolved: boolean;
  correlation_id: string;
};

@CommandHandler(ResolveConflictCommand)
export class ResolveConflictHandler
  implements ICommandHandler<ResolveConflictCommand>
{
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditWriter: AuditWriterService,
    private readonly outboxRepository: OutboxRepository,
  ) {}

  async execute(command: ResolveConflictCommand): Promise<ResolveConflictDto> {
    this.assertManagerOnly(command);
    const resolution = parseResolution(command.resolution);
    const resolutionNote = parseResolutionNote(command.resolutionNote);
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
          assessmentId: true,
          organizationId: true,
          status: true,
        },
      });

      if (!conflict) {
        throw new NotFoundException(
          this.errorBody(command, SCAN_ERROR_CODES.conflictNotFound),
        );
      }

      if (conflict.status !== CONFLICT_RECORD_STATUSES.pending) {
        throw new ConflictException(
          this.errorBody(command, SCAN_ERROR_CODES.conflictAlreadyResolved),
        );
      }

      await tx.conflictRecord.update({
        where: { id: conflict.id },
        data: {
          status: resolution,
          resolvedAt,
          resolvedById: command.resolvedById,
          resolutionNote,
        },
      });

      const remainingPending = await tx.conflictRecord.count({
        where: {
          assessmentId: command.assessmentId,
          organizationId: command.organizationId,
          status: CONFLICT_RECORD_STATUSES.pending,
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
          resourceType: "ConflictRecord",
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
          },
        },
        tx,
      );

      if (allConflictsResolved) {
        await this.enqueueAllResolvedEvent(command, tx);
      }

      return allConflictsResolved;
    });

    return {
      conflict_id: command.conflictId,
      status: resolution,
      resolved_at: resolvedAt.toISOString(),
      all_conflicts_resolved: result,
      correlation_id: command.correlationId,
    };
  }

  private assertManagerOnly(command: ResolveConflictCommand): void {
    const allowed =
      command.subjectRole === SUBJECT_ROLES.manager &&
      command.authorization.selectedAction === PBAC_ACTIONS.conflictResolve &&
      command.authorization.policyId !== null &&
      command.authorization.policyVersion !== null;

    if (allowed) return;

    throw new ForbiddenException({
      error_code: AUTH_ERROR_CODES.pbacDenied,
      correlation_id: command.correlationId,
    });
  }

  private async enqueueAllResolvedEvent(
    command: ResolveConflictCommand,
    tx: Prisma.TransactionClient,
  ): Promise<void> {
    const outboxEvent = buildOutboxMessageInput({
      aggregateType: "Assessment",
      aggregateId: command.assessmentId,
      eventType: SCAN_EVENT_TYPES.reconciliationAllConflictsResolved,
      organizationId: command.organizationId,
      assessmentId: command.assessmentId,
      correlationId: command.correlationId,
      causationId: command.conflictId,
      actor: { id: command.resolvedById, type: "user" },
      result: SCAN_EVENT_TYPES.reconciliationAllConflictsResolved,
      redactionStatus: AUDIT_REDACTION_STATUSES.none,
      idempotencyKey: `${command.assessmentId}:${SCAN_EVENT_TYPES.reconciliationAllConflictsResolved}:${command.correlationId}`,
      payload: {
        assessmentId: command.assessmentId,
        lastResolvedConflictId: command.conflictId,
        correlationId: command.correlationId,
      },
    });
    await this.outboxRepository.enqueue(outboxEvent, tx);
  }

  private errorBody(command: ResolveConflictCommand, errorCode: string) {
    return {
      error_code: errorCode,
      correlation_id: command.correlationId,
    };
  }
}

function parseResolution(
  value: unknown,
): typeof CONFLICT_RECORD_STATUSES.resolved | typeof CONFLICT_RECORD_STATUSES.dismissed {
  if (
    value === CONFLICT_RECORD_STATUSES.resolved ||
    value === CONFLICT_RECORD_STATUSES.dismissed
  ) {
    return value;
  }

  throw new UnprocessableEntityException({
    error_code: SCAN_ERROR_CODES.conflictSchemaInvalid,
  });
}

function parseResolutionNote(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string" || value.length > RESOLUTION_NOTE_MAX_LENGTH) {
    throw new UnprocessableEntityException({
      error_code: SCAN_ERROR_CODES.conflictSchemaInvalid,
    });
  }
  return value;
}
