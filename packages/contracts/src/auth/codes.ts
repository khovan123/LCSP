export const AUTH_ERROR_CODES = {
  authRequired: "AUTH_REQUIRED",
  invalidCredentials: "INVALID_CREDENTIALS",
  invalidInviteState: "INVALID_INVITE_STATE",
  membershipMissing: "MEMBERSHIP_MISSING",
  emailVerificationRequired: "EMAIL_VERIFICATION_REQUIRED",
  sessionInvalid: "SESSION_INVALID",
  temporaryLock: "TEMPORARY_LOCKED",
  authzPolicyUnavailable: "AUTHZ_POLICY_UNAVAILABLE",
  authzSubjectIncomplete: "AUTHZ_SUBJECT_INCOMPLETE",
  authzTenantScopeMismatch: "AUTHZ_TENANT_SCOPE_MISMATCH",
  authzStateGateBlocked: "AUTHZ_STATE_GATE_BLOCKED",
  authzEvaluatorFailure: "AUTHZ_EVALUATOR_FAILURE",
  validationFailed: "VALIDATION_FAILED",
  mfaRequired: "MFA_REQUIRED",
  mfaInvalid: "MFA_INVALID",
  mfaRateLimited: "MFA_RATE_LIMITED",
  recoveryInvalid: "RECOVERY_INVALID",
  pbacDenied: "PBAC_DENIED",
  unsupportedProvider: "UNSUPPORTED_PROVIDER",
  invalidRedirectUri: "INVALID_REDIRECT_URI",
  oauthStateInvalid: "OAUTH_STATE_INVALID",
  oauthCallbackInvalid: "OAUTH_CALLBACK_INVALID",
  accountNotFound: "ACCOUNT_NOT_FOUND"
} as const;

export type AuthErrorCode = (typeof AUTH_ERROR_CODES)[keyof typeof AUTH_ERROR_CODES];
