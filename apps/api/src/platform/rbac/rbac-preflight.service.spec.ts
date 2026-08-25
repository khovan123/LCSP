import {
  RBAC_ACTIONS,
  RBAC_DECISION,
  RBAC_REASON_CODE,
  RBAC_STATE_GATES,
  SUBJECT_ROLES,
} from "@lcsp/contracts/rbac";
import { AUTH_MEMBERSHIP_STATUSES } from "@lcsp/contracts/auth";
import { jest } from "@jest/globals";

import { Membership } from "../../modules/auth-workspace/domain/entities/membership.entity.js";
import { Policy } from "../../modules/auth-workspace/domain/entities/policy.entity.js";
import type { AuthorizationDecision } from "../../modules/auth-workspace/domain/models/auth-workspace.models.js";
import type { AuthorizationDecisionRepository } from "../../modules/auth-workspace/application/ports/persistence/authorization-decision.repository.js";
import type { MembershipRepository } from "../../modules/auth-workspace/application/ports/persistence/membership.repository.js";
import type { PolicyRepository } from "../../modules/auth-workspace/application/ports/persistence/policy.repository.js";
import { RbacEvaluatorService } from "./rbac-evaluator.service.js";
import {
  RbacPreflightService,
  type RbacPreflightInput,
} from "./rbac-preflight.service.js";

function makeMembership(
  overrides: Partial<ConstructorParameters<typeof Membership>[0]> = {},
): Membership {
  return Membership.rehydrate({
    id: "membership-1",
    userId: "user-1",
    organizationId: "org-1",
    status: AUTH_MEMBERSHIP_STATUSES.active,
    subjectAttributes: { role: SUBJECT_ROLES.manager },
    policyId: "policy-1",
    policyVersion: "v1",
    ...overrides,
  });
}

function makePolicy(
  overrides: Partial<ConstructorParameters<typeof Policy>[0]> = {},
): Policy {
  return Policy.rehydrate({
    id: "policy-1",
    version: "v1",
    actions: [RBAC_ACTIONS.scanTrigger],
    subjectRole: SUBJECT_ROLES.manager,
    stateGate: RBAC_STATE_GATES.membershipActive,
    organizationId: "org-1",
    ...overrides,
  });
}

