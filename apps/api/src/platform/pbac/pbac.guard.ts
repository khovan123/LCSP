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
import {
  PBAC_DECISION,
  PBAC_ACTIONS,
  PBAC_REASON_CODE,
  type PbacDecisionValue,
} from "@lcsp/contracts/pbac";

import { PrismaAuthorizationDecisionRepository } from "../../modules/auth-workspace/infrastructure/persistence/prisma-auth-workspace.repositories.js";
import { createCorrelationId } from "../../modules/auth-workspace/infrastructure/security/security.utils.js";
import type { AuthorizationDecisionRepository } from "../../modules/auth-workspace/application/ports/persistence/authorization-decision.repository.js";
import {
  PBAC_METADATA_KEY,
  type PbacMetadata,
} from "./decorators/pbac-metadata.js";
import {
  PbacContextLoader,
  type PbacContextDenialReason,
} from "./pbac-context.loader.js";
import { PbacEvaluatorService } from "./pbac-evaluator.service.js";
import type {
  PbacDecisionResult,
  PbacEvaluationContext,
  SubjectRole,
} from "./pbac.types.js";

import type { AuthenticatedRequest } from "../../common/interfaces/authenticated-request.interface.js";

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
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const correlationId =
      headerString(request.headers?.["x-correlation-id"]) ??
      createCorrelationId();
    request.correlationId = correlationId;

    if (!metadata) {
      await this.recordDecision({
        organizationId: null,
        action: PBAC_ACTIONS.metadataCheck,
        decision: PBAC_DECISION.deny,
        reasonCode: PBAC_REASON_CODE.metadataMissing,
        policyId: null,
        policyVersion: null,
        correlationId,
      });
      throw this.pbacDenied(correlationId);
    }

    const action =
      metadata.type === "action" ? metadata.action : PBAC_ACTIONS.sessionVerify;

    const token = this.extractToken(request);
    if (!token) {
      await this.recordDecision({
        organizationId: null,
        action,
        decision: PBAC_DECISION.deny,
        reasonCode: PBAC_REASON_CODE.sessionInvalid,
        policyId: null,
        policyVersion: null,
        correlationId,
      });
      throw new UnauthorizedException({
        error_code: AUTH_ERROR_CODES.sessionInvalid,
        correlation_id: correlationId,
      });
    }

    const result = await this.loader.load(token, Date.now());

    if (!result.ok) {
      await this.recordDecision({
        organizationId: null,
        action,
        decision: PBAC_DECISION.deny,
        reasonCode: result.reason,
        policyId: null,
        policyVersion: null,
        correlationId,
      });
      throw this.exceptionFor(result.reason, correlationId);
    }

    const { session, membership, policy } = result;
    const subjectRole = membership.role();
    if (!subjectRole) {
      await this.recordDecision({
        organizationId: session.organizationId,
        action,
        decision: PBAC_DECISION.deny,
        reasonCode: PBAC_REASON_CODE.subjectAttributeMissing,
        policyId: policy.id,
        policyVersion: policy.version,
        correlationId,
      });
      throw this.pbacDenied(correlationId);
    }

    if (metadata.type !== "action") {
      // @RequireSession() — session + active membership only, no PBAC action gate.
      request.pbacContext = {
        userId: session.userId,
        sessionId: session.id,
        organizationId: session.organizationId,
        subjectRole: subjectRole as SubjectRole,
        scope: readStringAttribute(membership.subjectAttributes.scope) ?? null,
        grantedActions: policy.actions,
        policyId: policy.id,
        policyVersion: policy.version,
      };
      await this.recordDecision({
        organizationId: session.organizationId,
        action,
        decision: PBAC_DECISION.allow,
        reasonCode: PBAC_REASON_CODE.authorized,
        policyId: policy.id,
        policyVersion: policy.version,
        correlationId,
      });
      return true;
    }

    const evaluationContext: PbacEvaluationContext = {
      action: metadata.action,
      subject: {
        role: subjectRole as SubjectRole,
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

    let decision: PbacDecisionResult;
    try {
      decision = this.evaluator.evaluate(evaluationContext);
    } catch (error) {
      this.logger.error(
        `PBAC evaluator threw — defaulting to deny: ${(error as Error).message}`,
      );
      await this.recordDecision({
        organizationId: session.organizationId,
        action: metadata.action,
        decision: PBAC_DECISION.deny,
        reasonCode: PBAC_REASON_CODE.evaluatorError,
        policyId: policy.id,
        policyVersion: policy.version,
        correlationId,
      });
      throw this.pbacDenied(correlationId);
    }

    if (decision.decision === PBAC_DECISION.deny) {
      await this.recordDecision({
        organizationId: session.organizationId,
        action: metadata.action,
        decision: PBAC_DECISION.deny,
        reasonCode: decision.reasonCode ?? PBAC_REASON_CODE.denied,
        policyId: decision.policyId || null,
        policyVersion: decision.policyVersion || null,
        correlationId,
      });
      throw this.pbacDenied(correlationId);
    }

    request.pbacContext = {
      userId: session.userId,
      sessionId: session.id,
      organizationId: session.organizationId,
      subjectRole: subjectRole as SubjectRole,
      scope: readStringAttribute(membership.subjectAttributes.scope) ?? null,
      grantedActions: policy.actions,
      policyId: decision.policyId ?? null,
      policyVersion: decision.policyVersion ?? null,
    };

    await this.recordDecision({
      organizationId: session.organizationId,
      action: metadata.action,
      decision: PBAC_DECISION.allow,
      reasonCode: PBAC_REASON_CODE.authorized,
      policyId: decision.policyId,
      policyVersion: decision.policyVersion,
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

  private exceptionFor(
    reason: PbacContextDenialReason,
    correlationId: string,
  ): UnauthorizedException | ForbiddenException {
    switch (reason) {
      case PBAC_REASON_CODE.sessionInvalid:
        return new UnauthorizedException({
          error_code: AUTH_ERROR_CODES.sessionInvalid,
          correlation_id: correlationId,
        });
      case PBAC_REASON_CODE.mfaRequired:
        return new UnauthorizedException({
          error_code: AUTH_ERROR_CODES.mfaRequired,
          correlation_id: correlationId,
        });
      case PBAC_REASON_CODE.membershipMissing:
        return new ForbiddenException({
          error_code: AUTH_ERROR_CODES.membershipMissing,
          correlation_id: correlationId,
        });
      case PBAC_REASON_CODE.policyNotFound:
      case PBAC_REASON_CODE.loadError:
        return this.pbacDenied(correlationId);
    }
  }

  private pbacDenied(correlationId: string): ForbiddenException {
    return new ForbiddenException({
      error_code: AUTH_ERROR_CODES.pbacDenied,
      correlation_id: correlationId,
    });
  }

  /** Never throws — a decision-log write failure must not change the allow/deny outcome. */
  private async recordDecision(input: {
    organizationId: string | null;
    action: string;
    decision: PbacDecisionValue;
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
