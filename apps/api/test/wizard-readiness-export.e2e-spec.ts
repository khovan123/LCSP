/** MW-wiz-004: Wizard Readiness Export Endpoint. */

import * as assert from "node:assert/strict";

import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma, PrismaClient } from "@prisma/client";
import type { INestApplication } from "@nestjs/common";
import { Test, type TestingModule } from "@nestjs/testing";
import { PDFDocument } from "pdf-lib";
import {
  ASSESSMENT_STATUS_CODES,
  type AssessmentStatusCode,
  WIZARD_STATUS_CODES,
} from "@lcsp/contracts/assessment";
import { AUTH_ERROR_CODES } from "@lcsp/contracts/auth";
import { PBAC_ACTIONS } from "@lcsp/contracts/pbac";
import { WIZARD_EVENT_TYPES } from "@lcsp/contracts/wizard";
import {
  ANSWER_STATES,
  READINESS_CLASSIFICATION_STATUSES,
  READINESS_EXPORT_ARTIFACT_TYPES,
  READINESS_EXPORT_BADGES,
  READINESS_EXPORT_DOWNLOAD_STATES,
  READINESS_EXPORT_LABELS,
  type AnswerState,
  READINESS_EXPORT_ERROR_CODES,
  READINESS_EXPORT_STATUSES,
} from "@lcsp/contracts/wizard";
import { TECHNICAL_EVIDENCE_REPORT_STATUSES } from "@lcsp/contracts/scan";

