import { jest } from "@jest/globals";

import { Membership } from "../../modules/auth-workspace/domain/entities/membership.entity.js";
import { Policy } from "../../modules/auth-workspace/domain/entities/policy.entity.js";
import type { AuthorizationDecision } from "../../modules/auth-workspace/domain/models/auth-workspace.models.js";
import type { AuthorizationDecisionRepository } from "../../modules/auth-workspace/application/ports/persistence/authorization-decision.repository.js";
import type { MembershipRepository } from "../../modules/auth-workspace/application/ports/persistence/membership.repository.js";
import type { PolicyRepository } from "../../modules/auth-workspace/application/ports/persistence/policy.repository.js";
import { PbacEvaluatorService } from "./pbac-evaluator.service.js";
import {
  PbacPreflightService,
  type PbacPreflightInput,
} from "./pbac-preflight.service.js";

function makeMembership(
  overrides: Partial<ConstructorParameters<typeof Membership>[0]> = {},
): Membership {
  return new Membership({
    id: "membership-1",
    userId: "user-1",
    organizationId: "org-1",
    status: "active",
    subjectAttributes: { role: "Manager" },
    policyId: "policy-1",
    policyVersion: "v1",
    ...overrides,
  });
}

function makePolicy(
  overrides: Partial<ConstructorParameters<typeof Policy>[0]> = {},
): Policy {
  return new Policy({
    id: "policy-1",
    version: "v1",
    actions: ["scan:trigger"],
    subjectRole: "Manager",
    stateGate: "membership_active",
    organizationId: "org-1",
    ...overrides,
  });
}

function makeInput(
  overrides: Partial<PbacPreflightInput> = {},
): PbacPreflightInput {
  return {
    userId: "user-1",
    organizationId: "org-1",
    action: "scan:trigger",
    correlationId: "corr-1",
    ...overrides,
  };
}

function makeService(
  overrides: {
    membership?: Membership | null;
    policy?: Policy | null;
    membershipsThrow?: Error;
    appendImpl?: (decision: AuthorizationDecision) => Promise<void>;
  } = {},
) {
  const findByUserAndOrganization = overrides.membershipsThrow
    ? jest
        .fn<MembershipRepository["findByUserAndOrganization"]>()
        .mockRejectedValue(overrides.membershipsThrow)
    : jest
        .fn<MembershipRepository["findByUserAndOrganization"]>()
        .mockResolvedValue(
          overrides.membership === undefined
            ? makeMembership()
            : overrides.membership,
        );
  const memberships = {
    findByUserAndOrganization,
  } as unknown as MembershipRepository;

  const findByIdAndVersion = jest
    .fn<PolicyRepository["findByIdAndVersion"]>()
    .mockResolvedValue(
      overrides.policy === undefined ? makePolicy() : overrides.policy,
    );
  const policies = { findByIdAndVersion } as unknown as PolicyRepository;

  const evaluator = new PbacEvaluatorService();

  const append = jest
    .fn<AuthorizationDecisionRepository["append"]>()
    .mockImplementation(overrides.appendImpl ?? (() => Promise.resolve()));
  const decisions = { append } as unknown as AuthorizationDecisionRepository;

  const service = new PbacPreflightService(
    memberships,
    policies,
    evaluator,
    decisions,
  );

  return { service, findByUserAndOrganization, findByIdAndVersion, append };
}

describe("PbacPreflightService", () => {
  it("T01: valid membership + action granted returns allow and logs it", async () => {
    const { service, append } = makeService();

    const result = await service.evaluate(makeInput());

    expect(result).toEqual({
      decision: "allow",
      reasonCode: null,
      correlationId: "corr-1",
    });
    expect(append).toHaveBeenCalledWith(
      expect.objectContaining({
        decision: "allow",
        reason_code: "AUTHORIZED",
        action: "scan:trigger",
      }),
    );
  });

  it("T02: membership revoked since task dispatch returns deny STATE_GATE_FAILED", async () => {
    const { service, append } = makeService({
      membership: makeMembership({ status: "revoked" }),
    });

    const result = await service.evaluate(makeInput());

    expect(result).toEqual({
      decision: "deny",
      reasonCode: "STATE_GATE_FAILED",
      correlationId: "corr-1",
    });
    expect(append).toHaveBeenCalledWith(
      expect.objectContaining({
        decision: "deny",
        reason_code: "STATE_GATE_FAILED",
      }),
    );
  });

  it("T03: action not in policy returns deny ACTION_NOT_GRANTED", async () => {
    const { service } = makeService({
      policy: makePolicy({ actions: ["other:action"] }),
    });

    const result = await service.evaluate(makeInput());

    expect(result).toEqual({
      decision: "deny",
      reasonCode: "ACTION_NOT_GRANTED",
      correlationId: "corr-1",
    });
  });

  it("denies with MEMBERSHIP_MISSING when no membership exists", async () => {
    const { service, findByIdAndVersion } = makeService({ membership: null });

    const result = await service.evaluate(makeInput());

    expect(result).toEqual({
      decision: "deny",
      reasonCode: "MEMBERSHIP_MISSING",
      correlationId: "corr-1",
    });
    expect(findByIdAndVersion).not.toHaveBeenCalled();
  });

  it("denies with POLICY_NOT_FOUND when the membership's policy cannot be loaded", async () => {
    const { service } = makeService({ policy: null });

    const result = await service.evaluate(makeInput());

    expect(result).toEqual({
      decision: "deny",
      reasonCode: "POLICY_NOT_FOUND",
      correlationId: "corr-1",
    });
  });

  it("T07: AuthDecisionLog is written for an allow decision", async () => {
    const { service, append } = makeService();

    await service.evaluate(makeInput());

    expect(append).toHaveBeenCalledTimes(1);
    expect(append.mock.calls[0][0]).toMatchObject({ decision: "allow" });
  });

  it("T08: AuthDecisionLog is written for a deny decision", async () => {
    const { service, append } = makeService({
      policy: makePolicy({ actions: [] }),
    });

    await service.evaluate(makeInput());

    expect(append).toHaveBeenCalledTimes(1);
    expect(append.mock.calls[0][0]).toMatchObject({ decision: "deny" });
  });

  it("denies with LOAD_ERROR (never throws) when a repository throws", async () => {
    const { service } = makeService({
      membershipsThrow: new Error("db unavailable"),
    });

    const result = await service.evaluate(makeInput());

    expect(result).toEqual({
      decision: "deny",
      reasonCode: "LOAD_ERROR",
      correlationId: "corr-1",
    });
  });

  it("does not throw when the decision-log write itself fails", async () => {
    const { service } = makeService({
      appendImpl: () => Promise.reject(new Error("db down")),
    });

    await expect(service.evaluate(makeInput())).resolves.toEqual({
      decision: "allow",
      reasonCode: null,
      correlationId: "corr-1",
    });
  });
});
