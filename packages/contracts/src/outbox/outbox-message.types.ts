export type OutboxStatus = "pending" | "published" | "failed" | "dlq";

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
