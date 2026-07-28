import * as crypto from "node:crypto";

import {
  ConflictException,
  HttpException,
  NotFoundException,
} from "@nestjs/common";
import { CommandHandler, type ICommandHandler } from "@nestjs/cqrs";
import type { Prisma } from "@prisma/client";
import {
  AUDIT_DECISIONS,
  AUDIT_REDACTION_STATUSES,
  buildAuditEventInput,
} from "@lcsp/contracts/audit";
import { REPOSITORY_SCAN_JOB_STATUSES } from "@lcsp/contracts/github-integration";
import { buildOutboxMessageInput } from "@lcsp/contracts/outbox";
import {
  SCAN_CALLBACK_STATUSES,
  SCAN_ERROR_CODES,
  SCAN_EVENT_TYPES,
  TECHNICAL_EVIDENCE_REPORT_STATUSES,
} from "@lcsp/contracts/scan";

import { PrismaService } from "../../../../../infrastructure/prisma/prisma.service.js";
import { AuditWriterService } from "../../../../../platform/audit/audit-writer.service.js";
import type { ScanCallbackDto } from "../../contracts/scan/scan-callback.contract.js";
import { EvidenceSchemaValidatorService } from "../../services/scan/evidence-schema-validator.service.js";
import { ProcessScanCallbackCommand } from "./process-scan-callback.command.js";

const SCANNER_WORKER_ACTOR_ID = "scanner-worker";

