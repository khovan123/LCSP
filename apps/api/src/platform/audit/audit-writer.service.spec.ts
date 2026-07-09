import { jest } from "@jest/globals";
import type { Prisma } from "@prisma/client";
import type { AuditEventInput } from "@lcsp/contracts/audit";

import type { PrismaService } from "../../infrastructure/prisma/prisma.service.js";
import { AuditWriterService } from "./audit-writer.service.js";

type CreateFn = (args: { data: Record<string, unknown> }) => Promise<unknown>;

function makePrisma(
  overrides: { create?: ReturnType<typeof jest.fn<CreateFn>> } = {},
) {
  const create = overrides.create ?? jest.fn<CreateFn>().mockResolvedValue({});
  const client = {
    authAuditEvent: { create },
  };
  return { client: client as unknown as PrismaService, create };
}

function makeTx(
  overrides: { create?: ReturnType<typeof jest.fn<CreateFn>> } = {},
) {
  const create = overrides.create ?? jest.fn<CreateFn>().mockResolvedValue({});
  const tx = {
    authAuditEvent: { create },
  };
  return { tx: tx as unknown as Prisma.TransactionClient, create };
}

function makeEvent(overrides: Partial<AuditEventInput> = {}): AuditEventInput {
  return {
    eventType: "auth.login.succeeded",
    actorId: "user-1",
    organizationId: "org-1",
    correlationId: "corr-1",
    decision: "allow",
    ...overrides,
  };
}

describe("AuditWriterService", () => {
  it("T01: write() with clean payload creates a row with all fields correct", async () => {
    const { client, create } = makePrisma();
    const service = new AuditWriterService(client);
    const event = makeEvent({ payload: { userId: "u-1" } });

    await service.write(event);

    expect(create).toHaveBeenCalledTimes(1);
    const [{ data }] = create.mock.calls[0] as [
      { data: Record<string, unknown> },
    ];
    expect(data).toMatchObject({
      eventType: event.eventType,
      actorId: event.actorId,
      organizationId: event.organizationId,
      correlationId: event.correlationId,
      decision: event.decision,
      payload: { userId: "u-1" },
    });
    expect(typeof data.id).toBe("string");
    expect(data.createdAt).toBeInstanceOf(Date);
  });

  it("T02: write() with payload.passwordHash strips the field, still creates the row, and warns", async () => {
    const { client, create } = makePrisma();
    const service = new AuditWriterService(client);
    const warnSpy = jest.spyOn(
      Reflect.get(service, "logger") as { warn: (msg: string) => void },
      "warn",
    );

    await service.write(
      makeEvent({ payload: { passwordHash: "h", userId: "u-1" } }),
    );

    expect(create).toHaveBeenCalledTimes(1);
    const [{ data }] = create.mock.calls[0] as [
      { data: Record<string, unknown> },
    ];
    expect(data.payload).toEqual({ userId: "u-1" });
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("passwordHash"),
    );
  });

  it("T03: write() with payload.sessionToken strips the field and still creates the row", async () => {
    const { client, create } = makePrisma();
    const service = new AuditWriterService(client);

    await service.write(
      makeEvent({ payload: { sessionToken: "t", userId: "u-1" } }),
    );

    const [{ data }] = create.mock.calls[0] as [
      { data: Record<string, unknown> },
    ];
    expect(data.payload).toEqual({ userId: "u-1" });
  });

  it("T04: write() does not throw when the DB write fails, and logs the error", async () => {
    const { client, create } = makePrisma({
      create: jest
        .fn<CreateFn>()
        .mockRejectedValue(new Error("db unavailable")),
    });
    const service = new AuditWriterService(client);
    const errorSpy = jest.spyOn(
      Reflect.get(service, "logger") as { error: (msg: string) => void },
      "error",
    );

    await expect(service.write(makeEvent())).resolves.toBeUndefined();

    expect(create).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("db unavailable"),
    );
  });

  it("T05/T06: writeInTx() writes through the passed transaction client, not the module-level PrismaService", async () => {
    const { client, create: prismaCreate } = makePrisma();
    const { tx, create: txCreate } = makeTx();
    const service = new AuditWriterService(client);

    await service.writeInTx(makeEvent(), tx);

    expect(txCreate).toHaveBeenCalledTimes(1);
    expect(prismaCreate).not.toHaveBeenCalled();
  });

  it("T05/T06: writeInTx() never throws, even when the transaction client rejects", async () => {
    const { client } = makePrisma();
    const { tx } = makeTx({
      create: jest
        .fn<CreateFn>()
        .mockRejectedValue(new Error("tx rolled back")),
    });
    const service = new AuditWriterService(client);

    await expect(service.writeInTx(makeEvent(), tx)).resolves.toBeUndefined();
  });

  it("T07: occurredAt (createdAt) is service-generated, not derived from caller input", async () => {
    const { client, create } = makePrisma();
    const service = new AuditWriterService(client);
    const before = new Date();

    await service.write(makeEvent());

    const after = new Date();
    const [{ data }] = create.mock.calls[0] as [
      { data: Record<string, unknown> },
    ];
    const createdAt = data.createdAt as Date;
    expect(createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
  });
});
