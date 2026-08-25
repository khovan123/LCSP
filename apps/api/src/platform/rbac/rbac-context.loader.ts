import { Inject, Injectable } from "@nestjs/common";
import {
  AUTH_MEMBERSHIP_STATUSES,
  type AuthMembershipStatus,
} from "@lcsp/contracts/auth";
import { actionsForRole, RBAC_REASON_CODE } from "@lcsp/contracts/rbac";
import type {
  Session,
  User,
} from "../../modules/auth-workspace/domain/models/auth-workspace.models.js";
import {
  fingerprintToken,
  verifySecret,
} from "../../modules/auth-workspace/infrastructure/security/security.utils.js";
import {
  PrismaMembershipRepository,
  PrismaMfaEnrollmentRepository,
  PrismaSessionRepository,
  PrismaUserRepository,
} from "../../modules/auth-workspace/infrastructure/persistence/prisma-auth-workspace.repositories.js";
import type { MembershipRepository } from "../../modules/auth-workspace/application/ports/persistence/membership.repository.js";
import type { MfaEnrollmentRepository } from "../../modules/auth-workspace/application/ports/persistence/mfa.repository.js";
import type { SessionRepository } from "../../modules/auth-workspace/application/ports/persistence/session.repository.js";
import type { UserRepository } from "../../modules/auth-workspace/application/ports/persistence/user.repository.js";

export type RbacContextDenialReason =
  | typeof RBAC_REASON_CODE.sessionInvalid
  | typeof RBAC_REASON_CODE.mfaRequired
  | typeof RBAC_REASON_CODE.membershipMissing
  | typeof RBAC_REASON_CODE.loadError;

export type RbacContextResult =
  | {
      ok: true;
      session: Session;
      user: User;
      membershipStatus: AuthMembershipStatus;
      grantedActions: readonly string[];
    }
  | {
      ok: false;
      reason: RbacContextDenialReason;
      mfaEnrolled?: boolean;
    };

/**
 * Loads the authenticated RBAC context in session → MFA → user role order.
 */
@Injectable()
export class RbacContextLoader {
  constructor(
    @Inject(PrismaSessionRepository)
    private readonly sessions: SessionRepository,
    @Inject(PrismaUserRepository)
    private readonly users: UserRepository,
    @Inject(PrismaMembershipRepository)
    private readonly memberships: MembershipRepository,
    @Inject(PrismaMfaEnrollmentRepository)
    private readonly mfaEnrollments: MfaEnrollmentRepository,
  ) {}

  async load(
    token: string,
    now: number,
    options: { allowPendingMfa?: boolean } = {},
  ): Promise<RbacContextResult> {
    try {
      const fingerprint = fingerprintToken(token);
      const session = await this.sessions.findByFingerprint(fingerprint);
      if (
        !session ||
        !verifySecret(token, session.tokenHash) ||
        !session.isActive(now)
      ) {
        return { ok: false, reason: RBAC_REASON_CODE.sessionInvalid };
      }

      const mfaEnrollment = await this.mfaEnrollments.findByUserId(
        session.userId,
      );
      if (
        !options.allowPendingMfa &&
        mfaEnrollment !== null &&
        mfaEnrollment.verifiedAt !== null &&
        !session.isMfaVerified()
      ) {
        return {
          ok: false,
          reason: RBAC_REASON_CODE.mfaRequired,
          mfaEnrolled: true,
        };
      }

      const user = await this.users.findById(session.userId);
      if (!user) {
        return { ok: false, reason: RBAC_REASON_CODE.loadError };
      }

      const membership = await this.memberships.findByUserAndOrganization(
        session.userId,
        session.organizationId,
      );
      if (
        !membership ||
        membership.status !== AUTH_MEMBERSHIP_STATUSES.active
      ) {
        return { ok: false, reason: RBAC_REASON_CODE.membershipMissing };
      }

      return {
        ok: true,
        session,
        user,
        membershipStatus: membership.status,
        grantedActions: actionsForRole(user.role),
      };
    } catch {
      return { ok: false, reason: RBAC_REASON_CODE.loadError };
    }
  }
}