function makeInput(
  overrides: Partial<RbacPreflightInput> = {},
): RbacPreflightInput {
  return {
    userId: "user-1",
    organizationId: "org-1",
    action: RBAC_ACTIONS.scanTrigger,
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

  const evaluator = new RbacEvaluatorService();

  const append = jest
    .fn<AuthorizationDecisionRepository["append"]>()
    .mockImplementation(overrides.appendImpl ?? (() => Promise.resolve()));
  const decisions = { append } as unknown as AuthorizationDecisionRepository;

  const service = new RbacPreflightService(
    memberships,
    policies,
    evaluator,
    decisions,
  );

  return { service, findByUserAndOrganization, findByIdAndVersion, append };
}

describe("RbacPreflightService", () => {
  it("T01: valid membership + action granted returns allow and logs it", async () => {
    const { service, append } = makeService();

    const result = await service.evaluate(makeInput());

    expect(result).toEqual({
      decision: RBAC_DECISION.allow,
      reasonCode: null,
      correlationId: "corr-1",
    });
    expect(append).toHaveBeenCalledWith(
      expect.objectContaining({
        actor_id: "user-1",
        session_id: null,
        organization_id: "org-1",
        resource_id: RBAC_ACTIONS.scanTrigger,
        decision: RBAC_DECISION.allow,
        reason_code: RBAC_REASON_CODE.authorized,
        action: RBAC_ACTIONS.scanTrigger,
      }),
    );
  });

  it("T02: membership revoked since task dispatch returns deny STATE_GATE_FAILED", async () => {
    const { service, append } = makeService({
      membership: makeMembership({ status: AUTH_MEMBERSHIP_STATUSES.revoked }),
    });

    const result = await service.evaluate(makeInput());

    expect(result).toEqual({
      decision: RBAC_DECISION.deny,
      reasonCode: RBAC_REASON_CODE.stateGateFailed,
      correlationId: "corr-1",
    });
    expect(append).toHaveBeenCalledWith(
      expect.objectContaining({
        decision: RBAC_DECISION.deny,
        reason_code: RBAC_REASON_CODE.stateGateFailed,
      }),
    );
  });

  it("T03: action not in policy returns deny ACTION_NOT_GRANTED", async () => {
    const { service } = makeService({
      policy: makePolicy({ actions: ["other:action"] }),
    });

    const result = await service.evaluate(makeInput());

    expect(result).toEqual({
      decision: RBAC_DECISION.deny,
      reasonCode: RBAC_REASON_CODE.actionNotGranted,
      correlationId: "corr-1",
    });
  });

  it("denies with MEMBERSHIP_MISSING when no membership exists", async () => {
    const { service, findByIdAndVersion } = makeService({ membership: null });

    const result = await service.evaluate(makeInput());

    expect(result).toEqual({
      decision: RBAC_DECISION.deny,
      reasonCode: RBAC_REASON_CODE.membershipMissing,
      correlationId: "corr-1",
    });
    expect(findByIdAndVersion).not.toHaveBeenCalled();
  });

  it("denies with POLICY_NOT_FOUND when the membership's policy cannot be loaded", async () => {
    const { service } = makeService({ policy: null });

    const result = await service.evaluate(makeInput());

    expect(result).toEqual({
      decision: RBAC_DECISION.deny,
      reasonCode: RBAC_REASON_CODE.policyNotFound,
      correlationId: "corr-1",
    });
  });

  it("T07: AuthDecisionLog is written for an allow decision", async () => {
    const { service, append } = makeService();

    await service.evaluate(makeInput());

    expect(append).toHaveBeenCalledTimes(1);
    expect(append.mock.calls[0][0]).toMatchObject({
      decision: RBAC_DECISION.allow,
    });
  });

  it("T08: AuthDecisionLog is written for a deny decision", async () => {
    const { service, append } = makeService({
      policy: makePolicy({ actions: [] }),
    });

    await service.evaluate(makeInput());

    expect(append).toHaveBeenCalledTimes(1);
    expect(append.mock.calls[0][0]).toMatchObject({
      decision: RBAC_DECISION.deny,
    });
  });

  it("denies with LOAD_ERROR (never throws) when a repository throws", async () => {
    const { service } = makeService({
      membershipsThrow: new Error("db unavailable"),
    });

    const result = await service.evaluate(makeInput());

    expect(result).toEqual({
      decision: RBAC_DECISION.deny,
      reasonCode: RBAC_REASON_CODE.loadError,
      correlationId: "corr-1",
    });
  });

  it("denies when the membership points at a policy from another organization", async () => {
    const { service, append } = makeService({
      policy: makePolicy({ organizationId: "org-2" }),
    });

    const result = await service.evaluate(
      makeInput({ organizationId: "org-1" }),
    );

    expect(result).toEqual({
      decision: RBAC_DECISION.deny,
      reasonCode: RBAC_REASON_CODE.organizationMismatch,
      correlationId: "corr-1",
    });
    expect(append).toHaveBeenCalledWith(
      expect.objectContaining({
        actor_id: "user-1",
        organization_id: "org-1",
        policy_id: "policy-1",
        policy_version: "v1",
      }),
    );
  });

  it("does not throw when the decision-log write itself fails", async () => {
    const { service } = makeService({
      appendImpl: () => Promise.reject(new Error("db down")),
    });

    await expect(service.evaluate(makeInput())).resolves.toEqual({
      decision: RBAC_DECISION.allow,
      reasonCode: null,
      correlationId: "corr-1",
    });
  });
});
