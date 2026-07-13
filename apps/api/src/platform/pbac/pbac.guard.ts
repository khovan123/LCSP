import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AUTH_ERROR_CODES } from "@lcsp/contracts/auth";

import { PrismaAuthorizationDecisionRepository } from "../../modules/auth-workspace/infrastructure/persistence/prisma-auth-workspace.repositories.js";
import { createCorrelationId } from "../../modules/auth-workspace/infrastructure/security/security.utils.js";
import type { AuthorizationDecisionRepository } from "../../modules/auth-workspace/application/ports/persistence/authorization-decision.repository.js";
import {
  PBAC_METADATA_KEY,
  type PbacMetadata,
} from "./decorators/pbac-metadata.js";
import { PbacContextLoader } from "./pbac-context.loader.js";
import { PbacEvaluatorService } from "./pbac-evaluator.service.js";
import type { PbacEvaluationContext, SubjectRole } from "./pbac.types.js";

export interface PbacRequestContext {
  userId: string;
  sessionId: string;
  organizationId: string;
  subjectRole: SubjectRole;
  scope: string | null;
  grantedActions: string[];
  policyId: string;
  policyVersion: string;
}

interface RequestWithPbac {
  headers: Record<string, string | string[] | undefined>;
  pbacContext?: PbacRequestContext;
  correlationId?: string;
}

const SESSION_CHECK_ACTION = "session:verify";
const DECISION_LOG_RESOURCE_TYPE = "HttpRoute";

@Injectable()
export class PbacGuard implements CanActivate {
  private readonly logger = new Logger(PbacGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly loader: PbacContextLoader,
    private readonly evaluator: PbacEvaluatorService,
    @Inject(PrismaAuthorizationDecisionRepository)
    private readonly decisions: AuthorizationDecisionRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const metadata = this.reflector.getAllAndOverride<PbacMetadata | undefined>(
      PBAC_METADATA_KEY,
      [context.getHandler(), context.getClass()],
    );
    const action =
      metadata?.type === "action" ? metadata.action : SESSION_CHECK_ACTION;

    const request = context.switchToHttp().getRequest<RequestWithPbac>();
    const correlationId =
      headerString(request.headers?.["x-correlation-id"]) ??
      createCorrelationId();
    request.correlationId = correlationId;

    const token = this.extractToken(request);
    if (!token) {
      await this.recordDecision({
        organizationId: null,
        action,
        decision: "deny",
        reasonCode: "SESSION_INVALID",
        policyId: null,
        policyVersion: null,
        correlationId,
      });
      throw new UnauthorizedException({
        error_code: AUTH_ERROR_CODES.sessionInvalid,
        code: AUTH_ERROR_CODES.sessionInvalid,
        correlation_id: correlationId,
      });
    }

    const result = await this.loader.load(token, Date.now());

    if (!result.ok) {
      await this.recordDecision({
        organizationId: null,
        action,
        decision: "deny",
        reasonCode: result.reason,
        policyId: null,
        policyVersion: null,
        correlationId,
      });
      throw this.exceptionFor(result.reason, correlationId);
    }

    const { session, membership, policy } = result;
    const subjectRole = membership.role() as SubjectRole;

    if (metadata?.type !== "action") {
      // @RequireSession() (or no decorator at all) — session + active
      // membership only, no PBAC action gate.
      request.pbacContext = {
        userId: session.userId,
        sessionId: session.id,
        organizationId: session.organizationId,
        subjectRole,
        scope: readStringAttribute(membership.subjectAttributes.scope) ?? null,
        grantedActions: policy.actions,
        policyId: policy.id,
        policyVersion: policy.version,
      };
      await this.recordDecision({
        organizationId: session.organizationId,
        action,
        decision: "allow",
        reasonCode: "AUTHORIZED",
        policyId: policy.id,
        policyVersion: policy.version,
        correlationId,
      });
      return true;
    }

    const evaluationContext: PbacEvaluationContext = {
      action: metadata.action,
      subject: {
        role: subjectRole,
        scope: readStringAttribute(membership.subjectAttributes.scope),
      },
      policy: {
        id: policy.id,
        organizationId: policy.organizationId,
        version: policy.version,
        subjectRole: policy.subjectRole as SubjectRole,
        stateGate: policy.stateGate,
        actions: policy.actions,
      },
      membershipStatus: membership.status,
    };

    const decision = this.evaluator.evaluate(evaluationContext);

    if (decision.decision === "deny") {
      await this.recordDecision({
        organizationId: session.organizationId,
        action: metadata.action,
        decision: "deny",
        reasonCode: decision.reasonCode ?? "PBAC_DENIED",
        policyId: decision.policyId || null,
        policyVersion: decision.policyVersion || null,
        correlationId,
      });
      throw new ForbiddenException({
        error_code: AUTH_ERROR_CODES.pbacDenied,
        code: AUTH_ERROR_CODES.pbacDenied,
        correlation_id: correlationId,
      });
    }

    request.pbacContext = {
      userId: session.userId,
      sessionId: session.id,
      organizationId: session.organizationId,
      subjectRole,
      scope: readStringAttribute(membership.subjectAttributes.scope) ?? null,
      grantedActions: policy.actions,
      policyId: decision.policyId,
      policyVersion: decision.policyVersion,
    };

    await this.recordDecision({
      organizationId: session.organizationId,
      action: metadata.action,
      decision: "allow",
      reasonCode: "AUTHORIZED",
      policyId: decision.policyId,
      policyVersion: decision.policyVersion,
      correlationId,
    });

    return true;
  }

