export const AUTH_AUDIT_EVENT_TYPES = {
  authSignInSuccess: "AUTH_SIGN_IN_SUCCESS",
  authSignInFailed: "AUTH_SIGN_IN_FAILED",
  authSessionRevoked: "AUTH_SESSION_REVOKED",
  authMfaEnrolled: "AUTH_MFA_ENROLLED",
  authMfaOtpVerified: "AUTH_MFA_OTP_VERIFIED",
  authMfaOtpFailed: "AUTH_MFA_OTP_FAILED",
  authProfileUpdated: "AUTH_PROFILE_UPDATED",
  authOauthStart: "AUTH_OAUTH_START",
  authOauthLoginSuccess: "AUTH_OAUTH_LOGIN_SUCCESS",
  authOauthLoginFailed: "AUTH_OAUTH_LOGIN_FAILED",
  authDeveloperInvited: "AUTH_DEVELOPER_INVITED",
  authDeveloperInvitationAccepted: "AUTH_DEVELOPER_INVITATION_ACCEPTED",
  authDeveloperRevoked: "AUTH_DEVELOPER_REVOKED",
} as const;

export type AuthAuditEventType =
  (typeof AUTH_AUDIT_EVENT_TYPES)[keyof typeof AUTH_AUDIT_EVENT_TYPES];
