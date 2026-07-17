export const OUTBOX_STATUSES = {
  pending: "pending",
  published: "published",
  failed: "failed",
  dlq: "dlq",
} as const;

export const OUTBOX_AUDIT_EVENT_TYPES = {
  dlqReplayed: "OUTBOX_DLQ_REPLAYED",
  dlqDiscarded: "OUTBOX_DLQ_DISCARDED",
} as const;

export type OutboxStatus =
  (typeof OUTBOX_STATUSES)[keyof typeof OUTBOX_STATUSES];

export interface OutboxMessageInput {
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  payload: Record<string, unknown>;
}

export interface OutboxMessage extends OutboxMessageInput {
  id: string;
  status: OutboxStatus;
  attempts: number;
  lastAttemptAt: Date | null;
  publishedAt: Date | null;
  errorMessage: string | null;
  createdAt: Date;
}
