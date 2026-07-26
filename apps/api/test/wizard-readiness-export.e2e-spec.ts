/** MW-wiz-004: Wizard Readiness Export Endpoint. */

import * as assert from "node:assert/strict";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import type { INestApplication } from "@nestjs/common";
import { Test, type TestingModule } from "@nestjs/testing";
import {
  ASSESSMENT_STATUS_CODES,
  WIZARD_STATUS_CODES,
} from "@lcsp/contracts/assessment";
import { AUTH_ERROR_CODES } from "@lcsp/contracts/auth";
import { PBAC_ACTIONS } from "@lcsp/contracts/pbac";
import { WIZARD_EVENT_TYPES } from "@lcsp/contracts/wizard";
import {
  READINESS_EXPORT_ERROR_CODES,
  READINESS_EXPORT_STATUSES,
} from "@lcsp/contracts/wizard";
import { TECHNICAL_EVIDENCE_REPORT_STATUSES } from "@lcsp/contracts/scan";

import { AppModule } from "../src/app.module.js";
import type { SignInSuccess } from "../src/modules/auth-workspace/application/contracts/auth-workspace/sign-in.contract.js";
import type { ReadinessExportResponse } from "../src/modules/wizard/application/contracts/wizard/readiness-export.contract.js";
import {
  TEST_DATABASE_URL,
  pushPrismaSchema,
  resetAuthWorkspaceDatabase,
  seedAuthWorkspaceFixture,
} from "./support/auth-workspace-test-helpers.js";
import { httpRequest } from "./support/http.js";

type ErrorResponse = { error_code?: string };

describe("Wizard Readiness Export Endpoint (e2e) [MW-wiz-004]", () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let managerToken: string;

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
    await resetDomainData(prisma);
    await resetAuthWorkspaceDatabase(prisma);
    await seedAuthWorkspaceFixture(prisma);

    const signIn = await httpRequest(app).post("/auth/sign-in").send({
      email: "manager@acme.test",
      password: "CorrectHorseBatteryStaple!",
      organization_id: "org-1",
    });
    managerToken = (signIn.body as SignInSuccess).session_token;
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  it("T01/T05/T06 generates a readiness-only export for a submitted wizard with locked classification", async () => {
    await seedSubmittedWizard(prisma);

    const response = await requestExport(app, managerToken);
    const body = response.body as ReadinessExportResponse;
    const serialized = JSON.stringify(body);

    assert.equal(response.status, 201);
    assert.equal(body.status, READINESS_EXPORT_STATUSES.generated);
    assert.equal(body.label, "Wizard Readiness Export");
    assert.equal(body.classification_locked, true);
    assert.equal(body.assessment_id, "assessment-1");
    assert.equal(body.owner_id, "user-1");
    assert.equal(body.version, 1);
    assert.ok(body.generated_at);
    assert.ok(body.export_id);
    assert.ok(body.missing_evidence.length >= 1);
    assert.ok(body.preparation_guidance.length >= 1);
    assert.ok(
      body.unresolved_unknowns.some((item) => item.includes("unknown")),
      "unknown wizard answers must remain explicit unresolved context",
    );
    assert.doesNotMatch(serialized, /\b(HIGH|MEDIUM|LOW)\b/);
    assert.doesNotMatch(serialized, /\brisk\b/i);
    assert.doesNotMatch(serialized, /classification result|final classification/i);
    assert.doesNotMatch(serialized, /\bnon-compliant\b/i);

    const [exportRecord, audit] = await Promise.all([
      prisma.readinessExport.findUnique({ where: { id: body.export_id } }),
      prisma.authAuditEvent.findFirst({
        where: { eventType: WIZARD_EVENT_TYPES.readinessExportGenerated },
      }),
    ]);

    assert.equal(exportRecord?.assessmentId, "assessment-1");
    assert.equal(exportRecord?.ownerId, "user-1");
    assert.equal(exportRecord?.version, 1);
    assert.equal(exportRecord?.status, READINESS_EXPORT_STATUSES.generated);
    assert.equal(audit?.resourceId, body.export_id);
    assert.doesNotMatch(JSON.stringify(audit?.payload), /answers|purpose/i);
  });

  it("T02 rejects readiness export when accepted technical evidence already exists", async () => {
    await seedSubmittedWizard(prisma);
    await prisma.technicalEvidenceReport.create({
      data: {
        id: "evidence-1",
        scanJobId: "scan-job-1",
        assessmentId: "assessment-1",
        organizationId: "org-1",
        snapshotId: "snapshot-1",
        toolsVersion: { semgrep: "1.0.0" },
        configHash: { semgrep: "sha256:abc" },
        evidencePayload: {},
        privacyFlags: { containsSourceCode: false, secretsRedacted: true },
        schemaVersion: "1.0.0",
        status: TECHNICAL_EVIDENCE_REPORT_STATUSES.accepted,
      },
    });

    const response = await requestExport(app, managerToken);

    assert.equal(response.status, 409);
    assert.equal(
      (response.body as ErrorResponse).error_code,
      READINESS_EXPORT_ERROR_CODES.requiresLockedClassification,
    );
  });

  it("T03 rejects readiness export before wizard submission", async () => {
    await seedAssessment(prisma, ASSESSMENT_STATUS_CODES.wizardInProgress);

    const response = await requestExport(app, managerToken);

    assert.equal(response.status, 422);
    assert.equal(
      (response.body as ErrorResponse).error_code,
      READINESS_EXPORT_ERROR_CODES.wizardNotSubmitted,
    );
  });

  it("T07 denies actors without wizard export action", async () => {
    await seedSubmittedWizard(prisma);
    await prisma.authPolicy.update({
      where: {
        id_version: {
          id: "policy-manager-workspace",
          version: "2026-06-26",
        },
      },
      data: {
        actions: [PBAC_ACTIONS.workspaceRead, PBAC_ACTIONS.assessmentRead],
      },
    });

    const response = await requestExport(app, managerToken);

    assert.equal(response.status, 403);
    assert.equal(
      (response.body as ErrorResponse).error_code,
      AUTH_ERROR_CODES.pbacDenied,
    );
  });

  it("T08 creates a new immutable row for each generated export", async () => {
    await seedSubmittedWizard(prisma);

    const first = await requestExport(app, managerToken);
    const second = await requestExport(app, managerToken);

    assert.equal(first.status, 201);
    assert.equal(second.status, 201);
    assert.notEqual(
      (first.body as ReadinessExportResponse).export_id,
      (second.body as ReadinessExportResponse).export_id,
    );
    assert.equal(await prisma.readinessExport.count(), 2);
    assert.deepEqual(
      (
        await prisma.readinessExport.findMany({
          orderBy: { version: "asc" },
          select: { version: true },
        })
      ).map((record) => record.version),
      [1, 2],
    );
  });
});

