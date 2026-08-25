import { AUDIT_DECISIONS, AUDIT_RESOURCE_TYPES } from "@lcsp/contracts/audit";
import {
  AUTH_ERROR_CODES,
  AUTH_LEGACY_AUDIT_EVENT_TYPES,
  createProblemResult,
} from "@lcsp/contracts/auth";
import {
  actionsForRole,
  RBAC_ACTIONS,
  RBAC_DECISION,
  RBAC_REASON_CODE,
} from "@lcsp/contracts/rbac";

import type {
  AuditEvent,
  AuthorizationDecision,
  Membership,
  MfaEnrollment,
  Organization,
  Session,
  User,
} from "../../../domain/models/auth-workspace.models.ts";
import { Session as SessionEntity } from "../../../domain/models/auth-workspace.models.ts";
import {
  createCorrelationId,
  fingerprintToken,
  hashSecret,
  issueOpaqueToken,
} from "../../../infrastructure/security/security.utils.ts";
import type {
  AuthProblemResult,
  SafeUserProjection,
} from "../../contracts/auth-workspace/common.contract.ts";
import type { CredentialPayload } from "../../contracts/auth-workspace/sign-in.contract.ts";
import type { WorkspaceAuthorization } from "../../contracts/auth-workspace/workspace.contract.ts";
import type { AuthWorkspaceRepositories } from "../../ports/persistence/auth-workspace-repositories.ts";
import type { AuthAuditService } from "./auth-audit.service.ts";

const FAILED_LOGIN_LIMIT = 3;
const LOCK_WINDOW_MS = 15 * 60_000;
const SESSION_TTL_MS = 8 * 60 * 60_000;

export class AuthWorkspaceSupportService {
  constructor(private readonly authAudit?: AuthAuditService) {}

  createCorrelationId(): string {
    return createCorrelationId();
  }

  now(): number {
    return Date.now();
  }

  get failedLoginLimit(): number {
    return FAILED_LOGIN_LIMIT;
  }

  get lockWindowMs(): number {
    return LOCK_WINDOW_MS;
  }

  safeUserProjection(
    user: User,
    organizationId: string,
    membership: Membership,
  ): SafeUserProjection {
    return {
      user_id: user.id,
      email: user.email.toString(),
      organization_id: organizationId,
      membership_status: membership.status,
      subject_attributes: { role: user.role },
    };
  }

  isMfaRequired(
    user: User,
    organization: Organization | null,
    mfaEnrollment: MfaEnrollment | null,
  ): boolean {
    if (user.mfaRequired) {
      return true;
    }

    void organization;
    return mfaEnrollment !== null && mfaEnrollment.verifiedAt !== null;
  }

  isMfaEnrolled(mfaEnrollment: MfaEnrollment | null): boolean {
    return mfaEnrollment !== null && mfaEnrollment.verifiedAt !== null;
  }

  recordAudit(repositories: unknown, event: AuditEvent): Promise<void> {
    void repositories;
    if (!this.authAudit) {
      return Promise.resolve();
    }
    return this.authAudit.write(event);
  }

  recordDecision(
    repositories: AuthWorkspaceRepositories,
    decision: AuthorizationDecision,
  ): Promise<void> {
    return repositories.authorizationDecisions.append(decision);
  }

  findMembership(
    repositories: AuthWorkspaceRepositories,
    userId: string,
    organizationId: string,
  ): Promise<Membership | null> {
    return repositories.memberships.findByUserAndOrganization(
      userId,
      organizationId,
    );
  }

  resolveUserById(
    repositories: AuthWorkspaceRepositories,
    userId: string,
  ): Promise<User | null> {
    return repositories.users.findById(userId);
  }

  resolveOrganizationById(
    repositories: AuthWorkspaceRepositories,
    organizationId: string,
  ): Promise<Organization | null> {
    return repositories.organizations.findById(organizationId);
  }

  validateCredentialPayload(
    payload: CredentialPayload,
    correlationId: string,
  ): AuthProblemResult | null {
    if (
      !this.requireString(payload?.email) ||
      !this.requireString(payload?.password)
    ) {
      return createProblemResult(
        AUTH_ERROR_CODES.validationFailed,
        correlationId,
      );
    }

    return null;
  }

