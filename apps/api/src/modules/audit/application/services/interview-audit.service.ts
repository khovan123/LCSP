import { Injectable, Logger } from "@nestjs/common";
import {
  AUDIT_ACTOR_IDS,
  AUDIT_ACTOR_TYPES,
  AUDIT_RESOURCE_TYPES,
  type AuditActorType,
  type AuditDecision,
} from "@lcsp/contracts/audit";
import {
  INTERVIEW_AUDIT_EVENT_TYPES,
  type InterviewAuditActorRef,
  type InterviewAuditEventType,
  type InterviewSourceSnapshotRef,
} from "@lcsp/contracts/audit";

import { AuditWriterService } from "../../../../platform/audit/audit-writer.service.js";

/**
 * Input structure for recording a material customer context statement.
 */
export type RecordStatementAuditInput = {
  assessmentId: string;
  respondentRef: InterviewAuditActorRef;
  interviewContextRevision: string;
  sessionId: string;
  threadId: string;
  turnId: string | number;
  statementKey: string;
  statementValue: unknown;
  questionId?: string;
  questionIntent?: string;
  interpretation?: string;
  evidenceRefs?: string[];
  sourceSnapshot?: InterviewSourceSnapshotRef;
  runId?: string;
  stage?: string;
  guidanceVersion?: string;
  modelId?: string;
  correlationId: string;
  causationId?: string | null;
  decision?: AuditDecision | null;
};

/**
 * Input structure for recording explicit statement confirmation by an authenticated actor.
 */
export type RecordConfirmationAuditInput = RecordStatementAuditInput;

/**
 * Input structure for recording a context supersession (correction / revision update).
 */
export type RecordSupersessionAuditInput = {
  assessmentId: string;
  respondentRef: InterviewAuditActorRef;
  priorRevision: string;
  newRevision: string;
  statementKey: string;
  priorValue: unknown;
  newValue: unknown;
  sessionId: string;
  threadId: string;
  turnId: string | number;
  questionId?: string;
  questionIntent?: string;
  interpretation?: string;
  evidenceRefs?: string[];
  sourceSnapshot?: InterviewSourceSnapshotRef;
  runId?: string;
  stage?: string;
  guidanceVersion?: string;
  modelId?: string;
  correlationId: string;
  causationId?: string | null;
};

/**
 * Input structure for recording cross-respondent context contradictions (conflicts).
 */
export type RecordCrossRespondentConflictAuditInput = {
  assessmentId: string;
  statementKey: string;
  firstRespondentRef: InterviewAuditActorRef;
  firstStatementValue: unknown;
  firstTurnId: string | number;
  secondRespondentRef: InterviewAuditActorRef;
  secondStatementValue: unknown;
  secondTurnId: string | number;
  interviewContextRevision: string;
  sessionId: string;
  threadId: string;
  questionId?: string;
  evidenceRefs?: string[];
  sourceSnapshot?: InterviewSourceSnapshotRef;
  runId?: string;
  stage?: string;
  guidanceVersion?: string;
  modelId?: string;
  correlationId: string;
  causationId?: string | null;
};

/**
 * Input structure for recording a targeted clarification loop initiation.
 */
export type RecordTargetedClarificationAuditInput = {
  assessmentId: string;
  respondentRef?: InterviewAuditActorRef | null;
  originatingInvestigationReference: string;
  interviewContextRevision: string;
  sessionId: string;
  threadId: string;
  runId: string;
  stage: string;
  guidanceVersion?: string;
  modelId?: string;
  sourceSnapshot?: InterviewSourceSnapshotRef;
  correlationId: string;
  causationId?: string | null;
};

/**
 * Input structure for recording DOWNSTREAM_IMPACT signal emission by the Interview Agent.
 */
export type RecordDownstreamImpactAuditInput = {
  assessmentId: string;
  respondentRef?: InterviewAuditActorRef | null;
  interviewContextRevision: string;
  affectedActivities: string[];
  summary: string;
  sessionId: string;
  threadId: string;
  runId: string;
  stage?: string;
  guidanceVersion?: string;
  modelId?: string;
  sourceSnapshot?: InterviewSourceSnapshotRef;
  correlationId: string;
  causationId?: string | null;
};

