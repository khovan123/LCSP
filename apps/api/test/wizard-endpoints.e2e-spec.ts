/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call */
import * as assert from "node:assert/strict";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import type { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { httpRequest } from "./support/http.js";

import { AppModule } from "../src/app.module.js";
import {
  TEST_DATABASE_URL,
  pushPrismaSchema,
  resetAuthWorkspaceDatabase,
  seedAuthWorkspaceFixture,
} from "./support/auth-workspace-test-helpers.js";

import {
  PBAC_ACTIONS,
  PBAC_STATE_GATES,
  SUBJECT_ROLES,
} from "@lcsp/contracts/pbac";
import { AUTH_MEMBERSHIP_STATUSES } from "@lcsp/contracts/auth";
import { AUTH_ERROR_CODES } from "@lcsp/contracts/auth";
import {
  ASSESSMENT_ERROR_CODES,
  ASSESSMENT_LOCK_REASONS,
  ASSESSMENT_STATUS_CODES,
  WIZARD_STATUS_CODES,
} from "@lcsp/contracts/assessment";
import { WIZARD_EVENT_TYPES } from "@lcsp/contracts/wizard";
import { TECHNICAL_EVIDENCE_REPORT_STATUSES } from "@lcsp/contracts/scan";
import { REPOSITORY_CONNECTION_STATUSES } from "@lcsp/contracts/github-integration";

import {
  OUTBOX_MESSAGE_SCHEMA_VERSION,
  OUTBOX_STATUSES,
} from "@lcsp/contracts/outbox";

describe("Wizard Endpoints (e2e) [MW-wiz-001, MW-wiz-002, MW-wiz-003]", () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let managerToken: string;
  let restrictedToken: string;
  const orgId = "org-1";

  // Example Assessment ID to be created in each block
  let assessmentId: string;

  beforeAll(async () => {
    process.env.DATABASE_URL = TEST_DATABASE_URL;
    pushPrismaSchema();

    prisma = new PrismaClient({ adapter: new PrismaPg(TEST_DATABASE_URL) });
    await prisma.$connect();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  beforeEach(async () => {
    // Clear wizard profile and outbox messages explicitly, though resetAuthWorkspaceDatabase might clear some
    await prisma.wizardProfile.deleteMany();
    await prisma.technicalEvidenceReport.deleteMany();
    await prisma.repositoryConnection.deleteMany();
    await prisma.assessment.deleteMany();
    await resetAuthWorkspaceDatabase(prisma);
    await seedAuthWorkspaceFixture(prisma);

    // Sign in as Manager
    const signInManager = await httpRequest(app).post("/auth/sign-in").send({
      email: "manager@acme.test",
      password: "CorrectHorseBatteryStaple!",
      organization_id: orgId,
    });
    managerToken = signInManager.body?.session_token ?? "";

    // Setup Restricted User
    const restrictedPolicyId = "policy-no-wizard-access";
    await prisma.authPolicy.create({
      data: {
        id: restrictedPolicyId,
        version: "2026-07-10",
        actions: [PBAC_ACTIONS.workspaceRead], // Only workspace read
        subjectRole: SUBJECT_ROLES.manager,
        stateGate: PBAC_STATE_GATES.membershipActive,
        organizationId: orgId,
      },
    });
    const restrictedUserId = "user-no-wizard-access";
    await prisma.authUser.create({
      data: {
        id: restrictedUserId,
        email: "restricted@acme.test",
        passwordHash: (
          await import("../src/modules/auth-workspace/infrastructure/security/security.utils.js")
        ).hashSecret("CorrectHorseBatteryStaple!"),
        emailVerified: true,
        failedLoginCount: 0,
      },
    });
    await prisma.authMembership.create({
      data: {
        id: "membership-no-wizard-access",
        userId: restrictedUserId,
        organizationId: orgId,
        status: AUTH_MEMBERSHIP_STATUSES.active,
        subjectAttributes: { role: SUBJECT_ROLES.manager },
        policyId: restrictedPolicyId,
        policyVersion: "2026-07-10",
      },
    });

    const signInRestricted = await httpRequest(app).post("/auth/sign-in").send({
      email: "restricted@acme.test",
      password: "CorrectHorseBatteryStaple!",
      organization_id: orgId,
    });
    restrictedToken = signInRestricted.body?.session_token ?? "";
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  // Helper to create an assessment before tests
  const createAssessment = async () => {
    const res = await httpRequest(app)
      .post("/assessments")
      .set("Authorization", `Bearer ${managerToken}`)
      .send({ name: "Wizard Test Assessment" });
    assessmentId = res.body.assessment_id;
  };

  describe("Save Wizard Draft [MW-wiz-001]", () => {
    beforeEach(async () => {
      await createAssessment();
    });

    it("T01 & T02: Valid partial answers and all fields provided -> 200, status IN_PROGRESS", async () => {
      // Partial answers
      const res1 = await httpRequest(app)
        .put(`/assessments/${assessmentId}/wizard/draft`)
        .set("Authorization", `Bearer ${managerToken}`)
        .send({ answers: { purpose: "Test purpose" } });

      assert.equal(res1.status, 200);
      let body = res1.body;
      assert.equal(body.status, WIZARD_STATUS_CODES.inProgress);
      assert.equal(body.version, 1);
      assert.ok(body.wizard_profile_id);

      // All fields provided
      const res2 = await httpRequest(app)
        .put(`/assessments/${assessmentId}/wizard/draft`)
        .set("Authorization", `Bearer ${managerToken}`)
        .send({
          answers: {
            purpose: "Updated purpose",
            sector: "Finance",
            data_type: ["PII"],
            user_group: "Internal employees",
            user_impact: "Low",
            decision_role: "Advisory",
            human_oversight: "Manager review",
            external_llm_usage: false,
          },
        });

      assert.equal(res2.status, 200);
      body = res2.body;
      assert.equal(body.status, WIZARD_STATUS_CODES.inProgress);
      assert.equal(body.version, 2);
    });

    it("T03: Re-save increments version", async () => {
      const res1 = await httpRequest(app)
        .put(`/assessments/${assessmentId}/wizard/draft`)
        .set("Authorization", `Bearer ${managerToken}`)
        .send({ answers: { purpose: "Draft 1" } });
      assert.equal(res1.status, 200);
      assert.equal(res1.body.version, 1);

      const res2 = await httpRequest(app)
        .put(`/assessments/${assessmentId}/wizard/draft`)
        .set("Authorization", `Bearer ${managerToken}`)
        .send({ answers: { purpose: "Draft 2" } });
      assert.equal(res2.status, 200);
      assert.equal(res2.body.version, 2);
    });

    it("T04: Attempt to save when already submitted -> 409", async () => {
      await prisma.wizardProfile.create({
        data: {
          id: "wp-3",
          assessmentId,
          organizationId: orgId,
          ownerId: "user-1",
          status: WIZARD_STATUS_CODES.submitted,
          answers: {},
          version: 1,
          submittedAt: new Date(),
        },
      });

      const res = await httpRequest(app)
        .put(`/assessments/${assessmentId}/wizard/draft`)
        .set("Authorization", `Bearer ${managerToken}`)
        .send({ answers: { purpose: "Draft" } });
      assert.equal(res.status, 409);
      assert.equal(res.body.error_code, "WIZARD_ALREADY_SUBMITTED");
    });

    it("T05: Invalid/missing assessment -> 404", async () => {
      const res = await httpRequest(app)
        .put(`/assessments/invalid-id/wizard/draft`)
        .set("Authorization", `Bearer ${managerToken}`)
        .send({ answers: { purpose: "Draft" } });
      assert.equal(res.status, 404);
      assert.equal(res.body.error_code, ASSESSMENT_ERROR_CODES.notFound);
    });

    it("T06: Actor lacks wizard:write -> 403 PBAC_DENIED", async () => {
      const res = await httpRequest(app)
        .put(`/assessments/${assessmentId}/wizard/draft`)
        .set("Authorization", `Bearer ${restrictedToken}`)
        .send({ answers: { purpose: "Draft" } });
      assert.equal(res.status, 403);
      assert.equal(res.body.error_code, AUTH_ERROR_CODES.pbacDenied);
    });

    it("T07: Partial save preserves existing fields", async () => {
      await httpRequest(app)
        .put(`/assessments/${assessmentId}/wizard/draft`)
        .set("Authorization", `Bearer ${managerToken}`)
        .send({
          answers: { purpose: "Original purpose", sector: "Healthcare" },
        });

      await httpRequest(app)
        .put(`/assessments/${assessmentId}/wizard/draft`)
        .set("Authorization", `Bearer ${managerToken}`)
        .send({ answers: { sector: "Finance" } });

      const profile = await prisma.wizardProfile.findUnique({
        where: { assessmentId },
      });
      const answers = profile?.answers as any;
      assert.equal(answers.purpose, "Original purpose");
      assert.equal(answers.sector, "Finance");
    });

    it("T08: WIZARD_DRAFT_SAVED audit event has no answer content", async () => {
      await httpRequest(app)
        .put(`/assessments/${assessmentId}/wizard/draft`)
        .set("Authorization", `Bearer ${managerToken}`)
        .send({ answers: { purpose: "Super secret answers" } });

      const audit = await prisma.authAuditEvent.findFirst({
        where: { eventType: WIZARD_EVENT_TYPES.draftSaved },
        orderBy: { createdAt: "desc" },
      });

      assert.ok(audit);
      assert.doesNotMatch(
        JSON.stringify(audit.payload),
        /Super secret answers/,
      );
    });
  });

  describe("Submit Wizard [MW-wiz-002]", () => {
    beforeEach(async () => {
      await createAssessment();
    });

    const validAnswers = {
      purpose: "Test purpose",
      sector: "Finance",
      data_type: ["PII"],
      user_group: "Internal employees",
      user_impact: "Low",
      decision_role: "Advisory",
      human_oversight: "Manager review",
      external_llm_usage: false,
    };

    it("T01: All critical fields present -> 200, status SUBMITTED", async () => {
      const res = await httpRequest(app)
        .post(`/assessments/${assessmentId}/wizard/submit`)
        .set("Authorization", `Bearer ${managerToken}`)
        .send({ answers: validAnswers });

      assert.equal(res.status, 200);
      const body = res.body;
      assert.equal(body.status, WIZARD_STATUS_CODES.submitted);
      assert.equal(body.assessment_status, ASSESSMENT_STATUS_CODES.wizardSubmitted);
      assert.ok(body.submitted_at);
    });

    it("T02 & T03: Missing critical fields -> 422 WIZARD_VALIDATION_FAILED", async () => {
      const invalidAnswers = { ...validAnswers };
      delete (invalidAnswers as any).purpose;

      const res = await httpRequest(app)
        .post(`/assessments/${assessmentId}/wizard/submit`)
        .set("Authorization", `Bearer ${managerToken}`)
        .send({ answers: invalidAnswers });

      assert.equal(res.status, 422);
      const body = res.body;
      assert.equal(body.error_code, "WIZARD_VALIDATION_FAILED");
      assert.ok(body.message);
      assert.doesNotMatch(body.message.toLowerCase(), /risk|severity/);
    });

    it("T04: Already submitted -> 409 WIZARD_ALREADY_SUBMITTED", async () => {
      await httpRequest(app)
        .post(`/assessments/${assessmentId}/wizard/submit`)
        .set("Authorization", `Bearer ${managerToken}`)
        .send({ answers: validAnswers });

      const res = await httpRequest(app)
        .post(`/assessments/${assessmentId}/wizard/submit`)
        .set("Authorization", `Bearer ${managerToken}`)
        .send({ answers: validAnswers });

      assert.equal(res.status, 409);
      assert.equal(res.body.error_code, "WIZARD_ALREADY_SUBMITTED");
    });

    it("T05: Assessment not found -> 404", async () => {
      const res = await httpRequest(app)
        .post(`/assessments/invalid-id/wizard/submit`)
        .set("Authorization", `Bearer ${managerToken}`)
        .send({ answers: validAnswers });

      assert.equal(res.status, 404);
      assert.equal(res.body.error_code, ASSESSMENT_ERROR_CODES.notFound);
    });

    it("T06: Verify Assessment.status transitions correctly upon submission", async () => {
      await httpRequest(app)
        .post(`/assessments/${assessmentId}/wizard/submit`)
        .set("Authorization", `Bearer ${managerToken}`)
        .send({ answers: validAnswers });

      const assessment = await prisma.assessment.findUnique({
        where: { id: assessmentId },
      });
      assert.ok(assessment);
      assert.notEqual(
        assessment.status,
        ASSESSMENT_STATUS_CODES.wizardInProgress,
      );
    });

    it("T07: Outbox message wizard.submitted is generated", async () => {
      await httpRequest(app)
        .post(`/assessments/${assessmentId}/wizard/submit`)
        .set("Authorization", `Bearer ${managerToken}`)
        .send({ answers: validAnswers });

      const outbox = await prisma.outboxMessage.findFirst({
        where: {
          aggregateType: "WizardProfile",
          eventType: WIZARD_EVENT_TYPES.submittedOutbox,
        },
      });

      assert.ok(outbox);
      assert.equal(outbox.status, OUTBOX_STATUSES.pending);
      const payload = outbox.payload as any;
      assert.equal(payload.schemaVersion, OUTBOX_MESSAGE_SCHEMA_VERSION);
    });

    it("T08: Answers immutable after submit (draft save rejected)", async () => {
      await httpRequest(app)
        .post(`/assessments/${assessmentId}/wizard/submit`)
        .set("Authorization", `Bearer ${managerToken}`)
        .send({ answers: validAnswers });

      const res = await httpRequest(app)
        .put(`/assessments/${assessmentId}/wizard/draft`)
        .set("Authorization", `Bearer ${managerToken}`)
        .send({ answers: { purpose: "Edited" } });

      assert.equal(res.status, 409);
      assert.equal(res.body.error_code, "WIZARD_ALREADY_SUBMITTED");
    });

    it("T10: Audit payload WIZARD_SUBMITTED has no answers content", async () => {
      await httpRequest(app)
        .post(`/assessments/${assessmentId}/wizard/submit`)
        .set("Authorization", `Bearer ${managerToken}`)
        .send({ answers: validAnswers });

      const audit = await prisma.authAuditEvent.findFirst({
        where: { eventType: WIZARD_EVENT_TYPES.submitted },
        orderBy: { createdAt: "desc" },
      });

      assert.ok(audit);
      assert.doesNotMatch(JSON.stringify(audit.payload), /Test purpose/);
    });
  });

  describe("Wizard Readiness State [MW-wiz-003]", () => {
    beforeEach(async () => {
      await createAssessment();
    });

    it("T01: WizardProfile submitted, no technical evidence -> classification_locked = true", async () => {
      await prisma.wizardProfile.create({
        data: {
          id: "wp-1",
          assessmentId,
          organizationId: orgId,
          ownerId: "user-1",
          status: WIZARD_STATUS_CODES.submitted,
          answers: {},
          version: 1,
          submittedAt: new Date(),
        },
      });

      const res = await httpRequest(app)
        .get(`/assessments/${assessmentId}/readiness`)
        .set("Authorization", `Bearer ${managerToken}`);

      assert.equal(res.status, 200);
      const body = res.body;
      assert.equal(body.classification_locked, true);
      assert.equal(body.lock_reason, ASSESSMENT_LOCK_REASONS.evidenceRequired);
    });

    it("T02: WizardProfile submitted, evidence accepted -> classification_locked = false", async () => {
      await prisma.wizardProfile.create({
        data: {
          id: "wp-2",
          assessmentId,
          organizationId: orgId,
          ownerId: "user-1",
          status: WIZARD_STATUS_CODES.submitted,
          answers: {},
          version: 1,
          submittedAt: new Date(),
        },
      });

      await prisma.technicalEvidenceReport.create({
        data: {
          id: "ter-1",
          scanJobId: "job-1",
          organizationId: orgId,
          snapshotId: "snap-1",
          toolsVersion: {},
          configHash: {},
          evidencePayload: {},
          privacyFlags: {},
          schemaVersion: "1.0",
          assessmentId,
          status: TECHNICAL_EVIDENCE_REPORT_STATUSES.accepted,
        },
      });

      const res = await httpRequest(app)
        .get(`/assessments/${assessmentId}/readiness`)
        .set("Authorization", `Bearer ${managerToken}`);

      assert.equal(res.status, 200);
      const body = res.body;
      assert.equal(body.classification_locked, false);
    });

    it("T03: No repository connected -> missing_evidence includes repository_connection", async () => {
      const res = await httpRequest(app)
        .get(`/assessments/${assessmentId}/readiness`)
        .set("Authorization", `Bearer ${managerToken}`);

      assert.equal(res.status, 200);
      const body = res.body;
      const missingEvidence = body.missing_evidence as any[];
      assert.ok(
        missingEvidence.some((item) => item.type === "repository_connection"),
      );
    });

    it("T04: Repository connected, no evidence -> missing_evidence includes technical_evidence", async () => {
      await prisma.repositoryConnection.create({
        data: {
          id: "repo-1",
          organizationId: orgId,
          userId: "user-1",
          installationId: "inst-1",
          repositoryId: "12345",
          repositoryName: "test",
          repositoryFullName: "acme/test",
          defaultBranch: "main",
          permissions: {},
          assessmentId,
          status: REPOSITORY_CONNECTION_STATUSES.active,
        },
      });

      const res = await httpRequest(app)
        .get(`/assessments/${assessmentId}/readiness`)
        .set("Authorization", `Bearer ${managerToken}`);

      assert.equal(res.status, 200);
      const body = res.body;
      const missingEvidence = body.missing_evidence as any[];
      assert.ok(
        missingEvidence.some((item) => item.type === "technical_evidence"),
      );
    });

    it("T05: Ensure no risk labels are returned when locked", async () => {
      const res = await httpRequest(app)
        .get(`/assessments/${assessmentId}/readiness`)
        .set("Authorization", `Bearer ${managerToken}`);

      assert.equal(res.status, 200);
      const bodyStr = JSON.stringify(res.body).toLowerCase();
      assert.doesNotMatch(bodyStr, /risk|severity/);
    });

    it("T06: next_action uses business language", async () => {
      const res = await httpRequest(app)
        .get(`/assessments/${assessmentId}/readiness`)
        .set("Authorization", `Bearer ${managerToken}`);

      assert.equal(res.status, 200);
      assert.ok(res.body.next_action);
      assert.doesNotMatch(
        String(res.body.next_action).toLowerCase(),
        /risk|severity|violation|compliant/,
      );
    });

    it("T07: Assessment not in org -> 404", async () => {
      const res = await httpRequest(app)
        .get(`/assessments/invalid-id/readiness`)
        .set("Authorization", `Bearer ${managerToken}`);

      assert.equal(res.status, 404);
      assert.equal(res.body.error_code, ASSESSMENT_ERROR_CODES.notFound);
    });
  });
});
