import { ASSESSMENT_ERROR_CODES } from "@lcsp/contracts/assessment";
import { AUTH_USER_ROLES } from "@lcsp/contracts/auth";
import {
  ASSESSMENT_INTERVIEW_BLOCKED_ACTIONS,
  ASSESSMENT_INTERVIEW_OUTCOMES,
  type AssessmentInterviewAnswerInput,
  type AssessmentInterviewBlockedInput,
  type AssessmentInterviewRuntimeState,
} from "@lcsp/contracts/evidence";
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  AssessmentRuntimeEventType,
  AssessmentRuntimeRunStatus,
  AssessmentRuntimeStage,
  type Prisma,
} from "@prisma/client";

import { PrismaService } from "../../../../infrastructure/prisma/prisma.service.js";
import type { RbacRequestContext } from "../../../../platform/rbac/interfaces/rbac-request.interface.js";

const INTERVIEW_TOOL_NAME = "assessment_interview";

@Injectable()
export class AssessmentInterviewRuntimeService {
  constructor(private readonly prisma: PrismaService) {}

  async getState(
    assessmentId: string,
    actor: RbacRequestContext,
  ): Promise<AssessmentInterviewRuntimeState> {
    await this.assertAssessmentVisible(assessmentId, actor);
    const latest = await this.latestInterviewEvent(assessmentId);
    return this.stateFromEvent(assessmentId, latest);
  }

  async submitAnswer(input: {
    assessmentId: string;
    actor: RbacRequestContext;
    correlationId: string;
    answer: AssessmentInterviewAnswerInput;
  }): Promise<AssessmentInterviewRuntimeState> {
    const answer = parseAnswer(input.answer);
    await this.assertAssessmentVisible(input.assessmentId, input.actor);
    const latest = await this.latestInterviewEvent(input.assessmentId);
    const priorState = this.stateFromEvent(input.assessmentId, latest);
    const contextRevision = (priorState.contextRevision ?? 0) + 1;
    const state: AssessmentInterviewRuntimeState = {
      outcome: ASSESSMENT_INTERVIEW_OUTCOMES.contextReady,
      threadId: this.threadId(input.assessmentId),
      contextRevision,
      orchestrationRequested: true,
      audit: this.auditRef(
        input.assessmentId,
        input.actor.userId,
        input.correlationId,
        {
          contextRevision,
          priorRevision: priorState.contextRevision,
          newRevision: contextRevision,
          relatedQuestionId: answer.questionId,
        },
      ),
    };

    await this.recordInterviewEvent({
      assessmentId: input.assessmentId,
      correlationId: input.correlationId,
      eventType: AssessmentRuntimeEventType.TOOL_COMPLETED,
      runStatus: AssessmentRuntimeRunStatus.RUNNING,
      summary:
        "Customer interview answer persisted; orchestration resume requested.",
      inputSummaryJson: toJson({ answer }),
      outputSummaryJson: toJson({ assessmentInterview: state }),
    });
    return state;
  }

  async recordBlockedAction(input: {
    assessmentId: string;
    actor: RbacRequestContext;
    correlationId: string;
    blocked: AssessmentInterviewBlockedInput;
  }): Promise<AssessmentInterviewRuntimeState> {
    const blocked = parseBlockedAction(input.blocked);
    await this.assertAssessmentVisible(input.assessmentId, input.actor);
    const latest = await this.latestInterviewEvent(input.assessmentId);
    const current = this.stateFromEvent(input.assessmentId, latest);
    const state: AssessmentInterviewRuntimeState = {
      ...current,
      outcome: ASSESSMENT_INTERVIEW_OUTCOMES.blockedOrUnresolved,
      threadId: this.threadId(input.assessmentId),
      blockedActions: Object.values(ASSESSMENT_INTERVIEW_BLOCKED_ACTIONS),
      orchestrationRequested:
        blocked.action ===
        ASSESSMENT_INTERVIEW_BLOCKED_ACTIONS.provideMoreContext,
      audit: this.auditRef(
        input.assessmentId,
        input.actor.userId,
        input.correlationId,
        {
          contextRevision: current.contextRevision ?? 0,
        },
      ),
    };

    await this.recordInterviewEvent({
      assessmentId: input.assessmentId,
      correlationId: input.correlationId,
      eventType: AssessmentRuntimeEventType.TOOL_WAITING_INPUT,
      runStatus: AssessmentRuntimeRunStatus.WAITING,
      summary: "Customer selected an unresolved Interview action.",
      inputSummaryJson: toJson({ blocked }),
      outputSummaryJson: toJson({ assessmentInterview: state }),
      waitingReason: blocked.action,
    });
    return state;
  }

