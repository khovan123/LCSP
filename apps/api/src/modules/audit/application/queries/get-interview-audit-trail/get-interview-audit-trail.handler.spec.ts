import { jest } from "@jest/globals";
import { AUTH_USER_ROLES } from "@lcsp/contracts/auth";
import { INTERVIEW_AUDIT_EVENT_TYPES } from "@lcsp/contracts/audit";
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
        createdAt: new Date("2026-09-01T10:00:00.000Z"),
        payload: {
          statementKey: "primary_language",
          statementValue: "TypeScript",
          interviewContextRevision: "1",
          questionId: "q-lang",
          evidenceRefs: ["ev-ts-1"],
          respondentRef: {
            id: "user-owner",
            role: "CUSTOMER",
            name: "Alice Owner",
          },
        },
      },
      {
        id: "evt-2",
        eventType: INTERVIEW_AUDIT_EVENT_TYPES.contextSuperseded,
        actorId: "user-owner",
        createdAt: new Date("2026-09-01T10:30:00.000Z"),
        payload: {
          statementKey: "primary_language",
          priorValue: "TypeScript",
          priorRevision: "1",
          newValue: "TypeScript + Python",
          newRevision: "2",
          respondentRef: {
            id: "user-owner",
            role: "CUSTOMER",
            name: "Alice Owner",
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
      actorRole: "CUSTOMER",
      actorName: "Alice Owner",
      assessmentId: "assessment-1",
      interviewContextRevision: "1",
      statementKey: "primary_language",
      statementValue: "TypeScript",
      priorValue: undefined,
      priorRevision: undefined,
      isConflict: false,
      questionId: "q-lang",
      evidenceRefs: ["ev-ts-1"],
      originatingInvestigationReference: null,
      downstreamImpact: false,
      occurredAt: "2026-09-01T10:00:00.000Z",
    });

    expect(result.events[1]).toEqual({
      id: "evt-2",
      eventType: INTERVIEW_AUDIT_EVENT_TYPES.contextSuperseded,
      actorId: "user-owner",
      actorRole: "CUSTOMER",
      actorName: "Alice Owner",
      assessmentId: "assessment-1",
      interviewContextRevision: "2",
      statementKey: "primary_language",
      statementValue: "TypeScript + Python",
      priorValue: "TypeScript",
      priorRevision: "1",
      isConflict: false,
      questionId: undefined,
      evidenceRefs: [],
      originatingInvestigationReference: null,
      downstreamImpact: false,
      occurredAt: "2026-09-01T10:30:00.000Z",
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
});