function requestExport(app: INestApplication, token: string) {
  return httpRequest(app)
    .post("/assessments/assessment-1/wizard/readiness-export")
    .set("Authorization", `Bearer ${token}`)
    .set("X-Correlation-Id", "readiness-export-corr-1")
    .send({});
}

async function resetDomainData(prisma: PrismaClient): Promise<void> {
  await prisma.readinessExport.deleteMany();
  await prisma.technicalEvidenceReport.deleteMany();
  await prisma.wizardProfile.deleteMany();
  await prisma.assessment.deleteMany();
}

async function seedSubmittedWizard(prisma: PrismaClient): Promise<void> {
  await seedAssessment(prisma, ASSESSMENT_STATUS_CODES.wizardSubmitted);
  await prisma.wizardProfile.create({
    data: {
      id: "wizard-profile-1",
      assessmentId: "assessment-1",
      organizationId: "org-1",
      ownerId: "user-1",
      version: 3,
      status: WIZARD_STATUS_CODES.submitted,
      submittedAt: new Date("2026-07-26T00:00:00.000Z"),
      answers: {
        purpose: "Route support requests to the right operations team.",
        sector: "customer-support",
        data_type: ["support-ticket", "unknown-data-category"],
        user_group: "internal-operators",
        user_impact: "unknown-impact",
        decision_role: "recommendation",
        human_oversight: "human-review",
        external_llm_usage: "unknown-external-provider",
        prohibitedRiskSignals: ["unknown"],
      },
    },
  });
}

async function seedAssessment(
  prisma: PrismaClient,
  status: string,
): Promise<void> {
  await prisma.assessment.create({
    data: {
      id: "assessment-1",
      organizationId: "org-1",
      ownerId: "user-1",
      name: "Wizard readiness export assessment",
      status,
    },
  });
}
