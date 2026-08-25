import { Injectable, Logger } from "@nestjs/common";
import { RBAC_DECISION, RBAC_REASON_CODE } from "@lcsp/contracts/rbac";

import type {
  RbacDecisionResult,
  RbacEvaluationContext,
} from "./rbac.types.js";

/**
 * Evaluates a resolved RBAC context against the action set assigned to the user's role.
 */
@Injectable()
export class RbacEvaluatorService {
  private readonly logger = new Logger(RbacEvaluatorService.name);

  evaluate(ctx: RbacEvaluationContext): RbacDecisionResult {
    try {
      return this.doEvaluate(ctx);
    } catch (error) {
      this.logger.error(
        `RBAC evaluation threw — defaulting to deny: ${(error as Error).message}`,
      );
      return {
        decision: RBAC_DECISION.deny,
        reasonCode: RBAC_REASON_CODE.evaluatorError,
      };
    }
  }

  private doEvaluate(ctx: RbacEvaluationContext): RbacDecisionResult {
    if (!ctx.grantedActions.includes(ctx.action)) {
      return {
        decision: RBAC_DECISION.deny,
        reasonCode: RBAC_REASON_CODE.actionNotGranted,
      };
    }

    return { decision: RBAC_DECISION.allow };
  }
}
