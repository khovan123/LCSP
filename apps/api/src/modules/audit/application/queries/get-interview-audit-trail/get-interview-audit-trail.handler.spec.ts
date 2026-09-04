import { jest } from "@jest/globals";
import { AUTH_USER_ROLES } from "@lcsp/contracts/auth";
import {
  AUDIT_ACTOR_IDS,
  AUDIT_ACTOR_TYPES,
  INTERVIEW_AUDIT_EVENT_TYPES,
} from "@lcsp/contracts/audit";
import { HttpStatus } from "@nestjs/common";

import type { PrismaService } from "../../../../../infrastructure/prisma/prisma.service.js";
import { AuditRedactorService } from "../../services/audit/audit-redactor.service.js";
import { GetInterviewAuditTrailHandler } from "./get-interview-audit-trail.handler.js";
import { GetInterviewAuditTrailQuery } from "./get-interview-audit-trail.query.js";

describe("GetInterviewAuditTrailHandler", () => {
  let handler: GetInterviewAuditTrailHandler;
  let findUniqueAssessmentMock: jest.Mock<any>;
  let findManyAuditEventsMock: jest.Mock<any>;
  let redactor: AuditRedactorService;

  beforeEach(() => {
    findUniqueAssessmentMock = jest.fn();
    findManyAuditEventsMock = jest.fn();
    redactor = new AuditRedactorService();

    const prisma = {
      assessment: {
        findUnique: findUniqueAssessmentMock,
      },
      auditEvent: {
        findMany: findManyAuditEventsMock,
      },
    } as unknown as PrismaService;

    handler = new GetInterviewAuditTrailHandler(prisma, redactor);
  });

  it("successfully returns normalized interview audit trail for assessment owner", async () => {
    findUniqueAssessmentMock.mockResolvedValue({
      id: "assessment-1",
      ownerId: "user-owner",
    });

    findManyAuditEventsMock.mockResolvedValue([
      {
        id: "evt-1",
        eventType: INTERVIEW_AUDIT_EVENT_TYPES.statementConfirmed,
        actorId: "user-owner",
        correlationId: "corr-evt-1",
        sessionId: "session-1",
        createdAt: new Date("2026-09-01T10:00:00.000Z"),
        payload: {
          actor: {
            id: "user-owner",
            type: AUDIT_ACTOR_TYPES.user,
            role: "CUSTOMER",
            name: "Alice Owner",
            authenticated: true,
          },
          statementKey: "primary_language",
          statementValue: "TypeScript",
          interviewContextRevision: "1",
          threadId: "thread-1",
          turnId: 2,
          runId: "run-1",
          guidanceVersion: "guidance-v1",
          modelId: "model-1",
          stage: "INITIAL_INTERVIEW",
          questionId: "q-lang",
          questionIntent: "CONFIRM",
          interpretation:
            "Customer confirmed TypeScript is the primary language.",
          evidenceRefs: ["ev-ts-1"],
          sourceSnapshot: {
            snapshotId: "snapshot-1",
            commitSha: "abc123",
            pgeVersion: "pge-v1",
            technicalCoverageState: "READY",
          },
          respondentRef: {
            id: "user-owner",
            role: "CUSTOMER",
            name: "Alice Owner",
            authenticated: true,
          },
        },
      },
      {
        id: "evt-2",
        eventType: INTERVIEW_AUDIT_EVENT_TYPES.contextSuperseded,
        actorId: "user-owner",
        correlationId: "corr-evt-2",
        sessionId: "session-1",
        createdAt: new Date("2026-09-01T10:30:00.000Z"),
        payload: {
          actor: {
            id: "user-owner",
            type: AUDIT_ACTOR_TYPES.user,
            role: "CUSTOMER",
            name: "Alice Owner",
            authenticated: true,
          },
          statementKey: "primary_language",
          priorValue: "TypeScript",
          priorRevision: "1",
          newValue: "TypeScript + Python",
          newRevision: "2",
          respondentRef: {
            id: "user-owner",
            role: "CUSTOMER",
            name: "Alice Owner",
            authenticated: true,
          },
        },
      },
    ]);

    const result = await handler.execute(
      new GetInterviewAuditTrailQuery(
        "assessment-1",
        "user-owner",
        AUTH_USER_ROLES.customer,
        undefined,
        "corr-trail-1",
      ),
    );

    expect(result.assessmentId).toBe("assessment-1");
    expect(result.total).toBe(2);
    expect(result.events).toHaveLength(2);

    expect(result.events[0]).toEqual({
      id: "evt-1",
      eventType: INTERVIEW_AUDIT_EVENT_TYPES.statementConfirmed,
      actorId: "user-owner",
      actorType: AUDIT_ACTOR_TYPES.user,
      actorRole: "CUSTOMER",
      actorName: "Alice Owner",
      respondentRef: {
        id: "user-owner",
        role: "CUSTOMER",
        name: "Alice Owner",
        authenticated: true,
      },
      assessmentId: "assessment-1",
      interviewContextRevision: "1",
      correlationId: "corr-evt-1",
      sessionId: "session-1",
      threadId: "thread-1",
      turnId: 2,
      runId: "run-1",
      guidanceVersion: "guidance-v1",
      modelId: "model-1",
      currentStage: "INITIAL_INTERVIEW",
      sourceSnapshot: {
        snapshotId: "snapshot-1",
        commitSha: "abc123",
        guidanceVersion: undefined,
        pgeVersion: "pge-v1",
        sourceVersion: undefined,
        technicalCoverageState: "READY",
        coverageLimitations: [],
      },
      statementKey: "primary_language",
      statementValue: "TypeScript",
      priorValue: undefined,
      priorRevision: undefined,
      isConflict: false,
      conflict: undefined,
      questionId: "q-lang",
      questionIntent: "CONFIRM",
      interpretation: "Customer confirmed TypeScript is the primary language.",
      evidenceRefs: ["ev-ts-1"],
      originatingInvestigationReference: null,
      downstreamImpact: false,
      affectedActivities: [],
      rerunScope: [],
      occurredAt: "2026-09-01T10:00:00.000Z",
    });

    expect(result.events[1]).toEqual({
      id: "evt-2",
      eventType: INTERVIEW_AUDIT_EVENT_TYPES.contextSuperseded,
      actorId: "user-owner",
      actorType: AUDIT_ACTOR_TYPES.user,
      actorRole: "CUSTOMER",
      actorName: "Alice Owner",
      respondentRef: {
        id: "user-owner",
        role: "CUSTOMER",
        name: "Alice Owner",
        authenticated: true,
      },
      assessmentId: "assessment-1",
      interviewContextRevision: "2",
      correlationId: "corr-evt-2",
      sessionId: "session-1",
      threadId: undefined,
      turnId: undefined,
      runId: undefined,
      guidanceVersion: undefined,
      modelId: undefined,
      currentStage: undefined,
      sourceSnapshot: undefined,
      statementKey: "primary_language",
      statementValue: "TypeScript + Python",
      priorValue: "TypeScript",
      priorRevision: "1",
      isConflict: false,
      conflict: undefined,
      questionId: undefined,
      questionIntent: undefined,
      interpretation: undefined,
      evidenceRefs: [],
      originatingInvestigationReference: null,
      downstreamImpact: false,
      affectedActivities: [],
      rerunScope: [],
      occurredAt: "2026-09-01T10:30:00.000Z",
    });
  });

  it("keeps runtime service attribution distinct from customer respondent provenance", async () => {
    findUniqueAssessmentMock.mockResolvedValue({
      id: "assessment-1",
      ownerId: "user-owner",
    });
    findManyAuditEventsMock.mockResolvedValue([
      {
        id: "evt-rerun",
        eventType: INTERVIEW_AUDIT_EVENT_TYPES.orchestrationRerunTriggered,
        actorId: AUDIT_ACTOR_IDS.assessmentOrchestrator,
        correlationId: "corr-rerun",
        sessionId: "session-1",
        createdAt: new Date("2026-09-01T11:00:00.000Z"),
        payload: {
          actor: {
            id: AUDIT_ACTOR_IDS.assessmentOrchestrator,
            type: AUDIT_ACTOR_TYPES.service,
            authenticated: false,
          },
          respondentRef: {
            id: "user-owner",
            role: "CUSTOMER",
            name: "Alice Owner",
            authenticated: true,
          },
          interviewContextRevision: "rev-7",
          threadId: "thread-7",
          runId: "orchestrator-run-7",
          stage: "RE_SCOPE",
          guidanceVersion: "guidance-v7",
          modelId: "model-v7",
          rerunScope: ["reconciliation", "classification_review"],
          sourceSnapshot: {
            snapshotId: "snapshot-7",
            commitSha: "commit-7",
            pgeVersion: "pge-v7",
            technicalCoverageState: "PARTIAL",
            coverageLimitations: ["worker repository unavailable"],
          },
        },
      },
    ]);

    const result = await handler.execute(
      new GetInterviewAuditTrailQuery(
        "assessment-1",
        "user-owner",
        AUTH_USER_ROLES.customer,
        undefined,
        "corr-read-rerun",
      ),
    );

    expect(result.events[0]).toMatchObject({
      actorId: AUDIT_ACTOR_IDS.assessmentOrchestrator,
      actorType: AUDIT_ACTOR_TYPES.service,
      actorRole: null,
      actorName: null,
      respondentRef: {
        id: "user-owner",
        role: "CUSTOMER",
        name: "Alice Owner",
        authenticated: true,
      },
      interviewContextRevision: "rev-7",
      correlationId: "corr-rerun",
      sessionId: "session-1",
      threadId: "thread-7",
      runId: "orchestrator-run-7",
      guidanceVersion: "guidance-v7",
      modelId: "model-v7",
      currentStage: "RE_SCOPE",
      rerunScope: ["reconciliation", "classification_review"],
      sourceSnapshot: {
        snapshotId: "snapshot-7",
        pgeVersion: "pge-v7",
        technicalCoverageState: "PARTIAL",
        coverageLimitations: ["worker repository unavailable"],
      },
    });
  });

  it("returns preserved cross-respondent conflict detail and does not fabricate missing revision", async () => {
    findUniqueAssessmentMock.mockResolvedValue({
      id: "assessment-1",
      ownerId: "user-owner",
    });
    findManyAuditEventsMock.mockResolvedValue([
      {
        id: "evt-conflict",
        eventType: INTERVIEW_AUDIT_EVENT_TYPES.contextConflicted,
        actorId: "user-bob",
        correlationId: "corr-conflict",
        sessionId: "session-conflict",
        createdAt: new Date("2026-09-01T12:00:00.000Z"),
        payload: {
          actor: {
            id: "user-bob",
            type: AUDIT_ACTOR_TYPES.user,
            role: "CUSTOMER",
            authenticated: true,
          },
          statementKey: "cloud_provider",
          conflict: {
            firstRespondent: {
              id: "user-alice",
              role: "CUSTOMER",
              authenticated: true,
            },
            firstValue: "AWS",
            firstTurnId: 2,
            secondRespondent: {
              id: "user-bob",
              role: "CUSTOMER",
              authenticated: true,
            },
            secondValue: "GCP",
            secondTurnId: 4,
          },
        },
      },
    ]);

    const result = await handler.execute(
      new GetInterviewAuditTrailQuery(
        "assessment-1",
        "user-owner",
        AUTH_USER_ROLES.customer,
        undefined,
        "corr-read-conflict",
      ),
    );

    expect(result.events[0].interviewContextRevision).toBeNull();
    expect(result.events[0].isConflict).toBe(true);
    expect(result.events[0].conflict).toEqual({
      firstRespondentRef: {
        id: "user-alice",
        role: "CUSTOMER",
        name: undefined,
        authenticated: true,
      },
      firstStatementValue: "AWS",
      firstTurnId: 2,
      secondRespondentRef: {
        id: "user-bob",
        role: "CUSTOMER",
        name: undefined,
        authenticated: true,
      },
      secondStatementValue: "GCP",
      secondTurnId: 4,
    });
  });

  it("enforces tenant isolation: throws 404 when assessment is not found", async () => {
    findUniqueAssessmentMock.mockResolvedValue(null);

    await expect(
      handler.execute(
        new GetInterviewAuditTrailQuery(
          "non-existent-assessment",
          "user-1",
          AUTH_USER_ROLES.customer,
          undefined,
          "corr-notfound",
        ),
      ),
    ).rejects.toMatchObject({
      status: HttpStatus.NOT_FOUND,
    });
  });

  it("enforces tenant isolation: throws 404 when customer queries another user's assessment", async () => {
    findUniqueAssessmentMock.mockResolvedValue({
      id: "assessment-1",
      ownerId: "user-another",
    });

    await expect(
      handler.execute(
        new GetInterviewAuditTrailQuery(
          "assessment-1",
          "user-intruder",
          AUTH_USER_ROLES.customer,
          undefined,
          "corr-forbidden",
        ),
      ),
    ).rejects.toMatchObject({
      status: HttpStatus.NOT_FOUND,
    });
  });

  it("allows ADMIN users to read assessment audit trail", async () => {
    findUniqueAssessmentMock.mockResolvedValue({
      id: "assessment-1",
      ownerId: "user-customer",
    });

    findManyAuditEventsMock.mockResolvedValue([]);

    const result = await handler.execute(
      new GetInterviewAuditTrailQuery(
        "assessment-1",
        "admin-user",
        AUTH_USER_ROLES.admin,
        undefined,
        "corr-admin",
      ),
    );

    expect(result.assessmentId).toBe("assessment-1");
    expect(result.events).toEqual([]);
    expect(result.total).toBe(0);
  });

  it("rejects audit retrieval when the authenticated scope targets another assessment", async () => {
    findUniqueAssessmentMock.mockResolvedValue({
      id: "assessment-1",
      ownerId: "user-owner",
    });

    await expect(
      handler.execute(
        new GetInterviewAuditTrailQuery(
          "assessment-1",
          "user-owner",
          AUTH_USER_ROLES.customer,
          "assessment:assessment-2",
          "corr-scope-mismatch",
        ),
      ),
    ).rejects.toMatchObject({ status: HttpStatus.NOT_FOUND });

    expect(findManyAuditEventsMock).not.toHaveBeenCalled();
  });
});
