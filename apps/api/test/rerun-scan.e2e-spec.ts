import * as assert from "node:assert/strict";

import { PrismaPg } from "@prisma/adapter-pg";
import { BillingReservationStatus, PrismaClient } from "@prisma/client";
import type { INestApplication } from "@nestjs/common";
import { Test, type TestingModule } from "@nestjs/testing";

import { ASSESSMENT_STATUS_CODES } from "@lcsp/contracts/assessment";
import {
  GITHUB_INTEGRATION_ERROR_CODES,
  GITHUB_INTEGRATION_EVENT_TYPES,
  REPOSITORY_SCAN_JOB_STATUSES,
  REPOSITORY_SCAN_TRIGGER_SOURCES,
  REPOSITORY_SNAPSHOT_STATUSES,
} from "@lcsp/contracts/github-integration";
import { SCAN_EVENT_TYPES } from "@lcsp/contracts/scan";

import { AppModule } from "../src/app.module.js";
import { BillingAccountingKernel } from "../src/modules/billing/application/shared/billing-accounting.kernel.js";
import type { SignInSuccess } from "../src/modules/auth/application/contracts/auth/sign-in.contract.js";
import type { RerunScanResponseDto } from "../src/modules/scan/application/contracts/scan/rerun-scan.contract.js";
import {
  pushPrismaSchema,
  resetAuthWorkspaceDatabase,
  seedAuthWorkspaceFixture,
  seedRepositorySnapshotGraph,
  TEST_DATABASE_URL,
} from "./support/auth-workspace-test-helpers.js";
import { httpRequest, problemCode, successBody } from "./support/http.js";

const IDEMPOTENCY_KEY = "rerun-scan-request:assessment-1:snapshot-1:1";

