import { REQUIRED_ACTIONS, type RequiredAction } from "./actions.ts";
import { AUTH_ERROR_CODES, type AuthErrorCode } from "./codes.ts";
import type { AppProblem, ProblemKey, ProblemMeta, ProblemResult } from "./problems.ts";

export const PROBLEM_REQUIRED_ACTIONS: Record<AuthErrorCode, RequiredAction> = {
  [AUTH_ERROR_CODES.authRequired]: REQUIRED_ACTIONS.signIn,
  [AUTH_ERROR_CODES.invalidCredentials]: REQUIRED_ACTIONS.signIn,
  [AUTH_ERROR_CODES.invalidInviteState]: REQUIRED_ACTIONS.acceptInvite,
  [AUTH_ERROR_CODES.membershipMissing]: REQUIRED_ACTIONS.contactOwner,
  [AUTH_ERROR_CODES.emailVerificationRequired]: REQUIRED_ACTIONS.verifyEmail,
  [AUTH_ERROR_CODES.sessionInvalid]: REQUIRED_ACTIONS.signIn,
  [AUTH_ERROR_CODES.temporaryLock]: REQUIRED_ACTIONS.waitAndRetry,
  [AUTH_ERROR_CODES.authzPolicyUnavailable]: REQUIRED_ACTIONS.contactOwner,
  [AUTH_ERROR_CODES.authzSubjectIncomplete]: REQUIRED_ACTIONS.contactOwner,
  [AUTH_ERROR_CODES.authzTenantScopeMismatch]: REQUIRED_ACTIONS.contactOwner,
  [AUTH_ERROR_CODES.authzStateGateBlocked]: REQUIRED_ACTIONS.contactOwner,
  [AUTH_ERROR_CODES.authzEvaluatorFailure]: REQUIRED_ACTIONS.contactOwner,
  [AUTH_ERROR_CODES.validationFailed]: REQUIRED_ACTIONS.signIn,
  [AUTH_ERROR_CODES.mfaRequired]: REQUIRED_ACTIONS.verifyMfa,
  [AUTH_ERROR_CODES.mfaInvalid]: REQUIRED_ACTIONS.verifyMfa,
  [AUTH_ERROR_CODES.mfaRateLimited]: REQUIRED_ACTIONS.waitAndRetry,
  [AUTH_ERROR_CODES.recoveryInvalid]: REQUIRED_ACTIONS.retryRecovery
};

type ProblemDefaults = {
  type: string;
  status: number;
  titleKey: ProblemKey;
  detailKey: ProblemKey;
};

