import { AUTH_ERROR_CODES, type AuthErrorCode } from "@lcsp/contracts/auth";
import { PBAC_ACTIONS, PBAC_STATE_GATES } from "@lcsp/contracts/pbac";

import { Membership } from "../entities/membership.entity.ts";
import { Policy } from "../entities/policy.entity.ts";

export class WorkspaceAuthorizationDomainService {
  authorize(
    membership: Membership | undefined,
    policy: Policy | undefined,
    organizationId: string,
  ): { allowed: true } | { allowed: false; code: AuthErrorCode } {
    if (!membership) {
      return { allowed: false, code: AUTH_ERROR_CODES.membershipMissing };
    }

    if (!membership.isActive()) {
      return { allowed: false, code: AUTH_ERROR_CODES.authzStateGateBlocked };
    }

    if (!membership.hasRole()) {
      return { allowed: false, code: AUTH_ERROR_CODES.authzSubjectIncomplete };
    }

    if (!policy) {
      return { allowed: false, code: AUTH_ERROR_CODES.authzPolicyUnavailable };
    }

    if (
      !membership.belongsToOrganization(organizationId) ||
      policy.organizationId !== organizationId
    ) {
      return {
        allowed: false,
        code: AUTH_ERROR_CODES.authzTenantScopeMismatch,
      };
    }

    if (
      policy.stateGate === PBAC_STATE_GATES.membershipActive &&
      !membership.isActive()
    ) {
      return { allowed: false, code: AUTH_ERROR_CODES.authzStateGateBlocked };
    }

    if (
      policy.subjectRole !== membership.role() ||
      !policy.allows(PBAC_ACTIONS.workspaceRead)
    ) {
      return { allowed: false, code: AUTH_ERROR_CODES.authzEvaluatorFailure };
    }

    return { allowed: true };
  }
}
