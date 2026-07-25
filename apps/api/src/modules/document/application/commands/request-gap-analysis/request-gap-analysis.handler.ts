import { ConflictException, NotFoundException } from "@nestjs/common";
import * as crypto from "node:crypto";
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
import { RequestGapAnalysisCommand } from "./request-gap-analysis.command.js";

const CLASSIFICATION_GUARDRAIL_STATUS_PASSED = "passed";
const ASSESSMENT_RESOURCE_TYPE = "Assessment";
const DOCUMENT_REQUEST_RESOURCE_TYPE = "DocumentRequest";
const DOCUMENT_REQUEST_LOCK_PREFIX = "document-gap-analysis";

@CommandHandler(RequestGapAnalysisCommand)
export class RequestGapAnalysisHandler implements ICommandHandler<RequestGapAnalysisCommand> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly outboxRepository: OutboxRepository,
    private readonly auditWriter: AuditWriterService,
  ) {}

  async execute(command: RequestGapAnalysisCommand): Promise<{
    document_request_id: string;
    status: string;
    document_type: string;
    correlation_id: string;
  }> {
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

    if (!classificationResult) {
      throw new ConflictException({
        error_code: DOCUMENT_ERROR_CODES.classificationRequired,
        correlation_id: command.correlationId,
      });
    }

    if (!hasPassedGuardrail(classificationResult.guardrailStatus)) {
      throw new ConflictException({
        error_code: DOCUMENT_ERROR_CODES.classificationGuardrailNotPassed,
        correlation_id: command.correlationId,
      });
    }

    const documentRequestId = await this.prisma.$transaction(async (tx) => {
      const lockKey = [
        DOCUMENT_REQUEST_LOCK_PREFIX,
        command.organizationId,
        command.assessmentId,
      ].join(":");

      await tx.$executeRaw`
        SELECT pg_advisory_xact_lock(hashtext(${lockKey}))
      `;

      const existingRequest = await tx.documentRequest.findFirst({
        where: {
          assessmentId: command.assessmentId,
          organizationId: command.organizationId,
          documentType: DOCUMENT_TYPES.gapAnalysis,
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

      const created = await tx.documentRequest.create({
        data: {
          id: crypto.randomUUID(),
          assessmentId: command.assessmentId,
          organizationId: command.organizationId,
          requestedById: command.requestedById,
          classificationResultId: classificationResult.id,
          documentType: DOCUMENT_TYPES.gapAnalysis,
          status: DOCUMENT_REQUEST_STATUSES.queued,
          correlationId: command.correlationId,
        },
        select: { id: true },
      });

      return created.id;
    });

    await this.outboxRepository.enqueue({
      aggregateType: DOCUMENT_REQUEST_RESOURCE_TYPE,
      aggregateId: documentRequestId,
      eventType: DOCUMENT_EVENT_TYPES.gapAnalysisRequested,
      payload: {
        documentRequestId,
        assessmentId: command.assessmentId,
        classificationResultId: classificationResult.id,
        correlationId: command.correlationId,
      },
    });

    await this.auditWriter.write({
      eventType: DOCUMENT_EVENT_TYPES.gapAnalysisRequestedAudit,
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
      eventType: DOCUMENT_EVENT_TYPES.gapAnalysisRequestedAudit,
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
      document_type: DOCUMENT_TYPES.gapAnalysis,
      correlation_id: command.correlationId,
    };
  }
}

function hasPassedGuardrail(status: string): boolean {
  return status.trim().toLowerCase() === CLASSIFICATION_GUARDRAIL_STATUS_PASSED;
}
