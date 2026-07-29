import { randomUUID } from "node:crypto";
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
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
  REPOSITORY_SCAN_JOB_STATUSES,
  REPOSITORY_SCAN_TRIGGER_SOURCES,
} from "@lcsp/contracts/github-integration";
import { buildOutboxMessageInput } from "@lcsp/contracts/outbox";
import { SUBJECT_ROLES } from "@lcsp/contracts/pbac";
import { SCAN_EVENT_TYPES } from "@lcsp/contracts/scan";

import { PrismaService } from "../../../../../infrastructure/prisma/prisma.service.js";
import { AuditWriterService } from "../../../../../platform/audit/audit-writer.service.js";
import { OutboxRepository } from "../../../../../platform/outbox/outbox.repository.js";
import type { RerunScanResponseDto } from "../../contracts/scan/rerun-scan.contract.js";
import { RerunScanCommand } from "./rerun-scan.command.js";

@CommandHandler(RerunScanCommand)
export class RerunScanHandler implements ICommandHandler<RerunScanCommand> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditWriter: AuditWriterService,
    private readonly outbox: OutboxRepository,
  ) {}

  async execute(command: RerunScanCommand): Promise<RerunScanResponseDto> {
    const pbac = command.pbacContext;
    // Basic org validation and PBAC was handled by the guard, but we still ensure assessment belongs to org
    
    if (!command.idempotencyKey) {
      throw new BadRequestException({
        error_code: GITHUB_INTEGRATION_ERROR_CODES.scanIdempotencyKeyRequired,
        correlation_id: command.correlationId,
      });
    }

    const existing = await this.prisma.repositoryScanJob.findUnique({
      where: { idempotencyKey: command.idempotencyKey },
    });
    
    if (existing) {
      if (
        existing.assessmentId !== command.assessmentId ||
        existing.snapshotId !== command.snapshotId ||
        existing.organizationId !== pbac.organizationId
      ) {
        throw new ConflictException({
          error_code: GITHUB_INTEGRATION_ERROR_CODES.scanIdempotencyConflict,
          correlation_id: command.correlationId,
        });
      }
      return this.toDto(existing.id, existing.status, undefined, command.correlationId);
    }

    const snapshot = await this.prisma.repositorySnapshot.findUnique({
      where: { id: command.snapshotId },
      select: {
        id: true,
        assessmentId: true,
        organizationId: true,
      },
    });

    if (!snapshot || snapshot.organizationId !== pbac.organizationId || snapshot.assessmentId !== command.assessmentId) {
      throw new NotFoundException({
        error_code: GITHUB_INTEGRATION_ERROR_CODES.snapshotNotFound,
        correlation_id: command.correlationId,
      });
    }

    const assessment = await this.prisma.assessment.findUnique({
      where: { id: command.assessmentId },
      select: { id: true, organizationId: true, ownerId: true, status: true },
    });

    if (!assessment || assessment.organizationId !== pbac.organizationId) {
      throw new NotFoundException({
        error_code: GITHUB_INTEGRATION_ERROR_CODES.snapshotNotFound,
        correlation_id: command.correlationId,
      });
    }

    const isManagerOwner =
      pbac.subjectRole === SUBJECT_ROLES.manager &&
      pbac.userId === assessment.ownerId;

    if (!isManagerOwner) {
      throw new ForbiddenException({
        error_code: AUTH_ERROR_CODES.pbacDenied,
        correlation_id: command.correlationId,
      });
    }

    if (
      assessment.status !== ASSESSMENT_STATUS_CODES.wizardSubmitted &&
      assessment.status !== ASSESSMENT_STATUS_CODES.readyForReview
    ) {
      throw new ConflictException({
        error_code: GITHUB_INTEGRATION_ERROR_CODES.assessmentStateInvalid,
        correlation_id: command.correlationId,
      });
    }

    // Find prior job to keep track
    const priorJob = await this.prisma.repositoryScanJob.findFirst({
      where: { assessmentId: command.assessmentId },
      orderBy: { createdAt: "desc" },
    });

    const newScanJobId = randomUUID();
    const triggerSource = REPOSITORY_SCAN_TRIGGER_SOURCES.manual;
    const status = REPOSITORY_SCAN_JOB_STATUSES.queued;

    const event = buildOutboxMessageInput({
      aggregateType: "RepositoryScanJob",
      aggregateId: newScanJobId,
      eventType: GITHUB_INTEGRATION_EVENT_TYPES.scanTriggered,
      organizationId: pbac.organizationId,
      assessmentId: command.assessmentId,
      correlationId: command.correlationId,
      causationId: command.correlationId,
      actor: { id: pbac.userId, type: "user" },
      result: SCAN_EVENT_TYPES.scanRerunTriggeredAudit,
      redactionStatus: AUDIT_REDACTION_STATUSES.none,
      idempotencyKey: command.idempotencyKey,
      payload: {
        scanJobId: newScanJobId,
        assessmentId: command.assessmentId,
        snapshotId: command.snapshotId,
        organizationId: pbac.organizationId,
        triggerSource,
        idempotencyKey: command.idempotencyKey,
        correlationId: command.correlationId,
        replacesScanJobId: priorJob?.id,
      },
    });

    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.repositoryScanJob.create({
          data: {
            id: newScanJobId,
            assessmentId: command.assessmentId,
            snapshotId: command.snapshotId,
            organizationId: pbac.organizationId,
            idempotencyKey: command.idempotencyKey,
            triggerSource,
            status,
            correlationId: command.correlationId,
          },
        });
        await this.outbox.enqueue(event, tx);
      });
    } catch (e) {
      // Possible idempotency race
      const raced = await this.prisma.repositoryScanJob.findUnique({
        where: { idempotencyKey: command.idempotencyKey },
      });
      if (raced) {
        return this.toDto(raced.id, raced.status, priorJob?.id, command.correlationId);
      }
      throw e;
    }

    await this.auditWriter.write({
      eventType: SCAN_EVENT_TYPES.scanRerunTriggeredAudit,
      actorId: pbac.userId,
      organizationId: pbac.organizationId,
      assessmentId: command.assessmentId,
      resourceType: "RepositoryScanJob",
      resourceId: newScanJobId,
      correlationId: command.correlationId,
      causationId: command.correlationId,
      decision: AUDIT_DECISIONS.allow,
      result: SCAN_EVENT_TYPES.scanRerunTriggeredAudit,
      redactionStatus: AUDIT_REDACTION_STATUSES.none,
      payload: {
        newScanJobId,
        priorScanJobId: priorJob?.id,
        assessmentId: command.assessmentId,
        correlationId: command.correlationId,
        reason: command.reason,
      },
    });

    return this.toDto(newScanJobId, status, priorJob?.id, command.correlationId);
  }

  private toDto(
    scanJobId: string,
    status: string,
    replacesScanJobId: string | undefined,
    correlationId: string,
  ): RerunScanResponseDto {
    return {
      scan_job_id: scanJobId,
      status,
      replaces_scan_job_id: replacesScanJobId,
      correlation_id: correlationId,
    };
  }
}