import { AppModule } from "../src/app.module.js";
import type { SignInSuccess } from "../src/modules/auth-workspace/application/contracts/auth-workspace/sign-in.contract.js";
import type { ReadinessExportResponse } from "../src/modules/wizard/application/contracts/wizard/readiness-export.contract.js";
import type { ReadinessResponse } from "../src/modules/wizard/application/contracts/wizard/readiness.contract.js";
import {
  TEST_DATABASE_URL,
  pushPrismaSchema,
  resetAuthWorkspaceDatabase,
  seedAuthWorkspaceFixture,
} from "./support/auth-workspace-test-helpers.js";
import { httpRequest, problemCode, successBody } from "./support/http.js";

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
    managerToken = successBody<SignInSuccess>(signIn).session_token;
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  it("T01/T05/T06 generates a readiness-only export for a submitted wizard with locked classification", async () => {
    await seedSubmittedWizard(prisma);

    const response = await requestExport(app, managerToken);
    const body = successBody<ReadinessExportResponse>(response);
    const readinessResponse = await httpRequest(app)
      .get("/assessments/assessment-1/readiness")
      .set("Authorization", `Bearer ${managerToken}`)
      .set("X-Correlation-Id", "readiness-corr-1");
    const readiness = successBody<ReadinessResponse>(readinessResponse);
    const serialized = JSON.stringify(body);

    assert.equal(response.status, 201);
    assert.equal(body.status, READINESS_EXPORT_STATUSES.generated);
    assert.equal(
      body.artifact_type,
      READINESS_EXPORT_ARTIFACT_TYPES.wizardReadinessExport,
    );
    assert.equal(body.label, "Wizard Readiness Export");
    assert.equal(body.title, "Wizard Readiness Export");
    assert.equal(body.badge, READINESS_EXPORT_BADGES.readinessOnly);
    assert.equal(body.readiness_only, true);
    assert.equal(
      body.classification_status,
      READINESS_CLASSIFICATION_STATUSES.lockedEvidenceRequired,
    );
    assert.equal(body.classification_locked, true);
    assert.equal(body.assessment_id, "assessment-1");
    assert.equal(body.owner_id, "user-1");
    assert.equal(body.version, 1);
    assert.ok(body.generated_at);
    assert.ok(body.export_id);
    assert.equal(body.download_state, READINESS_EXPORT_DOWNLOAD_STATES.ready);
    assert.match(
      body.download_url ?? "",
      /wizard\/readiness-exports\/.*\/download$/,
    );
    assert.equal(
      body.metadata.artifact_type,
      READINESS_EXPORT_ARTIFACT_TYPES.wizardReadinessExport,
    );
    assert.equal(body.metadata.readiness_only, true);
    assert.equal(
      body.metadata.classification_status,
      READINESS_CLASSIFICATION_STATUSES.lockedEvidenceRequired,
    );
    assert.equal(body.metadata.wizard_profile_version, 3);
    assert.equal(body.metadata.generated_by, "user-1");
    assert.ok(body.missing_evidence.length >= 1);
    assert.ok(body.preparation_guidance.length >= 1);
    assert.deepEqual(
      body.unresolved_unknown_items,
      readiness.unresolved_unknown_items,
      "export and readiness UI must consume one unresolved-unknown projection",
    );
    assert.ok(body.unresolved_unknown_items.length >= 1);
    assert.ok(
      body.unresolved_unknown_items.every(
        (item) =>
          item.answer_state === ANSWER_STATES.explicitUnknown &&
          !JSON.stringify(item).includes("unknown-external-provider"),
      ),
    );
    assert.doesNotMatch(serialized, /\b(HIGH|MEDIUM|LOW)\b/);
    assert.doesNotMatch(serialized, /\brisk\b/i);
    assert.doesNotMatch(
      serialized,
      /classification result|final classification/i,
    );
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
    assert.equal(
      (exportRecord?.contentJson as { metadata?: { readiness_only?: boolean } })
        .metadata?.readiness_only,
      true,
    );
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
      problemCode(response),
      READINESS_EXPORT_ERROR_CODES.requiresLockedClassification,
    );
  });

  it("T03 rejects readiness export before wizard submission", async () => {
    await seedAssessment(prisma, ASSESSMENT_STATUS_CODES.wizardInProgress);

    const response = await requestExport(app, managerToken);

    assert.equal(response.status, 422);
    assert.equal(
      problemCode(response),
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
    assert.equal(problemCode(response), AUTH_ERROR_CODES.pbacDenied);
  });

  it("T08 creates a new immutable row for each generated export", async () => {
    await seedSubmittedWizard(prisma);

    const first = await requestExport(app, managerToken);
    const second = await requestExport(app, managerToken);

    assert.equal(first.status, 201);
    assert.equal(second.status, 201);
    assert.notEqual(
      successBody<ReadinessExportResponse>(first).export_id,
      successBody<ReadinessExportResponse>(second).export_id,
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

    const historyResponse = await httpRequest(app)
      .get("/assessments/assessment-1/wizard/readiness-exports")
      .set("Authorization", `Bearer ${managerToken}`)
      .set("X-Correlation-Id", "readiness-history-corr-1");
    const history = successBody<ReadinessExportResponse[]>(historyResponse);

    assert.equal(historyResponse.status, 200);
    assert.deepEqual(
      history.map((artifact) => artifact.version),
      [2, 1],
    );
    assert.ok(
      history.every(
        (artifact) =>
          artifact.artifact_type ===
            READINESS_EXPORT_ARTIFACT_TYPES.wizardReadinessExport &&
          artifact.badge === READINESS_EXPORT_BADGES.readinessOnly &&
          artifact.download_state === READINESS_EXPORT_DOWNLOAD_STATES.ready,
      ),
    );

    const persistedBeforeDownload = await prisma.readinessExport.findUnique({
      where: {
        id: successBody<ReadinessExportResponse>(first).export_id,
      },
      select: { contentJson: true },
    });
    const downloadResponse = await httpRequest(app)
      .get(
        `/assessments/assessment-1/wizard/readiness-exports/${successBody<ReadinessExportResponse>(first).export_id}/download`,
      )
      .set("Authorization", `Bearer ${managerToken}`)
      .set("X-Correlation-Id", "readiness-download-corr-1");
    assert.equal(downloadResponse.status, 200);
    assert.equal(downloadResponse.headers["content-type"], "application/pdf");
    assert.equal(
      downloadResponse.headers["content-disposition"],
      'attachment; filename="wizard-readiness-export-v1.pdf"',
    );
    assert.match(downloadResponse.headers["cache-control"] ?? "", /private/);
    assert.match(downloadResponse.headers["cache-control"] ?? "", /no-store/);
    const pdfBytes = Buffer.from(downloadResponse.body as Uint8Array);
    assert.equal(pdfBytes.subarray(0, 5).toString("ascii"), "%PDF-");
    const pdf = await PDFDocument.load(pdfBytes);
    assert.equal(pdf.getTitle(), READINESS_EXPORT_LABELS.wizardReadinessExport);
    assert.ok(pdf.getPageCount() >= 1);

    const persistedAfterDownload = await prisma.readinessExport.findUnique({
      where: {
        id: successBody<ReadinessExportResponse>(first).export_id,
      },
      select: { contentJson: true },
    });
    assert.deepEqual(
      persistedAfterDownload?.contentJson,
      persistedBeforeDownload?.contentJson,
    );
  });

  it("does not disclose PDF bytes when provenance, status, scope, or permission is invalid", async () => {
    await seedSubmittedWizard(prisma);
    const generated = successBody<ReadinessExportResponse>(
      await requestExport(app, managerToken),
    );
    const record = await prisma.readinessExport.findUniqueOrThrow({
      where: { id: generated.export_id },
    });
    const guardedContent = record.contentJson as Prisma.InputJsonObject;

    await prisma.readinessExport.update({
      where: { id: generated.export_id },
      data: {
        contentJson: {
          ...guardedContent,
          title: "Final classification",
        },
      },
    });
    const drifted = await downloadExport(
      app,
      managerToken,
      generated.export_id,
    );

    assert.equal(drifted.status, 409);
    assert.equal(
      problemCode(drifted),
      READINESS_EXPORT_ERROR_CODES.notDownloadable,
    );
    assert.notEqual(drifted.headers["content-type"], "application/pdf");

    await prisma.readinessExport.update({
      where: { id: generated.export_id },
      data: {
        contentJson: {
          ...guardedContent,
          metadata: {
            ...(guardedContent.metadata as Prisma.InputJsonObject),
            version: 999,
          },
        },
      },
    });
    const provenanceDrift = await downloadExport(
      app,
      managerToken,
      generated.export_id,
    );

    assert.equal(provenanceDrift.status, 409);
    assert.equal(
      problemCode(provenanceDrift),
      READINESS_EXPORT_ERROR_CODES.notDownloadable,
    );
    assert.notEqual(provenanceDrift.headers["content-type"], "application/pdf");

    await prisma.readinessExport.update({
      where: { id: generated.export_id },
      data: { contentJson: guardedContent, ownerId: "other-owner" },
    });
    const crossOwner = await downloadExport(
      app,
      managerToken,
      generated.export_id,
    );

    assert.equal(crossOwner.status, 409);
    assert.equal(
      problemCode(crossOwner),
      READINESS_EXPORT_ERROR_CODES.notDownloadable,
    );
    assert.notEqual(crossOwner.headers["content-type"], "application/pdf");

    await prisma.readinessExport.update({
      where: { id: generated.export_id },
      data: { ownerId: "user-1", organizationId: "org-2" },
    });
    const crossOrganization = await downloadExport(
      app,
      managerToken,
      generated.export_id,
    );

    assert.equal(crossOrganization.status, 409);
    assert.equal(
      problemCode(crossOrganization),
      READINESS_EXPORT_ERROR_CODES.notDownloadable,
    );
    assert.notEqual(
      crossOrganization.headers["content-type"],
      "application/pdf",
    );

    await prisma.readinessExport.update({
      where: { id: generated.export_id },
      data: {
        organizationId: "org-1",
        status: READINESS_EXPORT_STATUSES.blocked,
      },
    });
    const blocked = await downloadExport(
      app,
      managerToken,
      generated.export_id,
    );

    assert.equal(blocked.status, 409);
    assert.equal(
      problemCode(blocked),
      READINESS_EXPORT_ERROR_CODES.notDownloadable,
    );
    assert.notEqual(blocked.headers["content-type"], "application/pdf");

    const missing = await downloadExport(app, managerToken, "missing-export");
    assert.equal(missing.status, 409);
    assert.equal(
      problemCode(missing),
      READINESS_EXPORT_ERROR_CODES.notDownloadable,
    );
    assert.notEqual(missing.headers["content-type"], "application/pdf");

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
    const denied = await downloadExport(app, managerToken, generated.export_id);
    assert.equal(denied.status, 403);
    assert.equal(problemCode(denied), AUTH_ERROR_CODES.pbacDenied);
    assert.notEqual(denied.headers["content-type"], "application/pdf");
  });
});

