import { describe, expect, it, jest } from "@jest/globals";
import {
  ADMIN_ACCOUNT_OPERATIONS as O,
  AUTH_ACCOUNT_STATUSES,
  AUTH_USER_ROLES,
  type AdminUserDetail,
} from "@lcsp/contracts/auth";
import { SuspendUserCommand } from "./suspend-user/suspend-user.command.js";
import { SuspendUserHandler } from "./suspend-user/suspend-user.handler.js";
import { RestoreUserCommand } from "./restore-user/restore-user.command.js";
import { RestoreUserHandler } from "./restore-user/restore-user.handler.js";
import type { AdminAccountCommandService } from "../services/admin-account-command.service.js";
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

  const dummyResult: AdminUserDetail = {
    id: "user-1",
    email: "user@example.com",
    fullName: "Test User",
    role: AUTH_USER_ROLES.customer,
    status: AUTH_ACCOUNT_STATUSES.suspended,
    version: 2,
    createdAt: new Date().toISOString(),
    lastActiveAt: null,
    usageSummary: {
      assessments30d: 0,
      lastAssessmentAt: null,
      creditSpend30d: 0,
      openFindingsCount: 0,
    },
  };

  it("SuspendUserHandler dispatches mutate with O.suspend", async () => {
    const mutateMock = jest.fn<AdminAccountCommandService["mutate"]>();
    mutateMock.mockResolvedValue(dummyResult);
    const commandService = {
      mutate: mutateMock,
    } as unknown as AdminAccountCommandService;

    const handler = new SuspendUserHandler(commandService);
    const command = new SuspendUserCommand(
      "user-1",
      { expectedVersion: 1 },
      mockActor,
    );
    const result = await handler.execute(command);

    expect(result).toEqual(dummyResult);
    expect(mutateMock).toHaveBeenCalledWith(
      "user-1",
      O.suspend,
      { expectedVersion: 1 },
      mockActor,
    );
  });

  it("RestoreUserHandler dispatches mutate with O.restore", async () => {
    const mutateMock = jest.fn<AdminAccountCommandService["mutate"]>();
    mutateMock.mockResolvedValue({
      ...dummyResult,
      status: AUTH_ACCOUNT_STATUSES.active,
    });
    const commandService = {
      mutate: mutateMock,
    } as unknown as AdminAccountCommandService;

    const handler = new RestoreUserHandler(commandService);
    const command = new RestoreUserCommand(
      "user-1",
      { expectedVersion: 2 },
      mockActor,
    );
    const result = await handler.execute(command);

    expect(result.status).toBe(AUTH_ACCOUNT_STATUSES.active);
    expect(mutateMock).toHaveBeenCalledWith(
      "user-1",
      O.restore,
      { expectedVersion: 2 },
      mockActor,
    );
  });
});
