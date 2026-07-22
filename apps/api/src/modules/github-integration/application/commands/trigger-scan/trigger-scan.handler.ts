import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  NotFoundException,
} from "@nestjs/common";
import { CommandHandler, type ICommandHandler } from "@nestjs/cqrs";

import { ASSESSMENT_STATUS_CODES } from "@lcsp/contracts/assessment";
import {
  AUDIT_DECISIONS,
  AUDIT_REDACTION_STATUSES,
} from "@lcsp/contracts/audit";
import { AUTH_ERROR_CODES } from "@lcsp/contracts/auth";
import {
  GITHUB_INTEGRATION_ERROR_CODES,
  GITHUB_INTEGRATION_EVENT_TYPES,
  REPOSITORY_SCAN_TRIGGER_SOURCES,
} from "@lcsp/contracts/github-integration";
import { buildOutboxMessageInput } from "@lcsp/contracts/outbox";
import { SUBJECT_ROLES } from "@lcsp/contracts/pbac";

import { PrismaService } from "../../../../../infrastructure/prisma/prisma.service.js";
import { AuditWriterService } from "../../../../../platform/audit/audit-writer.service.js";
import { RepositoryScanJob } from "../../../domain/entities/repository-scan-job.entity.js";
import type { TriggerScanDto } from "../../contracts/github-integration/trigger-scan.contract.js";
import {
  REPOSITORY_SCAN_JOB_REPOSITORY,
  type RepositoryScanJobRepository,
} from "../../ports/persistence/repository-scan-job.repository.js";
import { TriggerScanCommand } from "./trigger-scan.command.js";

@CommandHandler(TriggerScanCommand)
export class TriggerScanHandler implements ICommandHandler<TriggerScanCommand> {
  constructor(
    @Inject(REPOSITORY_SCAN_JOB_REPOSITORY)
    private readonly scanJobRepository: RepositoryScanJobRepository,
    private readonly prisma: PrismaService,
    private readonly auditWriter: AuditWriterService,
  ) {}

  async execute(command: TriggerScanCommand): Promise<TriggerScanDto> {
    const snapshotId = clean(command.snapshotId);
    const idempotencyKey = clean(command.idempotencyKey);
    if (!idempotencyKey) {
      await this.auditRejected(
        command,
        GITHUB_INTEGRATION_ERROR_CODES.scanIdempotencyKeyRequired,
      );
      throw new BadRequestException(
        this.errorBody(
          command,
          GITHUB_INTEGRATION_ERROR_CODES.scanIdempotencyKeyRequired,
        ),
      );
    }

    const snapshot = snapshotId
      ? await this.prisma.repositorySnapshot.findUnique({
          where: { id: snapshotId },
          select: {
            id: true,
            assessmentId: true,
            organizationId: true,
            repositoryId: true,
            repositoryFullName: true,
            commitSha: true,
          },
        })
      : null;
    const isTrusted =
      command.triggerSource === REPOSITORY_SCAN_TRIGGER_SOURCES.trusted;
    if (
      !snapshot ||
      snapshot.assessmentId !== command.assessmentId ||
      (!isTrusted && snapshot.organizationId !== command.organizationId)
    ) {
      await this.auditRejected(
        command,
        GITHUB_INTEGRATION_ERROR_CODES.snapshotNotFound,
      );
      throw new NotFoundException(
        this.errorBody(
          command,
          GITHUB_INTEGRATION_ERROR_CODES.snapshotNotFound,
        ),
      );
    }

    const assessment = await this.prisma.assessment.findUnique({
      where: { id: command.assessmentId },
      select: {
        id: true,
        organizationId: true,
        ownerId: true,
        status: true,
      },
    });
    if (!assessment || assessment.organizationId !== snapshot.organizationId) {
      await this.auditRejected(
        command,
        GITHUB_INTEGRATION_ERROR_CODES.snapshotNotFound,
        snapshot.organizationId,
      );
      throw new NotFoundException(
        this.errorBody(
          command,
          GITHUB_INTEGRATION_ERROR_CODES.snapshotNotFound,
        ),
      );
    }

    const isManagerOwner =
      command.subjectRole === SUBJECT_ROLES.manager &&
      command.actorId === assessment.ownerId;
    if (!isTrusted && !isManagerOwner) {
      await this.auditRejected(
        command,
        AUTH_ERROR_CODES.pbacDenied,
        snapshot.organizationId,
      );
      throw new ForbiddenException(
        this.errorBody(command, AUTH_ERROR_CODES.pbacDenied),
      );
    }

    const existing =
      await this.scanJobRepository.findByIdempotencyKey(idempotencyKey);
    if (existing) {
      return this.resolveExisting(command, existing, snapshot.organizationId);
    }

    if (assessment.status !== ASSESSMENT_STATUS_CODES.wizardSubmitted) {
      await this.auditRejected(
        command,
        GITHUB_INTEGRATION_ERROR_CODES.assessmentStateInvalid,
        snapshot.organizationId,
      );
      throw new ConflictException(
        this.errorBody(
          command,
          GITHUB_INTEGRATION_ERROR_CODES.assessmentStateInvalid,
        ),
      );
    }

    if (!hasCompleteMapping(snapshot)) {
      await this.auditRejected(
        command,
        GITHUB_INTEGRATION_ERROR_CODES.scanBlockedMapping,
        snapshot.organizationId,
      );
      throw new BadRequestException(
        this.errorBody(
          command,
          GITHUB_INTEGRATION_ERROR_CODES.scanBlockedMapping,
        ),
      );
    }

    const job = RepositoryScanJob.create({
      assessmentId: command.assessmentId,
      snapshotId: snapshot.id,
      organizationId: snapshot.organizationId,
      idempotencyKey,
      triggerSource: command.triggerSource,
      correlationId: command.correlationId,
    });
    const event = buildOutboxMessageInput({
      aggregateType: "RepositoryScanJob",
      aggregateId: job.id,
      eventType: GITHUB_INTEGRATION_EVENT_TYPES.scanTriggered,
      organizationId: job.organizationId,
      assessmentId: job.assessmentId,
      correlationId: job.correlationId,
      causationId: command.correlationId,
      actor: { id: command.actorId, type: isTrusted ? "service" : "user" },
      result: GITHUB_INTEGRATION_EVENT_TYPES.scanJobTriggeredAudit,
      redactionStatus: AUDIT_REDACTION_STATUSES.none,
      idempotencyKey: job.idempotencyKey,
      payload: {
        scanJobId: job.id,
        assessmentId: job.assessmentId,
        snapshotId: job.snapshotId,
        organizationId: job.organizationId,
        triggerSource: job.triggerSource,
        idempotencyKey: job.idempotencyKey,
        correlationId: job.correlationId,
      },
    });

    try {
      await this.scanJobRepository.saveWithTriggeredEvent(job, event);
    } catch (error) {
      const raced =
        await this.scanJobRepository.findByIdempotencyKey(idempotencyKey);
      if (raced) {
        return this.resolveExisting(command, raced, snapshot.organizationId);
      }
      throw error;
    }

    await this.auditWriter.write({
      eventType: GITHUB_INTEGRATION_EVENT_TYPES.scanJobTriggeredAudit,
      actorId: command.actorId,
      organizationId: snapshot.organizationId,
      assessmentId: job.assessmentId,
      resourceType: "RepositoryScanJob",
      resourceId: job.id,
      correlationId: command.correlationId,
      causationId: command.correlationId,
      decision: AUDIT_DECISIONS.allow,
      result: GITHUB_INTEGRATION_EVENT_TYPES.scanJobTriggeredAudit,
      redactionStatus: AUDIT_REDACTION_STATUSES.none,
      payload: event.payload,
    });

    return this.toDto(job, true, command.correlationId);
  }

