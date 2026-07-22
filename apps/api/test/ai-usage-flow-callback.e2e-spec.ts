/** MW-aiuf-001: AIUsageFlow Callback Endpoint. */

import * as assert from "node:assert/strict";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import type { INestApplication } from "@nestjs/common";
import { Test, type TestingModule } from "@nestjs/testing";
import { ASSESSMENT_STATUS_CODES } from "@lcsp/contracts/assessment";
import {
  AUDIT_EVENT_SCHEMA_VERSION,
  AUDIT_REDACTION_STATUSES,
} from "@lcsp/contracts/audit";
import { OUTBOX_MESSAGE_SCHEMA_VERSION } from "@lcsp/contracts/outbox";
import {
  AI_USAGE_FLOW_STATUSES,
  SCAN_ERROR_CODES,
  SCAN_EVENT_TYPES,
  TECHNICAL_EVIDENCE_REPORT_STATUSES,
  TECHNICAL_PROFILE_STATUSES,
} from "@lcsp/contracts/scan";

import { AppModule } from "../src/app.module.js";
import type {
  AIUsageFlowCallbackDto,
  AIUsageFlowCallbackRequest,
} from "../src/modules/ai-usage-flow/application/contracts/ai-usage-flow/ai-usage-flow-callback.contract.js";
import {
  pushPrismaSchema,
  resetAuthWorkspaceDatabase,
  seedAuthWorkspaceFixture,
  TEST_DATABASE_URL,
} from "./support/auth-workspace-test-helpers.js";
import { httpRequest } from "./support/http.js";

const WORKER_KEY = "test-only-worker-api-key-at-least-32-chars";
type ErrorResponse = { error_code?: string };

describe("AIUsageFlow Callback Endpoint (e2e) [MW-aiuf-001]", () => {
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
    await prisma.aIUsageFlow.deleteMany();
    await prisma.technicalProfile.deleteMany();
    await prisma.technicalEvidenceReport.deleteMany();
    await prisma.repositoryScanJob.deleteMany();
    await prisma.outboxMessage.deleteMany();
    await prisma.assessment.deleteMany();
    await resetAuthWorkspaceDatabase(prisma);
    await seedAuthWorkspaceFixture(prisma);
    await prisma.assessment.create({
      data: {
        id: "assessment-1",
        organizationId: "org-1",
        ownerId: "user-1",
        name: "AI usage flow callback assessment",
        status: ASSESSMENT_STATUS_CODES.scanInProgress,
      },
    });
    await createTechnicalProfile(prisma, TECHNICAL_PROFILE_STATUSES.accepted);
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  it("T01/T03/T06 accepts valid claims, preserves unknowns, emits outbox, and audits safe refs", async () => {
    const response = await callback(app, validPayload());
    const body = response.body as AIUsageFlowCallbackDto;

    assert.equal(response.status, 200);
    assert.equal(body.accepted, true);
    assert.ok(body.ai_usage_flow_id);

    const [flow, outbox, audit] = await Promise.all([
      prisma.aIUsageFlow.findUnique({ where: { id: body.ai_usage_flow_id } }),
      prisma.outboxMessage.findFirst({
        where: { eventType: SCAN_EVENT_TYPES.aiUsageFlowReady },
      }),
      prisma.authAuditEvent.findFirst({
        where: { eventType: SCAN_EVENT_TYPES.aiUsageFlowAcceptedAudit },
      }),
    ]);

    assert.equal(flow?.technicalProfileId, "technical-profile-1");
    assert.equal(flow?.status, AI_USAGE_FLOW_STATUSES.accepted);
    assert.deepEqual(flow?.claims, validPayload().claims);
    assert.deepEqual(flow?.unknownUsages, validPayload().unknown_usages);
    assert.equal(outbox?.aggregateId, body.ai_usage_flow_id);
    assert.equal(
      (outbox?.payload as { schemaVersion?: string }).schemaVersion,
      OUTBOX_MESSAGE_SCHEMA_VERSION,
    );
    assert.equal(
      (outbox?.payload as { causationId?: string }).causationId,
      "technical-profile-1",
    );
    assert.equal(audit?.resourceId, body.ai_usage_flow_id);
    assert.equal(
      (audit?.payload as { schemaVersion?: string }).schemaVersion,
      AUDIT_EVENT_SCHEMA_VERSION,
    );
    assert.equal(
      (audit?.payload as { redactionStatus?: string }).redactionStatus,
      AUDIT_REDACTION_STATUSES.none,
    );
    assert.equal((audit?.payload as { claims?: unknown }).claims, undefined);
  });

  it("T02 rejects material claims without evidence refs", async () => {
    const response = await callback(
      app,
      validPayload({
        claims: [{ ...validClaim(), evidence_refs: [] }],
      }),
    );

    assertError(
      response.status,
      response.body,
      422,
      SCAN_ERROR_CODES.claimMissingEvidenceRef,
    );
    await assertNoFlowMutation(prisma);
  });

  it("T04 rejects an existing flow for the same technical profile", async () => {
    await callback(app, validPayload());
    const response = await callback(app, validPayload());

    assertError(
      response.status,
      response.body,
      409,
      SCAN_ERROR_CODES.aiUsageFlowAlreadyExists,
    );
  });

  it("T05 rejects invalid privacy flags and unsafe payload content", async () => {
    const badFlags = await callback(
      app,
      validPayload({
        privacy_flags: { containsSourceCode: true, secretsRedacted: true },
      }),
    );
    assertError(
      badFlags.status,
      badFlags.body,
      422,
      SCAN_ERROR_CODES.privacyFlagsInvalid,
    );
    await assertNoFlowMutation(prisma);

    const unsafePayload = await callback(
      app,
      validPayload({
        unknown_usages: [
          {
            reason: "dynamic path",
            source_code: "const key = 'ghp_secret12345678901234567890'",
          },
        ],
      }),
    );
    assertError(
      unsafePayload.status,
      unsafePayload.body,
      422,
      SCAN_ERROR_CODES.privacyFlagsInvalid,
    );
    await assertNoFlowMutation(prisma);
  });

  it("T07 accepts empty claims when no AI usage was found", async () => {
    const response = await callback(app, validPayload({ claims: [] }));
    const body = response.body as AIUsageFlowCallbackDto;

    assert.equal(response.status, 200);
    assert.equal(body.accepted, true);
    const flow = await prisma.aIUsageFlow.findUnique({
      where: { id: body.ai_usage_flow_id },
    });
    assert.deepEqual(flow?.claims, []);
  });

  it("rejects a missing technical profile and does not expose an update path", async () => {
    const missingProfile = await callback(
      app,
      validPayload({ technical_profile_id: "missing-profile" }),
    );
    assertError(
      missingProfile.status,
      missingProfile.body,
      404,
      SCAN_ERROR_CODES.technicalProfileNotFound,
    );
    await assertNoFlowMutation(prisma);

    const updateAttempt = await httpRequest(app)
      .patch("/internal/ai-usage-flow/callback")
      .set("X-Worker-Api-Key", WORKER_KEY)
      .send(validPayload());
    assert.equal(updateAttempt.status, 404);
  });
});

