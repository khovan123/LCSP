import { Injectable, HttpStatus } from "@nestjs/common";
import { AUDIT_DECISIONS, AUDIT_RESOURCE_TYPES } from "@lcsp/contracts/audit";
import {
  REPOSITORY_SCAN_JOB_STATUSES,
} from "@lcsp/contracts/github-integration";
import {
  OUTBOX_AUDIT_EVENT_TYPES,
  OUTBOX_AGGREGATE_TYPES,
  OUTBOX_ERROR_CODES,
  OUTBOX_STATUSES,
} from "@lcsp/contracts/outbox";
import { TECHNICAL_EVIDENCE_REPORT_STATUSES } from "@lcsp/contracts/scan";
import { OutboxRepository } from "./outbox.repository.js";
import { AuditWriterService } from "../audit/audit-writer.service.js";
import { OutboxMessageEntity } from "./outbox-message.entity.js";
import { problemException } from "../problems/problem-factory.js";
import { PrismaService } from "../../infrastructure/prisma/prisma.service.js";
import {
  fromPrismaEvidenceAcceptanceStatus,
  fromPrismaRepositoryScanJobStatus,
} from "../../infrastructure/prisma/prisma-enum-mappers.js";

@Injectable()
export class OutboxDlqService {
  constructor(
    private readonly outboxRepository: OutboxRepository,
    private readonly auditWriter: AuditWriterService,
    private readonly prisma: PrismaService,
  ) {}

  async getDlqMessages(): Promise<{
    messages: OutboxMessageEntity[];
    count: number;
  }> {
    const messages = await this.outboxRepository.findDlqMessages();
    return { messages, count: messages.length };
  }

  async replayMessage(
    id: string,
    actorId: string,
    organizationId: string,
    correlationId: string,
  ): Promise<void> {
    const message = await this.outboxRepository.findMessageById(id);
    if (!message || message.status !== OUTBOX_STATUSES.dlq) {
      throw problemException(
        OUTBOX_ERROR_CODES.dlqMessageNotFound,
        correlationId,
        {
          status: HttpStatus.NOT_FOUND,
        },
      );
    }

    await this.assertReplayTargetIsSafe(message, correlationId);
    await this.outboxRepository.resetMessageForReplay(id);

    await this.auditWriter.write({
      eventType: OUTBOX_AUDIT_EVENT_TYPES.dlqReplayed,
      actorId,
      organizationId,
      resourceType: AUDIT_RESOURCE_TYPES.outbox,
      resourceId: id,
      decision: AUDIT_DECISIONS.allow,
      correlationId,
      payload: {
        originalEventType: message.eventType,
        aggregateId: message.aggregateId,
      },
    });
  }

  async deleteMessage(
    id: string,
    actorId: string,
    organizationId: string,
    correlationId: string,
  ): Promise<void> {
    const message = await this.outboxRepository.findMessageById(id);
    if (!message || message.status !== OUTBOX_STATUSES.dlq) {
      throw problemException(
        OUTBOX_ERROR_CODES.dlqMessageNotFound,
        correlationId,
        {
          status: HttpStatus.NOT_FOUND,
        },
      );
    }

    await this.outboxRepository.deleteMessage(id);

    await this.auditWriter.write({
      eventType: OUTBOX_AUDIT_EVENT_TYPES.dlqDiscarded,
      actorId,
      organizationId,
      resourceType: AUDIT_RESOURCE_TYPES.outbox,
      resourceId: id,
      decision: AUDIT_DECISIONS.allow,
      correlationId,
      payload: {
        originalEventType: message.eventType,
        aggregateId: message.aggregateId,
      },
    });
  }

  private async assertReplayTargetIsSafe(
    message: OutboxMessageEntity,
    correlationId: string,
  ): Promise<void> {
    if (message.aggregateType === OUTBOX_AGGREGATE_TYPES.repositoryScanJob) {
      const job = await this.prisma.repositoryScanJob.findUnique({
        where: { id: message.aggregateId },
        select: { status: true },
      });
      const status = job ? fromPrismaRepositoryScanJobStatus(job.status) : null;
      if (
        status === REPOSITORY_SCAN_JOB_STATUSES.completed ||
        status === REPOSITORY_SCAN_JOB_STATUSES.failed
      ) {
        throw this.unsafeReplay(correlationId);
      }
      return;
    }

    if (message.aggregateType === OUTBOX_AGGREGATE_TYPES.technicalEvidenceReport) {
      const report = await this.prisma.technicalEvidenceReport.findUnique({
        where: { id: message.aggregateId },
        select: { status: true },
      });
      const status = report
        ? fromPrismaEvidenceAcceptanceStatus(report.status)
        : null;
      if (status === TECHNICAL_EVIDENCE_REPORT_STATUSES.accepted) {
        throw this.unsafeReplay(correlationId);
      }
      return;
    }

    if (message.aggregateType === OUTBOX_AGGREGATE_TYPES.technicalProfile) {
      const profile = await this.prisma.technicalProfile.findUnique({
        where: { id: message.aggregateId },
        select: { status: true },
      });
      const status = profile
        ? fromPrismaEvidenceAcceptanceStatus(profile.status)
        : null;
      if (status === TECHNICAL_EVIDENCE_REPORT_STATUSES.accepted) {
        throw this.unsafeReplay(correlationId);
      }
    }
  }

  private unsafeReplay(correlationId: string): never {
    throw problemException(OUTBOX_ERROR_CODES.dlqReplayUnsafeTarget, correlationId, {
      status: HttpStatus.CONFLICT,
    });
  }
}