  private async assertAssessmentVisible(
    assessmentId: string,
    actor: RbacRequestContext,
  ): Promise<void> {
    const assessment = await this.prisma.assessment.findUnique({
      where: { id: assessmentId },
      select: { id: true, ownerId: true },
    });
    if (!assessment) {
      throw new NotFoundException({ code: ASSESSMENT_ERROR_CODES.notFound });
    }
    if (
      actor.role === AUTH_USER_ROLES.customer &&
      assessment.ownerId !== actor.userId
    ) {
      throw new NotFoundException({ code: ASSESSMENT_ERROR_CODES.notFound });
    }
  }

  private async latestInterviewEvent(assessmentId: string) {
    return this.prisma.assessmentRuntimeEvent.findFirst({
      where: { assessmentId, toolName: INTERVIEW_TOOL_NAME },
      orderBy: [{ createdAt: "desc" }, { sequence: "desc" }],
    });
  }

  private stateFromEvent(
    assessmentId: string,
    event: Awaited<ReturnType<typeof this.latestInterviewEvent>>,
  ): AssessmentInterviewRuntimeState {
    const state = parseState(event?.outputSummaryJson);
    return (
      state ?? {
        outcome: ASSESSMENT_INTERVIEW_OUTCOMES.waitingForCustomer,
        threadId: this.threadId(assessmentId),
        contextRevision: 0,
      }
    );
  }

  private async recordInterviewEvent(input: {
    assessmentId: string;
    correlationId: string;
    eventType: AssessmentRuntimeEventType;
    runStatus: AssessmentRuntimeRunStatus;
    summary: string;
    inputSummaryJson: Prisma.InputJsonValue;
    outputSummaryJson: Prisma.InputJsonValue;
    waitingReason?: string;
  }): Promise<void> {
    const runId = this.threadId(input.assessmentId);
    const latest = await this.prisma.assessmentRuntimeEvent.aggregate({
      where: { runId },
      _max: { sequence: true },
    });
    await this.prisma.assessmentRuntimeEvent.create({
      data: {
        assessmentId: input.assessmentId,
        runId,
        correlationId: input.correlationId,
        sequence: (latest._max.sequence ?? 0) + 1,
        eventType: input.eventType,
        runStatus: input.runStatus,
        stage: AssessmentRuntimeStage.INTERVIEW,
        toolName: INTERVIEW_TOOL_NAME,
        summary: input.summary,
        inputSummaryJson: input.inputSummaryJson,
        outputSummaryJson: input.outputSummaryJson,
        waitingReason: input.waitingReason,
        startedAt: new Date(),
        completedAt:
          input.eventType === AssessmentRuntimeEventType.TOOL_COMPLETED
            ? new Date()
            : null,
      },
    });
  }

  private auditRef(
    assessmentId: string,
    actorId: string,
    correlationId: string,
    input: {
      contextRevision: number;
      priorRevision?: number;
      newRevision?: number;
      relatedQuestionId?: string;
    },
  ) {
    return {
      authenticatedActorId: actorId,
      timestamp: new Date().toISOString(),
      assessmentId,
      sourceVersion: "assessment-interview-runtime-v1",
      pgeVersion: "runtime",
      sessionId: this.threadId(assessmentId),
      turnId: correlationId,
      ...input,
    };
  }

  private threadId(assessmentId: string): string {
    return `interview:${assessmentId}`;
  }
}

function parseAnswer(value: unknown): AssessmentInterviewAnswerInput {
  const record = objectRecord(value);
  if (!record || typeof record.questionId !== "string") {
    throw new BadRequestException({ code: "INTERVIEW_ANSWER_INVALID" });
  }
  return {
    questionId: record.questionId,
    freeText: typeof record.freeText === "string" ? record.freeText : undefined,
    selectedChoiceIds: Array.isArray(record.selectedChoiceIds)
      ? record.selectedChoiceIds.filter(
          (item): item is string => typeof item === "string",
        )
      : undefined,
    otherText:
      typeof record.otherText === "string" ? record.otherText : undefined,
    confirmed:
      typeof record.confirmed === "boolean" ? record.confirmed : undefined,
    adjusted:
      typeof record.adjusted === "boolean" ? record.adjusted : undefined,
  };
}

function parseBlockedAction(value: unknown): AssessmentInterviewBlockedInput {
  const record = objectRecord(value);
  if (
    !record ||
    !Object.values(ASSESSMENT_INTERVIEW_BLOCKED_ACTIONS).includes(
      record.action as never,
    )
  ) {
    throw new BadRequestException({ code: "INTERVIEW_BLOCKED_ACTION_INVALID" });
  }
  return {
    action: record.action as AssessmentInterviewBlockedInput["action"],
    draft: typeof record.draft === "string" ? record.draft : undefined,
  };
}

function parseState(value: unknown): AssessmentInterviewRuntimeState | null {
  const record = objectRecord(value);
  const candidate =
    objectRecord(record?.assessmentInterview) ?? objectRecord(record);
  if (
    !candidate ||
    !Object.values(ASSESSMENT_INTERVIEW_OUTCOMES).includes(
      candidate.outcome as never,
    )
  ) {
    return null;
  }
  return candidate as AssessmentInterviewRuntimeState;
}

function objectRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function toJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}
