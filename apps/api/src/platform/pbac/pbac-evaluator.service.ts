import { Injectable, Logger } from "@nestjs/common";
import { PBAC_DECISION, PBAC_REASON_CODE } from "@lcsp/contracts/pbac";

import type {
  PbacDecisionResult,
  PbacEvaluationContext,
} from "./pbac.types.js";

@Injectable()
export class PbacEvaluatorService {
  private readonly logger = new Logger(PbacEvaluatorService.name);

  evaluate(ctx: PbacEvaluationContext): PbacDecisionResult {
    try {
      return this.doEvaluate(ctx);
    } catch (error) {
      this.logger.error(
        `PBAC evaluation threw — defaulting to deny: ${(error as Error).message}`,
      );
      return {
        decision: PBAC_DECISION.deny,
        reasonCode: PBAC_REASON_CODE.policyNotFound,
        policyId: ctx?.policy?.id ?? "",
        policyVersion: ctx?.policy?.version ?? "",
      };
    }
  }

  private doEvaluate(ctx: PbacEvaluationContext): PbacDecisionResult {
    const { policy } = ctx;

    if (!policy) {
      return {
        decision: PBAC_DECISION.deny,
        reasonCode: PBAC_REASON_CODE.policyNotFound,
        policyId: "",
        policyVersion: "",
      };
    }

    if (
      policy.stateGate === "membership_active" &&
      ctx.membershipStatus !== "active"
    ) {
      return {
        decision: PBAC_DECISION.deny,
        reasonCode: PBAC_REASON_CODE.stateGateFailed,
        policyId: policy.id,
        policyVersion: policy.version,
      };
    }

    if (ctx.subject.role !== policy.subjectRole) {
      return {
        decision: PBAC_DECISION.deny,
        reasonCode: PBAC_REASON_CODE.subjectRoleMismatch,
        policyId: policy.id,
        policyVersion: policy.version,
      };
    }

    if (!policy.actions.includes(ctx.action)) {
      return {
        decision: PBAC_DECISION.deny,
        reasonCode: PBAC_REASON_CODE.actionNotGranted,
        policyId: policy.id,
        policyVersion: policy.version,
      };
    }

    return {
      decision: PBAC_DECISION.allow,
      policyId: policy.id,
      policyVersion: policy.version,
    };
  }
}
