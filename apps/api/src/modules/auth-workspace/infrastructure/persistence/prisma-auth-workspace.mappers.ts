import type {
  AuthAuditEvent,
  AuthDecisionLog,
  AuthInvitation,
  AuthMembership,
  AuthMfaRateLimit,
  AuthOAuthIdentity,
  AuthOAuthState,
  AuthOrganization,
  AuthPolicy,
  AuthRecoveryRequest,
  AuthSession,
  AuthUser,
  AuthUserMfa,
  Prisma,
} from "@prisma/client";

import {
  fromPrismaAuthBackupEmailPolicy,
  fromPrismaAuthInvitationState,
  fromPrismaAuthMembershipStatus,
  fromPrismaAuthPrimaryEmailAddressPolicy,
  fromPrismaAuthStateGate,
} from "../../../../infrastructure/prisma/prisma-enum-mappers.js";
import {
  Invitation,
  MfaEnrollment,
  MfaRateLimit,
  Membership,
  OAuthIdentity,
  OAuthState,
  Organization,
  Policy,
  RecoveryRequest,
  Session,
  User,
  type AuditEvent,
  type AuthorizationDecision,
} from "../../domain/models/auth-workspace.models.ts";
import type { SubjectAttributes } from "../../domain/models/auth-workspace.models.ts";

export function mapOrganizationRecord(record: AuthOrganization): Organization {
  return Organization.rehydrate({
    id: record.id,
    slug: record.slug,
    name: record.name,
    mfaRequired: record.mfaRequired,
  });
}

export function mapUserRecord(record: AuthUser): User {
  return User.rehydrate({
    id: record.id,
    email: record.email,
    passwordHash: record.passwordHash,
    emailVerified: record.emailVerified,
    failedLoginCount: record.failedLoginCount,
    lockUntil: record.lockUntil?.getTime() ?? null,
    displayName: record.displayName ?? null,
    recoveryEmail: record.recoveryEmail ?? null,
    primaryEmailAddressPolicy: fromPrismaAuthPrimaryEmailAddressPolicy(
      record.primaryEmailAddressPolicy,
    ),
    backupEmailPolicy: fromPrismaAuthBackupEmailPolicy(
      record.backupEmailPolicy,
    ),
    mfaRequired: record.mfaRequired,
  });
}

export function mapRecoveryRequestRecord(
  record: AuthRecoveryRequest,
): RecoveryRequest {
  return RecoveryRequest.rehydrate({
    id: record.id,
    userId: record.userId,
    tokenHash: record.tokenHash,
    expiresAt: record.expiresAt.getTime(),
    consumedAt: record.consumedAt?.getTime() ?? null,
  });
}

export function mapMembershipRecord(record: AuthMembership): Membership {
  return Membership.rehydrate({
    id: record.id,
    userId: record.userId,
    organizationId: record.organizationId,
    status: fromPrismaAuthMembershipStatus(record.status),
    subjectAttributes: jsonToSubjectAttributes(record.subjectAttributes),
    policyId: record.policyId,
    policyVersion: record.policyVersion,
  });
}

export function mapInvitationRecord(record: AuthInvitation): Invitation {
  return Invitation.rehydrate({
    id: record.id,
    email: record.email,
    organizationId: record.organizationId,
    state: fromPrismaAuthInvitationState(record.state),
    emailVerified: record.emailVerified,
    membershipStatus: fromPrismaAuthMembershipStatus(record.membershipStatus),
    subjectAttributes: jsonToSubjectAttributes(record.subjectAttributes),
    policyId: record.policyId,
    policyVersion: record.policyVersion,
    expiresAt: record.expiresAt.getTime(),
  });
}

export function mapSessionRecord(record: AuthSession): Session {
  return Session.rehydrate({
    id: record.id,
    userId: record.userId,
    organizationId: record.organizationId,
    tokenHash: record.tokenHash,
    expiresAt: record.expiresAt.getTime(),
    revokedAt: record.revokedAt?.getTime() ?? null,
    mfaVerifiedAt: record.mfaVerifiedAt?.getTime() ?? null,
  });
}

export function mapMfaEnrollmentRecord(record: AuthUserMfa): MfaEnrollment {
  return new MfaEnrollment({
    userId: record.userId,
    encryptedSecret: record.encryptedSecret,
    enrolledAt: record.enrolledAt.getTime(),
    verifiedAt: record.verifiedAt?.getTime() ?? null,
  });
}

export function mapMfaRateLimitRecord(record: AuthMfaRateLimit): MfaRateLimit {
  return new MfaRateLimit({
    userId: record.userId,
    failedCount: record.failedCount,
    lockedUntil: record.lockedUntil?.getTime() ?? null,
  });
}

export function mapPolicyRecord(record: AuthPolicy): Policy {
  return Policy.rehydrate({
    id: record.id,
    version: record.version,
    actions: record.actions,
    subjectRole: record.subjectRole,
    stateGate: fromPrismaAuthStateGate(record.stateGate),
    organizationId: record.organizationId,
  });
}

export function mapOAuthStateRecord(record: AuthOAuthState): OAuthState {
  return OAuthState.rehydrate({
    id: record.id,
    state: record.state,
    nonce: record.nonce,
    provider: record.provider,
    redirectUri: record.redirectUri,
    expiresAt: record.expiresAt.getTime(),
  });
}

export function mapOAuthIdentityRecord(
  record: AuthOAuthIdentity,
): OAuthIdentity {
  return OAuthIdentity.rehydrate({
    id: record.id,
    userId: record.userId,
    provider: record.provider,
    providerAccountId: record.providerAccountId,
    createdAt: record.createdAt.getTime(),
  });
}

export function mapAuditEventRecord(record: AuthAuditEvent): AuditEvent {
  return jsonToAuditEvent(record.payload);
}

export function mapAuthorizationDecisionRecord(
  record: AuthDecisionLog,
): AuthorizationDecision {
  return jsonToAuthorizationDecision(record.payload);
}

export function subjectAttributesToJson(
  value: SubjectAttributes,
): Prisma.InputJsonValue {
  return value;
}

export function dateFromEpochMs(value: number | null): Date | null {
  return value === null ? null : new Date(value);
}

export function dateFromEpochMsRequired(value: number): Date {
  return new Date(value);
}

export function jsonToSubjectAttributes(
  value: Prisma.JsonValue,
): SubjectAttributes {
  if (!value || Array.isArray(value) || typeof value !== "object") {
    return {};
  }

  return value as SubjectAttributes;
}

function jsonToAuditEvent(value: Prisma.JsonValue): AuditEvent {
  if (!value || Array.isArray(value) || typeof value !== "object") {
    return {};
  }

  return value;
}

function jsonToAuthorizationDecision(
  value: Prisma.JsonValue,
): AuthorizationDecision {
  if (!value || Array.isArray(value) || typeof value !== "object") {
    throw new Error("Invalid authorization decision payload");
  }

  return value as AuthorizationDecision;
}
