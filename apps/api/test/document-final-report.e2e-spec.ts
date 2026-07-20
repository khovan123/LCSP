/** LCSP-81: Request Final Report Endpoint (e2e). */

import * as assert from "node:assert/strict";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import type { INestApplication } from "@nestjs/common";
import { Test, type TestingModule } from "@nestjs/testing";
import {
  DOCUMENT_ERROR_CODES,
  DOCUMENT_EVENT_TYPES,
  DOCUMENT_REQUEST_STATUSES,
  DOCUMENT_TYPES,
} from "@lcsp/contracts/document";
import { PBAC_ACTIONS, PBAC_REASON_CODE } from "@lcsp/contracts/pbac";

import { AppModule } from "../src/app.module.js";
import type { SignInSuccess } from "../src/modules/auth-workspace/application/contracts/auth-workspace/sign-in.contract.js";
import {
  TEST_DATABASE_URL,
  pushPrismaSchema,
  resetAuthWorkspaceDatabase,
  seedAuthWorkspaceFixture,
} from "./support/auth-workspace-test-helpers.js";
import { httpRequest } from "./support/http.js";

type ErrorResponse = { error_code?: string };
type SuccessResponse = {
  document_request_id: string;
  status: string;
  document_type: string;
  correlation_id: string;
};

describe("Request Final Report Endpoint (e2e) [LCSP-81]", () => {
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
    await prisma.authAuditEvent.deleteMany({
      where: { eventType: DOCUMENT_EVENT_TYPES.finalReportRequestedAudit },
    });
    await prisma.outboxMessage.deleteMany({
      where: { eventType: DOCUMENT_EVENT_TYPES.finalReportRequested },
    });
    await prisma.documentRequest.deleteMany();
    await prisma.classificationResult.deleteMany();
    await prisma.technicalEvidenceReport.deleteMany();
    await prisma.assessment.deleteMany();
    await resetAuthWorkspaceDatabase(prisma);
    await seedAuthWorkspaceFixture(prisma);

    await prisma.assessment.create({
      data: {
        id: "assessment-1",
        organizationId: "org-1",
        ownerId: "user-1",
        name: "Final report assessment",
      },
    });

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

  it("returns QUEUED and writes document request, outbox, and audit when guardrail passed", async () => {
    await seedClassification(prisma, "passed");

    const response = await requestFinalReport(
      app,
      managerToken,
      "assessment-1",
    );
    const body = response.body as SuccessResponse;

    assert.equal(response.status, 201);
    assert.ok(body.document_request_id);
    assert.equal(body.status, DOCUMENT_REQUEST_STATUSES.queued);
    assert.equal(body.document_type, DOCUMENT_TYPES.finalReport);
    assert.ok(body.correlation_id);

    const [docRequest, outbox, auditCount] = await Promise.all([
      prisma.documentRequest.findUnique({
        where: { id: body.document_request_id },
      }),
      prisma.outboxMessage.findFirst({
        where: {
          eventType: DOCUMENT_EVENT_TYPES.finalReportRequested,
          aggregateType: "DocumentRequest",
          aggregateId: "assessment-1",
        },
      }),
      prisma.authAuditEvent.count({
        where: {
          eventType: DOCUMENT_EVENT_TYPES.finalReportRequestedAudit,
          correlationId: body.correlation_id,
        },
      }),
    ]);

    assert.ok(docRequest);
    assert.equal(docRequest?.status, DOCUMENT_REQUEST_STATUSES.queued);
    assert.equal(docRequest?.documentType, DOCUMENT_TYPES.finalReport);
    assert.ok(outbox);
    assert.equal(auditCount, 2);
  });

  it("returns 409 CLASSIFICATION_GUARDRAIL_NOT_PASSED when latest classification is degraded", async () => {
    await seedClassification(prisma, "degraded");

    const response = await requestFinalReport(
      app,
      managerToken,
      "assessment-1",
    );

    assert.equal(response.status, 409);
    assert.equal(
      (response.body as ErrorResponse).error_code,
      DOCUMENT_ERROR_CODES.classificationGuardrailNotPassed,
    );

    assert.equal(await prisma.documentRequest.count(), 0);
    assert.equal(
      await prisma.outboxMessage.count({
        where: { eventType: DOCUMENT_EVENT_TYPES.finalReportRequested },
      }),
      0,
    );
  });

  it("returns 409 DOCUMENT_ALREADY_QUEUED when a QUEUED request already exists", async () => {
    const { classificationResultId } = await seedClassification(
      prisma,
      "passed",
    );
    await prisma.documentRequest.create({
      data: {
        id: "doc-req-existing",
        assessmentId: "assessment-1",
        organizationId: "org-1",
        requestedById: "user-1",
        classificationResultId,
        documentType: DOCUMENT_TYPES.finalReport,
        status: DOCUMENT_REQUEST_STATUSES.queued,
        correlationId: "corr-existing",
      },
    });

    const response = await requestFinalReport(
      app,
      managerToken,
      "assessment-1",
    );

    assert.equal(response.status, 409);
    assert.equal(
      (response.body as ErrorResponse).error_code,
      DOCUMENT_ERROR_CODES.alreadyQueued,
    );
  });

  it("returns 404 ASSESSMENT_NOT_FOUND for assessment outside session organization", async () => {
    await prisma.assessment.create({
      data: {
        id: "assessment-foreign",
        organizationId: "org-foreign",
        ownerId: "user-x",
        name: "Foreign assessment",
      },
    });

    const response = await requestFinalReport(
      app,
      managerToken,
      "assessment-foreign",
    );

    assert.equal(response.status, 404);
    assert.equal(
      (response.body as ErrorResponse).error_code,
      DOCUMENT_ERROR_CODES.assessmentNotFound,
    );
  });

  it("returns 403 PBAC_DENIED when manager policy does not include document:generate", async () => {
    await seedClassification(prisma, "passed");

    await prisma.authPolicy.update({
      where: {
        id_version: {
          id: "policy-manager-workspace",
          version: "2026-06-26",
        },
      },
      data: {
        actions: [PBAC_ACTIONS.workspaceRead],
      },
    });

    const response = await requestFinalReport(
      app,
      managerToken,
      "assessment-1",
    );

    assert.equal(response.status, 403);
    assert.equal(
      (response.body as ErrorResponse).error_code,
      PBAC_REASON_CODE.denied,
    );
  });
});