function callback(app: INestApplication, payload: AIUsageFlowCallbackRequest) {
  return httpRequest(app)
    .post("/internal/ai-usage-flow/callback")
    .set("X-Worker-Api-Key", WORKER_KEY)
    .set("X-Correlation-Id", "ai-usage-flow-corr-1")
    .send(payload);
}

function validPayload(
  overrides: Partial<AIUsageFlowCallbackRequest> = {},
): AIUsageFlowCallbackRequest {
  return {
    technical_profile_id: "technical-profile-1",
    assessment_id: "assessment-1",
    schema_version: "1.0.0",
    provider_version: "ai-usage-flow-worker@1.0.0",
    claims: [validClaim()],
    unknown_usages: [
      { signal: "dynamic_output_path", reason: "requires review" },
    ],
    privacy_flags: {
      containsSourceCode: false,
      secretsRedacted: true,
    },
    ...overrides,
  };
}

function validClaim() {
  return {
    claim_id: "claim-1",
    claim_type: "model_call",
    confidence: "high",
    evidence_refs: ["evidence-report-1::finding-1"],
    uncertainty_reason: null,
    description: "Model invocation detected from accepted evidence",
    is_material: true,
  };
}

async function createTechnicalProfile(
  prisma: PrismaClient,
  status: string,
): Promise<void> {
  await prisma.technicalEvidenceReport.create({
    data: {
      id: "evidence-report-1",
      scanJobId: "scan-job-1",
      assessmentId: "assessment-1",
      snapshotId: "snapshot-1",
      organizationId: "org-1",
      toolsVersion: { semgrep: "1.0.0" },
      configHash: { semgrep: "sha256:abc" },
      evidencePayload: { findings: [{ finding_id: "finding-1" }] },
      privacyFlags: { containsSourceCode: false, secretsRedacted: true },
      schemaVersion: "1.0.0",
      status: TECHNICAL_EVIDENCE_REPORT_STATUSES.accepted,
    },
  });
  await prisma.technicalProfile.create({
    data: {
      id: "technical-profile-1",
      evidenceReportId: "evidence-report-1",
      assessmentId: "assessment-1",
      organizationId: "org-1",
      schemaVersion: "1.0.0",
      providerVersion: "technical-profile-worker@1.0.0",
      profileData: { aiDetected: "confirmed" },
      privacyFlags: { containsSourceCode: false, secretsRedacted: true },
      status,
    },
  });
}

async function assertNoFlowMutation(prisma: PrismaClient): Promise<void> {
  const [flows, outbox] = await Promise.all([
    prisma.aIUsageFlow.count(),
    prisma.outboxMessage.count({
      where: { eventType: SCAN_EVENT_TYPES.aiUsageFlowReady },
    }),
  ]);
  assert.equal(flows, 0);
  assert.equal(outbox, 0);
}

function assertError(
  actualStatus: number,
  body: unknown,
  expectedStatus: number,
  expectedCode: string,
): void {
  assert.equal(actualStatus, expectedStatus);
  assert.equal((body as ErrorResponse).error_code, expectedCode);
}
