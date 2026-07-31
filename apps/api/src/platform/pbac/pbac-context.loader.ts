import { Inject, Injectable } from "@nestjs/common";
import { PBAC_REASON_CODE } from "@lcsp/contracts/pbac";
import type {
  Membership,
  Policy,
  Session,
} from "../../modules/auth-workspace/domain/models/auth-workspace.models.js";
import {
  fingerprintToken,
  verifySecret,
} from "../../modules/auth-workspace/infrastructure/security/security.utils.js";
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
  | typeof PBAC_REASON_CODE.sessionInvalid
  | typeof PBAC_REASON_CODE.mfaRequired
  | typeof PBAC_REASON_CODE.membershipMissing
  | typeof PBAC_REASON_CODE.policyNotFound
  | typeof PBAC_REASON_CODE.loadError;

export type PbacContextResult =
  | { ok: true; session: Session; membership: Membership; policy: Policy }
  | {
      ok: false;
      reason: PbacContextDenialReason;
      mfaEnrolled?: boolean;
    };

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

  async load(
    token: string,
    now: number,
    options: { allowPendingMfa?: boolean } = {},
  ): Promise<PbacContextResult> {
    try {
      const fingerprint = fingerprintToken(token);
      const session = await this.sessions.findByFingerprint(fingerprint);
      if (
        !session ||
        !verifySecret(token, session.tokenHash) ||
        !session.isActive(now)
      ) {
        return { ok: false, reason: PBAC_REASON_CODE.sessionInvalid };
      }

      const mfaEnrollment = await this.mfaEnrollments.findByUserId(session.userId);
      if (!options.allowPendingMfa && !session.isMfaVerified()) {
        return {
          ok: false,
          reason: PBAC_REASON_CODE.mfaRequired,
          mfaEnrolled: mfaEnrollment !== null,
        };
      }

      const membership = await this.memberships.findByUserAndOrganization(
        session.userId,
        session.organizationId,
      );
      if (!membership || !membership.isActive()) {
        return { ok: false, reason: PBAC_REASON_CODE.membershipMissing };
      }

      const policy = await this.policies.findByIdAndVersion(
        membership.policyId,
        membership.policyVersion,
      );
      if (!policy) {
        return { ok: false, reason: PBAC_REASON_CODE.policyNotFound };
      }

      return { ok: true, session, membership, policy };
    } catch {
      // Any unexpected DB failure at any stage — deny, never allow on error.
      return { ok: false, reason: PBAC_REASON_CODE.loadError };
    }
  }
}