function requestFinalReport(
  app: INestApplication,
  token: string,
  assessmentId: string,
) {
  return httpRequest(app)
    .post(`/assessments/${assessmentId}/documents/final-report`)
    .set("Authorization", `Bearer ${token}`)
    .set("X-Correlation-Id", "doc-final-corr-1")
    .send({});
}

async function seedClassification(
  prisma: PrismaClient,
  guardrailStatus: string,
): Promise<{ classificationResultId: string }> {
  const reportId = `evidence-${guardrailStatus}`;
  const classificationResultId = `classification-${guardrailStatus}`;

  await prisma.technicalEvidenceReport.create({
    data: {
      id: reportId,
      scanJobId: `scan-job-${guardrailStatus}`,
      assessmentId: "assessment-1",
      organizationId: "org-1",
      snapshotId: "snapshot-1",
      toolsVersion: { semgrep: "1.0.0" },
      configHash: { semgrep: "sha256:abc" },
      evidencePayload: { guardrailStatus },
      privacyFlags: { containsSourceCode: false, secretsRedacted: true },
      schemaVersion: "1.0.0",
      status: "accepted",
    },
  });

  await prisma.classificationResult.create({
    data: {
      id: classificationResultId,
      assessmentId: "assessment-1",
      organizationId: "org-1",
      technicalEvidenceReportId: reportId,
      guardrailStatus,
    },
  });

  return { classificationResultId };
}
