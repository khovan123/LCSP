export { Organization } from "../entities/organization.entity.ts";
export { User } from "../entities/user.entity.ts";
export { Membership } from "../entities/membership.entity.ts";
export type { MembershipStatus } from "../entities/membership.entity.ts";
export { Invitation } from "../entities/invitation.entity.ts";
export type { InvitationState } from "../entities/invitation.entity.ts";
export { Session } from "../entities/session.entity.ts";
export { Policy } from "../entities/policy.entity.ts";
export { MfaEnrollment } from "../entities/mfa-enrollment.entity.ts";
export { MfaRateLimit } from "../entities/mfa-rate-limit.entity.ts";
export { RecoveryRequest } from "../entities/recovery-request.entity.ts";
export type { SubjectAttributesRecord as SubjectAttributes } from "../value-objects/subject-attributes.value-object.ts";

export type AuthorizationDecision = {
  organization_id: string | null;
  resource_type: string;
  resource_id: string;
  action: string;
  decision: "allow" | "deny";
  reason_code: string;
  policy_id: string | null;
  policy_version: string | null;
  correlation_id: string;
};

export type AuditEvent = Record<string, unknown>;
