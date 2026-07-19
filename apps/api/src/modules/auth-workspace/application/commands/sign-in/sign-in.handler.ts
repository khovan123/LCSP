import { AUDIT_DECISIONS } from "@lcsp/contracts/audit";
import {
  AUTH_ERROR_CODES,
  AUTH_LEGACY_AUDIT_EVENT_TYPES,
  createProblemResult,
} from "@lcsp/contracts/auth";

import {
  hashSecret,
  verifySecret,
} from "../../../infrastructure/security/security.utils.ts";
import type { AuthProblemResult } from "../../contracts/auth-workspace/common.contract.ts";
import type { SignInSuccess } from "../../contracts/auth-workspace/sign-in.contract.ts";
import type { AuthWorkspaceRepositories } from "../../ports/persistence/auth-workspace-repositories.ts";
import { AuthWorkspaceSupportService } from "../../services/auth-workspace/auth-workspace-support.service.ts";
import { SignInCommand } from "./sign-in.command.ts";

const DECOY_PASSWORD_HASH = hashSecret(
  "decoy-password-for-constant-time-compare",
);

export class SignInHandler {
  constructor(
    private readonly support: AuthWorkspaceSupportService,
    private readonly repositories: AuthWorkspaceRepositories,
  ) { }

  async execute(
    command: SignInCommand,
  ): Promise<AuthProblemResult | SignInSuccess> {
    const { payload, requestMeta } = command;
    const { repositories } = this;
    const correlationId =
      requestMeta.correlation_id ?? this.support.createCorrelationId();
    const validationError = this.support.validateCredentialPayload(
      payload,
      correlationId,
    );
    if (validationError) {
      return validationError;
    }

    const email = payload.email as string;
    const password = payload.password as string;
    const organizationId = payload.organization_id as string;
    const user = await repositories.users.findByEmail(email.toLowerCase());
    if (!user) {
      // Run the same scrypt-based comparison as the found-user path so the
      // response latency doesn't reveal whether the email is registered.
      verifySecret(password, DECOY_PASSWORD_HASH);
      await this.support.recordAudit(repositories, {
        event_type: AUTH_LEGACY_AUDIT_EVENT_TYPES.loginFailed,
        actor_id: null,
        organization_id: organizationId,
        decision: AUDIT_DECISIONS.deny,
        reason_code: AUTH_ERROR_CODES.invalidCredentials,
        correlation_id: correlationId,
      });
      return createProblemResult(
        AUTH_ERROR_CODES.invalidCredentials,
        correlationId,
      );
    }

    if (user.isLocked(this.support.now())) {
      await this.support.recordAudit(repositories, {
        event_type: AUTH_LEGACY_AUDIT_EVENT_TYPES.loginFailed,
        actor_id: user.id,
        organization_id: organizationId,
        decision: AUDIT_DECISIONS.deny,
        reason_code: AUTH_ERROR_CODES.temporaryLock,
        correlation_id: correlationId,
      });
      return createProblemResult(AUTH_ERROR_CODES.temporaryLock, correlationId);
    }

    if (!verifySecret(password, user.passwordHash)) {
      user.recordFailedLogin(
        this.support.now(),
        this.support.failedLoginLimit,
        this.support.lockWindowMs,
      );
      await repositories.users.save(user);
      await this.support.recordAudit(repositories, {
        event_type: AUTH_LEGACY_AUDIT_EVENT_TYPES.loginFailed,
        actor_id: user.id,
        organization_id: organizationId,
        decision: AUDIT_DECISIONS.deny,
        reason_code: user.lockUntil
          ? AUTH_ERROR_CODES.temporaryLock
          : AUTH_ERROR_CODES.invalidCredentials,
        correlation_id: correlationId,
      });
      return createProblemResult(
        user.lockUntil
          ? AUTH_ERROR_CODES.temporaryLock
          : AUTH_ERROR_CODES.invalidCredentials,
        correlationId,
      );
    }

    user.clearFailedLogins();
    await repositories.users.save(user);

    if (!user.emailVerified) {
      await this.support.recordAudit(repositories, {
        event_type: AUTH_LEGACY_AUDIT_EVENT_TYPES.loginFailed,
        actor_id: user.id,
        organization_id: organizationId,
        decision: AUDIT_DECISIONS.deny,
        reason_code: AUTH_ERROR_CODES.emailVerificationRequired,
        correlation_id: correlationId,
      });
      return createProblemResult(
        AUTH_ERROR_CODES.emailVerificationRequired,
        correlationId,
      );
    }

    const membership = await this.support.findMembership(
      repositories,
      user.id,
      organizationId,
    );
    if (!membership) {
      await this.support.recordAudit(repositories, {
        event_type: AUTH_LEGACY_AUDIT_EVENT_TYPES.loginFailed,
        actor_id: user.id,
        organization_id: organizationId,
        decision: AUDIT_DECISIONS.deny,
        reason_code: AUTH_ERROR_CODES.membershipMissing,
        correlation_id: correlationId,
      });
      return createProblemResult(
        AUTH_ERROR_CODES.membershipMissing,
        correlationId,
      );
    }

    if (!membership.isActive()) {
      await this.support.recordAudit(repositories, {
        event_type: AUTH_LEGACY_AUDIT_EVENT_TYPES.loginFailed,
        actor_id: user.id,
        organization_id: organizationId,
        decision: AUDIT_DECISIONS.deny,
        reason_code: AUTH_ERROR_CODES.invalidInviteState,
        correlation_id: correlationId,
      });
      return createProblemResult(
        AUTH_ERROR_CODES.invalidInviteState,
        correlationId,
      );
    }

    const sessionState = await this.support.createSession(
      repositories,
      user,
      organizationId,
      correlationId,
    );
    await this.support.recordAudit(repositories, {
      event_type: AUTH_LEGACY_AUDIT_EVENT_TYPES.loginSucceeded,
      actor_id: user.id,
      organization_id: organizationId,
      decision: AUDIT_DECISIONS.allow,
      correlation_id: correlationId,
    });

    const mfaEnrollment = await this.support.findMfaEnrollment(
      repositories,
      user.id,
    );
    const organization = await this.support.resolveOrganizationById(
      repositories,
      organizationId,
    );
    const mfaRequired = this.support.isMfaRequired(
      user,
      organization,
      mfaEnrollment,
    );

    return {
      ok: true,
      correlation_id: correlationId,
      session_token: sessionState.token,
      user: this.support.safeUserProjection(user, organizationId, membership),
      ...(mfaRequired ? { mfa_required: true } : {}),
    };
  }
}
