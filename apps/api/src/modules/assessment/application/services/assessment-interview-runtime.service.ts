import {
  ASSESSMENT_ERROR_CODES,
  ASSESSMENT_EVENT_TYPES,
} from "@lcsp/contracts/assessment";
import {
  AUDIT_ACTOR_TYPES,
  AUDIT_REDACTION_STATUSES,
} from "@lcsp/contracts/audit";
import { AUTH_USER_ROLES } from "@lcsp/contracts/auth";
import {
  ASSESSMENT_CONTEXT_AUTHORITY_STATUSES,
  ASSESSMENT_INTERVIEW_BLOCKED_ACTIONS,
  ASSESSMENT_INTERVIEW_OUTCOMES,
  ASSESSMENT_RUNTIME_STAGE_CODES,
  type AssessmentInterviewAnswerHistoryItem,
  type AssessmentInterviewAnswerInput,
  type AssessmentInterviewBlockedInput,
  type AssessmentInterviewRuntimeState,
} from "@lcsp/contracts/evidence";
import {
  buildOutboxMessageInput,
  OUTBOX_AGGREGATE_TYPES,
} from "@lcsp/contracts/outbox";
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { Prisma } from "@prisma/client";

import { PrismaService } from "../../../../infrastructure/prisma/prisma.service.js";
import { OutboxRepository } from "../../../../platform/outbox/outbox.repository.js";
import { AssessmentRuntimeEventService } from "../../../../platform/runtime-events/assessment-runtime-event.service.js";
import type { RbacRequestContext } from "../../../../platform/rbac/interfaces/rbac-request.interface.js";

const INTERVIEW_TOOL_NAME = "assessment_interview";
const INTERVIEW_SOURCE_VERSION = "assessment-interview-runtime-v1";
const MISSING_SOURCE_VERSION = "NO_REPOSITORY_SNAPSHOT";
const MISSING_PGE_VERSION = "NO_TECHNICAL_EVIDENCE_REPORT";
const PUBLIC_REDACTED_ANSWER_SUMMARY =
  "Customer answer persisted in governed Interview state.";
const PUBLIC_REDACTED_DRAFT_SUMMARY =
  "Customer draft persisted for Interview resume.";

