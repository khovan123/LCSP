/** Document List Endpoint (e2e) */

import * as assert from "node:assert/strict";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import type { INestApplication } from "@nestjs/common";
import { Test, type TestingModule } from "@nestjs/testing";
import {
  DOCUMENT_REQUEST_STATUSES,
  DOCUMENT_TYPES,
} from "@lcsp/contracts/document";

import { AppModule } from "../src/app.module.js";
import {
  pushPrismaSchema,
  resetAuthWorkspaceDatabase,
  seedAuthWorkspaceFixture,
  TEST_DATABASE_URL,
} from "./support/auth-workspace-test-helpers.js";
import { httpRequest } from "./support/http.js";

describe("Document List Endpoint (e2e)", () => {
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
    await prisma.documentRequest.deleteMany();
    await prisma.classificationResult.deleteMany();
    await prisma.legalRuleMatch.deleteMany();
    await prisma.technicalEvidenceReport.deleteMany();
    await prisma.assessment.deleteMany();
    await resetAuthWorkspaceDatabase(prisma);
    await seedAuthWorkspaceFixture(prisma);
    await enableManagerDocumentRead(prisma);

    await prisma.assessment.create({
      data: {
        id: "assessment-1",
        organizationId: "org-1",
        ownerId: "user-1",
        name: "Document list assessment",
      },
    });

    const signIn = await httpRequest(app).post("/auth/sign-in").send({
      email: "manager@acme.test",
      password: "CorrectHorseBatteryStaple!",
      organization_id: "org-1",
    });
    managerToken = signIn.body.session_token;
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  it("returns list of documents for assessment with statuses and download urls when ready", async () => {
    await seedDocumentRequest(prisma, {
      id: "doc-ready-1",
      status: DOCUMENT_REQUEST_STATUSES.ready,
      documentType: DOCUMENT_TYPES.gapAnalysis,
      documentUrl: "https://example.test/files/gap-analysis.pdf",
    });

    await seedDocumentRequest(prisma, {
      id: "doc-queued-1",
      status: DOCUMENT_REQUEST_STATUSES.queued,
      documentType: DOCUMENT_TYPES.finalReport,
    });

    const res = await httpRequest(app)
      .get(`/assessments/assessment-1/documents`)
      .set("Authorization", `Bearer ${managerToken}`)
      .set("X-Correlation-Id", "list-corr-1");

    assert.equal(res.status, 200);
    const body = res.body as any[];
    assert.ok(Array.isArray(body));
    // Should include the ready gap analysis with download_url
    const ready = body.find((b) => b.document_request_id === "doc-ready-1");
    assert.ok(ready);
    assert.equal(ready.status, DOCUMENT_REQUEST_STATUSES.ready);
    assert.ok(ready.download_url);

    const queued = body.find((b) => b.document_request_id === "doc-queued-1");
    assert.ok(queued);
    assert.equal(queued.status, DOCUMENT_REQUEST_STATUSES.queued);
    assert.equal(queued.download_url, null);
  });
});

async function enableManagerDocumentRead(prisma: PrismaClient) {
  await prisma.authPolicy.update({
    where: {
      id_version: {
        id: "policy-manager-workspace",
        version: "2026-06-26",
      },
    },
    data: {
      actions: ["workspace:read", "document:generate", "document:read"],
    },
  });
}

async function seedDocumentRequest(
  prisma: PrismaClient,
  input: {
    id: string;
    status: string;
    documentType: string;
    organizationId?: string;
    documentUrl?: string;
    blockedReason?: string;
  },
) {
  const matchId = `lrm-${input.id}`;
  const classificationResultId = `classification-${input.id}`;
  const organizationId = input.organizationId ?? "org-1";

  await prisma.legalRuleMatch.create({
    data: {
      id: matchId,
      verifiedProfileId: "vp-1",
      assessmentId: "assessment-1",
      organizationId,
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
      organizationId,
      schemaVersion: "1.0.0",
      classificationData: {
        system_type: "HIGH_IMPACT_AI",
        risk_level: "HIGH",
        citation_basis: ["chunk-1"],
      },
      guardrailStatus: "passed",
      blockedReason: null,
      status: "accepted",
    },
  });

  await prisma.documentRequest.create({
    data: {
      id: input.id,
      assessmentId: "assessment-1",
      organizationId,
      requestedById: "user-1",
      classificationResultId,
      documentType: input.documentType,
      status: input.status,
      documentUrl: input.documentUrl,
      blockedReason: input.blockedReason,
      correlationId: `${input.id}-corr`,
    },
  });
}
