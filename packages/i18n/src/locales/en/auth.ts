import type { AuthMessages } from "../../types.ts";

export const enAuth = {
  errors: {
    authRequired: {
      title: "Sign-in required",
      detail: "You need to sign in to continue."
    },
    invalidCredentials: {
      title: "Sign-in unavailable",
      detail: "The email or password is invalid."
    },
    invalidInviteState: {
      title: "Entry path unavailable",
      detail: "The account is not ready for this approved entry path."
    },
    membershipMissing: {
      title: "Workspace unavailable",
      detail: "You do not have access to this workspace."
    },
    emailVerificationRequired: {
      title: "Email verification required",
      detail: "You need to verify your email before continuing."
    },
    sessionInvalid: {
      title: "Session unavailable",
      detail: "The session is invalid or has expired."
    },
    temporaryLock: {
      title: "Temporary lock active",
      detail: "The account is temporarily locked. Please try again later."
    },
    authzPolicyUnavailable: {
      title: "Access check unavailable",
      detail: "Access cannot be verified right now."
    },
    authzSubjectIncomplete: {
      title: "Access check incomplete",
      detail: "Current access cannot be verified."
    },
    authzTenantScopeMismatch: {
      title: "Workspace unavailable",
      detail: "You do not have access to this workspace."
    },
    authzStateGateBlocked: {
      title: "Workspace blocked",
      detail: "You cannot access this workspace yet."
    },
    authzEvaluatorFailure: {
      title: "Access check unavailable",
      detail: "Access cannot be verified right now."
    },
    validationFailed: {
      title: "Request invalid",
      detail: "The request is invalid."
    },
    mfaRequired: {
      title: "MFA verification required",
      detail: "Two-factor authentication is required before workspace access."
    },
    mfaInvalid: {
      title: "MFA code invalid",
      detail: "The verification code is invalid or has expired."
    },
    mfaRateLimited: {
      title: "Too many MFA attempts",
      detail: "Too many failed attempts. Please try again later."
    },
    recoveryInvalid: {
      title: "Recovery link invalid",
      detail: "This recovery link is invalid or has expired."
    },
    pbacDenied: {
      title: "Action not permitted",
      detail: "You do not have permission to perform this action."
    }
  }
} as const satisfies AuthMessages;
