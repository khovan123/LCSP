import { ASSESSMENT_STATUS_CODES } from "@lcsp/contracts/assessment";
import {
  ASSESSMENT_PIPELINE_CONTINUE_ACTIONS,
  ASSESSMENT_PIPELINE_CONTINUE_PROBLEM_CODES,
  ASSESSMENT_PIPELINE_CONTINUE_RERUN_REASON,
  ASSESSMENT_PIPELINE_LIVENESS_WINDOW_SECONDS,
  type AssessmentPipelineContinueResult,
} from "@lcsp/contracts/evidence";
import { HttpStatus, Injectable } from "@nestjs/common";
import { CommandBus } from "@nestjs/cqrs";

import { fromPrismaAssessmentStatus } from "../../../../infrastructure/prisma/prisma-enum-mappers.js";
import { PrismaService } from "../../../../infrastructure/prisma/prisma.service.js";
import { problemException } from "../../../../platform/http/filters/error.factory.js";
import type { RbacRequestContext } from "../../../../platform/rbac/interfaces/rbac-request.interface.js";
import { AssessmentRuntimeEventService } from "../../../../platform/runtime-events/assessment-runtime-event.service.js";
import { RerunClassificationCommand } from "../../../classification/application/commands/rerun-classification/rerun-classification.command.js";
import { AssessmentInterviewRuntimeService } from "./assessment-interview-runtime.service.js";
import { AssessmentModelCreditPreflight } from "./assessment-model-credit-preflight.js";

const FINISHED_ASSESSMENT_STATUSES = new Set<string>([
  ASSESSMENT_STATUS_CODES.aiNotDetected,
  ASSESSMENT_STATUS_CODES.readyForReview,
]);

/**
 * One Customer "Continue" for a paused or stopped assessment pipeline. The API,
 * not the browser, decides which step to restart: a failed or stalled Interview
 * turn is re-run, otherwise the accepted technical evidence is re-sent so the
 * gated engineering assessment (rules, planner, investigation, gate) resumes
 * from the governed Interview context already on record.
 */
@Injectable()
export class AssessmentPipelineContinuationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly commandBus: CommandBus,
    private readonly interviewRuntime: AssessmentInterviewRuntimeService,
    private readonly runtimeEvents: AssessmentRuntimeEventService,
    private readonly creditPreflight: AssessmentModelCreditPreflight,
  ) {}

  async continuePipeline(input: {
    assessmentId: string;
    actor: RbacRequestContext;
    correlationId: string;
  }): Promise<AssessmentPipelineContinueResult> {
    await this.interviewRuntime.assertAssessmentVisible(
      input.assessmentId,
      input.actor,
    );
    const assessment = await this.prisma.assessment.findUnique({
      where: { id: input.assessmentId },
      select: { status: true },
    });
    if (
      assessment &&
      FINISHED_ASSESSMENT_STATUSES.has(
        fromPrismaAssessmentStatus(assessment.status),
      )
    ) {
      throw this.conflict(
        ASSESSMENT_PIPELINE_CONTINUE_PROBLEM_CODES.completed,
        input.correlationId,
      );
    }
    const liveness = await this.runtimeEvents.getPipelineLiveness(
      input.assessmentId,
      ASSESSMENT_PIPELINE_LIVENESS_WINDOW_SECONDS * 1_000,
    );
    if (liveness.live) {
      throw this.conflict(
        ASSESSMENT_PIPELINE_CONTINUE_PROBLEM_CODES.alreadyRunning,
        input.correlationId,
        {
          lastActivityAt: liveness.lastActivityAt?.toISOString() ?? "",
          retryAfterSeconds: String(
            ASSESSMENT_PIPELINE_LIVENESS_WINDOW_SECONDS,
          ),
        },
      );
    }
    const interview = await this.interviewRuntime.pipelineInterviewStatus(
      input.assessmentId,
    );
    if (interview.awaitingCustomer) {
      throw this.conflict(
        ASSESSMENT_PIPELINE_CONTINUE_PROBLEM_CODES.waitingForCustomer,
        input.correlationId,
      );
    }
    if (interview.pendingTurn) {
      await this.interviewRuntime.resumeFailedTurn({
        assessmentId: input.assessmentId,
        actor: input.actor,
        correlationId: input.correlationId,
        resume: {},
        allowStalled: true,
      });
      return {
        action: ASSESSMENT_PIPELINE_CONTINUE_ACTIONS.interviewTurnResumed,
      };
    }
    await this.creditPreflight.assertAvailable(
      input.assessmentId,
      input.correlationId,
    );
    await this.commandBus.execute(
      new RerunClassificationCommand(
        input.assessmentId,
        input.actor,
        input.correlationId,
        ASSESSMENT_PIPELINE_CONTINUE_RERUN_REASON,
      ),
    );
    return { action: ASSESSMENT_PIPELINE_CONTINUE_ACTIONS.downstreamRequeued };
  }

  private conflict(
    code: string,
    correlationId: string,
    meta?: Record<string, string>,
  ) {
    return problemException(code, correlationId, {
      status: HttpStatus.CONFLICT,
      meta,
    });
  }
}