export const PROBLEM_DEFAULTS: Record<AuthErrorCode, ProblemDefaults> = {
  [AUTH_ERROR_CODES.authRequired]: {
    type: "auth/auth-required",
    status: 401,
    titleKey: "auth.errors.authRequired.title",
    detailKey: "auth.errors.authRequired.detail"
  },
  [AUTH_ERROR_CODES.invalidCredentials]: {
    type: "auth/invalid-credentials",
    status: 401,
    titleKey: "auth.errors.invalidCredentials.title",
    detailKey: "auth.errors.invalidCredentials.detail"
  },
  [AUTH_ERROR_CODES.invalidInviteState]: {
    type: "auth/invalid-invite-state",
    status: 403,
    titleKey: "auth.errors.invalidInviteState.title",
    detailKey: "auth.errors.invalidInviteState.detail"
  },
  [AUTH_ERROR_CODES.membershipMissing]: {
    type: "auth/membership-missing",
    status: 403,
    titleKey: "auth.errors.membershipMissing.title",
    detailKey: "auth.errors.membershipMissing.detail"
  },
  [AUTH_ERROR_CODES.emailVerificationRequired]: {
    type: "auth/email-verification-required",
    status: 403,
    titleKey: "auth.errors.emailVerificationRequired.title",
    detailKey: "auth.errors.emailVerificationRequired.detail"
  },
  [AUTH_ERROR_CODES.sessionInvalid]: {
    type: "auth/session-invalid",
    status: 401,
    titleKey: "auth.errors.sessionInvalid.title",
    detailKey: "auth.errors.sessionInvalid.detail"
  },
  [AUTH_ERROR_CODES.temporaryLock]: {
    type: "auth/temporary-lock",
    status: 429,
    titleKey: "auth.errors.temporaryLock.title",
    detailKey: "auth.errors.temporaryLock.detail"
  },
  [AUTH_ERROR_CODES.authzPolicyUnavailable]: {
    type: "authz/policy-unavailable",
    status: 503,
    titleKey: "auth.errors.authzPolicyUnavailable.title",
    detailKey: "auth.errors.authzPolicyUnavailable.detail"
  },
  [AUTH_ERROR_CODES.authzSubjectIncomplete]: {
    type: "authz/subject-incomplete",
    status: 403,
    titleKey: "auth.errors.authzSubjectIncomplete.title",
    detailKey: "auth.errors.authzSubjectIncomplete.detail"
  },
  [AUTH_ERROR_CODES.authzTenantScopeMismatch]: {
    type: "authz/tenant-scope-mismatch",
    status: 403,
    titleKey: "auth.errors.authzTenantScopeMismatch.title",
    detailKey: "auth.errors.authzTenantScopeMismatch.detail"
  },
  [AUTH_ERROR_CODES.authzStateGateBlocked]: {
    type: "authz/state-gate-blocked",
    status: 403,
    titleKey: "auth.errors.authzStateGateBlocked.title",
    detailKey: "auth.errors.authzStateGateBlocked.detail"
  },
  [AUTH_ERROR_CODES.authzEvaluatorFailure]: {
    type: "authz/evaluator-failure",
    status: 403,
    titleKey: "auth.errors.authzEvaluatorFailure.title",
    detailKey: "auth.errors.authzEvaluatorFailure.detail"
  },
  [AUTH_ERROR_CODES.validationFailed]: {
    type: "request/validation-failed",
    status: 400,
    titleKey: "auth.errors.validationFailed.title",
    detailKey: "auth.errors.validationFailed.detail"
  },
  [AUTH_ERROR_CODES.mfaRequired]: {
    type: "auth/mfa-required",
    status: 403,
    titleKey: "auth.errors.mfaRequired.title",
    detailKey: "auth.errors.mfaRequired.detail"
  },
  [AUTH_ERROR_CODES.mfaInvalid]: {
    type: "auth/mfa-invalid",
    status: 403,
    titleKey: "auth.errors.mfaInvalid.title",
    detailKey: "auth.errors.mfaInvalid.detail"
  },
  [AUTH_ERROR_CODES.mfaRateLimited]: {
    type: "auth/mfa-rate-limited",
    status: 429,
    titleKey: "auth.errors.mfaRateLimited.title",
    detailKey: "auth.errors.mfaRateLimited.detail"
  },
  [AUTH_ERROR_CODES.recoveryInvalid]: {
    type: "auth/recovery-invalid",
    status: 400,
    titleKey: "auth.errors.recoveryInvalid.title",
    detailKey: "auth.errors.recoveryInvalid.detail"
  }
};

export type CreateProblemOverrides = {
  requiredAction?: RequiredAction;
  meta?: ProblemMeta;
  status?: number;
  type?: string;
  titleKey?: ProblemKey;
  detailKey?: ProblemKey;
};

export function createProblem(
  errorCode: AuthErrorCode,
  correlationId: string,
  overrides: CreateProblemOverrides = {}
): AppProblem<AuthErrorCode> {
  const defaults = PROBLEM_DEFAULTS[errorCode];
  return {
    type: overrides.type ?? defaults.type,
    status: overrides.status ?? defaults.status,
    code: errorCode,
    titleKey: overrides.titleKey ?? defaults.titleKey,
    detailKey: overrides.detailKey ?? defaults.detailKey,
    requiredAction: overrides.requiredAction ?? PROBLEM_REQUIRED_ACTIONS[errorCode] ?? REQUIRED_ACTIONS.none,
    correlationId,
    meta: overrides.meta
  };
}

export function createProblemResult(
  errorCode: AuthErrorCode,
  correlationId: string,
  overrides: CreateProblemOverrides = {}
): ProblemResult<AuthErrorCode> {
  return {
    ok: false,
    problem: createProblem(errorCode, correlationId, overrides)
  };
}
