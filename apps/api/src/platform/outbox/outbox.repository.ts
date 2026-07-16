import { Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import type { OutboxMessageInput, OutboxStatus } from "@lcsp/contracts/outbox";

import { PrismaService } from "../../infrastructure/prisma/prisma.service.js";
import { OutboxMessageEntity } from "./outbox-message.entity.js";

interface OutboxRow {
  id: string;
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  payload: unknown;
  status: string;
  attempts: number;
  lastAttemptAt: Date | null;
  publishedAt: Date | null;
  errorMessage: string | null;
  createdAt: Date;
}

@Injectable()
export class OutboxRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Inserts a new pending OutboxMessage; the publisher poller picks it up separately. */
  async enqueue(
    input: OutboxMessageInput,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const client = tx ?? this.prisma;
    const message = OutboxMessageEntity.create(crypto.randomUUID(), input);

    await client.outboxMessage.create({
      data: {
        id: message.id,
        aggregateType: message.aggregateType,
        aggregateId: message.aggregateId,
        eventType: message.eventType,
        payload: message.payload as Prisma.InputJsonValue,
        status: message.status,
        attempts: message.attempts,
        createdAt: message.createdAt,
      },
    });
  }

  /**
   * Selects up to `batchSize` pending messages with SELECT ... FOR UPDATE SKIP LOCKED,
   * then runs `handler` before committing — so the row lock is held for the duration of
   * the publish attempt, preventing a second instance from picking up the same message.
   */
  async withPendingBatch<T>(
    batchSize: number,
    handler: (
      messages: OutboxMessageEntity[],
      tx: Prisma.TransactionClient,
    ) => Promise<T>,
  ): Promise<T | null> {
    return this.prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<OutboxRow[]>`
        SELECT * FROM "OutboxMessage"
        WHERE status = 'pending'
        ORDER BY "createdAt" ASC
        LIMIT ${batchSize}
        FOR UPDATE SKIP LOCKED
      `;

      if (rows.length === 0) {
        return null;
      }

      const messages = rows.map((row) =>
        OutboxMessageEntity.fromPersistence({
          ...row,
          payload: row.payload as Record<string, unknown>,
          status: row.status as OutboxStatus,
        }),
      );

      return handler(messages, tx);
    });
  }

  async markPublished(
    tx: Prisma.TransactionClient,
    id: string,
    publishedAt: Date,
  ): Promise<void> {
    await tx.outboxMessage.update({
      where: { id },
      data: { status: "published", publishedAt },
    });
  }

  async markFailure(
    tx: Prisma.TransactionClient,
    id: string,
    attempts: number,
    maxAttempts: number,
    errorMessage: string,
    now: Date,
  ): Promise<void> {
    const status: OutboxStatus = attempts >= maxAttempts ? "dlq" : "failed";

    await tx.outboxMessage.update({
      where: { id },
      data: {
        status,
        attempts,
        lastAttemptAt: now,
        errorMessage: errorMessage.slice(0, 500),
      },
    });
  }

  async findDlqMessages(): Promise<OutboxMessageEntity[]> {
    const rows = await this.prisma.outboxMessage.findMany({
      where: { status: "dlq" },
      orderBy: { createdAt: "desc" },
    });
    return rows.map((row) =>
      OutboxMessageEntity.fromPersistence({
        ...row,
        payload: row.payload as Record<string, unknown>,
        status: row.status as OutboxStatus,
      }),
    );
  }

  async findMessageById(id: string): Promise<OutboxMessageEntity | null> {
    const row = await this.prisma.outboxMessage.findUnique({
      where: { id },
    });
    if (!row) return null;
    return OutboxMessageEntity.fromPersistence({
      ...row,
      payload: row.payload as Record<string, unknown>,
      status: row.status as OutboxStatus,
    });
  }

  async resetMessageForReplay(id: string): Promise<void> {
    await this.prisma.outboxMessage.update({
      where: { id },
      data: {
        status: "pending",
        attempts: 0,
        errorMessage: null,
      },
    });
  }

  async deleteMessage(id: string): Promise<void> {
    await this.prisma.outboxMessage.delete({
      where: { id },
    });
  }
}
