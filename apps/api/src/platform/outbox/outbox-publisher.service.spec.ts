import { jest } from "@jest/globals";
import type { Prisma } from "@prisma/client";
import type { ConfigService } from "@nestjs/config";
import { Logger } from "@nestjs/common";

import { OutboxMessageEntity } from "./outbox-message.entity.js";
import { OutboxPublisherService } from "./outbox-publisher.service.js";
import type { OutboxRepository } from "./outbox.repository.js";
import type { RabbitMqClient } from "./rabbitmq.client.js";

type WithPendingBatchFn = (
  batchSize: number,
  handler: (
    messages: OutboxMessageEntity[],
    tx: Prisma.TransactionClient,
  ) => Promise<unknown>,
) => Promise<unknown>;
type MarkPublishedFn = (
  tx: Prisma.TransactionClient,
  id: string,
  publishedAt: Date,
) => Promise<void>;
type MarkFailureFn = (
  tx: Prisma.TransactionClient,
  id: string,
  attempts: number,
  maxAttempts: number,
  errorMessage: string,
  now: Date,
) => Promise<void>;
type EnsureConnectedFn = () => Promise<void>;
type PublishFn = (
  exchange: string,
  routingKey: string,
  payload: Record<string, unknown>,
) => Promise<void>;

function makeConfigService(
  overrides: Record<string, unknown> = {},
): ConfigService {
  const values: Record<string, unknown> = {
    "outbox.pollIntervalMs": 1000,
    "outbox.batchSize": 50,
    "outbox.maxAttempts": 5,
    "rabbitmq.exchange": "lcsp.events",
    ...overrides,
  };

  return {
    get: (key: string, fallback?: unknown) => values[key] ?? fallback,
  } as unknown as ConfigService;
}

function makeOutboxRepository(overrides: {
  withPendingBatch?: ReturnType<typeof jest.fn<WithPendingBatchFn>>;
  markPublished?: ReturnType<typeof jest.fn<MarkPublishedFn>>;
  markFailure?: ReturnType<typeof jest.fn<MarkFailureFn>>;
}) {
  return {
    withPendingBatch:
      overrides.withPendingBatch ?? jest.fn<WithPendingBatchFn>(),
    markPublished: overrides.markPublished ?? jest.fn<MarkPublishedFn>(),
    markFailure: overrides.markFailure ?? jest.fn<MarkFailureFn>(),
  } as unknown as OutboxRepository;
}

function makeRabbitMqClient(overrides: {
  ensureConnected?: ReturnType<typeof jest.fn<EnsureConnectedFn>>;
  publish?: ReturnType<typeof jest.fn<PublishFn>>;
}) {
  return {
    ensureConnected: overrides.ensureConnected ?? jest.fn<EnsureConnectedFn>(),
    publish: overrides.publish ?? jest.fn<PublishFn>(),
  } as unknown as RabbitMqClient;
}

function makeMessage(
  overrides: Partial<
    Parameters<typeof OutboxMessageEntity.fromPersistence>[0]
  > = {},
) {
  return OutboxMessageEntity.fromPersistence({
    id: "outbox-1",
    aggregateType: "Assessment",
    aggregateId: "assessment-1",
    eventType: "assessment.created",
    payload: { foo: "bar" },
    status: "pending",
    attempts: 0,
    lastAttemptAt: null,
    publishedAt: null,
    errorMessage: null,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  });
}

