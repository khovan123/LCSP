import {
  ASSESSMENT_LOCK_REASONS,
  ASSESSMENT_STATUS_CODES,
  WIZARD_STATUS_CODES,
} from "@lcsp/contracts/assessment";
import { SUBJECT_ROLES } from "@lcsp/contracts/pbac";
import { describe, it, expect, jest } from "@jest/globals";
import { NotFoundException } from "@nestjs/common";

import { Assessment } from "../../../domain/entities/assessment.entity.js";
import type { AssessmentRepository } from "../../ports/persistence/assessment.repository.js";
import type { PrismaService } from "../../../../../infrastructure/prisma/prisma.service.js";
import { GetAssessmentQuery } from "./get-assessment.query.js";
import { GetAssessmentHandler } from "./get-assessment.handler.js";

function makeAssessment(
  overrides: Partial<{
    organizationId: string;
    ownerId: string;
    name: string;
  }> = {},
) {
  return Assessment.create({
    organizationId: overrides.organizationId ?? "org-1",
    ownerId: overrides.ownerId ?? "user-1",
    name: overrides.name ?? "Test Assessment",
  });
}

function buildHandler(input: {
  assessment: Assessment | null;
  wizardProfile?: { status: string } | null;
}) {
  const findById = jest
    .fn<AssessmentRepository["findById"]>()
    .mockResolvedValue(input.assessment);
  const save = jest
    .fn<AssessmentRepository["save"]>()
    .mockResolvedValue(undefined);
  const saveInTx = jest
    .fn<AssessmentRepository["saveInTx"]>()
    .mockResolvedValue(undefined);
  const findMany = jest
    .fn<AssessmentRepository["findMany"]>()
    .mockResolvedValue({ items: [], total: 0 });
  const repository: AssessmentRepository = {
    save,
    saveInTx,
    findById,
    findMany,
  };

  const findUnique = jest
    .fn<() => Promise<{ status: string } | null>>()
    .mockResolvedValue(input.wizardProfile ?? null);
  const prisma = {
    wizardProfile: { findUnique },
  } as unknown as PrismaService;

  const handler = new GetAssessmentHandler(repository, prisma);
  return { handler, findById, findUnique };
}

