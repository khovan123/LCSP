import { Injectable, NotFoundException } from "@nestjs/common";
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

  async getDlqMessages(): Promise<{ messages: OutboxMessageEntity[]; count: number }> {
    const messages = await this.outboxRepository.findDlqMessages();
    return { messages, count: messages.length };
  }

  async replayMessage(id: string, actorId: string): Promise<void> {
    const message = await this.outboxRepository.findMessageById(id);
    if (!message || message.status !== "dlq") {
      throw new NotFoundException(`DLQ message with ID ${id} not found`);
    }

    await this.outboxRepository.resetMessageForReplay(id);

    await this.auditWriter.write({
      eventType: "OUTBOX_DLQ_REPLAYED",
      actorId,
      organizationId: "system", // Or extract from context if applicable
      resourceType: "outbox",
      resourceId: id,
      decision: "allow",
      correlationId: randomUUID(),
      payload: { originalEventType: message.eventType, aggregateId: message.aggregateId },
    });
  }

  async deleteMessage(id: string, actorId: string): Promise<void> {
    const message = await this.outboxRepository.findMessageById(id);
    if (!message || message.status !== "dlq") {
      throw new NotFoundException(`DLQ message with ID ${id} not found`);
    }

    await this.outboxRepository.deleteMessage(id);

    await this.auditWriter.write({
      eventType: "OUTBOX_DLQ_DISCARDED",
      actorId,
      organizationId: "system",
      resourceType: "outbox",
      resourceId: id,
      decision: "allow",
      correlationId: randomUUID(),
      payload: { originalEventType: message.eventType, aggregateId: message.aggregateId },
    });
  }
}
