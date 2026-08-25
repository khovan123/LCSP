import { AUDIT_RESOURCE_TYPES } from "@lcsp/contracts/audit";
import type { AuthErrorCode } from "@lcsp/contracts/auth";
import { AUTH_ERROR_CODES } from "@lcsp/contracts/auth";
import {
  RBAC_ACTIONS,
  RBAC_DECISION,
  RBAC_METADATA_TYPES,
  RBAC_REASON_CODE,
  type RbacDecisionValue,
  type RbacReasonCode,
} from "@lcsp/contracts/rbac";
import {
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  type CanActivate,
  type ExecutionContext,
  type HttpException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";

import type { AuthenticatedRequest } from "../../common/interfaces/authenticated-request.interface.js";
import type { AuthorizationDecisionRepository } from "../../modules/auth-workspace/application/ports/persistence/authorization-decision.repository.js";
import { PrismaAuthorizationDecisionRepository } from "../../modules/auth-workspace/infrastructure/persistence/prisma-auth-workspace.repositories.js";
import { createCorrelationId } from "../../modules/auth-workspace/infrastructure/security/security.utils.js";
import { problemException } from "../problems/problem-factory.js";
import { RE_AUTH_FOR_SENSITIVE_ROUTE_METADATA_KEY } from "../security/decorators/re-auth-for-sensitive-route.decorator.js";
import { isSensitiveActionVerificationFresh } from "../security/sensitive-route-policy.js";
import { ALLOW_PENDING_MFA_METADATA_KEY } from "./decorators/allow-pending-mfa.decorator.js";
import {
  RBAC_METADATA_KEY,
  type RbacMetadata,
} from "./decorators/rbac-metadata.js";
import {
  RbacContextLoader,
  type RbacContextDenialReason,
} from "./rbac-context.loader.js";
import { RbacEvaluatorService } from "./rbac-evaluator.service.js";
import type { RbacDecisionResult, RbacEvaluationContext } from "./rbac.types.js";

const DECISION_LOG_RESOURCE_TYPE = AUDIT_RESOURCE_TYPES.httpRoute;

@Injectable()
export class RbacGuard implements CanActivate {
  private readonly logger = new Logger(RbacGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly loader: RbacContextLoader,
    private readonly evaluator: RbacEvaluatorService,
    @Inject(PrismaAuthorizationDecisionRepository)
    private readonly decisions: AuthorizationDecisionRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const metadata = this.reflector.getAllAndOverride<RbacMetadata | undefined>(
      RBAC_METADATA_KEY,
      [context.getHandler(), context.getClass()],
    );
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const correlationId =
      headerString(request.headers?.["x-correlation-id"]) ??
      createCorrelationId();
    request.correlationId = correlationId;

    if (!metadata) {
      await this.recordDecision({
        actorId: null,
        sessionId: null,
        organizationId: null,
        resourceId: requestResourceId(request, RBAC_ACTIONS.metadataCheck),
        action: RBAC_ACTIONS.metadataCheck,
        decision: RBAC_DECISION.deny,
        reasonCode: RBAC_REASON_CODE.metadataMissing,
        correlationId,
      });
      throw this.rbacDenied(correlationId);
    }

    const candidateActions =
      metadata.type === RBAC_METADATA_TYPES.action
        ? [metadata.action]
        : metadata.type === RBAC_METADATA_TYPES.actionAny
          ? metadata.actions
          : [];
    const action = candidateActions[0] ?? RBAC_ACTIONS.sessionVerify;
    const resourceId = requestResourceId(request, action);
    const token = this.extractToken(request);

    if (!token) {
      await this.recordDecision({
        actorId: null,
        sessionId: null,
        organizationId: null,
        resourceId,
        action,
        decision: RBAC_DECISION.deny,
        reasonCode: RBAC_REASON_CODE.sessionInvalid,
        correlationId,
      });
      throw problemException(AUTH_ERROR_CODES.sessionInvalid, correlationId, {
        status: HttpStatus.UNAUTHORIZED,
      });
    }

    const loaderResult = await this.loader.load(token, Date.now(), {
      allowPendingMfa:
        this.reflector.getAllAndOverride<boolean | undefined>(
          ALLOW_PENDING_MFA_METADATA_KEY,
          [context.getHandler(), context.getClass()],
        ) === true,
    });

    if (!loaderResult.ok) {
      await this.recordDecision({
        actorId: null,
        sessionId: null,
        organizationId: null,
        resourceId,
        action,
        decision: RBAC_DECISION.deny,
        reasonCode: loaderResult.reason,
        correlationId,
      });
      throw this.exceptionFor(
        loaderResult,
        correlationId,
        metadata.membershipMissingAsRbacDenied === true,
      );
    }

    const { session, user, membershipStatus, grantedActions } = loaderResult;
    const requiresSensitiveReauth =
      this.reflector.getAllAndOverride<boolean | undefined>(
        RE_AUTH_FOR_SENSITIVE_ROUTE_METADATA_KEY,
        [context.getHandler(), context.getClass()],
      ) === true;

    if (metadata.type === RBAC_METADATA_TYPES.session) {
      await this.enforceSensitiveReauth({
        required: requiresSensitiveReauth,
        session,
        resourceId,
        action,
        correlationId,
      });
      request.rbacContext = {
        userId: session.userId,
        sessionId: session.id,
        organizationId: session.organizationId,
        role: user.role,
        scope: resourceId,
        grantedActions,
        selectedAction: null,
      };
      await this.recordDecision({
        actorId: session.userId,
        sessionId: session.id,
        organizationId: session.organizationId,
        resourceId,
        action,
        decision: RBAC_DECISION.allow,
        reasonCode: RBAC_REASON_CODE.authorized,
        correlationId,
      });
      return true;
    }

    const deniedDecisions: Array<{
      action: string;
      decision: RbacDecisionResult;
    }> = [];
    let allowed: { action: string; decision: RbacDecisionResult } | undefined;

    for (const candidateAction of candidateActions) {
      const evaluationContext: RbacEvaluationContext = {
        organizationId: session.organizationId,
        action: candidateAction,
        subject: { role: user.role },
        grantedActions,
        membershipStatus,
      };
      const decision = this.evaluator.evaluate(evaluationContext);
      if (decision.decision === RBAC_DECISION.allow) {
        allowed = { action: candidateAction, decision };
        break;
      }
      deniedDecisions.push({ action: candidateAction, decision });
    }

    if (!allowed) {
      for (const denied of deniedDecisions) {
        await this.recordDecision({
          actorId: session.userId,
          sessionId: session.id,
          organizationId: session.organizationId,
          resourceId,
          action: denied.action,
          decision: RBAC_DECISION.deny,
          reasonCode: denied.decision.reasonCode ?? RBAC_REASON_CODE.denied,
          correlationId,
        });
      }
      throw this.rbacDenied(correlationId);
    }

    await this.enforceSensitiveReauth({
      required: requiresSensitiveReauth,
      session,
      resourceId,
      action: allowed.action,
      correlationId,
    });
    request.rbacContext = {
      userId: session.userId,
      sessionId: session.id,
      organizationId: session.organizationId,
      role: user.role,
      scope: resourceId,
      grantedActions,
      selectedAction: allowed.action,
    };
    await this.recordDecision({
      actorId: session.userId,
      sessionId: session.id,
      organizationId: session.organizationId,
      resourceId,
      action: allowed.action,
      decision: RBAC_DECISION.allow,
      reasonCode: RBAC_REASON_CODE.authorized,
      correlationId,
    });
    return true;
  }

  private extractToken(request: AuthenticatedRequest): string | null {
    const header = request.headers?.authorization;
    if (typeof header !== "string") return null;
    const [scheme, token] = header.split(" ");
    if (scheme !== "Bearer" || !token) return null;
    return token;
  }

  private async enforceSensitiveReauth(input: {
    required: boolean;
    session: {
      id: string;
      userId: string;
      organizationId: string;
      sensitiveActionVerifiedAt: number | null;
    };
    resourceId: string;
    action: string;
    correlationId: string;
  }): Promise<void> {
    if (
      !input.required ||
      isSensitiveActionVerificationFresh(
        input.session.sensitiveActionVerifiedAt,
        Date.now(),
      )
    ) {
      return;
    }

    await this.recordDecision({
      actorId: input.session.userId,
      sessionId: input.session.id,
      organizationId: input.session.organizationId,
      resourceId: input.resourceId,
      action: input.action,
      decision: RBAC_DECISION.deny,
      reasonCode: AUTH_ERROR_CODES.reauthRequired,
      correlationId: input.correlationId,
    });
    throw problemException(
      AUTH_ERROR_CODES.reauthRequired,
      input.correlationId,
      { status: HttpStatus.FORBIDDEN },
    );
  }

  private exceptionFor(
    denial:
      | { reason: RbacContextDenialReason; mfaEnrolled?: boolean }
      | RbacContextDenialReason,
    correlationId: string,
    membershipMissingAsRbacDenied = false,
  ): HttpException {
    const reason = typeof denial === "string" ? denial : denial.reason;
    switch (reason) {
      case RBAC_REASON_CODE.sessionInvalid:
        return problemException(
          AUTH_ERROR_CODES.sessionInvalid,
          correlationId,
          { status: HttpStatus.UNAUTHORIZED },
        );
      case RBAC_REASON_CODE.mfaRequired:
        return problemException(AUTH_ERROR_CODES.mfaRequired, correlationId, {
          meta:
            typeof denial === "string"
              ? undefined
              : { mfaEnrolled: denial.mfaEnrolled === true },
          status: HttpStatus.UNAUTHORIZED,
        });
      case RBAC_REASON_CODE.membershipMissing:
        if (membershipMissingAsRbacDenied) return this.rbacDenied(correlationId);
        return problemException(
          AUTH_ERROR_CODES.membershipMissing,
          correlationId,
          { status: HttpStatus.FORBIDDEN },
        );
      case RBAC_REASON_CODE.loadError:
        return this.rbacDenied(correlationId);
    }
  }

  private rbacDenied(correlationId: string): HttpException {
    return problemException(AUTH_ERROR_CODES.rbacDenied, correlationId, {
      status: HttpStatus.FORBIDDEN,
    });
  }

  private async recordDecision(input: {
    actorId: string | null;
    sessionId: string | null;
    organizationId: string | null;
    resourceId: string;
    action: string;
    decision: RbacDecisionValue;
    reasonCode: AuthErrorCode | RbacReasonCode;
    correlationId: string;
  }): Promise<void> {
    try {
      await this.decisions.append({
        actor_id: input.actorId,
        session_id: input.sessionId,
        organization_id: input.organizationId,
        resource_type: DECISION_LOG_RESOURCE_TYPE,
        resource_id: input.resourceId,
        action: input.action,
        decision: input.decision,
        reason_code: input.reasonCode,
        correlationId: input.correlationId,
      });
    } catch (error) {
      this.logger.error(
        `Failed to write AuthDecisionLog (action=${input.action}, decision=${input.decision}): ${(error as Error).message}`,
      );
    }
  }
}

function headerString(value: string | string[] | undefined): string | null {
  if (typeof value === "string" && value.trim().length > 0) return value;
  if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  return null;
}

function readStringAttribute(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function requestResourceId(
  request: AuthenticatedRequest,
  fallbackAction: string,
): string {
  const params = request.params;
  const assessmentId = readStringAttribute(params.assessmentId);
  const conflictId = readStringAttribute(params.conflictId);
  const userId = readStringAttribute(params.userId);
  const orgId =
    readStringAttribute(params.orgId) ?? readStringAttribute(params.id);

  if (assessmentId && conflictId)
    return `assessment:${assessmentId}:conflict:${conflictId}`;
  if (assessmentId) return `assessment:${assessmentId}`;
  if (userId) return `user:${userId}`;
  if (orgId) return `organization:${orgId}`;

  const method = request.method;
  const routePath = readStringAttribute(request.route?.path);
  if (method && routePath) return `${method} ${routePath}`;

  const originalUrl = request.originalUrl;
  if (method && originalUrl) return `${method} ${originalUrl.split("?")[0]}`;

  return fallbackAction;
}
