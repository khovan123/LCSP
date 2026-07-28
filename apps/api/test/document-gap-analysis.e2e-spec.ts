/** LCSP-80: Request Gap Analysis Endpoint (e2e). */

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

const WORKER_KEY = "test-only-worker-api-key-at-least-32-chars";

describe("Request Gap Analysis Endpoint (e2e) [LCSP-80]", () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let managerToken: string;

  beforeAll(async () => {
    process.env.DATABASE_URL = TEST_DATABASE_URL;
    process.env.WORKER_API_KEY = WORKER_KEY;
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
      where: { eventType: DOCUMENT_EVENT_TYPES.gapAnalysisRequestedAudit },
    });
    await prisma.outboxMessage.deleteMany({
      where: { eventType: DOCUMENT_EVENT_TYPES.gapAnalysisRequested },
    });
    await prisma.documentRequest.deleteMany();
    await prisma.classificationResult.deleteMany();
    await prisma.legalRuleMatch.deleteMany();
    await prisma.technicalEvidenceReport.deleteMany();
    await prisma.assessment.deleteMany();
    await resetAuthWorkspaceDatabase(prisma);
    await seedAuthWorkspaceFixture(prisma);

    await prisma.assessment.create({
      data: {
        id: "assessment-1",
        organizationId: "org-1",
        ownerId: "user-1",
        name: "Gap analysis assessment",
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

    const response = await requestGapAnalysis(
      app,
      managerToken,
      "assessment-1",
    );
    const body = response.body as SuccessResponse;

    assert.equal(response.status, 202);
    assert.ok(body.document_request_id);
    assert.equal(body.status, DOCUMENT_REQUEST_STATUSES.queued);
    assert.equal(body.document_type, DOCUMENT_TYPES.gapAnalysis);
    assert.ok(body.correlation_id);

    const [docRequest, outbox, auditCount] = await Promise.all([
      prisma.documentRequest.findUnique({
        where: { id: body.document_request_id },
      }),
      prisma.outboxMessage.findFirst({
        where: {
          eventType: DOCUMENT_EVENT_TYPES.gapAnalysisRequested,
          aggregateType: "DocumentRequest",
          aggregateId: body.document_request_id,
        },
      }),
      prisma.authAuditEvent.count({
        where: {
          eventType: DOCUMENT_EVENT_TYPES.gapAnalysisRequestedAudit,
          correlationId: body.correlation_id,
        },
      }),
    ]);

    assert.ok(docRequest);
    assert.equal(docRequest?.status, DOCUMENT_REQUEST_STATUSES.queued);
    assert.equal(docRequest?.documentType, DOCUMENT_TYPES.gapAnalysis);
    assert.ok(outbox);
    assert.equal(auditCount, 2);
  });

  it("returns 409 CLASSIFICATION_REQUIRED when no classification exists", async () => {
    const response = await requestGapAnalysis(
      app,
      managerToken,
      "assessment-1",
    );

    assert.equal(response.status, 409);
    assert.equal(
      (response.body as ErrorResponse).error_code,
      DOCUMENT_ERROR_CODES.classificationRequired,
    );

    assert.equal(await prisma.documentRequest.count(), 0);
    assert.equal(
      await prisma.outboxMessage.count({
        where: { eventType: DOCUMENT_EVENT_TYPES.gapAnalysisRequested },
      }),
      0,
    );
  });

  it("accepts worker callback and updates documentRequest to READY", async () => {
    await seedClassification(prisma, "passed");

    const requestResp = await requestGapAnalysis(
      app,
      managerToken,
      "assessment-1",
    );
    const body = requestResp.body as SuccessResponse;

    const callbackResp = await httpRequest(app)
      .post(`/internal/document-requests/${body.document_request_id}/callback`)
      .set("X-Worker-Api-Key", WORKER_KEY)
      .set("X-Correlation-Id", "doc-gap-corr-1")
      .send({
        document_request_id: body.document_request_id,
        status: DOCUMENT_REQUEST_STATUSES.ready,
        document_url: "https://example.test/gap.pdf",
      });

    assert.equal(callbackResp.status, 200);

    const updated = await prisma.documentRequest.findUnique({
      where: { id: body.document_request_id },
    });
    assert.equal(updated?.status, DOCUMENT_REQUEST_STATUSES.ready);
    assert.equal(updated?.documentUrl, "https://example.test/gap.pdf");
  });
});

function requestGapAnalysis(
  app: INestApplication,
  token: string,
  assessmentId: string,
) {
  return httpRequest(app)
    .post(`/assessments/${assessmentId}/documents/gap-analysis`)
    .set("Authorization", `Bearer ${token}`)
    .set("X-Correlation-Id", "doc-gap-corr-req-1")
    .send({});
}

async function seedClassification(
  prisma: PrismaClient,
  guardrailStatus: string,
) {
  const matchId = `lrm-${guardrailStatus}`;
  const classificationResultId = `classification-${guardrailStatus}`;

  await prisma.legalRuleMatch.create({
    data: {
      id: matchId,
      verifiedProfileId: "vp-1",
      assessmentId: "assessment-1",
      organizationId: "org-1",
      corpusVersionId: "LCSP-LEGAL-CORPUS-v0.1.0",
      legalRuleCatalogVersionId: "LCSP-RULE-CATALOG-v0.1.0",
      schemaVersion: "1.0.0",
      matches: [],
      citationAllowlist: ["chunk-1"],
      overallCoverageStatus: "COMPLETE_CITATION",
      guardrailStatus: "passed",
      status: "accepted",
    },
  });

  await prisma.classificationResult.create({
    data: {
      id: classificationResultId,
      legalRuleMatchId: matchId,
      verifiedProfileId: "vp-1",
      assessmentId: "assessment-1",
      organizationId: "org-1",
      schemaVersion: "1.0.0",
      classificationData: { system_type: "HIGH_IMPACT_AI" },
      guardrailStatus,
      status: "accepted",
    },
  });

  return { classificationResultId };
}
