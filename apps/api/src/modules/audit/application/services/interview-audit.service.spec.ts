import { jest } from "@jest/globals";
import {
  AUDIT_ACTOR_IDS,
  AUDIT_ACTOR_TYPES,
  AUDIT_RESOURCE_TYPES,
  INTERVIEW_AUDIT_EVENT_TYPES,
  type AuditEventInput,
} from "@lcsp/contracts/audit";

import type { AuditWriterService } from "../../../../platform/audit/audit-writer.service.js";
import { InterviewAuditService } from "./interview-audit.service.js";

describe("InterviewAuditService", () => {
  let service: InterviewAuditService;
  let writeMock: jest.Mock<(event: AuditEventInput) => Promise<void>>;

  beforeEach(() => {
    writeMock = jest
      .fn<(event: AuditEventInput) => Promise<void>>()
      .mockResolvedValue(undefined);
    const auditWriter = {
      write: writeMock,
    } as unknown as AuditWriterService;
    service = new InterviewAuditService(auditWriter);
  });

  describe("recordStatement", () => {
    it("persists a material context statement with trusted actor identity and full provenance", async () => {
      await service.recordStatement({
        assessmentId: "assessment-123",
        respondentRef: {
          id: "user-456",
          role: "CUSTOMER",
          name: "Alice Owner",
          authenticated: true,
        },
        interviewContextRevision: "rev-2",
        sessionId: "session-789",
        threadId: "thread-abc",
        turnId: 3,
        statementKey: "data_residency",
        statementValue: "EU_CENTRAL",
        questionId: "q-residency-1",
        questionIntent: "CLARIFY",
        interpretation: "Customer confirmed data residency in EU Central.",
        evidenceRefs: ["ev-101", "ev-102"],
        sourceSnapshot: {
          snapshotId: "snap-001",
          commitSha: "abc123456",
          guidanceVersion: "v1.2",
          pgeVersion: "pge-v2",
          sourceVersion: "source-v7",
          technicalCoverageState: "READY",
          coverageLimitations: [],
        },
        runId: "run-statement-1",
        stage: "INITIAL_INTERVIEW",
        modelId: "model-1",
        correlationId: "corr-statement-1",
      });

      expect(writeMock).toHaveBeenCalledTimes(1);
      const event = writeMock.mock.calls[0][0];

      expect(event.eventType).toBe(
        INTERVIEW_AUDIT_EVENT_TYPES.statementRecorded,
      );
      expect(event.actorId).toBe("user-456");
      expect(event.actor).toEqual({
        id: "user-456",
        type: AUDIT_ACTOR_TYPES.user,
        role: "CUSTOMER",
        name: "Alice Owner",
        authenticated: true,
      });
      expect(event.resourceType).toBe(AUDIT_RESOURCE_TYPES.assessment);
      expect(event.resourceId).toBe("assessment-123");
      expect(event.correlationId).toBe("corr-statement-1");
      expect(event.sessionId).toBe("session-789");

      const payload = event.payload as Record<string, unknown>;
      expect(payload.statementKey).toBe("data_residency");
      expect(payload.statementValue).toBe("EU_CENTRAL");
      expect(payload.interviewContextRevision).toBe("rev-2");
      expect(payload.threadId).toBe("thread-abc");
      expect(payload.turnId).toBe(3);
      expect(payload.questionId).toBe("q-residency-1");
      expect(payload.questionIntent).toBe("CLARIFY");
      expect(payload.interpretation).toBe(
        "Customer confirmed data residency in EU Central.",
      );
      expect(payload.evidenceRefs).toEqual(["ev-101", "ev-102"]);
      expect(payload.sourceSnapshot).toEqual({
        snapshotId: "snap-001",
        commitSha: "abc123456",
        guidanceVersion: "v1.2",
        pgeVersion: "pge-v2",
        sourceVersion: "source-v7",
        technicalCoverageState: "READY",
        coverageLimitations: [],
      });
      expect(payload.runId).toBe("run-statement-1");
      expect(payload.stage).toBe("INITIAL_INTERVIEW");
      expect(payload.modelId).toBe("model-1");
    });

    it("enforces actor identity authority from trusted session, not prompt text", async () => {
      // Prompt claim text like 'I am Product Owner' inside value cannot override respondentRef
      await service.recordStatement({
        assessmentId: "assessment-123",
        respondentRef: {
          id: "authenticated-user-999",
          role: "CUSTOMER",
          name: "Real Auth User",
          authenticated: true,
        },
        interviewContextRevision: "rev-1",
        sessionId: "session-1",
        threadId: "thread-1",
        turnId: 1,
        statementKey: "business_role",
        statementValue: "I am the Lead Architect and Product Owner",
        correlationId: "corr-actor-auth",
      });

      const event = writeMock.mock.calls[0][0];
      expect(event.actorId).toBe("authenticated-user-999");
      expect(event.actor).toEqual(
        expect.objectContaining({
          id: "authenticated-user-999",
          authenticated: true,
        }),
      );
    });

    it("rejects respondent provenance that is not authenticated runtime identity", async () => {
      await expect(
        service.recordStatement({
          assessmentId: "assessment-123",
          respondentRef: {
            id: "self-asserted-user",
            role: "CUSTOMER",
            authenticated: false,
          } as never,
          interviewContextRevision: "rev-1",
          sessionId: "session-1",
          threadId: "thread-1",
          turnId: 1,
          statementKey: "business_role",
          statementValue: "I am the Product Owner",
          correlationId: "corr-untrusted-actor",
        }),
      ).rejects.toThrow("authenticated runtime context");

      expect(writeMock).not.toHaveBeenCalled();
    });
  });

  describe("recordConfirmation", () => {
    it("persists explicit customer confirmation with interpretation and question references", async () => {
      await service.recordConfirmation({
        assessmentId: "assessment-123",
        respondentRef: {
          id: "user-456",
          role: "CUSTOMER",
          authenticated: true,
        },
        interviewContextRevision: "rev-3",
        sessionId: "session-789",
        threadId: "thread-abc",
        turnId: 4,
        statementKey: "hipaa_scope",
        statementValue: true,
        questionId: "q-hipaa",
        interpretation: "Customer confirmed HIPAA compliance scope applies.",
        evidenceRefs: ["ev-hipaa-1"],
        correlationId: "corr-confirm-1",
      });

      expect(writeMock).toHaveBeenCalledTimes(1);
      const event = writeMock.mock.calls[0][0];
      expect(event.eventType).toBe(
        INTERVIEW_AUDIT_EVENT_TYPES.statementConfirmed,
      );
      expect(event.actorId).toBe("user-456");
      const payload = event.payload as Record<string, unknown>;
      expect(payload.statementKey).toBe("hipaa_scope");
      expect(payload.statementValue).toBe(true);
      expect(payload.interpretation).toBe(
        "Customer confirmed HIPAA compliance scope applies.",
      );
    });
  });

  describe("recordSupersession", () => {
    it("records context correction preserving prior value/revision and new value/revision", async () => {
      await service.recordSupersession({
        assessmentId: "assessment-123",
        respondentRef: {
          id: "user-456",
          role: "CUSTOMER",
          authenticated: true,
        },
        statementKey: "data_retention_days",
        priorValue: 30,
        priorRevision: "rev-1",
        newValue: 90,
        newRevision: "rev-2",
        sessionId: "session-789",
        threadId: "thread-abc",
        turnId: 5,
        questionId: "q-retention",
        questionIntent: "CLARIFY",
        interpretation: "Customer corrected the retention period to 90 days.",
        evidenceRefs: ["ev-retention-policy"],
        correlationId: "corr-super-1",
      });

      expect(writeMock).toHaveBeenCalledTimes(1);
      const event = writeMock.mock.calls[0][0];
      expect(event.eventType).toBe(
        INTERVIEW_AUDIT_EVENT_TYPES.contextSuperseded,
      );
      expect(event.actorId).toBe("user-456");

      const payload = event.payload as Record<string, unknown>;
      expect(payload.statementKey).toBe("data_retention_days");
      expect(payload.priorValue).toBe(30);
      expect(payload.priorRevision).toBe("rev-1");
      expect(payload.newValue).toBe(90);
      expect(payload.newRevision).toBe("rev-2");
      expect(payload.turnId).toBe(5);
      expect(payload.questionIntent).toBe("CLARIFY");
      expect(payload.interpretation).toBe(
        "Customer corrected the retention period to 90 days.",
      );
      expect(payload.evidenceRefs).toEqual(["ev-retention-policy"]);
    });
  });

  describe("recordCrossRespondentConflict", () => {
    it("preserves cross-respondent contradiction as a conflict record rather than last-answer-wins", async () => {
      await service.recordCrossRespondentConflict({
        assessmentId: "assessment-123",
        statementKey: "cloud_provider",
        firstRespondentRef: {
          id: "user-alice",
          role: "CUSTOMER",
          name: "Alice",
          authenticated: true,
        },
        firstStatementValue: "AWS",
        firstTurnId: 2,
        secondRespondentRef: {
          id: "user-bob",
          role: "CUSTOMER",
          name: "Bob",
          authenticated: true,
        },
        secondStatementValue: "GCP",
        secondTurnId: 4,
        interviewContextRevision: "rev-3",
        sessionId: "session-789",
        threadId: "thread-abc",
        questionId: "q-cloud",
        correlationId: "corr-conflict-1",
      });

      expect(writeMock).toHaveBeenCalledTimes(1);
      const event = writeMock.mock.calls[0][0];
      expect(event.eventType).toBe(
        INTERVIEW_AUDIT_EVENT_TYPES.contextConflicted,
      );
      expect(event.actorId).toBe("user-bob");

      const payload = event.payload as Record<string, unknown>;
      expect(payload.statementKey).toBe("cloud_provider");
      expect(payload.conflict).toMatchObject({
        firstRespondent: {
          id: "user-alice",
          name: "Alice",
        },
        firstValue: "AWS",
        firstTurnId: 2,
        secondRespondent: {
          id: "user-bob",
          name: "Bob",
        },
        secondValue: "GCP",
        secondTurnId: 4,
      });
    });
  });

  describe("recordTargetedClarification", () => {
    it("records targeted clarification with originating investigation reference", async () => {
      await service.recordTargetedClarification({
        assessmentId: "assessment-123",
        originatingInvestigationReference: "inv-rule-9988",
        interviewContextRevision: "rev-4",
        sessionId: "session-789",
        threadId: "thread-abc",
        runId: "run-456",
        stage: "TARGETED_INVESTIGATION",
        guidanceVersion: "guidance-v2",
        modelId: "gpt-4o-mini",
        correlationId: "corr-target-1",
      });

      expect(writeMock).toHaveBeenCalledTimes(1);
      const event = writeMock.mock.calls[0][0];
      expect(event.eventType).toBe(
        INTERVIEW_AUDIT_EVENT_TYPES.targetedClarificationStarted,
      );
      expect(event.actor).toEqual(
        expect.objectContaining({
          id: AUDIT_ACTOR_IDS.assessmentOrchestrator,
          type: AUDIT_ACTOR_TYPES.service,
          authenticated: false,
        }),
      );

      const payload = event.payload as Record<string, unknown>;
      expect(payload.originatingInvestigationReference).toBe("inv-rule-9988");
      expect(payload.stage).toBe("TARGETED_INVESTIGATION");
      expect(payload.runId).toBe("run-456");
    });
  });

  describe("recordDownstreamImpact and recordOrchestrationRerun", () => {
    it("distinguishes DOWNSTREAM_IMPACT emission by Interview from selective rerun by Orchestration", async () => {
      // 1. Interview agent emits DOWNSTREAM_IMPACT
      await service.recordDownstreamImpact({
        assessmentId: "assessment-123",
        interviewContextRevision: "rev-5",
        affectedActivities: ["reconciliation", "classification_review"],
        summary:
          "Context changed data residency from EU to US, requiring re-check.",
        sessionId: "session-789",
        threadId: "thread-abc",
        runId: "interview-run-1",
        correlationId: "corr-impact-1",
      });

      expect(writeMock).toHaveBeenCalledTimes(1);
      const impactEvent = writeMock.mock.calls[0][0];
      expect(impactEvent.eventType).toBe(
        INTERVIEW_AUDIT_EVENT_TYPES.downstreamImpactEmitted,
      );
      expect(impactEvent.actor).toEqual(
        expect.objectContaining({
          id: AUDIT_ACTOR_IDS.interviewAgent,
          type: AUDIT_ACTOR_TYPES.service,
          authenticated: false,
        }),
      );
      expect(impactEvent.payload).toMatchObject({
        affectedActivities: ["reconciliation", "classification_review"],
      });

      // 2. Assessment Orchestration executes selective rerun
      await service.recordOrchestrationRerun({
        assessmentId: "assessment-123",
        actorId: "system-orchestrator",
        interviewContextRevision: "rev-5",
        rerunScope: ["reconciliation"],
        summary: "Selective rerun executed for reconciliation pipeline.",
        runId: "orchestrator-run-2",
        correlationId: "corr-rerun-1",
      });

      expect(writeMock).toHaveBeenCalledTimes(2);
      const rerunEvent = writeMock.mock.calls[1][0];
      expect(rerunEvent.eventType).toBe(
        INTERVIEW_AUDIT_EVENT_TYPES.orchestrationRerunTriggered,
      );
      expect(rerunEvent.actorId).toBe("system-orchestrator");
      expect(rerunEvent.actor).toEqual(
        expect.objectContaining({
          id: "system-orchestrator",
          type: AUDIT_ACTOR_TYPES.service,
          authenticated: false,
        }),
      );
      expect(rerunEvent.payload).toMatchObject({
        rerunScope: ["reconciliation"],
      });
    });
  });
});