  private extractToken(request: RequestWithPbac): string | null {
    const header = request.headers?.authorization;
    if (typeof header !== "string") return null;
    const [scheme, token] = header.split(" ");
    if (scheme !== "Bearer" || !token) return null;
    return token;
  }

  private exceptionFor(
    reason:
      | "SESSION_INVALID"
      | "MFA_REQUIRED"
      | "MEMBERSHIP_MISSING"
      | "POLICY_NOT_FOUND"
      | "LOAD_ERROR",
    correlationId: string,
  ): UnauthorizedException | ForbiddenException {
    switch (reason) {
      case "SESSION_INVALID":
        return new UnauthorizedException({
          error_code: AUTH_ERROR_CODES.sessionInvalid,
          code: AUTH_ERROR_CODES.sessionInvalid,
          correlation_id: correlationId,
        });
      case "MFA_REQUIRED":
        return new UnauthorizedException({
          error_code: AUTH_ERROR_CODES.mfaRequired,
          code: AUTH_ERROR_CODES.mfaRequired,
          correlation_id: correlationId,
        });
      case "MEMBERSHIP_MISSING":
        return new ForbiddenException({
          error_code: AUTH_ERROR_CODES.membershipMissing,
          code: AUTH_ERROR_CODES.membershipMissing,
          correlation_id: correlationId,
        });
      case "POLICY_NOT_FOUND":
      case "LOAD_ERROR":
        return new ForbiddenException({
          error_code: AUTH_ERROR_CODES.pbacDenied,
          code: AUTH_ERROR_CODES.pbacDenied,
          correlation_id: correlationId,
        });
    }
  }

  /** Never throws — a decision-log write failure must not change the allow/deny outcome. */
  private async recordDecision(input: {
    organizationId: string | null;
    action: string;
    decision: "allow" | "deny";
    reasonCode: string;
    policyId: string | null;
    policyVersion: string | null;
    correlationId: string;
  }): Promise<void> {
    try {
      await this.decisions.append({
        organization_id: input.organizationId,
        resource_type: DECISION_LOG_RESOURCE_TYPE,
        resource_id: input.action,
        action: input.action,
        decision: input.decision,
        reason_code: input.reasonCode,
        policy_id: input.policyId,
        policy_version: input.policyVersion,
        correlation_id: input.correlationId,
      });
    } catch (error) {
      this.logger.error(
        `Failed to write AuthDecisionLog (action=${input.action}, decision=${input.decision}): ${(error as Error).message}`,
      );
    }
  }
}

function readStringAttribute(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function headerString(value: string | string[] | undefined): string | null {
  if (typeof value === "string" && value.trim().length > 0) {
    return value;
  }
  if (Array.isArray(value) && typeof value[0] === "string") {
    return value[0];
  }
  return null;
}
