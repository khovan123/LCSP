import * as assert from "node:assert/strict";

import { PrismaPg } from "@prisma/adapter-pg";
import {
  EvidenceAcceptanceStatus,
  LegalRuleMatchGuardrailStatus,
  OverallCoverageStatus,
  PrismaClient,
  VerifiedProfileStatus,
  WizardProfileStatus,
} from "@prisma/client";
import type { INestApplication } from "@nestjs/common";
import { Test, type TestingModule } from "@nestjs/testing";

import { AppModule } from "../src/app.module.js";
import {
  pushPrismaSchema,
  TEST_DATABASE_URL,
} from "./support/auth-workspace-test-helpers.js";
import { httpRequest } from "./support/http.js";

const WORKER_KEY = "test-only-worker-api-key-at-least-32-chars";

describe("Worker runtime input endpoints (e2e) [LCSP-155]", () => {
  let app: INestApplication;
  let prisma: PrismaClient;

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
    await prisma.legalRuleMatch.deleteMany();
    await prisma.verifiedProfile.deleteMany();
    await prisma.wizardProfile.deleteMany();
    await prisma.technicalProfile.deleteMany();
    await prisma.technicalEvidenceReport.deleteMany();

    await prisma.technicalEvidenceReport.create({
      data: {
        id: "report-runtime-1",
        scanJobId: "scan-runtime-1",
        assessmentId: "assessment-runtime-1",
        organizationId: "org-runtime-1",
        snapshotId: "snapshot-runtime-1",
        toolsVersion: { semgrep: "1.0" },
        configHash: { semgrep: "sha256:test" },
        evidencePayload: {
          ai_usage_signals: [
            {
              id: "finding-invocation",
              signal_type: "AI_MODEL_INVOCATION",
              evidence_ref: "finding-invocation",
            },
          ],
          technical_findings: [
            {
              finding_id: "finding-status",
              finding_type: "STATUS_UPDATE_SIGNAL",
            },
          ],
        },
        privacyFlags: { containsSourceCode: false, secretsRedacted: true },
        schemaVersion: "1.0.0",
        status: EvidenceAcceptanceStatus.ACCEPTED,
      },
    });
    await prisma.technicalProfile.create({
      data: {
        id: "profile-runtime-1",
        evidenceReportId: "report-runtime-1",
        assessmentId: "assessment-runtime-1",
        organizationId: "org-runtime-1",
        schemaVersion: "1.0.0",
        providerVersion: "technical-profile-worker@1",
        profileData: {
          ai_detected: "confirmed",
          dependency_ai_packages: ["openai"],
          evidence_refs: ["finding-invocation"],
        },
        privacyFlags: { containsSourceCode: false, secretsRedacted: true },
        status: EvidenceAcceptanceStatus.ACCEPTED,
      },
    });
    await prisma.wizardProfile.create({
      data: {
        id: "wizard-runtime-1",
        assessmentId: "assessment-runtime-1",
        organizationId: "org-runtime-1",
        ownerId: "user-runtime-1",
        version: 1,
        status: WizardProfileStatus.SUBMITTED,
        answers: {
          businessProcess: "loan_approval",
          aiPurpose: "decision_support",
        },
        submittedAt: new Date("2026-08-08T01:00:00.000Z"),
      },
    });
    await prisma.verifiedProfile.create({
      data: {
        id: "verified-runtime-1",
        aiUsageFlowId: "aiuf-runtime-1",
        assessmentId: "assessment-runtime-1",
        organizationId: "org-runtime-1",
        schemaVersion: "1.0.0",
        providerVersion: "verified-profile-worker@1",
        profileData: {
          claims: [{ claim_category: "MODEL_INVOCATION" }],
        },
        gatesPassedAt: { reconciliation: "2026-08-08T01:00:00.000Z" },
        status: VerifiedProfileStatus.APPROVED,
      },
    });
    await prisma.legalRuleMatch.create({
      data: {
        id: "match-runtime-1",
        verifiedProfileId: "verified-runtime-1",
        assessmentId: "assessment-runtime-1",
        organizationId: "org-runtime-1",
        corpusVersionId: "corpus-runtime-1",
        legalRuleCatalogVersionId: "catalog-runtime-1",
        schemaVersion: "1.0.0",
        matches: [
          {
            confidence: 0.92,
            coverage_status: "COMPLETE_CITATION",
            citation_chunk_ids: ["chunk-runtime-1"],
          },
        ],
        citationAllowlist: ["chunk-runtime-1"],
        overallCoverageStatus: OverallCoverageStatus.COMPLETE_CITATION,
        guardrailStatus: LegalRuleMatchGuardrailStatus.PASSED,
        status: EvidenceAcceptanceStatus.ACCEPTED,
      },
    });
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  it("serves all persisted inputs required by the LangGraph workers", async () => {
    const report = await workerGet(
      "/internal/evidence/reports/report-runtime-1",
    );
    assert.equal(report.status, 200);
    assert.equal(report.body.status, "accepted");
    assert.equal(report.body.assessment_id, "assessment-runtime-1");
    assert.equal(
      report.body.evidence_payload.technical_findings[0].finding_type,
      "STATUS_UPDATE_SIGNAL",
    );

    const profile = await workerGet(
      "/internal/evidence/technical-profiles/profile-runtime-1",
    );
    assert.equal(profile.status, 200);
    assert.equal(profile.body.technical_profile_id, "profile-runtime-1");
    assert.equal(profile.body.evidence_report_id, "report-runtime-1");
    assert.deepEqual(profile.body.dependency_ai_packages, ["openai"]);

    const wizard = await workerGet(
      "/internal/assessments/assessment-runtime-1/wizard-profile",
    );
    assert.equal(wizard.status, 200);
    assert.equal(wizard.body.id, "wizard-runtime-1");
    assert.equal(wizard.body.answers.businessProcess, "loan_approval");

    const legalRuleMatch = await workerGet(
      "/internal/classification/runtime/legal-rule-matches/match-runtime-1",
    );
    assert.equal(legalRuleMatch.status, 200);
    assert.equal(legalRuleMatch.body.legal_rule_match_id, "match-runtime-1");
    assert.equal(legalRuleMatch.body.verified_profile_id, "verified-runtime-1");
    assert.equal(legalRuleMatch.body.guardrail_status, "passed");
    assert.deepEqual(legalRuleMatch.body.citation_allowlist, [
      "chunk-runtime-1",
    ]);
    assert.deepEqual(legalRuleMatch.body.verified_profile_data.claims, [
      { claim_category: "MODEL_INVOCATION" },
    ]);
  });

  it("rejects worker runtime reads without the worker API key", async () => {
    const response = await httpRequest(app).get(
      "/internal/evidence/reports/report-runtime-1",
    );
    assert.equal(response.status, 401);
  });

  function workerGet(path: string) {
    return httpRequest(app)
      .get(path)
      .set("X-Worker-Api-Key", WORKER_KEY)
      .set("X-Correlation-Id", "runtime-inputs-corr-1");
  }
});
