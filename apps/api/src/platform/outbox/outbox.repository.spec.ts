import { jest } from "@jest/globals";
import type { Prisma } from "@prisma/client";

import { OutboxRepository } from "./outbox.repository.js";
import { PrismaService } from "../../infrastructure/prisma/prisma.service.js";

type UpdateFn = (args: unknown) => Promise<unknown>;

function makeTx() {
  const update = jest.fn<UpdateFn>().mockResolvedValue(undefined);
  return {
    tx: {
      outboxMessage: { update },
    } as unknown as Prisma.TransactionClient,
    update,
  };
}

describe("OutboxRepository", () => {
  it("markPublished sets status=published with the given publishedAt", async () => {
    const repository = new OutboxRepository({} as PrismaService);
    const { tx, update } = makeTx();
    const publishedAt = new Date("2026-01-01T00:00:00Z");

    await repository.markPublished(tx, "outbox-1", publishedAt);

    expect(update).toHaveBeenCalledWith({
      where: { id: "outbox-1" },
      data: { status: "published", publishedAt },
    });
  });

  it("T02: markFailure sets status=failed while attempts < maxAttempts", async () => {
    const repository = new OutboxRepository({} as PrismaService);
    const { tx, update } = makeTx();
    const now = new Date("2026-01-01T00:00:00Z");

    await repository.markFailure(tx, "outbox-1", 3, 5, "boom", now);

    expect(update).toHaveBeenCalledWith({
      where: { id: "outbox-1" },
      data: {
        status: "failed",
        attempts: 3,
        lastAttemptAt: now,
        errorMessage: "boom",
      },
    });
  });

  it("T03: markFailure sets status=dlq once attempts reaches maxAttempts", async () => {
    const repository = new OutboxRepository({} as PrismaService);
    const { tx, update } = makeTx();
    const now = new Date("2026-01-01T00:00:00Z");

    await repository.markFailure(tx, "outbox-1", 5, 5, "boom", now);

    expect(update).toHaveBeenCalledWith({
      where: { id: "outbox-1" },
      data: {
        status: "dlq",
        attempts: 5,
        lastAttemptAt: now,
        errorMessage: "boom",
      },
    });
  });

  it("truncates errorMessage to 500 characters", async () => {
    const repository = new OutboxRepository({} as PrismaService);
    const { tx, update } = makeTx();
    const longMessage = "x".repeat(600);

    await repository.markFailure(tx, "outbox-1", 1, 5, longMessage, new Date());

    const call = update.mock.calls[0][0] as {
      data: { errorMessage: string };
    };
    expect(call.data.errorMessage).toHaveLength(500);
  });
});
