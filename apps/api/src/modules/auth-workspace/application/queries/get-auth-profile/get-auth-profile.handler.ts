import { HttpStatus } from "@nestjs/common";
import { AUTH_ERROR_CODES } from "@lcsp/contracts/auth";

import { PrismaService } from "../../../../../infrastructure/prisma/prisma.service.js";
import type { AuthProblemResult } from "../../contracts/auth-workspace/common.contract.ts";
import type { AuthProfileSuccess } from "../../contracts/auth-workspace/settings.contract.ts";
import { problemException } from "../../../../../platform/problems/problem-factory.js";
import { GetAuthProfileQuery } from "./get-auth-profile.query.ts";

export class GetAuthProfileHandler {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    query: GetAuthProfileQuery,
  ): Promise<AuthProblemResult | AuthProfileSuccess> {
    const [user, session] = await Promise.all([
      this.prisma.authUser.findUnique({
        where: { id: query.context.userId },
        select: {
          id: true,
          email: true,
          emailVerified: true,
          displayName: true,
          recoveryEmail: true,
          createdAt: true,
          updatedAt: true,
          mfaEnrollment: { select: { enrolledAt: true } },
        },
      }),
      this.prisma.authSession.findUnique({
        where: { id: query.context.sessionId },
        select: {
          id: true,
          mfaVerifiedAt: true,
          createdAt: true,
          updatedAt: true,
          expiresAt: true,
        },
      }),
    ]);

    if (!user || !session) {
      throw problemException(AUTH_ERROR_CODES.sessionInvalid, query.correlationId, {
        status: HttpStatus.UNAUTHORIZED,
      });
    }

    return {
      ok: true,
      user_id: user.id,
      email: user.email,
      email_verified: user.emailVerified,
      display_name: user.displayName,
      recovery_email: user.recoveryEmail,
      created_at: user.createdAt.toISOString(),
      updated_at: user.updatedAt.toISOString(),
      membership_role: query.context.subjectRole,
      organization_id: query.context.organizationId,
      mfa_enrolled: user.mfaEnrollment !== null,
      mfa_enrolled_at: user.mfaEnrollment?.enrolledAt.toISOString() ?? null,
      mfa_verified: session.mfaVerifiedAt !== null,
      mfa_verified_at: session.mfaVerifiedAt?.toISOString() ?? null,
      current_session_id: session.id,
      current_session_created_at: session.createdAt.toISOString(),
      current_session_updated_at: session.updatedAt.toISOString(),
      current_session_expires_at: session.expiresAt.toISOString(),
    };
  }
}