describe("Re-Run Scan Endpoint (e2e) [MW-scan-003]", () => {
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
    await prisma.billingReservationInvocationClaim.deleteMany();
    await prisma.llmUsageEvent.deleteMany();
    await prisma.billingReservation.deleteMany();
    await prisma.creditLedgerEntry.deleteMany();
    await prisma.billingWallet.deleteMany();
    await prisma.outboxMessage.deleteMany({
      where: { eventType: GITHUB_INTEGRATION_EVENT_TYPES.scanTriggered },
    });
    await prisma.repositoryScanJob.deleteMany();
    await prisma.repositorySnapshot.deleteMany();
    await prisma.repositoryConnection.deleteMany();
    await prisma.assessment.deleteMany();
    await resetAuthWorkspaceDatabase(prisma);
    await seedAuthWorkspaceFixture(prisma);
    await prisma.assessment.create({
      data: {
        id: "assessment-1",
        ownerId: "user-1",
        name: "Scan assessment",
        status: ASSESSMENT_STATUS_CODES.wizardSubmitted,
      },
    });
    await createSnapshot(prisma, "snapshot-1");

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

  it("T01/T03: Valid re-run creates 201 replacement scan job and removes prior same-snapshot scan", async () => {
    const priorUpdatedAt = new Date("2026-07-17T00:00:00.000Z");
    await prisma.repositoryScanJob.create({
      data: {
        id: "prior-scan-job",
        assessmentId: "assessment-1",
        snapshotId: "snapshot-1",
        idempotencyKey: "scan-request:assessment-1:snapshot-1:0",
        triggerSource: REPOSITORY_SCAN_TRIGGER_SOURCES.manual,
        status: REPOSITORY_SCAN_JOB_STATUSES.completed,
        attemptCount: 1,
        correlationId: "prior-corr",
        createdAt: priorUpdatedAt,
        updatedAt: priorUpdatedAt,
      },
    });

    const response = await triggerRerun(app, managerToken);
    const body = successBody<RerunScanResponseDto>(response);

    assert.equal(response.status, 201);
    assert.equal(body.status, REPOSITORY_SCAN_JOB_STATUSES.queued);
    assert.equal(body.replaces_scan_job_id, "prior-scan-job");

    const job = await prisma.repositoryScanJob.findUnique({
      where: { id: body.scan_job_id },
    });
    assert.ok(job);
    assert.equal(job.snapshotId, "snapshot-1");
    assert.equal(job.triggerSource, REPOSITORY_SCAN_TRIGGER_SOURCES.manual);

    const prior = await prisma.repositoryScanJob.findUnique({
      where: { id: "prior-scan-job" },
    });
    assert.equal(prior, null);

    const event = await prisma.outboxMessage.findFirst({
      where: { aggregateId: body.scan_job_id },
    });
    assert.ok(event);
    assert.equal(
      (event.payload as Record<string, unknown>).replacesScanJobId,
      "prior-scan-job",
    );

    const audit = await prisma.auditEvent.findFirst({
      where: {
        eventType: SCAN_EVENT_TYPES.scanRerunTriggeredAudit,
        resourceId: body.scan_job_id,
      },
    });
    assert.ok(audit);
  });

  it("T06: re-run releases credits still held by replaced or deleted scans", async () => {
    const billing = app.get(BillingAccountingKernel);
    const wallet = await billing.getOrCreateWallet("user-1");
    await billing.appendLedger({
      userId: "user-1",
      walletId: wallet.id,
      deltaCredits: 1_000n,
      idempotencyKey: "rerun-release-seed",
      source: "TEST",
    });
    await prisma.repositoryScanJob.create({
      data: {
        id: "prior-scan-job",
        assessmentId: "assessment-1",
        snapshotId: "snapshot-1",
        idempotencyKey: "scan-request:assessment-1:snapshot-1:0",
        triggerSource: REPOSITORY_SCAN_TRIGGER_SOURCES.manual,
        status: REPOSITORY_SCAN_JOB_STATUSES.failed,
        attemptCount: 1,
        correlationId: "prior-corr",
      },
    });
    // A retryable worker failure keeps its reservation for redelivery; once the
    // scan is terminal (or already replaced) nothing else will ever release it.
    const replacedScanHold = await billing.reserveCredits({
      userId: "user-1",
      assessmentId: "assessment-1",
      runId: "prior-scan-job",
      scanJobId: "prior-scan-job",
      amountCredits: 300n,
      idempotencyKey: "hold-prior-scan-job",
    });
    const deletedScanHold = await billing.reserveCredits({
      userId: "user-1",
      assessmentId: "assessment-1",
      runId: "deleted-scan-job",
      scanJobId: "deleted-scan-job",
      amountCredits: 200n,
      idempotencyKey: "hold-deleted-scan-job",
    });
    const unscopedHold = await billing.reserveCredits({
      userId: "user-1",
      amountCredits: 50n,
      idempotencyKey: "hold-without-scan",
    });

    const response = await triggerRerun(app, managerToken);

    assert.equal(response.status, 201);
    const holds = await prisma.billingReservation.findMany({
      where: {
        id: {
          in: [replacedScanHold.id, deletedScanHold.id, unscopedHold.id],
        },
      },
      select: { id: true, status: true },
    });
    const statusById = new Map(holds.map((hold) => [hold.id, hold.status]));
    assert.equal(
      statusById.get(replacedScanHold.id),
      BillingReservationStatus.RELEASED,
    );
    assert.equal(
      statusById.get(deletedScanHold.id),
      BillingReservationStatus.RELEASED,
    );
    assert.equal(
      statusById.get(unscopedHold.id),
      BillingReservationStatus.RESERVED,
    );
    const walletAfter = await prisma.billingWallet.findUniqueOrThrow({
      where: { userId: "user-1" },
    });
    assert.equal(walletAfter.reservedCredits, 50n);
    assert.equal(walletAfter.availableCredits, 950n);
  });

  it("T02: Same idempotency_key returns existing re-run job", async () => {
    const first = await triggerRerun(app, managerToken);
    const firstBody = successBody<RerunScanResponseDto>(first);

    const second = await triggerRerun(app, managerToken);
    const secondBody = successBody<RerunScanResponseDto>(second);

    assert.equal(second.status, 201); // Returns 201 for idempotency too by NestJS default if HttpCode(201) is used unless we modify response, which is fine
    assert.equal(secondBody.scan_job_id, firstBody.scan_job_id);
    assert.equal(await prisma.repositoryScanJob.count(), 1);
  });

  it("T05: Snapshot not in org returns 404", async () => {
    await prisma.assessment.create({
      data: {
        id: "assessment-other",
        ownerId: "user-2",
        name: "Other assessment",
        status: ASSESSMENT_STATUS_CODES.wizardSubmitted,
      },
    });
    await prisma.repositorySnapshot.update({
      where: { id: "snapshot-1" },
      data: { assessmentId: "assessment-other" },
    });

    const response = await triggerRerun(app, managerToken);

    assert.equal(response.status, 404);
    assert.equal(
      problemCode(response),
      GITHUB_INTEGRATION_ERROR_CODES.snapshotNotFound,
    );
  });
});

function triggerRerun(app: INestApplication, token: string) {
  return httpRequest(app)
    .post("/assessments/assessment-1/scan-jobs/rerun")
    .set("Authorization", `Bearer ${token}`)
    .send({
      snapshot_id: "snapshot-1",
      idempotency_key: IDEMPOTENCY_KEY,
      reason: "Security requested re-run",
    });
}

async function createSnapshot(prisma: PrismaClient, id: string): Promise<void> {
  await seedRepositorySnapshotGraph(prisma, {
    assessmentId: "assessment-1",
    userId: "user-1",
    connectionId: "connection-1",
    snapshotId: id,
    repositoryId: "repo-1",
  });
  await prisma.repositorySnapshot.update({
    where: { id },
    data: {
      branch: "main",
      commitSha: "a".repeat(40),
      providerMetadata: { requestedRevision: "main" },
      status: REPOSITORY_SNAPSHOT_STATUSES.ready,
    },
  });
}
