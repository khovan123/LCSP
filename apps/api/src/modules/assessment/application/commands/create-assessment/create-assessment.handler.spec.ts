import {
  ASSESSMENT_ERROR_CODES,
  ASSESSMENT_EVENT_TYPES,
  ASSESSMENT_STATUS_CODES,
} from "@lcsp/contracts/assessment";
import { AUTH_ERROR_CODES } from "@lcsp/contracts/auth";
import {
  PBAC_ACTIONS,
  PBAC_DECISION,
  SUBJECT_ROLES,
} from "@lcsp/contracts/pbac";
import { describe, it, expect, jest } from "@jest/globals";
import {
  ForbiddenException,
  UnprocessableEntityException,
} from "@nestjs/common";

import type { AssessmentRepository } from "../../ports/persistence/assessment.repository.js";
import type { AuditWriterService } from "../../../../../platform/audit/audit-writer.service.js";
import type { OutboxRepository } from "../../../../../platform/outbox/outbox.repository.js";
import { CreateAssessmentCommand } from "./create-assessment.command.js";
import { CreateAssessmentHandler } from "./create-assessment.handler.js";

function buildHandler() {
  const save = jest
    .fn<AssessmentRepository["save"]>()
    .mockResolvedValue(undefined);
  const findById = jest
    .fn<AssessmentRepository["findById"]>()
    .mockResolvedValue(null);
  const findMany = jest
    .fn<AssessmentRepository["findMany"]>()
    .mockResolvedValue({ items: [], total: 0 });
  const repository: AssessmentRepository = { save, findById, findMany };

  const write = jest
    .fn<AuditWriterService["write"]>()
    .mockResolvedValue(undefined);
  const auditWriter = { write } as unknown as AuditWriterService;

  const enqueue = jest
    .fn<OutboxRepository["enqueue"]>()
    .mockResolvedValue(undefined);
  const outboxRepository = { enqueue } as unknown as OutboxRepository;

  const handler = new CreateAssessmentHandler(
    repository,
    auditWriter,
    outboxRepository,
  );

  return { handler, save, write, enqueue };
}

