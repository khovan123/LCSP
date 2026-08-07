/**
 * Generates an inspectable Wizard Readiness Export using the disposable e2e
 * database and the same authenticated HTTP endpoints used by the web app.
 */
import * as assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, open, rename, rm, writeFile } from "node:fs/promises";
import { promisify } from "node:util";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Test, type TestingModule } from "@nestjs/testing";
import {
  ASSESSMENT_STATUS_CODES,
  WIZARD_STATUS_CODES,
} from "@lcsp/contracts/assessment";
import {
  ANSWER_STATES,
  READINESS_EXPORT_STATUSES,
} from "@lcsp/contracts/wizard";
import type { INestApplication } from "@nestjs/common";

import { AppModule } from "../src/app.module.js";
import type { SignInSuccess } from "../src/modules/auth-workspace/application/contracts/auth-workspace/sign-in.contract.js";
import type { ReadinessExportResponse } from "../src/modules/wizard/application/contracts/wizard/readiness-export.contract.js";
import {
  TEST_DATABASE_URL,
  pushPrismaSchema,
  resetAuthWorkspaceDatabase,
  seedAuthWorkspaceFixture,
} from "../test/support/auth-workspace-test-helpers.js";
import { httpRequest, successBody } from "../test/support/http.js";
import {
  assertReadinessExportPdf,
  READINESS_EXPORT_PDF_FILE_NAME,
} from "./readiness-export-pdf-demo.helpers.js";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const apiRoot = resolve(scriptDir, "..");
const projectRoot = resolve(scriptDir, "../../..");
const outputPath = resolve(projectRoot, "output/readiness-export-demo.pdf");
const lockPath = `${outputPath}.lock`;
const temporaryOutputPath = `${outputPath}.${process.pid}.tmp`;
const executeFile = promisify(execFile);

async function main(): Promise<void> {
  process.env.NODE_ENV = "test";
  process.env.DATABASE_URL = TEST_DATABASE_URL;
  process.env.RABBITMQ_URL = "amqp://guest:guest@127.0.0.1:5672";
  process.env.RABBITMQ_EXCHANGE = "lcsp.events.test";
  process.env.OUTBOX_POLL_INTERVAL_MS = "60000";

  await mkdir(dirname(outputPath), { recursive: true });
  const lock = await open(lockPath, "wx").catch(() => {
    throw new Error(
      "Another readiness export PDF demo is already running. Wait for it to finish.",
    );
  });
  let app: INestApplication | undefined;
  let prisma: PrismaClient | undefined;

  try {
    // Remove stale output so a failed run can never be mistaken for a success.
    await rm(outputPath, { force: true });
    await executeFile("node", ["./test/scripts/ensure-test-postgres.mjs"], {
      cwd: apiRoot,
    });
    pushPrismaSchema();
    prisma = new PrismaClient({ adapter: new PrismaPg(TEST_DATABASE_URL) });
    await prisma.$connect();
    await resetDemoData(prisma);
    await resetAuthWorkspaceDatabase(prisma);
    await seedAuthWorkspaceFixture(prisma);
    await seedSubmittedWizard(prisma);

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();

    const signIn = await httpRequest(app).post("/auth/sign-in").send({
      email: "manager@acme.test",
      password: "CorrectHorseBatteryStaple!",
      organization_id: "org-1",
    });
    assert.equal(signIn.status, 200, "Manager sign-in failed");
    const managerToken = successBody<SignInSuccess>(signIn).session_token;

    const generation = await httpRequest(app)
      .post("/assessments/assessment-1/wizard/readiness-export")
      .set("Authorization", `Bearer ${managerToken}`)
      .set("X-Correlation-Id", randomUUID())
      .send({});
    assert.equal(generation.status, 201, "Readiness export generation failed");
    const exportBody = successBody<ReadinessExportResponse>(generation);
    assert.equal(exportBody.status, READINESS_EXPORT_STATUSES.generated);
    assert.equal(exportBody.version, 1);
    assert.equal(exportBody.media_type, "application/pdf");
    assert.ok(
      exportBody.download_url,
      "Export generation did not return a download URL",
    );

    const download = await httpRequest(app)
      .get(exportBody.download_url)
      .set("Authorization", `Bearer ${managerToken}`)
      .buffer(true)
      .parse((response, callback) => {
        const chunks: Buffer[] = [];
        response.on("data", (chunk: Buffer) => chunks.push(chunk));
        response.on("end", () => callback(null, Buffer.concat(chunks)));
      });
    assert.equal(download.status, 200, "Readiness export download failed");
    assert.match(download.headers["content-type"], /^application\/pdf/);
    assert.equal(
      download.headers["content-disposition"],
      `attachment; filename="${READINESS_EXPORT_PDF_FILE_NAME}"`,
    );
    assert.ok(Buffer.isBuffer(download.body), "PDF response was not binary");
    assertReadinessExportPdf(download.body);

    await writeFile(temporaryOutputPath, download.body);
    await rename(temporaryOutputPath, outputPath);

    console.log(
      `Readiness export PDF written to ${outputPath} (${download.body.length} bytes)`,
    );
  } finally {
    await app?.close();
    await prisma?.$disconnect();
    await rm(temporaryOutputPath, { force: true });
    await lock.close();
    await rm(lockPath, { force: true });
  }
}

