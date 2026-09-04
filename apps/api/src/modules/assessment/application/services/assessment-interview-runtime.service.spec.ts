import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import {
  ASSESSMENT_CONTEXT_AUTHORITY_STATUSES,
  ASSESSMENT_INTERVIEW_ANSWER_ACTIONS,
  ASSESSMENT_INTERVIEW_BLOCKED_ACTIONS,
  ASSESSMENT_INTERVIEW_CONTROLS,
  ASSESSMENT_INTERVIEW_OUTCOMES,
  ASSESSMENT_INTERVIEW_QUESTION_INTENTS,
  type AssessmentInterviewRuntimeState,
} from "@lcsp/contracts/evidence";
import { AUTH_USER_ROLES } from "@lcsp/contracts/auth";

import type { PrismaService } from "../../../../infrastructure/prisma/prisma.service.js";
import type { OutboxRepository } from "../../../../platform/outbox/outbox.repository.js";
import type { AssessmentRuntimeEventService } from "../../../../platform/runtime-events/assessment-runtime-event.service.js";
import type { InterviewAuditService } from "../../../audit/application/services/interview-audit.service.js";
import { AssessmentInterviewRuntimeService } from "./assessment-interview-runtime.service.js";

describe("AssessmentInterviewRuntimeService Audit & Provenance Emission", () => {
  let service: AssessmentInterviewRuntimeService;
  let mockPrisma: any;
  let mockOutboxRepository: any;
  let mockRuntimeEvents: any;
  let mockInterviewAudit: any;
  let mockTx: any;

  beforeEach(() => {
    mockTx = {
      assessment: {
        findUnique: jest.fn<any>().mockResolvedValue({
          id: "assessment-1",
          ownerId: "user-1",
        }),
      },
      assessmentInterviewThread: {
        findUnique: jest.fn<any>(),
        updateMany: jest.fn<any>().mockResolvedValue({ count: 1 }),
        upsert: jest.fn<any>().mockResolvedValue({}),
      },
      repositorySnapshot: {
        findFirst: jest.fn<any>().mockResolvedValue({
          id: "snap-1",
          commitSha: "sha-123456",
        }),
      },
      technicalEvidenceReport: {
        findFirst: jest.fn<any>().mockResolvedValue({
          id: "report-1",
          schemaVersion: "v1",
          evidencePayload: {
            technicalCoverageState: "READY",
            coverageLimitations: [],
          },
        }),
      },
    };

    mockPrisma = {
      ...mockTx,
      $transaction: jest.fn(async (cb: (tx: any) => Promise<any>) =>
        cb(mockTx),
      ),
    };

    mockOutboxRepository = {
      enqueue: jest.fn<any>().mockResolvedValue("outbox-1"),
    };

    mockRuntimeEvents = {
      recordToolWaitingInput: jest.fn<any>().mockResolvedValue(undefined),
    };

    mockInterviewAudit = {
      recordQuestionPersisted: jest.fn<any>().mockResolvedValue(undefined),
      recordCustomerAnswer: jest.fn<any>().mockResolvedValue(undefined),
      recordContextRevisionCreated: jest.fn<any>().mockResolvedValue(undefined),
      recordInterviewOutcome: jest.fn<any>().mockResolvedValue(undefined),
      recordTargetedClarification: jest.fn<any>().mockResolvedValue(undefined),
      recordDownstreamImpact: jest.fn<any>().mockResolvedValue(undefined),
    };

    service = new AssessmentInterviewRuntimeService(
      mockPrisma as PrismaService,
      mockRuntimeEvents as AssessmentRuntimeEventService,
      mockOutboxRepository as OutboxRepository,
      mockInterviewAudit as InterviewAuditService,
    );
  });

  describe("submitAnswer", () => {
    it("atomically records customer answer and context revision audit events in the same transaction", async () => {
      const activeState: AssessmentInterviewRuntimeState = {
        outcome: ASSESSMENT_INTERVIEW_OUTCOMES.waitingForCustomer,
        contextRevision: 1,
        activeQuestion: {
          id: "q-1",
          intent: ASSESSMENT_INTERVIEW_QUESTION_INTENTS.ask,
          prompt: "What is your data residency?",
          control: ASSESSMENT_INTERVIEW_CONTROLS.confirmAdjust,
        },
      };

      mockTx.assessmentInterviewThread.findUnique.mockResolvedValue({
        assessmentId: "assessment-1",
        contextRevision: 1,
        processedRevision: 0,
        activeQuestionId: "q-1",
        stateJson: activeState,
        privateContextJson: { revisions: [] },
        sourceVersion: "snap-1:sha-123456",
        pgeVersion: "report-1:v1",
      });

      const result = await service.submitAnswer({
        assessmentId: "assessment-1",
        actor: {
          userId: "user-1",
          sessionId: "session-1",
          role: AUTH_USER_ROLES.customer,
          scope: "assessment:assessment-1",
        },
        correlationId: "corr-submit-1",
        answer: {
          questionId: "q-1",
          confirmed: true,
        },
      });

      expect(result.contextRevision).toBe(2);
      expect(mockInterviewAudit.recordCustomerAnswer).toHaveBeenCalledTimes(1);
      expect(mockInterviewAudit.recordCustomerAnswer).toHaveBeenCalledWith(
        expect.objectContaining({
          assessmentId: "assessment-1",
          questionId: "q-1",
          questionIntent: ASSESSMENT_INTERVIEW_QUESTION_INTENTS.ask,
          responseMode: ASSESSMENT_INTERVIEW_CONTROLS.confirmAdjust,
          responseAction: ASSESSMENT_INTERVIEW_ANSWER_ACTIONS.confirm,
          sessionId: "interview:assessment-1",
          threadId: "interview:assessment-1",
          turnId: 2,
          sourceSnapshot: expect.objectContaining({
            snapshotId: "snap-1",
            commitSha: "sha-123456",
            sourceVersion: "snap-1:sha-123456",
            pgeVersion: "report-1:v1",
            technicalCoverageState: "READY",
            coverageLimitations: [],
          }),
        }),
        mockTx,
      );

      expect(
        mockInterviewAudit.recordContextRevisionCreated,
      ).toHaveBeenCalledTimes(1);
      expect(
        mockInterviewAudit.recordContextRevisionCreated,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          assessmentId: "assessment-1",
          contextRevision: 2,
          priorRevision: 1,
          authority: ASSESSMENT_CONTEXT_AUTHORITY_STATUSES.customerStated,
          statementKey: "q-1",
          sessionId: "interview:assessment-1",
          threadId: "interview:assessment-1",
          turnId: 2,
        }),
        mockTx,
      );
    });
  });

  describe("recordBlockedAction", () => {
    it("atomically records blocked interview outcome in transaction", async () => {
      const currentState: AssessmentInterviewRuntimeState = {
        outcome: ASSESSMENT_INTERVIEW_OUTCOMES.waitingForCustomer,
        contextRevision: 2,
      };

      mockTx.assessmentInterviewThread.findUnique.mockResolvedValue({
        assessmentId: "assessment-1",
        contextRevision: 2,
        processedRevision: 1,
        activeQuestionId: "q-1",
        stateJson: currentState,
        privateContextJson: { revisions: [] },
        sourceVersion: "snap-1:sha-123456",
        pgeVersion: "report-1:v1",
      });

      const result = await service.recordBlockedAction({
        assessmentId: "assessment-1",
        actor: {
          userId: "user-1",
          sessionId: "session-1",
          role: AUTH_USER_ROLES.customer,
          scope: "assessment:assessment-1",
        },
        correlationId: "corr-blocked-1",
        blocked: {
          action: ASSESSMENT_INTERVIEW_BLOCKED_ACTIONS.saveAndExit,
        },
      });

      expect(result.outcome).toBe(
        ASSESSMENT_INTERVIEW_OUTCOMES.blockedOrUnresolved,
      );
      expect(mockInterviewAudit.recordInterviewOutcome).toHaveBeenCalledTimes(1);
      expect(mockInterviewAudit.recordInterviewOutcome).toHaveBeenCalledWith(
        expect.objectContaining({
          assessmentId: "assessment-1",
          outcome: ASSESSMENT_INTERVIEW_OUTCOMES.blockedOrUnresolved,
          contextRevision: 2,
          sessionId: "interview:assessment-1",
          threadId: "interview:assessment-1",
        }),
        mockTx,
      );
    });
  });

  describe("registerTargetedNeedForWorker", () => {
    it("atomically records targeted clarification started in transaction", async () => {
      const readyState: AssessmentInterviewRuntimeState = {
        outcome: ASSESSMENT_INTERVIEW_OUTCOMES.contextReady,
        contextRevision: 2,
      };

      mockTx.assessmentInterviewThread.findUnique.mockResolvedValue({
        assessmentId: "assessment-1",
        contextRevision: 2,
        processedRevision: 2,
        activeQuestionId: null,
        stateJson: readyState,
        privateContextJson: { revisions: [] },
        sourceVersion: "snap-1:sha-123456",
        pgeVersion: "report-1:v1",
      });

      await service.registerTargetedNeedForWorker({
        assessmentId: "assessment-1",
        correlationId: "corr-target-1",
        target: {
          actorId: "investigator-1",
          needId: "need-data-residency",
          businessContextNeed: "Clarify cloud provider region",
          resolutionCriteria: ["Customer specifies AWS or GCP region"],
          originatingInvestigationReference: "inv-ref-404",
          investigatorExecutionId: "exec-1",
          workflowRunId: "run-10",
          checkpointId: "cp-1",
          affectedRuleIds: ["rule-1"],
          artifactVersions: { "artifact-1": "v1" },
        },
      });

      expect(
        mockInterviewAudit.recordTargetedClarification,
      ).toHaveBeenCalledTimes(1);
      expect(
        mockInterviewAudit.recordTargetedClarification,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          assessmentId: "assessment-1",
          originatingInvestigationReference: "inv-ref-404",
          sessionId: "interview:assessment-1",
          threadId: "interview:assessment-1",
          runId: "run-10",
          sourceSnapshot: expect.objectContaining({
            sourceVersion: "snap-1:sha-123456",
            pgeVersion: "report-1:v1",
            technicalCoverageState: "READY",
          }),
        }),
        mockTx,
      );
    });
  });

  describe("recordAgentDecision", () => {
    it("atomically records outcome, question persistence, and downstream impact in transaction", async () => {
      const waitingState: AssessmentInterviewRuntimeState = {
        outcome: ASSESSMENT_INTERVIEW_OUTCOMES.waitingForCustomer,
        contextRevision: 2,
      };

      mockTx.assessmentInterviewThread.findUnique.mockResolvedValue({
        assessmentId: "assessment-1",
        contextRevision: 2,
        processedRevision: 1,
        activeQuestionId: null,
        stateJson: waitingState,
        privateContextJson: {
          revisions: [
            {
              questionId: "q-1",
              answer: { questionId: "q-1", confirmed: true },
              actorId: "user-1",
              answeredAt: new Date().toISOString(),
              contextRevision: 2,
              priorRevision: 1,
              authority: ASSESSMENT_CONTEXT_AUTHORITY_STATUSES.customerStated,
              sourceVersion: "snap-1:sha-123456",
              pgeVersion: "report-1:v1",
              governedEvidenceRefs: [],
            },
          ],
        },
        sourceVersion: "snap-1:sha-123456",
        pgeVersion: "report-1:v1",
      });

      await service.recordAgentDecision({
        assessmentId: "assessment-1",
        correlationId: "corr-decision-1",
        decision: {
          expectedContextRevision: 2,
          outcome: ASSESSMENT_INTERVIEW_OUTCOMES.waitingForCustomer,
          activeQuestion: {
            id: "q-next-1",
            intent: ASSESSMENT_INTERVIEW_QUESTION_INTENTS.clarify,
            prompt: "Is this storage multi-region?",
            control: ASSESSMENT_INTERVIEW_CONTROLS.boolean,
          },
          flags: ["DOWNSTREAM_IMPACT"],
        },
      });

      expect(mockInterviewAudit.recordInterviewOutcome).toHaveBeenCalledTimes(1);
      expect(mockInterviewAudit.recordInterviewOutcome).toHaveBeenCalledWith(
        expect.objectContaining({
          assessmentId: "assessment-1",
          outcome: ASSESSMENT_INTERVIEW_OUTCOMES.waitingForCustomer,
          activeQuestionId: "q-next-1",
          contextRevision: 2,
          sessionId: "interview:assessment-1",
        }),
        mockTx,
      );

      expect(mockInterviewAudit.recordQuestionPersisted).toHaveBeenCalledTimes(
        1,
      );
      expect(mockInterviewAudit.recordQuestionPersisted).toHaveBeenCalledWith(
        expect.objectContaining({
          assessmentId: "assessment-1",
          questionId: "q-next-1",
          questionIntent: ASSESSMENT_INTERVIEW_QUESTION_INTENTS.clarify,
          sessionId: "interview:assessment-1",
        }),
        mockTx,
      );

      expect(mockInterviewAudit.recordDownstreamImpact).toHaveBeenCalledTimes(1);
      expect(mockInterviewAudit.recordDownstreamImpact).toHaveBeenCalledWith(
        expect.objectContaining({
          assessmentId: "assessment-1",
          interviewContextRevision: "2",
          affectedActivities: ["reconciliation", "classification_review"],
          sessionId: "interview:assessment-1",
        }),
        mockTx,
      );
    });
  });

  describe("seedInitialQuestionForWorker", () => {
    it("atomically persists thread state and records question in transaction", async () => {
      const initialState: AssessmentInterviewRuntimeState = {
        outcome: ASSESSMENT_INTERVIEW_OUTCOMES.waitingForCustomer,
        activeQuestion: {
          id: "q-init-1",
          intent: ASSESSMENT_INTERVIEW_QUESTION_INTENTS.ask,
          prompt: "What is your cloud environment?",
          control: ASSESSMENT_INTERVIEW_CONTROLS.singleSelect,
        },
      };

      const result = await service.seedInitialQuestionForWorker({
        assessmentId: "assessment-1",
        correlationId: "corr-seed-1",
        state: initialState,
      });

      expect(result.outcome).toBe(
        ASSESSMENT_INTERVIEW_OUTCOMES.waitingForCustomer,
      );
      expect(mockInterviewAudit.recordQuestionPersisted).toHaveBeenCalledTimes(
        1,
      );
      expect(mockInterviewAudit.recordQuestionPersisted).toHaveBeenCalledWith(
        expect.objectContaining({
          assessmentId: "assessment-1",
          questionId: "q-init-1",
          questionIntent: ASSESSMENT_INTERVIEW_QUESTION_INTENTS.ask,
          sessionId: "interview:assessment-1",
          sourceSnapshot: expect.objectContaining({
            sourceVersion: "snap-1:sha-123456",
            pgeVersion: "report-1:v1",
            technicalCoverageState: "READY",
          }),
        }),
        mockTx,
      );
    });
  });
});
