import type { RequiredAction } from "./actions.ts";
import type { AuthErrorCode } from "./codes.ts";

export type ProblemMetaValue = string | number | boolean | null;
export type ProblemMeta = Record<string, ProblemMetaValue>;

export type ProblemKey =
  | "auth.errors.authRequired.title"
  | "auth.errors.authRequired.detail"
  | "auth.errors.invalidCredentials.title"
  | "auth.errors.invalidCredentials.detail"
  | "auth.errors.invalidInviteState.title"
  | "auth.errors.invalidInviteState.detail"
  | "auth.errors.membershipMissing.title"
  | "auth.errors.membershipMissing.detail"
  | "auth.errors.emailVerificationRequired.title"
  | "auth.errors.emailVerificationRequired.detail"
  | "auth.errors.sessionInvalid.title"
  | "auth.errors.sessionInvalid.detail"
  | "auth.errors.temporaryLock.title"
  | "auth.errors.temporaryLock.detail"
  | "auth.errors.authzPolicyUnavailable.title"
  | "auth.errors.authzPolicyUnavailable.detail"
  | "auth.errors.authzSubjectIncomplete.title"
  | "auth.errors.authzSubjectIncomplete.detail"
  | "auth.errors.authzTenantScopeMismatch.title"
  | "auth.errors.authzTenantScopeMismatch.detail"
  | "auth.errors.authzStateGateBlocked.title"
  | "auth.errors.authzStateGateBlocked.detail"
  | "auth.errors.authzEvaluatorFailure.title"
  | "auth.errors.authzEvaluatorFailure.detail"
  | "auth.errors.validationFailed.title"
  | "auth.errors.validationFailed.detail"
  | "auth.errors.mfaRequired.title"
  | "auth.errors.mfaRequired.detail"
  | "auth.errors.mfaInvalid.title"
  | "auth.errors.mfaInvalid.detail"
  | "auth.errors.mfaRateLimited.title"
  | "auth.errors.mfaRateLimited.detail"
  | "auth.errors.recoveryInvalid.title"
  | "auth.errors.recoveryInvalid.detail"
  | "auth.errors.pbacDenied.title"
  | "auth.errors.pbacDenied.detail"
  | "auth.errors.unsupportedProvider.title"
  | "auth.errors.unsupportedProvider.detail"
  | "auth.errors.invalidRedirectUri.title"
  | "auth.errors.invalidRedirectUri.detail"
  | "auth.errors.oauthStateInvalid.title"
  | "auth.errors.oauthStateInvalid.detail"
  | "auth.errors.oauthCallbackInvalid.title"
  | "auth.errors.oauthCallbackInvalid.detail"
  | "auth.errors.accountNotFound.title"
  | "auth.errors.accountNotFound.detail";

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