describe("CreateAssessmentHandler", () => {
  // T01
  it("creates an assessment with WIZARD_IN_PROGRESS status for a valid request", async () => {
    const { handler, save } = buildHandler();

    const result = await handler.execute(
      new CreateAssessmentCommand(
        "org-1",
        "user-1",
        "My AI System Assessment",
        undefined,
        "corr-1",
        {
          subjectRole: SUBJECT_ROLES.manager,
          selectedAction: PBAC_ACTIONS.assessmentCreate,
          policyId: "policy-manager-workspace",
          policyVersion: "2026-06-26",
        },
      ),
    );

    expect(result.status).toBe(ASSESSMENT_STATUS_CODES.wizardInProgress);
    expect(result.assessment_id).toBeTruthy();
    expect(result.correlation_id).toBe("corr-1");
    expect(save).toHaveBeenCalledTimes(1);
  });

  // T03
  it("throws UnprocessableEntityException with INVALID_REQUEST when name is missing", async () => {
    const { handler, save } = buildHandler();

    await expect(
      handler.execute(
        new CreateAssessmentCommand(
          "org-1",
          "user-1",
          undefined,
          undefined,
          "corr-1",
          {
            subjectRole: SUBJECT_ROLES.manager,
            selectedAction: PBAC_ACTIONS.assessmentCreate,
            policyId: "policy-manager-workspace",
            policyVersion: "2026-06-26",
          },
        ),
      ),
    ).rejects.toThrow(UnprocessableEntityException);

    try {
      await handler.execute(
        new CreateAssessmentCommand(
          "org-1",
          "user-1",
          undefined,
          undefined,
          "corr-1",
          {
            subjectRole: SUBJECT_ROLES.manager,
            selectedAction: PBAC_ACTIONS.assessmentCreate,
            policyId: "policy-manager-workspace",
            policyVersion: "2026-06-26",
          },
        ),
      );
    } catch (error) {
      expect((error as UnprocessableEntityException).getResponse()).toEqual({
        error_code: ASSESSMENT_ERROR_CODES.invalidRequest,
        correlation_id: "corr-1",
      });
    }
    expect(save).not.toHaveBeenCalled();
  });

  it("throws UnprocessableEntityException with INVALID_REQUEST when name exceeds 200 chars", async () => {
    const { handler, save } = buildHandler();
    const longName = "a".repeat(201);

    await expect(
      handler.execute(
        new CreateAssessmentCommand(
          "org-1",
          "user-1",
          longName,
          undefined,
          "corr-1",
          {
            subjectRole: SUBJECT_ROLES.manager,
            selectedAction: PBAC_ACTIONS.assessmentCreate,
            policyId: "policy-manager-workspace",
            policyVersion: "2026-06-26",
          },
        ),
      ),
    ).rejects.toThrow(UnprocessableEntityException);
    expect(save).not.toHaveBeenCalled();
  });

  it("throws UnprocessableEntityException with INVALID_REQUEST when description exceeds 1000 chars", async () => {
    const { handler, save } = buildHandler();
    const longDescription = "a".repeat(1001);

    await expect(
      handler.execute(
        new CreateAssessmentCommand(
          "org-1",
          "user-1",
          "Valid name",
          longDescription,
          "corr-1",
          {
            subjectRole: SUBJECT_ROLES.manager,
            selectedAction: PBAC_ACTIONS.assessmentCreate,
            policyId: "policy-manager-workspace",
            policyVersion: "2026-06-26",
          },
        ),
      ),
    ).rejects.toThrow(UnprocessableEntityException);
    expect(save).not.toHaveBeenCalled();
  });

  // T05, T06
  it("sets ownerId and organizationId from the command", async () => {
    const { handler, save } = buildHandler();

    await handler.execute(
      new CreateAssessmentCommand(
        "org-42",
        "user-42",
        "Name",
        undefined,
        "corr-1",
        {
          subjectRole: SUBJECT_ROLES.manager,
          selectedAction: PBAC_ACTIONS.assessmentCreate,
          policyId: "policy-manager-workspace",
          policyVersion: "2026-06-26",
        },
      ),
    );

    const savedAssessment = save.mock.calls[0][0];
    expect(savedAssessment.ownerId).toBe("user-42");
    expect(savedAssessment.organizationId).toBe("org-42");
  });

  // T07
  it("writes an ASSESSMENT_CREATED audit event without name/description in the payload", async () => {
    const { handler, write } = buildHandler();

    await handler.execute(
      new CreateAssessmentCommand(
        "org-1",
        "user-1",
        "Secret Project Name",
        "Sensitive description",
        "corr-1",
        {
          subjectRole: SUBJECT_ROLES.manager,
          selectedAction: PBAC_ACTIONS.assessmentCreate,
          policyId: "policy-manager-workspace",
          policyVersion: "2026-06-26",
        },
      ),
    );

    expect(write).toHaveBeenCalledTimes(1);
    const event = write.mock.calls[0][0];
    expect(event.eventType).toBe(ASSESSMENT_EVENT_TYPES.created);
    expect(event.actorId).toBe("user-1");
    expect(event.organizationId).toBe("org-1");
    expect(event.resourceType).toBe("Assessment");
    expect(event.resourceId).toBeTruthy();
    expect(event.correlationId).toBe("corr-1");
    expect(event.policyId).toBe("policy-manager-workspace");
    expect(event.policyVersion).toBe("2026-06-26");
    expect(event.decision).toBe(PBAC_DECISION.allow);
    expect(JSON.stringify(event.payload)).not.toMatch(/Secret Project Name/);
    expect(JSON.stringify(event.payload)).not.toMatch(/Sensitive description/);
  });

  // T08
  it("response contains no developer assignment fields", async () => {
    const { handler } = buildHandler();

    const result = await handler.execute(
      new CreateAssessmentCommand(
        "org-1",
        "user-1",
        "Name",
        undefined,
        "corr-1",
        {
          subjectRole: SUBJECT_ROLES.manager,
          selectedAction: PBAC_ACTIONS.assessmentCreate,
          policyId: "policy-manager-workspace",
          policyVersion: "2026-06-26",
        },
      ),
    );

    expect(result).not.toHaveProperty("developer_id");
    expect(result).not.toHaveProperty("developerId");
  });

  it("enqueues an assessment.created outbox message", async () => {
    const { handler, enqueue } = buildHandler();

    await handler.execute(
      new CreateAssessmentCommand(
        "org-1",
        "user-1",
        "Name",
        undefined,
        "corr-1",
        {
          subjectRole: SUBJECT_ROLES.manager,
          selectedAction: PBAC_ACTIONS.assessmentCreate,
          policyId: "policy-manager-workspace",
          policyVersion: "2026-06-26",
        },
      ),
    );

    expect(enqueue).toHaveBeenCalledTimes(1);
    const input = enqueue.mock.calls[0][0];
    expect(input.eventType).toBe(ASSESSMENT_EVENT_TYPES.createdOutbox);
    expect(input.aggregateType).toBe("Assessment");
  });

  it("denies service-level assessment creation when PBAC context is not Manager assessment:create", async () => {
    const { handler, save, write, enqueue } = buildHandler();

    await expect(
      handler.execute(
        new CreateAssessmentCommand(
          "org-1",
          "developer-1",
          "Denied",
          undefined,
          "corr-deny",
          {
            subjectRole: SUBJECT_ROLES.developer,
            selectedAction: PBAC_ACTIONS.assessmentCreate,
            policyId: "policy-developer",
            policyVersion: "2026-06-26",
          },
        ),
      ),
    ).rejects.toThrow(ForbiddenException);

    expect(save).not.toHaveBeenCalled();
    expect(enqueue).not.toHaveBeenCalled();
    expect(write).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: ASSESSMENT_EVENT_TYPES.created,
        actorId: "developer-1",
        organizationId: "org-1",
        resourceType: "Assessment",
        resourceId: null,
        correlationId: "corr-deny",
        decision: PBAC_DECISION.deny,
        reasonCode: AUTH_ERROR_CODES.pbacDenied,
        policyId: "policy-developer",
        policyVersion: "2026-06-26",
      }),
    );
  });
});