@CommandHandler(ProcessScanCallbackCommand)
export class ProcessScanCallbackHandler implements ICommandHandler<ProcessScanCallbackCommand> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly validator: EvidenceSchemaValidatorService,
    private readonly auditWriter: AuditWriterService,
  ) {}

  async execute(command: ProcessScanCallbackCommand): Promise<ScanCallbackDto> {
    const job = await this.prisma.repositoryScanJob.findUnique({
      where: { id: command.scanJobId },
      select: {
        id: true,
        assessmentId: true,
        snapshotId: true,
        organizationId: true,
        status: true,
      },
    });
    if (!job) {
      throw new NotFoundException(
        this.errorBody(command, SCAN_ERROR_CODES.jobNotFound),
      );
    }
    if (job.status !== REPOSITORY_SCAN_JOB_STATUSES.running) {
      throw new ConflictException(
        this.errorBody(command, SCAN_ERROR_CODES.jobWrongState),
      );
    }

    try {
      this.validator.validate(
        command.scanJobId,
        command.payload,
        command.correlationId,
      );
    } catch (error) {
      await this.auditValidationRejection(command, job, error);
      throw error;
    }

    const isRejected = command.payload.status === SCAN_CALLBACK_STATUSES.failed;
    const reportId = crypto.randomUUID();
    const reportStatus = isRejected
      ? TECHNICAL_EVIDENCE_REPORT_STATUSES.rejected
      : TECHNICAL_EVIDENCE_REPORT_STATUSES.accepted;
    const jobStatus = isRejected
      ? REPOSITORY_SCAN_JOB_STATUSES.failed
      : REPOSITORY_SCAN_JOB_STATUSES.completed;
    const auditEventType = isRejected
      ? SCAN_EVENT_TYPES.evidenceRejectedAudit
      : SCAN_EVENT_TYPES.evidenceAcceptedAudit;
    const rejectionReason = isRejected
      ? (command.payload.error_code ?? null)
      : null;

    await this.prisma.$transaction(async (tx) => {
      const transition = await tx.repositoryScanJob.updateMany({
        where: {
          id: job.id,
          status: REPOSITORY_SCAN_JOB_STATUSES.running,
        },
        data: { status: jobStatus },
      });
      if (transition.count !== 1) {
        throw new ConflictException(
          this.errorBody(command, SCAN_ERROR_CODES.jobWrongState),
        );
      }

      await tx.technicalEvidenceReport.create({
        data: {
          id: reportId,
          scanJobId: job.id,
          assessmentId: job.assessmentId,
          organizationId: job.organizationId,
          snapshotId: job.snapshotId,
          toolsVersion: command.payload.tools_version as Prisma.InputJsonValue,
          configHash: command.payload.config_hash as Prisma.InputJsonValue,
          evidencePayload: command.payload
            .evidence_payload as Prisma.InputJsonValue,
          privacyFlags: command.payload.privacy_flags as Prisma.InputJsonValue,
          schemaVersion: command.payload.schema_version,
          status: reportStatus,
          rejectionReason,
        },
      });

      if (!isRejected) {
        const event = buildOutboxMessageInput({
          aggregateType: "TechnicalEvidenceReport",
          aggregateId: reportId,
          eventType: SCAN_EVENT_TYPES.evidenceAccepted,
          organizationId: job.organizationId,
          assessmentId: job.assessmentId,
          correlationId: command.correlationId,
          causationId: job.id,
          actor: { id: SCANNER_WORKER_ACTOR_ID, type: "service" },
          result: SCAN_EVENT_TYPES.evidenceAcceptedAudit,
          redactionStatus: AUDIT_REDACTION_STATUSES.none,
          idempotencyKey: `${reportId}:${SCAN_EVENT_TYPES.evidenceAccepted}`,
          payload: {
            evidenceReportId: reportId,
            assessmentId: job.assessmentId,
            scanJobId: job.id,
            correlationId: command.correlationId,
          },
        });
        await tx.outboxMessage.create({
          data: {
            id: crypto.randomUUID(),
            aggregateType: event.aggregateType,
            aggregateId: event.aggregateId,
            eventType: event.eventType,
            payload: event.payload as Prisma.InputJsonValue,
          },
        });
      }

      const auditEvent = buildAuditEventInput({
        eventType: auditEventType,
        actorId: SCANNER_WORKER_ACTOR_ID,
        organizationId: job.organizationId,
        assessmentId: job.assessmentId,
        resourceType: "TechnicalEvidenceReport",
        resourceId: reportId,
        correlationId: command.correlationId,
        causationId: job.id,
        reasonCode: rejectionReason,
        decision: isRejected ? AUDIT_DECISIONS.deny : AUDIT_DECISIONS.allow,
        result: auditEventType,
        redactionStatus: AUDIT_REDACTION_STATUSES.none,
        actor: { id: SCANNER_WORKER_ACTOR_ID, type: "service" },
        payload: {
          evidenceReportId: reportId,
          assessmentId: job.assessmentId,
          scanJobId: job.id,
          evidenceSchemaVersion: command.payload.schema_version,
          correlationId: command.correlationId,
        },
      });
      await tx.authAuditEvent.create({
        data: {
          id: crypto.randomUUID(),
          eventType: auditEvent.eventType,
          actorId: auditEvent.actorId,
          organizationId: auditEvent.organizationId,
          resourceType: auditEvent.resourceType ?? null,
          resourceId: auditEvent.resourceId ?? null,
          correlationId: auditEvent.correlationId,
          reasonCode: auditEvent.reasonCode ?? null,
          decision: auditEvent.decision,
          payload: auditEvent.payload as Prisma.InputJsonValue,
        },
      });
    });

    return {
      accepted: !isRejected,
      evidence_report_id: reportId,
      correlation_id: command.correlationId,
    };
  }

  private async auditValidationRejection(
    command: ProcessScanCallbackCommand,
    job: {
      id: string;
      assessmentId: string;
      organizationId: string;
    },
    error: unknown,
  ): Promise<void> {
    const reasonCode = errorCode(error);
    await this.auditWriter.write(
      buildAuditEventInput({
        eventType: SCAN_EVENT_TYPES.evidenceRejectedAudit,
        actorId: SCANNER_WORKER_ACTOR_ID,
        organizationId: job.organizationId,
        assessmentId: job.assessmentId,
        resourceType: "RepositoryScanJob",
        resourceId: job.id,
        correlationId: command.correlationId,
        causationId: job.id,
        reasonCode,
        decision: AUDIT_DECISIONS.deny,
        result: SCAN_EVENT_TYPES.evidenceRejectedAudit,
        redactionStatus: AUDIT_REDACTION_STATUSES.none,
        actor: { id: SCANNER_WORKER_ACTOR_ID, type: "service" },
        payload: {
          assessmentId: job.assessmentId,
          scanJobId: job.id,
          reasonCode,
          correlationId: command.correlationId,
        },
      }),
    );
  }

  private errorBody(
    command: ProcessScanCallbackCommand,
    errorCode: string,
  ): { error_code: string; correlation_id: string } {
    return {
      error_code: errorCode,
      correlation_id: command.correlationId,
    };
  }
}

function errorCode(error: unknown): string {
  if (error instanceof HttpException) {
    const response = error.getResponse();
    if (response && typeof response === "object") {
      const value = (response as Record<string, unknown>).error_code;
      if (typeof value === "string") return value;
    }
  }
  return SCAN_ERROR_CODES.evidenceSchemaInvalid;
}
