import type { AuthErrorCode, RequiredAction } from "./types.ts";

export type ProblemMetaValue = string | number | boolean | null;
export type ProblemMeta = Record<string, ProblemMetaValue>;

export const PROBLEM_KEYS = {
  authRequiredTitle: "auth.errors.authRequired.title",
  authRequiredDetail: "auth.errors.authRequired.detail",
  invalidCredentialsTitle: "auth.errors.invalidCredentials.title",
  invalidCredentialsDetail: "auth.errors.invalidCredentials.detail",
  invalidInviteStateTitle: "auth.errors.invalidInviteState.title",
  invalidInviteStateDetail: "auth.errors.invalidInviteState.detail",
  membershipMissingTitle: "auth.errors.membershipMissing.title",
  membershipMissingDetail: "auth.errors.membershipMissing.detail",
  emailVerificationRequiredTitle: "auth.errors.emailVerificationRequired.title",
  emailVerificationRequiredDetail:
    "auth.errors.emailVerificationRequired.detail",
  sessionInvalidTitle: "auth.errors.sessionInvalid.title",
  sessionInvalidDetail: "auth.errors.sessionInvalid.detail",
  temporaryLockTitle: "auth.errors.temporaryLock.title",
  temporaryLockDetail: "auth.errors.temporaryLock.detail",
  authzPolicyUnavailableTitle: "auth.errors.authzPolicyUnavailable.title",
  authzPolicyUnavailableDetail: "auth.errors.authzPolicyUnavailable.detail",
  authzSubjectIncompleteTitle: "auth.errors.authzSubjectIncomplete.title",
  authzSubjectIncompleteDetail: "auth.errors.authzSubjectIncomplete.detail",
  authzTenantScopeMismatchTitle: "auth.errors.authzTenantScopeMismatch.title",
  authzTenantScopeMismatchDetail: "auth.errors.authzTenantScopeMismatch.detail",
  authzStateGateBlockedTitle: "auth.errors.authzStateGateBlocked.title",
  authzStateGateBlockedDetail: "auth.errors.authzStateGateBlocked.detail",
  authzEvaluatorFailureTitle: "auth.errors.authzEvaluatorFailure.title",
  authzEvaluatorFailureDetail: "auth.errors.authzEvaluatorFailure.detail",
  validationFailedTitle: "auth.errors.validationFailed.title",
  validationFailedDetail: "auth.errors.validationFailed.detail",
  mfaRequiredTitle: "auth.errors.mfaRequired.title",
  mfaRequiredDetail: "auth.errors.mfaRequired.detail",
  mfaInvalidTitle: "auth.errors.mfaInvalid.title",
  mfaInvalidDetail: "auth.errors.mfaInvalid.detail",
  mfaRateLimitedTitle: "auth.errors.mfaRateLimited.title",
  mfaRateLimitedDetail: "auth.errors.mfaRateLimited.detail",
  recoveryInvalidTitle: "auth.errors.recoveryInvalid.title",
  recoveryInvalidDetail: "auth.errors.recoveryInvalid.detail",
  pbacDeniedTitle: "auth.errors.pbacDenied.title",
  pbacDeniedDetail: "auth.errors.pbacDenied.detail",
  unsupportedProviderTitle: "auth.errors.unsupportedProvider.title",
  unsupportedProviderDetail: "auth.errors.unsupportedProvider.detail",
  invalidRedirectUriTitle: "auth.errors.invalidRedirectUri.title",
  invalidRedirectUriDetail: "auth.errors.invalidRedirectUri.detail",
  oauthStateInvalidTitle: "auth.errors.oauthStateInvalid.title",
  oauthStateInvalidDetail: "auth.errors.oauthStateInvalid.detail",
  oauthCallbackInvalidTitle: "auth.errors.oauthCallbackInvalid.title",
  oauthCallbackInvalidDetail: "auth.errors.oauthCallbackInvalid.detail",
  accountNotFoundTitle: "auth.errors.accountNotFound.title",
  accountNotFoundDetail: "auth.errors.accountNotFound.detail",
} as const;

export type ProblemKey = (typeof PROBLEM_KEYS)[keyof typeof PROBLEM_KEYS];

export type AppProblem<TCode extends string = AuthErrorCode> = {
  type: string;
  status: number;
  code: TCode;
  titleKey: ProblemKey;
  detailKey: ProblemKey;
  requiredAction: RequiredAction;
  correlationId: string;
  meta?: ProblemMeta;
};

export type ProblemResult<TCode extends string = AuthErrorCode> = {
  ok: false;
  problem: AppProblem<TCode>;
};

export type SuccessResult<TData = unknown> = {
  ok: true;
  data: TData;
};

export type AppResult<TData = unknown, TCode extends string = AuthErrorCode> =
  | SuccessResult<TData>
  | ProblemResult<TCode>;

/** Wire compatibility shape accepted at frontend/BFF boundaries during error migration. */
export type ProblemCodeEnvelope<TCode extends string = AuthErrorCode> =
  | ProblemResult<TCode>
  | {
      code?: TCode;
      error_code?: TCode;
      problem?: { code?: TCode; error_code?: TCode };
    };
