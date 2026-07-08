import { jest } from "@jest/globals";

interface FakeChannel {
  publish: ReturnType<
    typeof jest.fn<
      (
        exchange: string,
        routingKey: string,
        content: Buffer,
        options?: unknown,
      ) => boolean
    >
  >;
  close: ReturnType<typeof jest.fn<() => Promise<void>>>;
}

interface FakeConnection {
  createChannel: ReturnType<typeof jest.fn<() => Promise<FakeChannel>>>;
  close: ReturnType<typeof jest.fn<() => Promise<void>>>;
  on: ReturnType<
    typeof jest.fn<
      (event: string, handler: (...args: unknown[]) => void) => void
    >
  >;
  emit(event: string, ...args: unknown[]): void;
}

const connect = jest.fn<() => Promise<FakeConnection>>();

jest.unstable_mockModule("amqplib", () => ({
  connect,
}));

const { RabbitMqClient } = await import("./rabbitmq.client.js");

function makeChannel(): FakeChannel {
  return {
    publish: jest.fn<
      (
        exchange: string,
        routingKey: string,
        content: Buffer,
        options?: unknown,
      ) => boolean
    >(() => true),
    close: jest.fn<() => Promise<void>>(() => Promise.resolve()),
  };
}

function makeConnection(channel: FakeChannel): FakeConnection {
  const handlers: Record<string, ((...args: unknown[]) => void)[]> = {};
  return {
    createChannel: jest.fn<() => Promise<FakeChannel>>(() =>
      Promise.resolve(channel),
    ),
    close: jest.fn<() => Promise<void>>(() => Promise.resolve()),
    on: jest.fn<(event: string, handler: (...args: unknown[]) => void) => void>(
      (event, handler) => {
        handlers[event] ??= [];
        handlers[event].push(handler);
      },
    ),
    emit(event: string, ...args: unknown[]) {
      for (const handler of handlers[event] ?? []) {
        handler(...args);
      }
    },
  };
}

beforeEach(() => {
  connect.mockReset();
});

describe("RabbitMqClient", () => {
  it("connects lazily and reuses the same channel across calls", async () => {
    const channel = makeChannel();
    const connection = makeConnection(channel);
    connect.mockResolvedValue(connection);

    const client = new RabbitMqClient("amqp://fake");
    await client.ensureConnected();
    await client.publish("lcsp.events", "assessment.created", { a: 1 });

    expect(connect).toHaveBeenCalledTimes(1);
    expect(connection.createChannel).toHaveBeenCalledTimes(1);
  });

  it("publishes with the exact exchange, routing key, and JSON payload", async () => {
    const channel = makeChannel();
    const connection = makeConnection(channel);
    connect.mockResolvedValue(connection);

    const client = new RabbitMqClient("amqp://fake");
    await client.publish("lcsp.events", "assessment.created", { foo: "bar" });

    expect(channel.publish).toHaveBeenCalledWith(
      "lcsp.events",
      "assessment.created",
      Buffer.from(JSON.stringify({ foo: "bar" })),
      { contentType: "application/json", persistent: true },
    );
  });

  it("throws when the channel reports publish backpressure", async () => {
    const channel = makeChannel();
    channel.publish.mockReturnValue(false);
    const connection = makeConnection(channel);
    connect.mockResolvedValue(connection);

    const client = new RabbitMqClient("amqp://fake");

    await expect(
      client.publish("lcsp.events", "assessment.created", {}),
    ).rejects.toThrow(/backpressure/i);
  });

  it("reconnects after the connection emits close", async () => {
    const channelA = makeChannel();
    const connectionA = makeConnection(channelA);
    const channelB = makeChannel();
    const connectionB = makeConnection(channelB);
    connect
      .mockResolvedValueOnce(connectionA)
      .mockResolvedValueOnce(connectionB);

    const client = new RabbitMqClient("amqp://fake");
    await client.ensureConnected();
    connectionA.emit("close");
    await client.ensureConnected();

    expect(connect).toHaveBeenCalledTimes(2);
  });

  it("propagates connection failure to ensureConnected without caching a broken state", async () => {
    connect.mockRejectedValueOnce(new Error("ECONNREFUSED"));

    const client = new RabbitMqClient("amqp://fake");

    await expect(client.ensureConnected()).rejects.toThrow("ECONNREFUSED");

    const connection = makeConnection(makeChannel());
    connect.mockResolvedValueOnce(connection);
    await client.ensureConnected();

    expect(connect).toHaveBeenCalledTimes(2);
  });

  it("closes the channel and connection on module destroy", async () => {
    const channel = makeChannel();
    const connection = makeConnection(channel);
    connect.mockResolvedValue(connection);

    const client = new RabbitMqClient("amqp://fake");
    await client.ensureConnected();
    await client.onModuleDestroy();

    expect(channel.close).toHaveBeenCalledTimes(1);
    expect(connection.close).toHaveBeenCalledTimes(1);
  });
});