function requestExport(app: INestApplication, token: string) {
  return httpRequest(app)
    .post("/assessments/assessment-1/wizard/readiness-export")
    .set("Authorization", `Bearer ${token}`)
    .set("X-Correlation-Id", "readiness-export-corr-1")
    .send({});
}

function downloadExport(
  app: INestApplication,
  token: string,
  exportId: string,
) {
  return httpRequest(app)
    .get(
      `/assessments/assessment-1/wizard/readiness-exports/${exportId}/download`,
    )
    .set("Authorization", `Bearer ${token}`)
    .set("X-Correlation-Id", "readiness-download-corr-1");
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
      answers: [
        wizardAnswer(
          "businessProcess",
          "Route support requests to the right operations team.",
        ),
        wizardAnswer("aiPurpose", "Support request routing"),
        wizardAnswer("dataTypes", ["support-ticket"]),
        wizardAnswer("affectedSubjects", ["customers"]),
        wizardAnswer("decisionRole", "ASSISTS_DECISION"),
        wizardAnswer("humanReview", "UNCLEAR"),
        wizardAnswer(
          "externalLlmUsage",
          "unknown-external-provider",
          ANSWER_STATES.explicitUnknown,
        ),
        wizardAnswer(
          "prohibitedRiskSignals",
          ["UNKNOWN"],
          ANSWER_STATES.explicitUnknown,
        ),
      ] as unknown as Prisma.InputJsonArray,
    },
  });
}

function wizardAnswer(
  questionId: string,
  value: unknown,
  answerState: AnswerState = ANSWER_STATES.answered,
) {
  return {
    questionId,
    value,
    answerState,
    updatedAt: "2026-08-01T00:00:00.000Z",
  };
}

async function seedAssessment(
  prisma: PrismaClient,
  status: AssessmentStatusCode,
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
