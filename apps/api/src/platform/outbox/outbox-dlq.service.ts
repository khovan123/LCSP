import { Injectable, NotFoundException } from "@nestjs/common";
import { AUDIT_DECISIONS } from "@lcsp/contracts/audit";
import {
  OUTBOX_AUDIT_EVENT_TYPES,
  OUTBOX_STATUSES,
} from "@lcsp/contracts/outbox";
import { OutboxRepository } from "./outbox.repository.js";
import { AuditWriterService } from "../audit/audit-writer.service.js";
import { OutboxMessageEntity } from "./outbox-message.entity.js";
import { randomUUID } from "node:crypto";

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
      throw new NotFoundException(`DLQ message with ID ${id} not found`);
    }

    await this.outboxRepository.resetMessageForReplay(id);

    await this.auditWriter.write({
      eventType: OUTBOX_AUDIT_EVENT_TYPES.dlqReplayed,
      actorId,
      organizationId: "system", // Or extract from context if applicable
      resourceType: "outbox",
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
      throw new NotFoundException(`DLQ message with ID ${id} not found`);
    }

    await this.outboxRepository.deleteMessage(id);

    await this.auditWriter.write({
      eventType: OUTBOX_AUDIT_EVENT_TYPES.dlqDiscarded,
      actorId,
      organizationId: "system",
      resourceType: "outbox",
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
