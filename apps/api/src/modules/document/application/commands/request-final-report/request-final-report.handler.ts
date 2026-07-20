import { ConflictException, NotFoundException } from "@nestjs/common";
import { CommandHandler, type ICommandHandler } from "@nestjs/cqrs";
import { AUDIT_DECISIONS } from "@lcsp/contracts/audit";
import {
  DOCUMENT_ERROR_CODES,
  DOCUMENT_EVENT_TYPES,
  DOCUMENT_REQUEST_STATUSES,
  DOCUMENT_TYPES,
} from "@lcsp/contracts/document";

import { PrismaService } from "../../../../../infrastructure/prisma/prisma.service.js";
import { AuditWriterService } from "../../../../../platform/audit/audit-writer.service.js";
import { OutboxRepository } from "../../../../../platform/outbox/outbox.repository.js";
import type { FinalReportRequestDto } from "../../contracts/document/final-report-request.contract.js";
import { RequestFinalReportCommand } from "./request-final-report.command.js";

const CLASSIFICATION_GUARDRAIL_STATUS_PASSED = "passed";
const ASSESSMENT_RESOURCE_TYPE = "Assessment";
const DOCUMENT_REQUEST_RESOURCE_TYPE = "DocumentRequest";

@CommandHandler(RequestFinalReportCommand)
export class RequestFinalReportHandler implements ICommandHandler<RequestFinalReportCommand> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly outboxRepository: OutboxRepository,
    private readonly auditWriter: AuditWriterService,
  ) {}

  async execute(
    command: RequestFinalReportCommand,
  ): Promise<FinalReportRequestDto> {
    const assessment = await this.prisma.assessment.findUnique({
      where: { id: command.assessmentId },
      select: { id: true, organizationId: true },
    });

    if (!assessment || assessment.organizationId !== command.organizationId) {
      throw new NotFoundException({
        error_code: DOCUMENT_ERROR_CODES.assessmentNotFound,
        correlation_id: command.correlationId,
      });
    }

    const classificationResult =
      await this.prisma.classificationResult.findFirst({
        where: {
          assessmentId: command.assessmentId,
          organizationId: command.organizationId,
        },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          guardrailStatus: true,
        },
      });

    if (
      !classificationResult ||
      !hasPassedGuardrail(classificationResult.guardrailStatus)
    ) {
      throw new ConflictException({
        error_code: DOCUMENT_ERROR_CODES.classificationGuardrailNotPassed,
        correlation_id: command.correlationId,
      });
    }

    const documentRequestId = crypto.randomUUID();

    await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`
        SELECT pg_advisory_xact_lock(hashtext(${command.assessmentId}))
      `;

      const existingRequest = await tx.documentRequest.findFirst({
        where: {
          assessmentId: command.assessmentId,
          organizationId: command.organizationId,
          documentType: DOCUMENT_TYPES.finalReport,
          status: {
            in: [
              DOCUMENT_REQUEST_STATUSES.queued,
              DOCUMENT_REQUEST_STATUSES.generating,
            ],
          },
        },
        select: { id: true },
      });

      if (existingRequest) {
        throw new ConflictException({
          error_code: DOCUMENT_ERROR_CODES.alreadyQueued,
          correlation_id: command.correlationId,
        });
      }

      await tx.documentRequest.create({
        data: {
          id: documentRequestId,
          assessmentId: command.assessmentId,
          organizationId: command.organizationId,
          requestedById: command.requestedById,
          classificationResultId: classificationResult.id,
          documentType: DOCUMENT_TYPES.finalReport,
          status: DOCUMENT_REQUEST_STATUSES.queued,
          correlationId: command.correlationId,
        },
      });
    });

    await this.outboxRepository.enqueue({
      aggregateType: DOCUMENT_REQUEST_RESOURCE_TYPE,
      aggregateId: command.assessmentId,
      eventType: DOCUMENT_EVENT_TYPES.finalReportRequested,
      payload: {
        documentRequestId,
        assessmentId: command.assessmentId,
        classificationResultId: classificationResult.id,
        correlationId: command.correlationId,
      },
    });

    await this.auditWriter.write({
      eventType: DOCUMENT_EVENT_TYPES.finalReportRequestedAudit,
      actorId: command.requestedById,
      organizationId: command.organizationId,
      resourceType: DOCUMENT_REQUEST_RESOURCE_TYPE,
      resourceId: documentRequestId,
      correlationId: command.correlationId,
      decision: AUDIT_DECISIONS.allow,
      payload: {
        documentRequestId,
        assessmentId: command.assessmentId,
        classificationResultId: classificationResult.id,
        correlationId: command.correlationId,
      },
    });

    await this.auditWriter.write({
      eventType: DOCUMENT_EVENT_TYPES.finalReportRequestedAudit,
      actorId: command.requestedById,
      organizationId: command.organizationId,
      resourceType: ASSESSMENT_RESOURCE_TYPE,
      resourceId: command.assessmentId,
      correlationId: command.correlationId,
      decision: AUDIT_DECISIONS.allow,
      payload: {
        documentRequestId,
        assessmentId: command.assessmentId,
        correlationId: command.correlationId,
      },
    });

    return {
      document_request_id: documentRequestId,
      status: DOCUMENT_REQUEST_STATUSES.queued,
      document_type: DOCUMENT_TYPES.finalReport,
      correlation_id: command.correlationId,
    };
  }
}

function hasPassedGuardrail(status: string): boolean {
  return status.trim().toLowerCase() === CLASSIFICATION_GUARDRAIL_STATUS_PASSED;
}
