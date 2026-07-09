import { Injectable, Logger } from "@nestjs/common";

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
        decision: "deny",
        reasonCode: "POLICY_NOT_FOUND",
        policyId: ctx?.policy?.id ?? "",
        policyVersion: ctx?.policy?.version ?? "",
      };
    }
  }

  private doEvaluate(ctx: PbacEvaluationContext): PbacDecisionResult {
    const { policy } = ctx;

    if (!policy) {
      return {
        decision: "deny",
        reasonCode: "POLICY_NOT_FOUND",
        policyId: "",
        policyVersion: "",
      };
    }

    if (
      policy.stateGate === "membership_active" &&
      ctx.membershipStatus !== "active"
    ) {
      return {
        decision: "deny",
        reasonCode: "STATE_GATE_FAILED",
        policyId: policy.id,
        policyVersion: policy.version,
      };
    }

    if (ctx.subject.role !== policy.subjectRole) {
      return {
        decision: "deny",
        reasonCode: "SUBJECT_ROLE_MISMATCH",
        policyId: policy.id,
        policyVersion: policy.version,
      };
    }

    if (!policy.actions.includes(ctx.action)) {
      return {
        decision: "deny",
        reasonCode: "ACTION_NOT_GRANTED",
        policyId: policy.id,
        policyVersion: policy.version,
      };
    }

    return {
      decision: "allow",
      policyId: policy.id,
      policyVersion: policy.version,
    };
  }
}