/**
 * Input structure for recording Orchestration-owned selective rerun execution.
 */
export type RecordOrchestrationRerunAuditInput = {
  assessmentId: string;
  actorId?: string | null;
  interviewContextRevision: string;
  rerunScope: string[];
  summary: string;
  runId: string;
  sessionId?: string;
  threadId?: string;
  stage?: string;
  guidanceVersion?: string;
  modelId?: string;
  sourceSnapshot?: InterviewSourceSnapshotRef;
  correlationId: string;
  causationId?: string | null;
};

/**
 * High-level domain audit service for Interview Agent operations.
 *
 * Enforces production audit rules:
 * 1. Actor Identity Authority: Authenticated actor references are sourced exclusively from
 *    trusted application security contexts, never from chat message text.
 * 2. Material Provenance: Every statement/confirmation captures timestamp, assessmentId,
 *    source/PGE snapshot, session/thread/turn, revision, question ID, and evidence refs.
 * 3. Supersession & History: Corrections preserve prior/new values and revisions.
 * 4. Contradictions: Cross-respondent conflicts are preserved as conflict records (no last-answer-wins).
 * 5. Orchestration Attribution: DOWNSTREAM_IMPACT is distinguished from selective rerun execution.
 */
@Injectable()
export class InterviewAuditService {
  private readonly logger = new Logger(InterviewAuditService.name);

  /**
   * Creates the Interview audit service backed by AuditWriterService.
   *
   * @param auditWriter Platform audit writer persisting normalized AuditEvent records.
   */
  constructor(private readonly auditWriter: AuditWriterService) {}

  /**
   * Records a material Customer context statement in the canonical audit log.
   *
   * @param input Material statement audit input parameters.
   */
  async recordStatement(input: RecordStatementAuditInput): Promise<void> {
    const actor = this.authenticatedRespondent(input.respondentRef);
    await this.writeInterviewEvent({
      eventType: INTERVIEW_AUDIT_EVENT_TYPES.statementRecorded,
      assessmentId: input.assessmentId,
      actor,
      respondentRef: input.respondentRef,
      correlationId: input.correlationId,
      causationId: input.causationId,
      decision: input.decision,
      sessionId: input.sessionId,
      payload: {
        statementKey: input.statementKey,
        statementValue: input.statementValue,
        interviewContextRevision: input.interviewContextRevision,
        threadId: input.threadId,
        turnId: input.turnId,
        questionId: input.questionId,
        questionIntent: input.questionIntent,
        interpretation: input.interpretation,
        evidenceRefs: input.evidenceRefs ?? [],
        sourceSnapshot: input.sourceSnapshot,
        runId: input.runId,
        stage: input.stage,
        guidanceVersion: input.guidanceVersion,
        modelId: input.modelId,
      },
    });
  }

  /**
   * Records an explicit confirmation of a material statement by an authenticated respondent.
   *
   * @param input Statement confirmation audit input parameters.
   */
  async recordConfirmation(input: RecordConfirmationAuditInput): Promise<void> {
    const actor = this.authenticatedRespondent(input.respondentRef);
    await this.writeInterviewEvent({
      eventType: INTERVIEW_AUDIT_EVENT_TYPES.statementConfirmed,
      assessmentId: input.assessmentId,
      actor,
      respondentRef: input.respondentRef,
      correlationId: input.correlationId,
      causationId: input.causationId,
      decision: input.decision,
      sessionId: input.sessionId,
      payload: {
        statementKey: input.statementKey,
        statementValue: input.statementValue,
        interviewContextRevision: input.interviewContextRevision,
        threadId: input.threadId,
        turnId: input.turnId,
        questionId: input.questionId,
        questionIntent: input.questionIntent,
        interpretation: input.interpretation,
        evidenceRefs: input.evidenceRefs ?? [],
        sourceSnapshot: input.sourceSnapshot,
        runId: input.runId,
        stage: input.stage,
        guidanceVersion: input.guidanceVersion,
        modelId: input.modelId,
      },
    });
  }