@Injectable()
export class AssessmentInterviewRuntimeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly runtimeEvents: AssessmentRuntimeEventService,
    private readonly outboxRepository: OutboxRepository,
  ) {}

  async getState(
    assessmentId: string,
    actor: RbacRequestContext,
  ): Promise<AssessmentInterviewRuntimeState> {
    await this.assertAssessmentVisible(assessmentId, actor);
    return this.readThreadState(assessmentId);
  }

  async submitAnswer(input: {
    assessmentId: string;
    actor: RbacRequestContext;
    correlationId: string;
    answer: AssessmentInterviewAnswerInput;
  }): Promise<AssessmentInterviewRuntimeState> {
    const answer = parseAnswer(input.answer);
    await this.assertAssessmentVisible(input.assessmentId, input.actor);
    const current = await this.readThreadState(input.assessmentId);
    if (!current.activeQuestion || current.activeQuestion.id !== answer.questionId) {
      throw new BadRequestException({ code: "INTERVIEW_QUESTION_STALE_OR_UNKNOWN" });
    }

    const historyItem: AssessmentInterviewAnswerHistoryItem = {
      questionId: answer.questionId,
      actorId: input.actor.userId,
      answeredAt: new Date().toISOString(),
      summary: summarizeAnswer(answer),
    };
    const nextRevision = (current.contextRevision ?? 0) + 1;
    const nextState: AssessmentInterviewRuntimeState = {
      ...current,
      outcome: ASSESSMENT_INTERVIEW_OUTCOMES.waitingForCustomer,
      contextAuthority: ASSESSMENT_CONTEXT_AUTHORITY_STATUSES.customerStated,
      contextRevision: nextRevision,
      activeQuestion: undefined,
      pendingDraft: undefined,
      answerHistory: [...(current.answerHistory ?? []), historyItem],
      orchestrationRequested: true,
      audit: await this.auditRef(
        input.assessmentId,
        input.actor.userId,
        input.correlationId,
        {
          contextRevision: nextRevision,
          priorRevision: current.contextRevision,
          newRevision: nextRevision,
          relatedQuestionId: answer.questionId,
        },
      ),
    };

    await this.persistThreadState(input.assessmentId, nextState);
    await this.runtimeEvents.recordToolWaitingInput({
      assessmentId: input.assessmentId,
      runId: this.threadId(input.assessmentId),
      correlationId: input.correlationId,
      stage: ASSESSMENT_RUNTIME_STAGE_CODES.interview,
      toolName: INTERVIEW_TOOL_NAME,
      summary:
        "Customer interview answer persisted; Interview Agent sufficiency decision required.",
      inputSummary: {
        questionId: answer.questionId,
        answer: PUBLIC_REDACTED_ANSWER_SUMMARY,
      },
      outputSummary: { assessmentInterview: publicState(nextState) },
      waitingReason: "INTERVIEW_AGENT_DECISION_REQUIRED",
      startedAt: new Date(),
    });
    await this.enqueueInterviewAgentResume({
      assessmentId: input.assessmentId,
      actorId: input.actor.userId,
      correlationId: input.correlationId,
      contextRevision: nextRevision,
      questionId: answer.questionId,
    });
    return nextState;
  }

  async recordBlockedAction(input: {
    assessmentId: string;
    actor: RbacRequestContext;
    correlationId: string;
    blocked: AssessmentInterviewBlockedInput;
  }): Promise<AssessmentInterviewRuntimeState> {
    const blocked = parseBlockedAction(input.blocked);
    await this.assertAssessmentVisible(input.assessmentId, input.actor);
    const current = await this.readThreadState(input.assessmentId);
    const nextState: AssessmentInterviewRuntimeState = {
      ...current,
      outcome: ASSESSMENT_INTERVIEW_OUTCOMES.blockedOrUnresolved,
      threadId: this.threadId(input.assessmentId),
      blockedActions: Object.values(ASSESSMENT_INTERVIEW_BLOCKED_ACTIONS),
      pendingDraft:
        blocked.action === ASSESSMENT_INTERVIEW_BLOCKED_ACTIONS.saveAndExit
          ? (blocked.draft ?? current.pendingDraft)
          : current.pendingDraft,
      orchestrationRequested:
        blocked.action === ASSESSMENT_INTERVIEW_BLOCKED_ACTIONS.provideMoreContext,
      audit: await this.auditRef(
        input.assessmentId,
        input.actor.userId,
        input.correlationId,
        {
          contextRevision: current.contextRevision ?? 0,
        },
      ),
    };

    await this.persistThreadState(input.assessmentId, nextState);
    await this.runtimeEvents.recordToolWaitingInput({
      assessmentId: input.assessmentId,
      runId: this.threadId(input.assessmentId),
      correlationId: input.correlationId,
      stage: ASSESSMENT_RUNTIME_STAGE_CODES.interview,
      toolName: INTERVIEW_TOOL_NAME,
      summary: "Customer selected an unresolved Interview action.",
      inputSummary: {
        action: blocked.action,
        draft: blocked.draft ? PUBLIC_REDACTED_DRAFT_SUMMARY : undefined,
      },
      outputSummary: { assessmentInterview: publicState(nextState) },
      waitingReason: blocked.action,
      startedAt: new Date(),
    });
    return nextState;
  }

  async recordAgentDecision(input: {
    assessmentId: string;
    actor: RbacRequestContext;
    correlationId: string;
    state: AssessmentInterviewRuntimeState;
  }): Promise<AssessmentInterviewRuntimeState> {
    await this.assertAssessmentVisible(input.assessmentId, input.actor);
    const current = await this.readThreadState(input.assessmentId);
    const nextState: AssessmentInterviewRuntimeState = {
      ...current,
      ...sanitizeAgentDecision(input.state),
      threadId: this.threadId(input.assessmentId),
      orchestrationRequested: false,
    };
    await this.persistThreadState(input.assessmentId, nextState);
    await this.runtimeEvents.recordToolWaitingInput({
      assessmentId: input.assessmentId,
      runId: this.threadId(input.assessmentId),
      correlationId: input.correlationId,
      stage: ASSESSMENT_RUNTIME_STAGE_CODES.interview,
      toolName: INTERVIEW_TOOL_NAME,
      summary:
        "Interview Agent decision persisted for customer or orchestration continuation.",
      inputSummary: { decisionOutcome: nextState.outcome },
      outputSummary: { assessmentInterview: publicState(nextState) },
      waitingReason:
        nextState.outcome === ASSESSMENT_INTERVIEW_OUTCOMES.waitingForCustomer
          ? "WAITING_FOR_CUSTOMER"
          : null,
      startedAt: new Date(),
    });
    return nextState;
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

  private async readThreadState(
    assessmentId: string,
  ): Promise<AssessmentInterviewRuntimeState> {
    const thread = await this.prisma.assessmentInterviewThread.findUnique({
      where: { assessmentId },
    });
    const state = parseState(thread?.stateJson);
    return (
      state ?? {
        outcome: ASSESSMENT_INTERVIEW_OUTCOMES.waitingForCustomer,
        threadId: this.threadId(assessmentId),
        contextRevision: 0,
        answerHistory: [],
      }
    );
  }

  private async persistThreadState(
    assessmentId: string,
    state: AssessmentInterviewRuntimeState,
  ): Promise<void> {
    await this.prisma.assessmentInterviewThread.upsert({
      where: { assessmentId },
      update: { stateJson: toJson(state) },
      create: {
        id: this.threadId(assessmentId),
        assessmentId,
        stateJson: toJson(state),
      },
    });
  }

  private async enqueueInterviewAgentResume(input: {
    assessmentId: string;
    actorId: string;
    correlationId: string;
    contextRevision: number;
    questionId: string;
  }): Promise<void> {
    await this.outboxRepository.enqueue(
      buildOutboxMessageInput({
        aggregateType: OUTBOX_AGGREGATE_TYPES.assessment,
        aggregateId: input.assessmentId,
        eventType: ASSESSMENT_EVENT_TYPES.interviewAgentResumeRequestedOutbox,
        assessmentId: input.assessmentId,
        correlationId: input.correlationId,
        causationId: input.correlationId,
        actor: { id: input.actorId, type: AUDIT_ACTOR_TYPES.user },
        result: ASSESSMENT_EVENT_TYPES.interviewAnswerSubmitted,
        redactionStatus: AUDIT_REDACTION_STATUSES.redacted,
        idempotencyKey: `${input.assessmentId}:${input.contextRevision}:${ASSESSMENT_EVENT_TYPES.interviewAgentResumeRequestedOutbox}`,
        payload: {
          assessmentId: input.assessmentId,
          threadId: this.threadId(input.assessmentId),
          contextRevision: input.contextRevision,
          questionId: input.questionId,
        },
      }),
    );
  }

  private async auditRef(
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
    const provenance = await this.assessmentProvenance(assessmentId);
    return {
      authenticatedActorId: actorId,
      timestamp: new Date().toISOString(),
      assessmentId,
      sourceVersion: provenance.sourceVersion,
      pgeVersion: provenance.pgeVersion,
      sessionId: this.threadId(assessmentId),
      turnId: correlationId,
      governedEvidenceRefs: provenance.governedEvidenceRefs,
      ...input,
    };
  }

  private async assessmentProvenance(assessmentId: string): Promise<{
    sourceVersion: string;
    pgeVersion: string;
    governedEvidenceRefs: string[];
  }> {
    const [snapshot, report] = await Promise.all([
      this.prisma.repositorySnapshot.findFirst({
        where: { assessmentId },
        orderBy: { createdAt: "desc" },
        select: { id: true, commitSha: true },
      }),
      this.prisma.technicalEvidenceReport.findFirst({
        where: { assessmentId },
        orderBy: { createdAt: "desc" },
        select: { id: true, schemaVersion: true },
      }),
    ]);
    return {
      sourceVersion: snapshot
        ? `${snapshot.id}:${snapshot.commitSha}`
        : MISSING_SOURCE_VERSION,
      pgeVersion: report
        ? `${report.id}:${report.schemaVersion}`
        : MISSING_PGE_VERSION,
      governedEvidenceRefs: [
        ...(snapshot ? [`repositorySnapshot:${snapshot.id}`] : []),
        ...(report ? [`technicalEvidenceReport:${report.id}`] : []),
        `interviewRuntime:${INTERVIEW_SOURCE_VERSION}`,
      ],
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
  if (
    !record ||
    !Object.values(ASSESSMENT_INTERVIEW_OUTCOMES).includes(
      record.outcome as never,
    )
  ) {
    return null;
  }
  return record as AssessmentInterviewRuntimeState;
}

function sanitizeAgentDecision(
  state: AssessmentInterviewRuntimeState,
): AssessmentInterviewRuntimeState {
  if (
    !Object.values(ASSESSMENT_INTERVIEW_OUTCOMES).includes(state.outcome as never)
  ) {
    throw new BadRequestException({ code: "INTERVIEW_AGENT_DECISION_INVALID" });
  }
  return state;
}

function summarizeAnswer(answer: AssessmentInterviewAnswerInput): string {
  if (answer.confirmed) {
    return "Customer confirmed prior material context.";
  }
  if (answer.adjusted) {
    return "Customer requested adjustment to prior material context.";
  }
  if (answer.selectedChoiceIds?.length) {
    return `Customer selected ${answer.selectedChoiceIds.length} option(s).`;
  }
  return "Customer supplied free-text Interview context.";
}

function publicState(
  state: AssessmentInterviewRuntimeState,
): AssessmentInterviewRuntimeState {
  return {
    ...state,
    pendingDraft: state.pendingDraft ? PUBLIC_REDACTED_DRAFT_SUMMARY : undefined,
    answerHistory: state.answerHistory?.map((item) => ({
      ...item,
      summary: item.summary,
    })),
  };
}

function objectRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function toJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}
