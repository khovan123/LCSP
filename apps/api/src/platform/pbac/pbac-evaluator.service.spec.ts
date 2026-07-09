import { PbacEvaluatorService } from "./pbac-evaluator.service.js";
import type { PbacEvaluationContext, PolicyDocument } from "./pbac.types.js";

function buildPolicy(overrides: Partial<PolicyDocument> = {}): PolicyDocument {
  return {
    id: "policy-1",
    organizationId: "org-1",
    version: "1",
    subjectRole: "Manager",
    stateGate: "membership_active",
    actions: ["assessment.create"],
    ...overrides,
  };
}

function buildContext(
  overrides: Partial<PbacEvaluationContext> = {},
): PbacEvaluationContext {
  return {
    action: "assessment.create",
    subject: { role: "Manager" },
    policy: buildPolicy(),
    membershipStatus: "active",
    ...overrides,
  };
}

describe("PbacEvaluatorService", () => {
  const service = new PbacEvaluatorService();

  it("T01: all checks pass → allow", () => {
    const result = service.evaluate(buildContext());

    expect(result).toEqual({
      decision: "allow",
      policyId: "policy-1",
      policyVersion: "1",
    });
  });

  it("T02: policy is null → deny POLICY_NOT_FOUND", () => {
    const result = service.evaluate(
      buildContext({ policy: null as unknown as PolicyDocument }),
    );

    expect(result.decision).toBe("deny");
    expect(result.reasonCode).toBe("POLICY_NOT_FOUND");
  });

  it("T03: stateGate membership_active, membership not active → deny STATE_GATE_FAILED", () => {
    const result = service.evaluate(
      buildContext({ membershipStatus: "invited" }),
    );

    expect(result.decision).toBe("deny");
    expect(result.reasonCode).toBe("STATE_GATE_FAILED");
  });

  it("T04: subject role mismatch → deny SUBJECT_ROLE_MISMATCH", () => {
    const result = service.evaluate(
      buildContext({ subject: { role: "Developer" } }),
    );

    expect(result.decision).toBe("deny");
    expect(result.reasonCode).toBe("SUBJECT_ROLE_MISMATCH");
  });

  it("T05: action not in policy.actions → deny ACTION_NOT_GRANTED", () => {
    const result = service.evaluate(
      buildContext({ action: "assessment.delete" }),
    );

    expect(result.decision).toBe("deny");
    expect(result.reasonCode).toBe("ACTION_NOT_GRANTED");
  });

  it("T06: evaluator throws internally → caught, returns deny", () => {
    const brokenPolicy = {
      ...buildPolicy(),
      get actions(): never {
        throw new Error("boom");
      },
    } as unknown as PolicyDocument;

    const result = service.evaluate(buildContext({ policy: brokenPolicy }));

    expect(result.decision).toBe("deny");
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

    expect(result.decision).toBe("allow");
  });

  it("T08: empty policy.actions array → deny ACTION_NOT_GRANTED", () => {
    const result = service.evaluate(
      buildContext({ policy: buildPolicy({ actions: [] }) }),
    );

    expect(result.decision).toBe("deny");
    expect(result.reasonCode).toBe("ACTION_NOT_GRANTED");
  });
});