  private async resolveExisting(
    command: TriggerScanCommand,
    existing: RepositoryScanJob,
    organizationId: string,
  ): Promise<TriggerScanDto> {
    if (
      existing.assessmentId !== command.assessmentId ||
      existing.snapshotId !== clean(command.snapshotId) ||
      existing.organizationId !== organizationId ||
      existing.triggerSource !== command.triggerSource
    ) {
      await this.auditRejected(
        command,
        GITHUB_INTEGRATION_ERROR_CODES.scanIdempotencyConflict,
        organizationId,
      );
      throw new ConflictException(
        this.errorBody(
          command,
          GITHUB_INTEGRATION_ERROR_CODES.scanIdempotencyConflict,
        ),
      );
    }

    await this.auditWriter.write({
      eventType: GITHUB_INTEGRATION_EVENT_TYPES.scanTriggerDuplicateAudit,
      actorId: command.actorId,
      organizationId,
      resourceType: "RepositoryScanJob",
      resourceId: existing.id,
      correlationId: command.correlationId,
      decision: AUDIT_DECISIONS.allow,
      payload: {
        scanJobId: existing.id,
        assessmentId: existing.assessmentId,
        snapshotId: existing.snapshotId,
        idempotencyKey: existing.idempotencyKey,
        correlationId: command.correlationId,
      },
    });
    return this.toDto(existing, false, command.correlationId);
  }

  private toDto(
    job: RepositoryScanJob,
    isNew: boolean,
    correlationId: string,
  ): TriggerScanDto {
    return {
      scan_job_id: job.id,
      status: job.status,
      is_new: isNew,
      correlation_id: correlationId,
    };
  }

  private async auditRejected(
    command: TriggerScanCommand,
    reasonCode: string,
    organizationId: string | null = command.organizationId,
  ): Promise<void> {
    await this.auditWriter.write({
      eventType: GITHUB_INTEGRATION_EVENT_TYPES.scanTriggerRejectedAudit,
      actorId: command.actorId,
      organizationId,
      resourceType: "RepositorySnapshot",
      resourceId: clean(command.snapshotId) ?? command.assessmentId,
      correlationId: command.correlationId,
      reasonCode,
      decision: AUDIT_DECISIONS.deny,
      payload: {
        assessmentId: command.assessmentId,
        snapshotId: clean(command.snapshotId),
        triggerSource: command.triggerSource,
        reasonCode,
        correlationId: command.correlationId,
      },
    });
  }

  private errorBody(
    command: TriggerScanCommand,
    errorCode: string,
  ): { error_code: string; correlation_id: string } {
    return {
      error_code: errorCode,
      correlation_id: command.correlationId,
    };
  }
}

function clean(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function hasCompleteMapping(snapshot: {
  repositoryId: string;
  repositoryFullName: string;
  commitSha: string;
}): boolean {
  return Boolean(
    clean(snapshot.repositoryId) &&
    clean(snapshot.repositoryFullName) &&
    /^[0-9a-f]{40}$/i.test(snapshot.commitSha),
  );
}