  /**
   * Records a context supersession where an existing context value is corrected or updated.
   *
   * @param input Supersession audit input parameters.
   */
  async recordSupersession(input: RecordSupersessionAuditInput): Promise<void> {
    const actor = this.authenticatedRespondent(input.respondentRef);
    await this.writeInterviewEvent({
      eventType: INTERVIEW_AUDIT_EVENT_TYPES.contextSuperseded,
      assessmentId: input.assessmentId,
      actor,
      respondentRef: input.respondentRef,
      correlationId: input.correlationId,
      causationId: input.causationId,
      sessionId: input.sessionId,
      payload: {
        statementKey: input.statementKey,
        priorValue: input.priorValue,
        priorRevision: input.priorRevision,
        newValue: input.newValue,
        newRevision: input.newRevision,
        threadId: input.threadId,
        turnId: input.turnId,
        questionId: input.questionId,
        questionIntent: input.questionIntent,
        interpretation: input.interpretation,
        evidenceRefs: input.evidenceRefs ?? [],
        sourceSnapshot: input.sourceSnapshot,
        runId: input.runId,
        stage: input.stage,
        guidanceVersion: input.guidanceVersion,
        modelId: input.modelId,
      },
    });
  }

  /**
   * Records a cross-respondent conflict when two different authenticated users provide conflicting statements.
   * Preserves both statements rather than executing a naive last-answer-wins replacement.
   *
   * @param input Conflict audit input parameters.
   */
  async recordCrossRespondentConflict(
    input: RecordCrossRespondentConflictAuditInput,
  ): Promise<void> {
    const actor = this.authenticatedRespondent(input.secondRespondentRef);
    this.authenticatedRespondent(input.firstRespondentRef);
    await this.writeInterviewEvent({
      eventType: INTERVIEW_AUDIT_EVENT_TYPES.contextConflicted,
      assessmentId: input.assessmentId,
      actor,
      respondentRef: input.secondRespondentRef,
      correlationId: input.correlationId,
      causationId: input.causationId,
      sessionId: input.sessionId,
      payload: {
        statementKey: input.statementKey,
        interviewContextRevision: input.interviewContextRevision,
        threadId: input.threadId,
        questionId: input.questionId,
        evidenceRefs: input.evidenceRefs ?? [],
        sourceSnapshot: input.sourceSnapshot,
        runId: input.runId,
        stage: input.stage,
        guidanceVersion: input.guidanceVersion,
        modelId: input.modelId,
        conflict: {
          firstRespondent: input.firstRespondentRef,
          firstValue: input.firstStatementValue,
          firstTurnId: input.firstTurnId,
          secondRespondent: input.secondRespondentRef,
          secondValue: input.secondStatementValue,
          secondTurnId: input.secondTurnId,
        },
      },
    });
  }

  /**
   * Records the initiation of a targeted clarification loop triggered by the Investigator.
   * Preserves originatingInvestigationReference while keeping opaque runtime continuation details out of the interview context.
   *
   * @param input Targeted clarification audit parameters.
   */
  async recordTargetedClarification(
    input: RecordTargetedClarificationAuditInput,
  ): Promise<void> {
    const respondentRef = this.optionalAuthenticatedRespondent(
      input.respondentRef,
    );
    await this.writeInterviewEvent({
      eventType: INTERVIEW_AUDIT_EVENT_TYPES.targetedClarificationStarted,
      assessmentId: input.assessmentId,
      actor: this.serviceActor(AUDIT_ACTOR_IDS.assessmentOrchestrator),
      respondentRef,
      correlationId: input.correlationId,
      causationId: input.causationId,
      sessionId: input.sessionId,
      payload: {
        originatingInvestigationReference:
          input.originatingInvestigationReference,
        interviewContextRevision: input.interviewContextRevision,
        threadId: input.threadId,
        runId: input.runId,
        stage: input.stage,
        guidanceVersion: input.guidanceVersion,
        modelId: input.modelId,
        sourceSnapshot: input.sourceSnapshot,
      },
    });
  }

