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

export const LEGACY_AUTH_AUDIT_EVENT_TYPE_ALIASES: Record<string, string> = {
  "auth.login.succeeded": "LOGIN_SUCCESS",
  "auth.login.failed": AUTH_AUDIT_EVENT_TYPES.authSignInFailed,
  "auth.session.revoked": AUTH_AUDIT_EVENT_TYPES.authSessionRevoked,
  "auth.mfa.enrolled": AUTH_AUDIT_EVENT_TYPES.authMfaEnrolled,
  "auth.mfa.verified": AUTH_AUDIT_EVENT_TYPES.authMfaOtpVerified,
  "auth.mfa.failed": AUTH_AUDIT_EVENT_TYPES.authMfaOtpFailed,
  "auth.profile.updated": AUTH_AUDIT_EVENT_TYPES.authProfileUpdated,
  "auth.oauth.start.succeeded": AUTH_AUDIT_EVENT_TYPES.authOauthStart,
  "auth.oauth.start.failed": AUTH_AUDIT_EVENT_TYPES.authOauthStart,
  "auth.oauth.login.succeeded": AUTH_AUDIT_EVENT_TYPES.authOauthLoginSuccess,
  "auth.oauth.login.failed": AUTH_AUDIT_EVENT_TYPES.authOauthLoginFailed,
};

export type LegacyAuthAuditEvent = Record<string, unknown>;

export function isLegacyAuthAuditEvent(
  event: unknown,
): event is LegacyAuthAuditEvent {
  return typeof event === "object" && event !== null && "event_type" in event;
}

export function normalizeLegacyAuthAuditEventType(eventType: string): string {
  return LEGACY_AUTH_AUDIT_EVENT_TYPE_ALIASES[eventType] ?? eventType;
}

export function authAuditReadString(
  event: LegacyAuthAuditEvent,
  key: string,
): string {
  const value = event[key];
  if (typeof value !== "string") {
    throw new Error(`Auth audit event field ${key} must be a string`);
  }

  return value;
}

export function authAuditReadRequiredString(
  event: LegacyAuthAuditEvent,
  key: string,
): string {
  const value = authAuditReadString(event, key);
  if (value.length === 0) {
    throw new Error(`Auth audit event field ${key} must be a string`);
  }

  return value;
}

export function authAuditReadNullableString(
  event: LegacyAuthAuditEvent,
  key: string,
): string | null {
  const value = event[key];
  return typeof value === "string" ? value : null;
}

export function authAuditReadDecision(
  event: LegacyAuthAuditEvent,
  key: string,
): "allow" | "deny" | null {
  const value = event[key];
  return value === "allow" || value === "deny" ? value : null;
}
