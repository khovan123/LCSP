import { jest } from "@jest/globals";
import { AUTH_USER_ROLES } from "@lcsp/contracts/auth";
import {
  RBAC_ACTIONS,
  RBAC_DECISION,
  RBAC_REASON_CODE,
} from "@lcsp/contracts/rbac";

import type { AuthorizationDecisionRepository } from "../../modules/auth-workspace/application/ports/persistence/authorization-decision.repository.js";
import type { UserRepository } from "../../modules/auth-workspace/application/ports/persistence/user.repository.js";
import { User } from "../../modules/auth-workspace/domain/entities/user.entity.js";
import { RbacEvaluatorService } from "./rbac-evaluator.service.js";
import { RbacPreflightService } from "./rbac-preflight.service.js";

function makeUser(role = AUTH_USER_ROLES.customer): User {
  return User.rehydrate({
    id: "user-1",
    email: "user@example.com",
    passwordHash: "hash",
    emailVerified: true,
    failedLoginCount: 0,
    role,
  });
}

function makeService(user: User | null = makeUser()) {
  const users = {
    nextId: () => "user-1",
    save: () => Promise.resolve(),
    findById: jest.fn<UserRepository["findById"]>().mockResolvedValue(user),
    findByEmail: () => Promise.resolve(null),
    findByRecoveryEmail: () => Promise.resolve(null),
    findByPrimaryEmail: () => Promise.resolve(null),
  } as unknown as UserRepository;
  const decisions = {
    append: jest
      .fn<AuthorizationDecisionRepository["append"]>()
      .mockResolvedValue(undefined),
  } as unknown as AuthorizationDecisionRepository;

  return new RbacPreflightService(users, new RbacEvaluatorService(), decisions);
}

describe("RbacPreflightService public contract", () => {
  it("returns role-only authorization output without legacy policy metadata", async () => {
    const result = await makeService().evaluate({
      userId: "user-1",
      action: RBAC_ACTIONS.scanTrigger,
      correlationId: "correlation-1",
    });

    expect(result).toEqual({
      decision: RBAC_DECISION.allow,
      reasonCode: null,
      correlationId: "correlation-1",
    });
    expect("policyId" in result).toBe(false);
    expect("policyVersion" in result).toBe(false);
  });

  it("fails closed without policy metadata when the user cannot be loaded", async () => {
    const result = await makeService(null).evaluate({
      userId: "missing-user",
      action: RBAC_ACTIONS.scanTrigger,
      correlationId: "correlation-2",
    });

    expect(result).toEqual({
      decision: RBAC_DECISION.deny,
      reasonCode: RBAC_REASON_CODE.loadError,
      correlationId: "correlation-2",
    });
    expect("policyId" in result).toBe(false);
    expect("policyVersion" in result).toBe(false);
  });
});
