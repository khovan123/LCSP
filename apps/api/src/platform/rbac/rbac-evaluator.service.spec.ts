import { AUTH_USER_ROLES } from "@lcsp/contracts/auth";
import {
  actionsForRole,
  RBAC_ACTIONS,
  RBAC_DECISION,
  RBAC_REASON_CODE,
} from "@lcsp/contracts/rbac";

import { RbacEvaluatorService } from "./rbac-evaluator.service.js";
import type { RbacEvaluationContext } from "./rbac.types.js";

function buildContext(
  overrides: Partial<RbacEvaluationContext> = {},
): RbacEvaluationContext {
  return {
    action: RBAC_ACTIONS.scanTrigger,
    subject: { role: AUTH_USER_ROLES.customer },
    grantedActions: actionsForRole(AUTH_USER_ROLES.customer),
    ...overrides,
  };
}

describe("RbacEvaluatorService", () => {
  const service = new RbacEvaluatorService();

  it("allows when the user's role grants the requested action", () => {
    expect(service.evaluate(buildContext())).toEqual({
      decision: RBAC_DECISION.allow,
    });
  });

  it("denies when the action is not granted to the role", () => {
    const result = service.evaluate(
      buildContext({ action: RBAC_ACTIONS.outboxReplay }),
    );

    expect(result).toEqual({
      decision: RBAC_DECISION.deny,
      reasonCode: RBAC_REASON_CODE.actionNotGranted,
    });
  });

  it("denies when no actions are granted", () => {
    const result = service.evaluate(buildContext({ grantedActions: [] }));

    expect(result).toEqual({
      decision: RBAC_DECISION.deny,
      reasonCode: RBAC_REASON_CODE.actionNotGranted,
    });
  });

  it("fails closed when role action evaluation throws", () => {
    const result = service.evaluate(
      buildContext({
        grantedActions: {
          includes(): never {
            throw new Error("boom");
          },
        } as unknown as readonly string[],
      }),
    );

    expect(result).toEqual({
      decision: RBAC_DECISION.deny,
      reasonCode: RBAC_REASON_CODE.evaluatorError,
    });
  });
});