  /**
   * Records DOWNSTREAM_IMPACT emission from the Interview Agent.
   *
   * @param input Downstream impact audit input parameters.
   */
  async recordDownstreamImpact(
    input: RecordDownstreamImpactAuditInput,
  ): Promise<void> {
    const respondentRef = this.optionalAuthenticatedRespondent(
      input.respondentRef,
    );
    await this.writeInterviewEvent({
      eventType: INTERVIEW_AUDIT_EVENT_TYPES.downstreamImpactEmitted,
      assessmentId: input.assessmentId,
      actor: this.serviceActor(AUDIT_ACTOR_IDS.interviewAgent),
      respondentRef,
      correlationId: input.correlationId,
      causationId: input.causationId,
      sessionId: input.sessionId,
      payload: {
        interviewContextRevision: input.interviewContextRevision,
        affectedActivities: input.affectedActivities,
        summary: input.summary,
        threadId: input.threadId,
        runId: input.runId,
        stage: input.stage,
        guidanceVersion: input.guidanceVersion,
        modelId: input.modelId,
        sourceSnapshot: input.sourceSnapshot,
      },
    });
  }

  /**
   * Records an Orchestration-owned selective rerun execution.
   *
   * @param input Orchestration rerun audit input parameters.
   */
  async recordOrchestrationRerun(
    input: RecordOrchestrationRerunAuditInput,
  ): Promise<void> {
    await this.writeInterviewEvent({
      eventType: INTERVIEW_AUDIT_EVENT_TYPES.orchestrationRerunTriggered,
      assessmentId: input.assessmentId,
      actor: this.serviceActor(
        input.actorId ?? AUDIT_ACTOR_IDS.assessmentOrchestrator,
      ),
      correlationId: input.correlationId,
      causationId: input.causationId,
      sessionId: input.sessionId,
      payload: {
        interviewContextRevision: input.interviewContextRevision,
        rerunScope: input.rerunScope,
        summary: input.summary,
        runId: input.runId,
        threadId: input.threadId,
        stage: input.stage,
        guidanceVersion: input.guidanceVersion,
        modelId: input.modelId,
        sourceSnapshot: input.sourceSnapshot,
      },
    });
  }

  private authenticatedRespondent(
    input: InterviewAuditActorRef,
  ): InterviewAuditEventActor {
    if (!input.id.trim() || input.authenticated !== true) {
      throw new TypeError(
        "Interview audit respondent must come from authenticated runtime context",
      );
    }
    return {
      id: input.id,
      type: AUDIT_ACTOR_TYPES.user,
      role: input.role,
      name: input.name,
      authenticated: true,
    };
  }

  private optionalAuthenticatedRespondent(
    input: InterviewAuditActorRef | null | undefined,
  ): InterviewAuditActorRef | undefined {
    if (!input) return undefined;
    this.authenticatedRespondent(input);
    return input;
  }

  private serviceActor(id: string): InterviewAuditEventActor {
    const actorId = id.trim();
    if (!actorId) {
      throw new TypeError("Interview audit service actor id must not be empty");
    }
    return {
      id: actorId,
      type: AUDIT_ACTOR_TYPES.service,
      authenticated: false,
    };
  }

  /**
   * Internal helper that translates interview domain audit parameters into platform AuditEventInput.
   */
  private async writeInterviewEvent(params: {
    eventType: InterviewAuditEventType;
    assessmentId: string;
    actor: InterviewAuditEventActor;
    respondentRef?: InterviewAuditActorRef;
    correlationId: string;
    causationId?: string | null;
    sessionId?: string | null;
    decision?: AuditDecision | null;
    payload: Record<string, unknown>;
  }): Promise<void> {
    const actorId = params.actor.id;

    try {
      await this.auditWriter.write({
        eventType: params.eventType,
        actorId,
        actor: params.actor,
        assessmentId: params.assessmentId,
        resourceType: AUDIT_RESOURCE_TYPES.assessment,
        resourceId: params.assessmentId,
        correlationId: params.correlationId,
        causationId: params.causationId ?? null,
        sessionId: params.sessionId ?? null,
        decision: params.decision ?? null,
        result: params.eventType,
        payload: {
          ...params.payload,
          ...(params.respondentRef
            ? { respondentRef: params.respondentRef }
            : {}),
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to record interview audit event ${params.eventType} for assessment ${params.assessmentId}: ${(error as Error).message}`,
      );
      throw error;
    }
  }
}

type InterviewAuditEventActor = {
  id: string | null;
  type: AuditActorType;
  role?: string;
  name?: string;
  authenticated: boolean;
};
