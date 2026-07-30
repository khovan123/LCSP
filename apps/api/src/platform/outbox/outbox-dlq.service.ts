import { Injectable, HttpStatus } from "@nestjs/common";
import { AUDIT_DECISIONS, AUDIT_RESOURCE_TYPES } from "@lcsp/contracts/audit";
import {
  OUTBOX_AUDIT_EVENT_TYPES,
  OUTBOX_ERROR_CODES,
  OUTBOX_STATUSES,
} from "@lcsp/contracts/outbox";
import { OutboxRepository } from "./outbox.repository.js";
import { AuditWriterService } from "../audit/audit-writer.service.js";
import { OutboxMessageEntity } from "./outbox-message.entity.js";
import { randomUUID } from "node:crypto";
import { problemException } from "../problems/problem-factory.js";

@Injectable()
export class OutboxDlqService {
  constructor(
    private readonly outboxRepository: OutboxRepository,
    private readonly auditWriter: AuditWriterService,
  ) {}

  async getDlqMessages(): Promise<{
    messages: OutboxMessageEntity[];
    count: number;
  }> {
    const messages = await this.outboxRepository.findDlqMessages();
    return { messages, count: messages.length };
  }

  async replayMessage(id: string, actorId: string): Promise<void> {
    const message = await this.outboxRepository.findMessageById(id);
    if (!message || message.status !== OUTBOX_STATUSES.dlq) {
      throw problemException(
        OUTBOX_ERROR_CODES.dlqMessageNotFound,
        randomUUID(),
        {
          status: HttpStatus.NOT_FOUND,
        },
      );
    }

    await this.outboxRepository.resetMessageForReplay(id);

    await this.auditWriter.write({
      eventType: OUTBOX_AUDIT_EVENT_TYPES.dlqReplayed,
      actorId,
      organizationId: "system", // Or extract from context if applicable
      resourceType: AUDIT_RESOURCE_TYPES.outbox,
      resourceId: id,
      decision: AUDIT_DECISIONS.allow,
      correlationId: randomUUID(),
      payload: {
        originalEventType: message.eventType,
        aggregateId: message.aggregateId,
      },
    });
  }

  async deleteMessage(id: string, actorId: string): Promise<void> {
    const message = await this.outboxRepository.findMessageById(id);
    if (!message || message.status !== OUTBOX_STATUSES.dlq) {
      throw problemException(
        OUTBOX_ERROR_CODES.dlqMessageNotFound,
        randomUUID(),
        {
          status: HttpStatus.NOT_FOUND,
        },
      );
    }

    await this.outboxRepository.deleteMessage(id);

    await this.auditWriter.write({
      eventType: OUTBOX_AUDIT_EVENT_TYPES.dlqDiscarded,
      actorId,
      organizationId: "system",
      resourceType: AUDIT_RESOURCE_TYPES.outbox,
      resourceId: id,
      decision: AUDIT_DECISIONS.allow,
      correlationId: randomUUID(),
      payload: {
        originalEventType: message.eventType,
        aggregateId: message.aggregateId,
      },
    });
  }
}
