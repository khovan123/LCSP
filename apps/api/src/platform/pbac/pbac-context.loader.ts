import { Inject, Injectable } from "@nestjs/common";
import type {
  Membership,
  Policy,
  Session,
} from "../../modules/auth-workspace/domain/models/auth-workspace.models.js";
import { fingerprintToken } from "../../modules/auth-workspace/infrastructure/security/security.utils.js";
import {
  PrismaMembershipRepository,
  PrismaMfaEnrollmentRepository,
  PrismaPolicyRepository,
  PrismaSessionRepository,
} from "../../modules/auth-workspace/infrastructure/persistence/prisma-auth-workspace.repositories.js";
import type { MembershipRepository } from "../../modules/auth-workspace/application/ports/persistence/membership.repository.js";
import type { MfaEnrollmentRepository } from "../../modules/auth-workspace/application/ports/persistence/mfa.repository.js";
import type { PolicyRepository } from "../../modules/auth-workspace/application/ports/persistence/policy.repository.js";
import type { SessionRepository } from "../../modules/auth-workspace/application/ports/persistence/session.repository.js";

export type PbacContextDenialReason =
  | "SESSION_INVALID"
  | "MFA_REQUIRED"
  | "MEMBERSHIP_MISSING"
  | "POLICY_NOT_FOUND"
  | "LOAD_ERROR";

export type PbacContextResult =
  | { ok: true; session: Session; membership: Membership; policy: Policy }
  | { ok: false; reason: PbacContextDenialReason };

/**
 * Orchestrates the guard's DB reads (session -> MFA -> membership -> policy),
 * reusing auth-workspace's existing repositories instead of re-querying Prisma
 * directly, so session/membership semantics can't drift between the two paths.
 */
@Injectable()
export class PbacContextLoader {
  constructor(
    @Inject(PrismaSessionRepository)
    private readonly sessions: SessionRepository,
    @Inject(PrismaMembershipRepository)
    private readonly memberships: MembershipRepository,
    @Inject(PrismaPolicyRepository)
    private readonly policies: PolicyRepository,
    @Inject(PrismaMfaEnrollmentRepository)
    private readonly mfaEnrollments: MfaEnrollmentRepository,
  ) {}

  async load(token: string, now: number): Promise<PbacContextResult> {
    try {
      const fingerprint = fingerprintToken(token);
      const session = await this.sessions.findByFingerprint(fingerprint);
      if (!session || !session.isActive(now)) {
        return { ok: false, reason: "SESSION_INVALID" };
      }

      const mfaEnrollment = await this.mfaEnrollments.findByUserId(
        session.userId,
      );
      if (mfaEnrollment && !session.isMfaVerified()) {
        return { ok: false, reason: "MFA_REQUIRED" };
      }

      const membership = await this.memberships.findByUserAndOrganization(
        session.userId,
        session.organizationId,
      );
      if (!membership || !membership.isActive()) {
        return { ok: false, reason: "MEMBERSHIP_MISSING" };
      }

      const policy = await this.policies.findByIdAndVersion(
        membership.policyId,
        membership.policyVersion,
      );
      if (!policy) {
        return { ok: false, reason: "POLICY_NOT_FOUND" };
      }

      return { ok: true, session, membership, policy };
    } catch {
      // Any unexpected DB failure at any stage — deny, never allow on error.
      return { ok: false, reason: "LOAD_ERROR" };
    }
  }
}