  async createSession(
    repositories: AuthWorkspaceRepositories,
    user: User,
    organizationId: string,
    correlationId: string,
  ): Promise<{ token: string; session: Session }> {
    const token = issueOpaqueToken();
    const fingerprint = fingerprintToken(token);
    const session = new SessionEntity({
      userId: user.id,
      organizationId,
      tokenHash: hashSecret(token),
      expiresAt: this.now() + SESSION_TTL_MS,
      revokedAt: null,
    });
    await repositories.sessions.save(session, fingerprint);
    await this.recordAudit(repositories, {
      event_type: AUTH_LEGACY_AUDIT_EVENT_TYPES.sessionCreated,
      actor_id: user.id,
      organization_id: organizationId,
      decision: AUDIT_DECISIONS.allow,
      correlationId: correlationId,
      session_id: session.id,
    });
    return { token, session };
  }

  async findValidSession(
    repositories: AuthWorkspaceRepositories,
    token: string,
  ): Promise<Session | null> {
    const session = await repositories.sessions.findByFingerprint(
      fingerprintToken(token),
    );

    if (!session) {
      return null;
    }

    if (!session.isActive(this.now())) {
      return null;
    }

    return session;
  }

  findMfaEnrollment(
    repositories: AuthWorkspaceRepositories,
    userId: string,
  ): Promise<MfaEnrollment | null> {
    return repositories.mfaEnrollments.findByUserId(userId);
  }

  async authorizeWorkspace(
    repositories: AuthWorkspaceRepositories,
    membership: Membership | null | undefined,
    user: User | null | undefined,
    correlationId: string,
    organizationId: string,
    resourceId = "workspace-home",
  ): Promise<WorkspaceAuthorization> {
    if (!membership || !user) {
      const denialCode = !membership
        ? AUTH_ERROR_CODES.membershipMissing
        : AUTH_ERROR_CODES.sessionInvalid;
      const denied = createProblemResult(denialCode, correlationId);
      await this.recordDecision(repositories, {
        actor_id: membership?.userId ?? null,
        session_id: null,
        organization_id: membership?.organizationId ?? null,
        resource_type: AUDIT_RESOURCE_TYPES.workspace,
        resource_id: resourceId,
        action: RBAC_ACTIONS.workspaceRead,
        decision: RBAC_DECISION.deny,
        reason_code: denialCode,
        correlationId: correlationId,
      });
      return denied;
    }

    if (
      !membership.isActive() ||
      !membership.belongsToOrganization(organizationId)
    ) {
      const denialCode = !membership.isActive()
        ? AUTH_ERROR_CODES.authzStateGateBlocked
        : AUTH_ERROR_CODES.authzTenantScopeMismatch;
      const denied = createProblemResult(denialCode, correlationId);
      await this.recordDecision(repositories, {
        actor_id: membership.userId,
        session_id: null,
        organization_id: membership.organizationId,
        resource_type: AUDIT_RESOURCE_TYPES.workspace,
        resource_id: resourceId,
        action: RBAC_ACTIONS.workspaceRead,
        decision: RBAC_DECISION.deny,
        reason_code: denialCode,
        correlationId: correlationId,
      });
      return denied;
    }

    const allowed: AuthorizationDecision = {
      actor_id: membership.userId,
      session_id: null,
      organization_id: organizationId,
      resource_type: AUDIT_RESOURCE_TYPES.workspace,
      resource_id: resourceId,
      action: RBAC_ACTIONS.workspaceRead,
      decision: RBAC_DECISION.allow,
      reason_code: RBAC_REASON_CODE.authorized,
      correlationId: correlationId,
    };
    await this.recordDecision(repositories, allowed);
    return {
      ok: true,
      decision: allowed,
      membership_status: membership.status,
      role: user.role,
      granted_actions: [...actionsForRole(user.role)],
    };
  }

  private requireString(value: unknown): value is string {
    return typeof value === "string" && value.trim().length > 0;
  }
}
