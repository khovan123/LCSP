export const REQUIRED_ACTIONS = {
  signIn: "sign_in",
  verifyEmail: "verify_email",
  acceptInvite: "accept_valid_invite",
  contactOwner: "contact_organization_owner",
  waitAndRetry: "wait_and_retry",
  verifyMfa: "verify_mfa",
  retryRecovery: "retry_recovery_request",
  none: "none"
} as const;

export type RequiredAction = (typeof REQUIRED_ACTIONS)[keyof typeof REQUIRED_ACTIONS];
