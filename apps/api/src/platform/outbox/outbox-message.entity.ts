import { randomUUID } from "node:crypto";

import {
  type OutboxAggregateType,
  OUTBOX_STATUSES,
  type OutboxMessageInput,
  type OutboxStatus,
} from "@lcsp/contracts/outbox";

export class OutboxMessageEntity {
  readonly id: string;
  readonly aggregateType: OutboxAggregateType;
  readonly aggregateId: string;
  readonly eventType: string;
  readonly payload: Record<string, unknown>;
  readonly status: OutboxStatus;
  readonly attempts: number;
  readonly lastAttemptAt: Date | null;
  readonly publishedAt: Date | null;
  readonly errorMessage: string | null;
  readonly createdAt: Date;

  private constructor(fields: {
    aggregateType: OutboxAggregateType;
    aggregateId: string;
    eventType: string;
    payload: Record<string, unknown>;
    status: OutboxStatus;
    attempts: number;
    lastAttemptAt: Date | null;
    publishedAt: Date | null;
    errorMessage: string | null;
    createdAt: Date;
  }) {
    this.id = randomUUID();
    this.aggregateType = fields.aggregateType;
    this.aggregateId = fields.aggregateId;
    this.eventType = fields.eventType;
    this.payload = fields.payload;
    this.status = fields.status;
    this.attempts = fields.attempts;
    this.lastAttemptAt = fields.lastAttemptAt;
    this.publishedAt = fields.publishedAt;
    this.errorMessage = fields.errorMessage;
    this.createdAt = fields.createdAt;
  }

  static create(
    input: OutboxMessageInput,
    createdAt: Date = new Date(),
  ): OutboxMessageEntity {
    return new OutboxMessageEntity({
      aggregateType: input.aggregateType,
      aggregateId: input.aggregateId,
      eventType: input.eventType,
      payload: input.payload,
      status: OUTBOX_STATUSES.pending,
      attempts: 0,
      lastAttemptAt: null,
      publishedAt: null,
      errorMessage: null,
      createdAt,
    });
  }

  static fromPersistence(fields: {
    id: string;
    aggregateType: OutboxAggregateType;
    aggregateId: string;
    eventType: string;
    payload: Record<string, unknown>;
    status: OutboxStatus;
    attempts: number;
    lastAttemptAt: Date | null;
    publishedAt: Date | null;
    errorMessage: string | null;
    createdAt: Date;
  }): OutboxMessageEntity {
    const entity = new OutboxMessageEntity(fields);
    Object.assign(entity, { id: fields.id });
    return entity;
  }
}
