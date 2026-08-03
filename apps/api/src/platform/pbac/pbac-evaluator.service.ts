import { Injectable, Logger } from "@nestjs/common";
import { AUTH_MEMBERSHIP_STATUSES } from "@lcsp/contracts/auth";
import {
  PBAC_DECISION,
  PBAC_REASON_CODE,
  PBAC_STATE_GATES,
} from "@lcsp/contracts/pbac";

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
        policyId: ctx?.policy?.id ?? null,
        policyVersion: ctx?.policy?.version ?? null,
      };
    }
  }

  private doEvaluate(ctx: PbacEvaluationContext): PbacDecisionResult {
    const { policy } = ctx;

    if (!policy) {
      return {
        decision: PBAC_DECISION.deny,
        reasonCode: PBAC_REASON_CODE.policyNotFound,
        policyId: null,
        policyVersion: null,
      };
    }

    if (
      ctx.organizationId !== policy.organizationId
    ) {
      return {
        decision: PBAC_DECISION.deny,
        reasonCode: PBAC_REASON_CODE.organizationMismatch,
        policyId: policy.id,
        policyVersion: policy.version,
      };
    }

    if (
      policy.stateGate === PBAC_STATE_GATES.membershipActive &&
      ctx.membershipStatus !== AUTH_MEMBERSHIP_STATUSES.active
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
