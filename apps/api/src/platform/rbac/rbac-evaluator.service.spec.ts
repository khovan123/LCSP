import {
  RBAC_DECISION,
  RBAC_REASON_CODE,
  RBAC_STATE_GATES,
  SUBJECT_ROLES,
} from "@lcsp/contracts/rbac";
import { AUTH_MEMBERSHIP_STATUSES } from "@lcsp/contracts/auth";
import { RbacEvaluatorService } from "./rbac-evaluator.service.js";
import type { RbacEvaluationContext, PolicyDocument } from "./rbac.types.js";

function buildPolicy(overrides: Partial<PolicyDocument> = {}): PolicyDocument {
  return {
    id: "policy-1",
    organizationId: "org-1",
    version: "1",
    subjectRole: SUBJECT_ROLES.manager,
    stateGate: RBAC_STATE_GATES.membershipActive,
    actions: ["assessment.create"],
    ...overrides,
  };
}

function buildContext(
  overrides: Partial<RbacEvaluationContext> = {},
): RbacEvaluationContext {
  return {
    organizationId: "org-1",
    action: "assessment.create",
    subject: { role: SUBJECT_ROLES.manager },
    policy: buildPolicy(),
    membershipStatus: AUTH_MEMBERSHIP_STATUSES.active,
    ...overrides,
  };
}

describe("RbacEvaluatorService", () => {
  const service = new RbacEvaluatorService();

  it("T01: all checks pass → allow", () => {
    const result = service.evaluate(buildContext());

    expect(result).toEqual({
      decision: RBAC_DECISION.allow,
      policyId: "policy-1",
      policyVersion: "1",
    });
  });

  it("T02: policy is null → deny POLICY_NOT_FOUND", () => {
    const result = service.evaluate(
      buildContext({ policy: null as unknown as PolicyDocument }),
    );

    expect(result.decision).toBe(RBAC_DECISION.deny);
    expect(result.reasonCode).toBe(RBAC_REASON_CODE.policyNotFound);
  });

  it("T03: stateGate membership_active, membership not active → deny STATE_GATE_FAILED", () => {
    const result = service.evaluate(
      buildContext({ membershipStatus: AUTH_MEMBERSHIP_STATUSES.invited }),
    );

    expect(result.decision).toBe(RBAC_DECISION.deny);
    expect(result.reasonCode).toBe(RBAC_REASON_CODE.stateGateFailed);
  });

  it("T04: subject role mismatch → deny SUBJECT_ROLE_MISMATCH", () => {
    const result = service.evaluate(
      buildContext({ subject: { role: SUBJECT_ROLES.systemAdmin } }),
    );

    expect(result.decision).toBe(RBAC_DECISION.deny);
    expect(result.reasonCode).toBe(RBAC_REASON_CODE.subjectRoleMismatch);
  });

  it("T05: action not in policy.actions → deny ACTION_NOT_GRANTED", () => {
    const result = service.evaluate(
      buildContext({ action: "assessment.delete" }),
    );

    expect(result.decision).toBe(RBAC_DECISION.deny);
    expect(result.reasonCode).toBe(RBAC_REASON_CODE.actionNotGranted);
  });

  it("T06: evaluator throws internally → caught, returns deny", () => {
    const brokenPolicy = {
      ...buildPolicy(),
      get actions(): never {
        throw new Error("boom");
      },
    } as unknown as PolicyDocument;

    const result = service.evaluate(buildContext({ policy: brokenPolicy }));

    expect(result.decision).toBe(RBAC_DECISION.deny);
  });

  it("T07: multiple actions in policy, one matches → allow", () => {
    const result = service.evaluate(
      buildContext({
        action: "assessment.read",
        policy: buildPolicy({
          actions: ["assessment.create", "assessment.read"],
        }),
      }),
    );

    expect(result.decision).toBe(RBAC_DECISION.allow);
  });

  it("T08: empty policy.actions array → deny ACTION_NOT_GRANTED", () => {
    const result = service.evaluate(
      buildContext({ policy: buildPolicy({ actions: [] }) }),
    );

    expect(result.decision).toBe(RBAC_DECISION.deny);
    expect(result.reasonCode).toBe(RBAC_REASON_CODE.actionNotGranted);
  });

  it("denies when the policy belongs to a different organization", () => {
    const result = service.evaluate(
      buildContext({
        organizationId: "org-2",
        policy: buildPolicy({ organizationId: "org-1" }),
      }),
    );

    expect(result.decision).toBe(RBAC_DECISION.deny);
    expect(result.reasonCode).toBe(RBAC_REASON_CODE.organizationMismatch);
    expect(result.policyId).toBe("policy-1");
    expect(result.policyVersion).toBe("1");
  });
});
