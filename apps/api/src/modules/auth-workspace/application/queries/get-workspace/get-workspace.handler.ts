import { AUDIT_DECISIONS } from "@lcsp/contracts/audit";
import {
  AUTH_ERROR_CODES,
  AUTH_LEGACY_AUDIT_EVENT_TYPES,
} from "@lcsp/contracts/auth";

import { Inject } from "@nestjs/common";
import { QueryHandler, type IQueryHandler } from "@nestjs/cqrs";

import { problemException } from "../../../../../platform/problems/problem-factory.ts";
import type { WorkspaceSuccess } from "../../contracts/auth-workspace/workspace.contract.ts";
import {
  AUTH_WORKSPACE_AUTHORIZATION_DECISION_REPOSITORY,
  AUTH_WORKSPACE_SESSION_REPOSITORY,
  AUTH_WORKSPACE_USER_REPOSITORY,
  type AuthorizationDecisionRepository,
  type SessionRepository,
  type UserRepository,
} from "../../ports/persistence/index.ts";
import { AuthWorkspaceSupportService } from "../../services/auth-workspace/auth-workspace-support.service.ts";
import { GetWorkspaceQuery } from "./get-workspace.query.ts";

@QueryHandler(GetWorkspaceQuery)
export class GetWorkspaceHandler implements IQueryHandler<GetWorkspaceQuery> {
  constructor(
    private readonly support: AuthWorkspaceSupportService,
    @Inject(AUTH_WORKSPACE_USER_REPOSITORY)
    private readonly users: UserRepository,
    @Inject(AUTH_WORKSPACE_SESSION_REPOSITORY)
    private readonly sessions: SessionRepository,
    @Inject(AUTH_WORKSPACE_AUTHORIZATION_DECISION_REPOSITORY)
    private readonly authorizationDecisions: AuthorizationDecisionRepository,
  ) {}

  async execute(query: GetWorkspaceQuery): Promise<WorkspaceSuccess> {
    const { context, correlationId } = query;
    const { users, sessions, authorizationDecisions } = this;
    const cid = correlationId ?? this.support.createCorrelationId();

    const user = await users.findById(context.userId);
    if (!user) {
      await this.support.recordAudit({
        event_type: AUTH_LEGACY_AUDIT_EVENT_TYPES.workspaceAccessDenied,
        actor_id: context.userId,
        decision: AUDIT_DECISIONS.deny,
        reason_code: AUTH_ERROR_CODES.sessionInvalid,
        correlationId: cid,
      });
      throw problemException(AUTH_ERROR_CODES.sessionInvalid, cid);
    }

    const session = await sessions.findById(context.sessionId);
    if (
      !session ||
      !session.isActive(this.support.now()) ||
      session.userId !== user.id
    ) {
      await this.support.recordAudit({
        event_type: AUTH_LEGACY_AUDIT_EVENT_TYPES.workspaceAccessDenied,
        actor_id: user.id,
        decision: AUDIT_DECISIONS.deny,
        reason_code: AUTH_ERROR_CODES.sessionInvalid,
        correlationId: cid,
      });
      throw problemException(AUTH_ERROR_CODES.sessionInvalid, cid);
    }

    const authorization = await this.support.authorizeWorkspace(
      authorizationDecisions,
      user,
      cid,
    );

    await this.support.recordAudit({
      event_type: AUTH_LEGACY_AUDIT_EVENT_TYPES.workspaceAccessAllowed,
      actor_id: user.id,
      decision: AUDIT_DECISIONS.allow,
      correlationId: cid,
    });

    return {
      ok: true,
      user_id: user.id,
      display_name: user.displayName ?? user.email.toString(),
      role: authorization.role,
      session_expires_at: new Date(session.expiresAt).toISOString(),
      mfa_verified: session.isMfaVerified(),
      correlationId: cid,
    };
  }
}
