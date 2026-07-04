import { AUTH_ERROR_CODES, createProblemResult } from "@lcsp/contracts/auth";

import type { AuthProblemResult } from "../../contracts/auth-workspace/common.contract.ts";
import type { AuthWorkspaceRepositories } from "../../ports/persistence/auth-workspace-repositories.ts";
import { AuthWorkspaceSupportService } from "../../services/auth-workspace/auth-workspace-support.service.ts";
import type { WorkspaceSuccess } from "../../contracts/auth-workspace/workspace.contract.ts";
import { GetWorkspaceQuery } from "./get-workspace.query.ts";

export class GetWorkspaceHandler {
  constructor(
    private readonly support: AuthWorkspaceSupportService,
    private readonly repositories: AuthWorkspaceRepositories,
  ) {}

  async execute(
    query: GetWorkspaceQuery,
  ): Promise<AuthProblemResult | WorkspaceSuccess> {
    const { request } = query;
    const { repositories } = this;
    const correlationId =
      request.correlation_id ?? this.support.createCorrelationId();
    const sessionToken = request.session_token;
    if (!sessionToken) {
      await this.support.recordAudit(repositories, {
        event_type: "workspace.access.denied",
        actor_id: null,
        organization_id: request.organization_id ?? null,
        decision: "deny",
        reason_code: AUTH_ERROR_CODES.authRequired,
        correlation_id: correlationId,
      });
      return createProblemResult(AUTH_ERROR_CODES.authRequired, correlationId);
    }

    const session = await this.support.findValidSession(
      repositories,
      sessionToken,
    );
    if (!session) {
      await this.support.recordAudit(repositories, {
        event_type: "workspace.access.denied",
        actor_id: null,
        organization_id: request.organization_id ?? null,
        decision: "deny",
        reason_code: AUTH_ERROR_CODES.sessionInvalid,
        correlation_id: correlationId,
      });
      return createProblemResult(
        AUTH_ERROR_CODES.sessionInvalid,
        correlationId,
      );
    }

    const user = await this.support.resolveUserById(
      repositories,
      session.userId,
    );
    if (!user) {
      await this.support.recordAudit(repositories, {
        event_type: "workspace.access.denied",
        actor_id: session.userId,
        organization_id: session.organizationId,
        decision: "deny",
        reason_code: AUTH_ERROR_CODES.sessionInvalid,
        correlation_id: correlationId,
      });
      return createProblemResult(
        AUTH_ERROR_CODES.sessionInvalid,
        correlationId,
      );
    }

    const mfaEnrollment = await this.support.findMfaEnrollment(
      repositories,
      session.userId,
    );
    const sessionOrganization = await this.support.resolveOrganizationById(
      repositories,
      session.organizationId,
    );
    const mfaRequired = this.support.isMfaRequired(
      user,
      sessionOrganization,
      mfaEnrollment,
    );
    if (mfaRequired && !session.isMfaVerified()) {
      await this.support.recordAudit(repositories, {
        event_type: "workspace.access.denied",
        actor_id: session.userId,
        organization_id: session.organizationId,
        decision: "deny",
        reason_code: AUTH_ERROR_CODES.mfaRequired,
        correlation_id: correlationId,
      });
      return createProblemResult(AUTH_ERROR_CODES.mfaRequired, correlationId);
    }

    if (
      request.organization_id &&
      request.organization_id !== session.organizationId
    ) {
      await this.support.recordAudit(repositories, {
        event_type: "workspace.access.denied",
        actor_id: session.userId,
        organization_id: session.organizationId,
        decision: "deny",
        reason_code: AUTH_ERROR_CODES.authzTenantScopeMismatch,
        correlation_id: correlationId,
      });
      return createProblemResult(
        AUTH_ERROR_CODES.authzTenantScopeMismatch,
        correlationId,
      );
    }

    const membership = await this.support.findMembership(
      repositories,
      user.id,
      session.organizationId,
    );
    const organization = sessionOrganization;
    const authorization = await this.support.authorizeWorkspace(
      repositories,
      membership,
      correlationId,
      session.organizationId,
    );
    if (authorization.ok === false) {
      await this.support.recordAudit(repositories, {
        event_type: "workspace.access.denied",
        actor_id: user.id,
        organization_id: session.organizationId,
        decision: "deny",
        reason_code: authorization.problem.code,
        correlation_id: correlationId,
        policy_id: membership?.policyId ?? null,
        policy_version: membership?.policyVersion ?? null,
      });
      return authorization;
    }

    await this.support.recordAudit(repositories, {
      event_type: "workspace.access.allowed",
      actor_id: user.id,
      organization_id: session.organizationId,
      decision: "allow",
      correlation_id: correlationId,
      policy_id: membership?.policyId ?? null,
      policy_version: membership?.policyVersion ?? null,
    });

    return {
      ok: true,
      correlation_id: correlationId,
      workspace: {
        id: "workspace-home",
        organization_id: session.organizationId,
        name: organization?.name ?? "Acme Workspace",
      },
      capabilities: {
        can_view_workspace: true,
        source: "backend_projection",
      },
    };
  }
}