async function resetDemoData(prisma: PrismaClient): Promise<void> {
  await prisma.readinessExport.deleteMany();
  await prisma.technicalEvidenceReport.deleteMany();
  await prisma.wizardProfile.deleteMany();
  await prisma.assessment.deleteMany();
}

async function seedSubmittedWizard(prisma: PrismaClient): Promise<void> {
  await prisma.assessment.create({
    data: {
      id: "assessment-1",
      organizationId: "org-1",
      ownerId: "user-1",
      name: "Wizard readiness export assessment",
      status: ASSESSMENT_STATUS_CODES.wizardSubmitted,
    },
  });
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
        {
          questionId: "ps_001_ai_scope",
          answerState: ANSWER_STATES.answered,
          value:
            "The product uses AI to triage incoming customer support tickets and suggest routing metadata.",
          updatedAt: new Date().toISOString(),
        },
        {
          questionId: "ps_002_affected_people",
          answerState: ANSWER_STATES.answered,
          value: ["Customers", "Employees"],
          updatedAt: new Date().toISOString(),
        },
        {
          questionId: "ps_003_personal_or_sensitive_data",
          answerState: ANSWER_STATES.answered,
          value: "yes",
          updatedAt: new Date().toISOString(),
        },
        {
          questionId: "ps_004_decision_importance",
          answerState: ANSWER_STATES.answered,
          value: "no",
          updatedAt: new Date().toISOString(),
        },
        {
          questionId: "businessProcess",
          answerState: ANSWER_STATES.answered,
          value: "Customer support intake and operations routing.",
          updatedAt: new Date().toISOString(),
        },
        {
          questionId: "aiPurpose",
          answerState: ANSWER_STATES.answered,
          value:
            "Summarize ticket context, suggest a support queue, and highlight missing operational details for human review.",
          updatedAt: new Date().toISOString(),
        },
        {
          questionId: "purpose",
          answerState: ANSWER_STATES.answered,
          value: "Route support requests to the right operations team.",
          updatedAt: new Date().toISOString(),
        },
        {
          questionId: "sector",
          answerState: ANSWER_STATES.answered,
          value: "GENERAL_BUSINESS",
          updatedAt: new Date().toISOString(),
        },
        {
          questionId: "dataTypes",
          answerState: ANSWER_STATES.answered,
          value: ["Contact details", "Ticket messages", "Operational metadata"],
          updatedAt: new Date().toISOString(),
        },
        {
          questionId: "affectedSubjects",
          answerState: ANSWER_STATES.answered,
          value: ["CUSTOMERS", "EMPLOYEES"],
          updatedAt: new Date().toISOString(),
        },
        {
          questionId: "userImpact",
          answerState: ANSWER_STATES.answered,
          value: "LOW",
          updatedAt: new Date().toISOString(),
        },
        {
          questionId: "decisionRole",
          answerState: ANSWER_STATES.answered,
          value: "ASSISTS_DECISION",
          updatedAt: new Date().toISOString(),
        },
        {
          questionId: "humanReview",
          answerState: ANSWER_STATES.answered,
          value: "PRESENT",
          updatedAt: new Date().toISOString(),
        },
        {
          questionId: "externalLlmUsage",
          answerState: ANSWER_STATES.answered,
          value: "POSSIBLE",
          updatedAt: new Date().toISOString(),
        },
        {
          questionId: "deploymentContext",
          answerState: ANSWER_STATES.answered,
          value: ["Internal staff workflow", "Customer-facing support portal"],
          updatedAt: new Date().toISOString(),
        },
        {
          questionId: "specialCategoryData",
          answerState: ANSWER_STATES.answered,
          value: "unknown",
          updatedAt: new Date().toISOString(),
        },
        {
          questionId: "biometricData",
          answerState: ANSWER_STATES.answered,
          value: "no",
          updatedAt: new Date().toISOString(),
        },
        {
          questionId: "highImpactIndicators",
          answerState: ANSWER_STATES.answered,
          value: ["Employment and HR support escalation"],
          updatedAt: new Date().toISOString(),
        },
        {
          questionId: "transparencyIndicators",
          answerState: ANSWER_STATES.answered,
          value: [
            "Direct interaction notice planned",
            "AI-generated summary label",
          ],
          updatedAt: new Date().toISOString(),
        },
        {
          questionId: "prohibitedRiskSignals",
          answerState: ANSWER_STATES.answered,
          value: ["None identified during Wizard intake"],
          updatedAt: new Date().toISOString(),
        },
      ],
    },
  });
}

void main().catch((error: unknown) => {
  console.error("Readiness export PDF demo failed:", error);
  process.exitCode = 1;
});