describe("GetAssessmentHandler", () => {
  // T01
  it("returns full assessment state for the owning Manager", async () => {
    const assessment = makeAssessment({
      organizationId: "org-1",
      ownerId: "user-1",
    });
    const { handler } = buildHandler({ assessment, wizardProfile: null });

    const result = await handler.execute(
      new GetAssessmentQuery(
        "assessment-1",
        "org-1",
        "user-1",
        SUBJECT_ROLES.manager,
        "corr-1",
      ),
    );

    expect(result.assessment_id).toBe(assessment.id);
    expect(result.name).toBe("Test Assessment");
    expect(result.status).toBe(ASSESSMENT_STATUS_CODES.wizardInProgress);
    expect(result.owner_id).toBe("user-1");
    expect(result.organization_id).toBe("org-1");
    expect(result.correlation_id).toBe("corr-1");
  });

  // T02: no WizardProfile row -> NOT_STARTED
  it("reports wizard_status NOT_STARTED when no WizardProfile exists", async () => {
    const assessment = makeAssessment();
    const { handler } = buildHandler({ assessment, wizardProfile: null });

    const result = await handler.execute(
      new GetAssessmentQuery(
        "assessment-1",
        "org-1",
        "user-1",
        SUBJECT_ROLES.manager,
        "corr-1",
      ),
    );

    expect(result.wizard_status).toBe(WIZARD_STATUS_CODES.notStarted);
  });

  it("reports wizard_status from the WizardProfile row when it exists", async () => {
    const assessment = makeAssessment();
    const { handler } = buildHandler({
      assessment,
      wizardProfile: { status: WIZARD_STATUS_CODES.inProgress },
    });

    const result = await handler.execute(
      new GetAssessmentQuery(
        "assessment-1",
        "org-1",
        "user-1",
        SUBJECT_ROLES.manager,
        "corr-1",
      ),
    );

    expect(result.wizard_status).toBe(WIZARD_STATUS_CODES.inProgress);
  });

  // T02: classification always locked until MW-evid-001 lands (no TechnicalEvidenceReport table yet)
  it("always reports classification_locked=true with LOCKED_EVIDENCE_REQUIRED (no accepted evidence possible yet)", async () => {
    const assessment = makeAssessment();
    const { handler } = buildHandler({ assessment, wizardProfile: null });

    const result = await handler.execute(
      new GetAssessmentQuery(
        "assessment-1",
        "org-1",
        "user-1",
        SUBJECT_ROLES.manager,
        "corr-1",
      ),
    );

    expect(result.readiness_state.classification_locked).toBe(true);
    expect(result.readiness_state.lock_reason).toBe(
      ASSESSMENT_LOCK_REASONS.evidenceRequired,
    );
    expect(result.readiness_state.missing_evidence.length).toBeGreaterThan(0);
  });

  // T04
  it("throws ASSESSMENT_NOT_FOUND when the assessment does not exist", async () => {
    const { handler } = buildHandler({ assessment: null });

    await expect(
      handler.execute(
        new GetAssessmentQuery(
          "missing",
          "org-1",
          "user-1",
          SUBJECT_ROLES.manager,
          "corr-1",
        ),
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it("throws ASSESSMENT_NOT_FOUND when the assessment belongs to a different organization", async () => {
    const assessment = makeAssessment({ organizationId: "org-2" });
    const { handler } = buildHandler({ assessment });

    await expect(
      handler.execute(
        new GetAssessmentQuery(
          assessment.id,
          "org-1",
          "user-1",
          SUBJECT_ROLES.manager,
          "corr-1",
        ),
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it("throws ASSESSMENT_NOT_FOUND when a Manager requests an assessment owned by someone else in the same org", async () => {
    const assessment = makeAssessment({
      organizationId: "org-1",
      ownerId: "user-2",
    });
    const { handler } = buildHandler({ assessment });

    await expect(
      handler.execute(
        new GetAssessmentQuery(
          assessment.id,
          "org-1",
          "user-1",
          SUBJECT_ROLES.manager,
          "corr-1",
        ),
      ),
    ).rejects.toThrow(NotFoundException);
  });

  // T07: Developer scope is not restricted by ownerId (PBAC action grant already gates access)
  it("allows a Developer to read an assessment not owned by them, in the same org", async () => {
    const assessment = makeAssessment({
      organizationId: "org-1",
      ownerId: "user-2",
    });
    const { handler } = buildHandler({ assessment });

    const result = await handler.execute(
      new GetAssessmentQuery(
        assessment.id,
        "org-1",
        "user-3",
        SUBJECT_ROLES.developer,
        "corr-1",
      ),
    );

    expect(result.assessment_id).toBe(assessment.id);
  });

  // T06 / T08
  it("never includes risk/severity/non-compliant wording, and next_action is business language", async () => {
    const assessment = makeAssessment();
    const { handler } = buildHandler({ assessment, wizardProfile: null });

    const result = await handler.execute(
      new GetAssessmentQuery(
        assessment.id,
        "org-1",
        "user-1",
        SUBJECT_ROLES.manager,
        "corr-1",
      ),
    );

    const serialized = JSON.stringify(result);
    expect(serialized).not.toMatch(/\bHIGH\b|\bMEDIUM\b|\bLOW\b/);
    expect(serialized.toLowerCase()).not.toMatch(
      /\brisk\b|\bseverity\b|\bviolation\b|non-compliant/,
    );
    expect(result.next_action.length).toBeGreaterThan(0);
  });

  it("varies next_action by wizard_status", async () => {
    const assessment = makeAssessment();
    const { handler: notStarted } = buildHandler({
      assessment,
      wizardProfile: null,
    });
    const { handler: inProgress } = buildHandler({
      assessment,
      wizardProfile: { status: WIZARD_STATUS_CODES.inProgress },
    });
    const { handler: submitted } = buildHandler({
      assessment,
      wizardProfile: { status: WIZARD_STATUS_CODES.submitted },
    });

    const query = new GetAssessmentQuery(
      assessment.id,
      "org-1",
      "user-1",
      SUBJECT_ROLES.manager,
      "corr-1",
    );
    const a = await notStarted.execute(query);
    const b = await inProgress.execute(query);
    const c = await submitted.execute(query);

    expect(new Set([a.next_action, b.next_action, c.next_action]).size).toBe(3);
  });
});
