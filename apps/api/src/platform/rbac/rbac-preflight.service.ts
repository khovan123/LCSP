import { AUDIT_RESOURCE_TYPES } from "@lcsp/contracts/audit";
import {
  actionsForRole,
  RBAC_DECISION,
  RBAC_REASON_CODE,
  type RbacDecisionValue,
  type RbacReasonCode,
} from "@lcsp/contracts/rbac";
import { Inject, Injectable, Logger } from "@nestjs/common";

import type { AuthorizationDecisionRepository } from "../../modules/auth-workspace/application/ports/persistence/authorization-decision.repository.js";
import type { UserRepository } from "../../modules/auth-workspace/application/ports/persistence/user.repository.js";
import {
  PrismaAuthorizationDecisionRepository,
  PrismaUserRepository,
} from "../../modules/auth-workspace/infrastructure/persistence/prisma-auth-workspace.repositories.js";
import { RbacEvaluatorService } from "./rbac-evaluator.service.js";
import type { RbacEvaluationContext } from "./rbac.types.js";

export interface RbacPreflightInput {
  userId: string;
  action: string;
  correlationId: string;
}

export interface RbacPreflightResult {
  decision: RbacDecisionValue;
  reasonCode: RbacReasonCode | null;
  correlationId: string;
}

const DECISION_LOG_RESOURCE_TYPE = AUDIT_RESOURCE_TYPES.workerTask;

@Injectable()
export class RbacPreflightService {
  private readonly logger = new Logger(RbacPreflightService.name);

  constructor(
    @Inject(PrismaUserRepository)
    private readonly users: UserRepository,
    private readonly evaluator: RbacEvaluatorService,
    @Inject(PrismaAuthorizationDecisionRepository)
    private readonly decisions: AuthorizationDecisionRepository,
  ) {}

  async evaluate(input: RbacPreflightInput): Promise<RbacPreflightResult> {
    try {
      const user = await this.users.findById(input.userId);
      if (!user) {
        return this.deny(input, RBAC_REASON_CODE.loadError);
      }

      const evaluationContext: RbacEvaluationContext = {
        action: input.action,
        subject: { role: user.role },
        grantedActions: actionsForRole(user.role),
      };
      const result = this.evaluator.evaluate(evaluationContext);
      const reasonCode =
        result.decision === RBAC_DECISION.deny
          ? (result.reasonCode ?? RBAC_REASON_CODE.denied)
          : RBAC_REASON_CODE.authorized;

      await this.recordDecision(input, result.decision, reasonCode);
      return {
        decision: result.decision,
        reasonCode: result.decision === RBAC_DECISION.deny ? reasonCode : null,
        correlationId: input.correlationId,
      };
    } catch (error) {
      this.logger.error(
        `RBAC preflight evaluation failed (action=${input.action}): ${(error as Error).message}`,
      );
      await this.recordDecision(
        input,
        RBAC_DECISION.deny,
        RBAC_REASON_CODE.loadError,
      );
      return {
        decision: RBAC_DECISION.deny,
        reasonCode: RBAC_REASON_CODE.loadError,
        correlationId: input.correlationId,
      };
    }
  }

  private async deny(
    input: RbacPreflightInput,
    reasonCode: RbacReasonCode,
  ): Promise<RbacPreflightResult> {
    await this.recordDecision(input, RBAC_DECISION.deny, reasonCode);
    return {
      decision: RBAC_DECISION.deny,
      reasonCode,
      correlationId: input.correlationId,
    };
  }

  private async recordDecision(
    input: RbacPreflightInput,
    decision: RbacDecisionValue,
    reasonCode: RbacReasonCode,
  ): Promise<void> {
    try {
      await this.decisions.append({
        actor_id: input.userId,
        session_id: null,
        resource_type: DECISION_LOG_RESOURCE_TYPE,
        resource_id: input.action,
        action: input.action,
        decision,
        reason_code: reasonCode,
        correlationId: input.correlationId,
      });
    } catch (error) {
      this.logger.error(
        `Failed to write AuthDecisionLog for worker preflight (action=${input.action}): ${(error as Error).message}`,
      );
    }
  }
}
