import { describe, expect, it, jest } from "@jest/globals";
import {
  ADMIN_ACCOUNT_OPERATIONS as O,
  AUTH_ACCOUNT_STATUSES,
  AUTH_USER_ROLES,
} from "@lcsp/contracts/auth";
import type { PrismaService } from "../../../../infrastructure/prisma/prisma.service.js";
import type { AuthAuditService } from "../../../auth/application/services/auth/auth-audit.service.js";
import { SuspendUserCommand } from "./suspend-user/suspend-user.command.js";
import { SuspendUserHandler } from "./suspend-user/suspend-user.handler.js";
import { RestoreUserCommand } from "./restore-user/restore-user.command.js";
import { RestoreUserHandler } from "./restore-user/restore-user.handler.js";
import type { AdminActor } from "../services/admin-account.transaction.js";

describe("Admin CQRS Commands", () => {
  const mockActor: AdminActor = {
    userId: "admin-1",
    sessionId: "sess-1",
    role: AUTH_USER_ROLES.admin,
    scope: "ALL",
    correlationId: "corr-1",
    idempotencyKey: "idem-1",
  };

  const createMockPrisma = (initialStatus = "ACTIVE") => {
    const txMock = {
      user: {
        findUnique: jest
          .fn<() => Promise<unknown>>()
          .mockResolvedValueOnce({
            id: "admin-1",
            role: AUTH_USER_ROLES.admin,
            accessStatus: "ACTIVE",
            emailVerified: true,
            accessVersion: 0,
          })
          .mockResolvedValueOnce({
            id: "user-1",
            role: AUTH_USER_ROLES.customer,
            accessStatus: initialStatus,
            accessVersion: 1,
            email: "user@example.com",
            displayName: "Test User",
            createdAt: new Date(),
          })
          .mockResolvedValueOnce({
            id: "user-1",
            role: AUTH_USER_ROLES.customer,
            accessStatus: initialStatus === "ACTIVE" ? "SUSPENDED" : "ACTIVE",
            accessVersion: 2,
            email: "user@example.com",
            displayName: "Test User",
            createdAt: new Date(),
          }),
        count: jest.fn<() => Promise<number>>().mockResolvedValue(1),
        updateMany: jest
          .fn<() => Promise<{ count: number }>>()
          .mockResolvedValue({ count: 1 }),
      },
      authRecord: {
        findFirst: jest.fn<() => Promise<unknown>>().mockResolvedValueOnce({
          id: "sess-1",
          userId: "admin-1",
          type: "SESSION",
          revokedAt: null,
          expiresAt: new Date(Date.now() + 10000),
        }),
        updateMany: jest
          .fn<() => Promise<{ count: number }>>()
          .mockResolvedValue({ count: 1 }),
        aggregate: jest
          .fn<() => Promise<{ _max: { createdAt: Date | null } }>>()
          .mockResolvedValue({
            _max: { createdAt: null },
          }),
      },
      adminAccountCommandReceipt: {
        findUnique: jest.fn<() => Promise<unknown>>().mockResolvedValue(null),
        create: jest
          .fn<() => Promise<unknown>>()
          .mockResolvedValue({ id: "rec-1" }),
      },
      assessment: {
        count: jest.fn<() => Promise<number>>().mockResolvedValue(0),
        aggregate: jest
          .fn<() => Promise<{ _max: { createdAt: Date | null } }>>()
          .mockResolvedValue({
            _max: { createdAt: null },
          }),
      },
      $queryRaw: jest.fn<() => Promise<unknown>>().mockResolvedValue([]),
      $executeRaw: jest.fn<() => Promise<unknown>>().mockResolvedValue(1),
    };

    return {
      $transaction: jest.fn().mockImplementation(async (callback) => {
        return (callback as (tx: unknown) => Promise<unknown>)(txMock);
      }),
    } as unknown as PrismaService;
  };

  const audit = {
    writeInTx: jest.fn<() => Promise<unknown>>().mockResolvedValue(undefined),
  } as unknown as AuthAuditService;

  it("SuspendUserHandler executes suspend mutation", async () => {
    const prisma = createMockPrisma("ACTIVE");
    const handler = new SuspendUserHandler(prisma, audit);
    const command = new SuspendUserCommand(
      "user-1",
      { expectedVersion: 1 },
      mockActor,
    );
    const result = await handler.execute(command);

    expect(result.id).toBe("user-1");
    expect(result.status).toBe(AUTH_ACCOUNT_STATUSES.suspended);
  });

  it("RestoreUserHandler executes restore mutation", async () => {
    const prisma = createMockPrisma("SUSPENDED");
    const handler = new RestoreUserHandler(prisma, audit);
    const command = new RestoreUserCommand(
      "user-1",
      { expectedVersion: 1 },
      mockActor,
    );
    const result = await handler.execute(command);

    expect(result.id).toBe("user-1");
    expect(result.status).toBe(AUTH_ACCOUNT_STATUSES.active);
  });
});
