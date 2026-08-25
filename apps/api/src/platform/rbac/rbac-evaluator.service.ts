import { Injectable, Logger } from "@nestjs/common";
import { AUTH_MEMBERSHIP_STATUSES } from "@lcsp/contracts/auth";
import {
  RBAC_DECISION,
  RBAC_REASON_CODE,
  RBAC_STATE_GATES,
} from "@lcsp/contracts/rbac";

import type {
  RbacDecisionResult,
  RbacEvaluationContext,
} from "./rbac.types.js";

/**
 * Evaluates a resolved RBAC context against policy organization, state gate, subject role, and granted actions.
 */
@Injectable()
export class RbacEvaluatorService {
  private readonly logger = new Logger(RbacEvaluatorService.name);

  /**
   * Evaluates a RBAC request and fails closed when an unexpected evaluator error occurs.
   *
   * @param ctx - Authorization context containing subject, membership, policy, organization, and requested action.
   * @returns Allow or deny decision with policy metadata and an optional denial reason.
   */
  evaluate(ctx: RbacEvaluationContext): RbacDecisionResult {
    try {
      return this.doEvaluate(ctx);
    } catch (error) {
      this.logger.error(
        `RBAC evaluation threw — defaulting to deny: ${(error as Error).message}`,
      );
      return {
        decision: RBAC_DECISION.deny,
        reasonCode: RBAC_REASON_CODE.policyNotFound,
        policyId: ctx?.policy?.id ?? null,
        policyVersion: ctx?.policy?.version ?? null,
      };
    }
  }

  /**
   * Applies deterministic RBAC policy checks in fail-fast order.
   *
   * @param ctx - Fully resolved RBAC evaluation context.
   * @returns The first applicable denial decision or a final allow decision.
   */
  private doEvaluate(ctx: RbacEvaluationContext): RbacDecisionResult {
    const { policy } = ctx;

    if (!policy) {
      return {
        decision: RBAC_DECISION.deny,
        reasonCode: RBAC_REASON_CODE.policyNotFound,
        policyId: null,
        policyVersion: null,
      };
    }

    if (ctx.organizationId !== policy.organizationId) {
      return {
        decision: RBAC_DECISION.deny,
        reasonCode: RBAC_REASON_CODE.organizationMismatch,
        policyId: policy.id,
        policyVersion: policy.version,
      };
    }

    if (
      policy.stateGate === RBAC_STATE_GATES.membershipActive &&
      ctx.membershipStatus !== AUTH_MEMBERSHIP_STATUSES.active
    ) {
      return {
        decision: RBAC_DECISION.deny,
        reasonCode: RBAC_REASON_CODE.stateGateFailed,
        policyId: policy.id,
        policyVersion: policy.version,
      };
    }

    if (ctx.subject.role !== policy.subjectRole) {
      return {
        decision: RBAC_DECISION.deny,
        reasonCode: RBAC_REASON_CODE.subjectRoleMismatch,
        policyId: policy.id,
        policyVersion: policy.version,
      };
    }

    if (!policy.actions.includes(ctx.action)) {
      return {
        decision: RBAC_DECISION.deny,
        reasonCode: RBAC_REASON_CODE.actionNotGranted,
        policyId: policy.id,
        policyVersion: policy.version,
      };
    }

    return {
      decision: RBAC_DECISION.allow,
      policyId: policy.id,
      policyVersion: policy.version,
    };
  }
}
