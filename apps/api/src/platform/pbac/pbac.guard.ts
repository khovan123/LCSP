import {
  type CanActivate,
  type ExecutionContext,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  type HttpException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AUTH_ERROR_CODES } from "@lcsp/contracts/auth";
import {
  PBAC_DECISION,
  PBAC_ACTIONS,
  PBAC_METADATA_TYPES,
  PBAC_REASON_CODE,
  type PbacDecisionValue,
  type PbacReasonCode,
} from "@lcsp/contracts/pbac";
import { AUDIT_RESOURCE_TYPES } from "@lcsp/contracts/audit";

import { PrismaAuthorizationDecisionRepository } from "../../modules/auth-workspace/infrastructure/persistence/prisma-auth-workspace.repositories.js";
import { createCorrelationId } from "../../modules/auth-workspace/infrastructure/security/security.utils.js";
import type { AuthorizationDecisionRepository } from "../../modules/auth-workspace/application/ports/persistence/authorization-decision.repository.js";
import {
  PBAC_METADATA_KEY,
  type PbacMetadata,
} from "./decorators/pbac-metadata.js";
import { ALLOW_PENDING_MFA_METADATA_KEY } from "./decorators/allow-pending-mfa.decorator.js";
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
import { problemException } from "../problems/problem-factory.js";

const DECISION_LOG_RESOURCE_TYPE = AUDIT_RESOURCE_TYPES.httpRoute;

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
    const allowPendingMfa =
      this.reflector.getAllAndOverride<boolean | undefined>(
        ALLOW_PENDING_MFA_METADATA_KEY,
        [context.getHandler(), context.getClass()],
      ) === true;
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

    const candidateActions =
      metadata.type === PBAC_METADATA_TYPES.action
        ? [metadata.action]
        : metadata.type === PBAC_METADATA_TYPES.actionAny
          ? metadata.actions
          : [];
    const action = candidateActions[0] ?? PBAC_ACTIONS.sessionVerify;

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
      throw problemException(AUTH_ERROR_CODES.sessionInvalid, correlationId, {
        status: HttpStatus.UNAUTHORIZED,
      });
    }

    const loaderResult = await this.loader.load(token, Date.now(), {
      allowPendingMfa,
    });

    if (!loaderResult.ok) {
      await this.recordDecision({
        organizationId: null,
        action,
        decision: PBAC_DECISION.deny,
        reasonCode: loaderResult.reason,
        policyId: null,
        policyVersion: null,
        correlationId,
      });
      throw this.exceptionFor(
        loaderResult,
        correlationId,
        metadata.membershipMissingAsPbacDenied === true,
      );
    }

    const { session, membership, policy } = loaderResult;
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

    if (metadata.type === PBAC_METADATA_TYPES.session) {
      // @RequireSession() — session + active membership only, no PBAC action gate.
      request.pbacContext = {
        userId: session.userId,
        sessionId: session.id,
        organizationId: session.organizationId,
        subjectRole: subjectRole as SubjectRole,
        scope: readStringAttribute(membership.subjectAttributes.scope) ?? null,
        grantedActions: policy.actions,
        selectedAction: null,
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

    const deniedDecisions: Array<{
      action: string;
      decision: PbacDecisionResult;
    }> = [];
    let allowed: { action: string; decision: PbacDecisionResult } | undefined;

    for (const candidateAction of candidateActions) {
      const evaluationContext: PbacEvaluationContext = {
        action: candidateAction,
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
          action: candidateAction,
          decision: PBAC_DECISION.deny,
          reasonCode: PBAC_REASON_CODE.evaluatorError,
          policyId: policy.id,
          policyVersion: policy.version,
          correlationId,
        });
        throw this.pbacDenied(correlationId);
      }

      if (decision.decision === PBAC_DECISION.allow) {
        allowed = { action: candidateAction, decision };
        break;
      }
      deniedDecisions.push({ action: candidateAction, decision });
    }

    if (!allowed) {
      for (const denied of deniedDecisions) {
        await this.recordDecision({
          organizationId: session.organizationId,
          action: denied.action,
          decision: PBAC_DECISION.deny,
          reasonCode: denied.decision.reasonCode ?? PBAC_REASON_CODE.denied,
          policyId: denied.decision.policyId || null,
          policyVersion: denied.decision.policyVersion || null,
          correlationId,
        });
      }
      throw this.pbacDenied(correlationId);
    }

    request.pbacContext = {
      userId: session.userId,
      sessionId: session.id,
      organizationId: session.organizationId,
      subjectRole: subjectRole as SubjectRole,
      scope: readStringAttribute(membership.subjectAttributes.scope) ?? null,
      grantedActions: policy.actions,
      selectedAction: allowed.action,
      policyId: allowed.decision.policyId ?? null,
      policyVersion: allowed.decision.policyVersion ?? null,
    };

    await this.recordDecision({
      organizationId: session.organizationId,
      action: allowed.action,
      decision: PBAC_DECISION.allow,
      reasonCode: PBAC_REASON_CODE.authorized,
      policyId: allowed.decision.policyId,
      policyVersion: allowed.decision.policyVersion,
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
    denial:
      | { reason: PbacContextDenialReason; mfaEnrolled?: boolean }
      | PbacContextDenialReason,
    correlationId: string,
    membershipMissingAsPbacDenied = false,
  ): HttpException {
    const reason = typeof denial === "string" ? denial : denial.reason;
    switch (reason) {
      case PBAC_REASON_CODE.sessionInvalid:
        return problemException(
          AUTH_ERROR_CODES.sessionInvalid,
          correlationId,
          {
            status: HttpStatus.UNAUTHORIZED,
          },
        );
      case PBAC_REASON_CODE.mfaRequired:
        return problemException(AUTH_ERROR_CODES.mfaRequired, correlationId, {
          meta:
            typeof denial === "string"
              ? undefined
              : {
                  mfaEnrolled: denial.mfaEnrolled === true,
                },
          status: HttpStatus.UNAUTHORIZED,
        });
      case PBAC_REASON_CODE.membershipMissing:
        if (membershipMissingAsPbacDenied) {
          return this.pbacDenied(correlationId);
        }
        return problemException(
          AUTH_ERROR_CODES.membershipMissing,
          correlationId,
          {
            status: HttpStatus.FORBIDDEN,
          },
        );
      case PBAC_REASON_CODE.policyNotFound:
      case PBAC_REASON_CODE.loadError:
        return this.pbacDenied(correlationId);
    }
  }

  private pbacDenied(correlationId: string): HttpException {
    return problemException(AUTH_ERROR_CODES.pbacDenied, correlationId, {
      status: HttpStatus.FORBIDDEN,
    });
  }

  /** Never throws — a decision-log write failure must not change the allow/deny outcome. */
  private async recordDecision(input: {
    organizationId: string | null;
    action: string;
    decision: PbacDecisionValue;
    reasonCode: PbacReasonCode;
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