describe("OutboxPublisherService", () => {
  let loggerErrorSpy: jest.SpiedFunction<typeof Logger.prototype.error>;

  beforeEach(() => {
    loggerErrorSpy = jest
      .spyOn(Logger.prototype, "error")
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    loggerErrorSpy.mockRestore();
    jest.useRealTimers();
  });

  it("T01: publishes a pending message and marks it published", async () => {
    const message = makeMessage();
    const markPublished = jest
      .fn<MarkPublishedFn>()
      .mockResolvedValue(undefined);
    const withPendingBatch = jest
      .fn<WithPendingBatchFn>()
      .mockImplementation(async (_batchSize, handler) =>
        handler([message], {} as Prisma.TransactionClient),
      );
    const outboxRepository = makeOutboxRepository({
      withPendingBatch,
      markPublished,
    });

    const publish = jest.fn<PublishFn>().mockResolvedValue(undefined);
    const rabbitMqClient = makeRabbitMqClient({
      ensureConnected: jest
        .fn<EnsureConnectedFn>()
        .mockResolvedValue(undefined),
      publish,
    });

    const service = new OutboxPublisherService(
      outboxRepository,
      rabbitMqClient,
      makeConfigService(),
    );

    await service.poll();

    expect(publish).toHaveBeenCalledWith("lcsp.events", "assessment.created", {
      foo: "bar",
    });
    expect(markPublished).toHaveBeenCalledWith(
      {},
      "outbox-1",
      expect.any(Date),
    );
  });

  it("T02: on publish failure below MAX_ATTEMPTS, records the failure with incremented attempts", async () => {
    const message = makeMessage({ attempts: 2 });
    const markFailure = jest.fn<MarkFailureFn>().mockResolvedValue(undefined);
    const withPendingBatch = jest
      .fn<WithPendingBatchFn>()
      .mockImplementation(async (_batchSize, handler) =>
        handler([message], {} as Prisma.TransactionClient),
      );
    const outboxRepository = makeOutboxRepository({
      withPendingBatch,
      markFailure,
    });

    const rabbitMqClient = makeRabbitMqClient({
      ensureConnected: jest
        .fn<EnsureConnectedFn>()
        .mockResolvedValue(undefined),
      publish: jest
        .fn<PublishFn>()
        .mockRejectedValue(new Error("broker refused")),
    });

    const service = new OutboxPublisherService(
      outboxRepository,
      rabbitMqClient,
      makeConfigService({ "outbox.maxAttempts": 5 }),
    );

    await service.poll();

    expect(markFailure).toHaveBeenCalledWith(
      {},
      "outbox-1",
      3,
      5,
      "broker refused",
      expect.any(Date),
    );
  });

  it("T04: skips the poll and does not crash when RabbitMQ is unavailable", async () => {
    const withPendingBatch = jest.fn<WithPendingBatchFn>();
    const outboxRepository = makeOutboxRepository({ withPendingBatch });

    const rabbitMqClient = makeRabbitMqClient({
      ensureConnected: jest
        .fn<EnsureConnectedFn>()
        .mockRejectedValue(new Error("ECONNREFUSED")),
    });

    const service = new OutboxPublisherService(
      outboxRepository,
      rabbitMqClient,
      makeConfigService(),
    );

    await expect(service.poll()).resolves.toBeUndefined();
    expect(withPendingBatch).not.toHaveBeenCalled();
  });

  it("does not overlap polls when one is already in progress", async () => {
    let resolveEnsureConnected: () => void = () => undefined;
    const ensureConnected = jest.fn<EnsureConnectedFn>(
      () =>
        new Promise<void>((resolve) => {
          resolveEnsureConnected = resolve;
        }),
    );
    const withPendingBatch = jest
      .fn<WithPendingBatchFn>()
      .mockResolvedValue(null);
    const outboxRepository = makeOutboxRepository({ withPendingBatch });
    const rabbitMqClient = makeRabbitMqClient({ ensureConnected });

    const service = new OutboxPublisherService(
      outboxRepository,
      rabbitMqClient,
      makeConfigService(),
    );

    const firstPoll = service.poll();
    const secondPoll = service.poll();

    expect(ensureConnected).toHaveBeenCalledTimes(1);

    resolveEnsureConnected();
    await Promise.all([firstPoll, secondPoll]);
  });

  it("T08: onModuleDestroy stops the poller so no further polls fire", async () => {
    jest.useFakeTimers();

    const withPendingBatch = jest
      .fn<WithPendingBatchFn>()
      .mockResolvedValue(null);
    const outboxRepository = makeOutboxRepository({ withPendingBatch });
    const ensureConnected = jest
      .fn<EnsureConnectedFn>()
      .mockResolvedValue(undefined);
    const rabbitMqClient = makeRabbitMqClient({ ensureConnected });

    const service = new OutboxPublisherService(
      outboxRepository,
      rabbitMqClient,
      makeConfigService({ "outbox.pollIntervalMs": 100 }),
    );

    service.onModuleInit();
    await jest.advanceTimersByTimeAsync(250);
    service.onModuleDestroy();
    await jest.advanceTimersByTimeAsync(1000);

    // Two ticks fired before destroy (at 100ms and 200ms); none after.
    expect(ensureConnected).toHaveBeenCalledTimes(2);
  });
});
