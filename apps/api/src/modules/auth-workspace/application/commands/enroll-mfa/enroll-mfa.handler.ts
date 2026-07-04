import { AUTH_ERROR_CODES, createProblemResult } from "@lcsp/contracts/auth";

import {
  encryptMfaSecret,
  generateTotpSecret,
} from "../../../infrastructure/security/security.utils.ts";
import { MfaEnrollment } from "../../../domain/entities/mfa-enrollment.entity.ts";
import type { AuthProblemResult } from "../../contracts/auth-workspace/common.contract.ts";
import type { EnrollMfaSuccess } from "../../contracts/auth-workspace/mfa.contract.ts";
import type { AuthWorkspaceRepositories } from "../../ports/persistence/auth-workspace-repositories.ts";
import { AuthWorkspaceSupportService } from "../../services/auth-workspace/auth-workspace-support.service.ts";
import { EnrollMfaCommand } from "./enroll-mfa.command.ts";

export class EnrollMfaHandler {
  constructor(
    private readonly support: AuthWorkspaceSupportService,
    private readonly repositories: AuthWorkspaceRepositories,
  ) {}

  async execute(
    command: EnrollMfaCommand,
  ): Promise<AuthProblemResult | EnrollMfaSuccess> {
    const { sessionToken, requestMeta } = command;
    const correlationId =
      requestMeta.correlation_id ?? this.support.createCorrelationId();

    const session = await this.support.findValidSession(
      this.repositories,
      sessionToken,
    );
    if (!session) {
      return createProblemResult(AUTH_ERROR_CODES.sessionInvalid, correlationId);
    }

    const existingEnrollment = await this.repositories.mfaEnrollments.findByUserId(
      session.userId,
    );
    if (existingEnrollment && !session.isMfaVerified()) {
      // A valid-but-unverified session must not be able to silently replace
      // an existing TOTP secret (would let a stolen pre-MFA session hijack MFA).
      return createProblemResult(AUTH_ERROR_CODES.mfaRequired, correlationId);
    }

    const user = await this.support.resolveUserById(
      this.repositories,
      session.userId,
    );
    if (!user) {
      return createProblemResult(AUTH_ERROR_CODES.sessionInvalid, correlationId);
    }

    const plainSecret = generateTotpSecret();
    const encryptedSecret = encryptMfaSecret(plainSecret);
    const enrollment = new MfaEnrollment({
      userId: session.userId,
      encryptedSecret,
      enrolledAt: this.support.now(),
    });
    await this.repositories.mfaEnrollments.save(enrollment);

    await this.support.recordAudit(this.repositories, {
      event_type: "auth.mfa.enrolled",
      actor_id: session.userId,
      organization_id: session.organizationId,
      decision: "allow",
      correlation_id: correlationId,
    });

    return {
      ok: true,
      correlation_id: correlationId,
      totp_uri: buildTotpUri(plainSecret, user.email.toString()),
    };
  }
}

function buildTotpUri(secret: string, accountName: string): string {
  const issuer = "LCSP";
  const label = encodeURIComponent(`${issuer}:${accountName}`);
  return `otpauth://totp/${label}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
}
