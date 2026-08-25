import { Inject, Injectable } from "@nestjs/common";
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
  PrismaMfaEnrollmentRepository,
  PrismaSessionRepository,
  PrismaUserRepository,
} from "../../modules/auth-workspace/infrastructure/persistence/prisma-auth-workspace.repositories.js";
import type { MfaEnrollmentRepository } from "../../modules/auth-workspace/application/ports/persistence/mfa.repository.js";
import type { SessionRepository } from "../../modules/auth-workspace/application/ports/persistence/session.repository.js";
import type { UserRepository } from "../../modules/auth-workspace/application/ports/persistence/user.repository.js";

export type RbacContextDenialReason =
  | typeof RBAC_REASON_CODE.sessionInvalid
  | typeof RBAC_REASON_CODE.mfaRequired
  | typeof RBAC_REASON_CODE.loadError;

export type RbacContextResult =
  | {
      ok: true;
      session: Session;
      user: User;
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

      return {
        ok: true,
        session,
        user,
        grantedActions: actionsForRole(user.role),
      };
    } catch {
      return { ok: false, reason: RBAC_REASON_CODE.loadError };
    }
  }
}
