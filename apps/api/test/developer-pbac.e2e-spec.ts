import {
  PBAC_ACTIONS,
  PBAC_DECISION,
  PBAC_STATE_GATES,
  SUBJECT_ROLES,
} from "@lcsp/contracts/pbac";
import { AUTH_MEMBERSHIP_STATUSES } from "@lcsp/contracts/auth";
/**
 * AC-024: Organization and PBAC-denied action audit.
 * AC-025: Developer cannot perform Manager-only actions.
 */

import * as assert from "node:assert/strict";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import type { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { httpRequest } from "./support/http.js";

import type { AuthErrorCode } from "@lcsp/contracts/auth";

import { AppModule } from "../src/app.module.js";
import type { SignInSuccess } from "../src/modules/auth-workspace/application/contracts/auth-workspace/sign-in.contract.js";
import { hashSecret } from "../src/modules/auth-workspace/infrastructure/security/security.utils.js";
import {
  TEST_DATABASE_URL,
  pushPrismaSchema,
  resetAuthWorkspaceDatabase,
  seedAuthWorkspaceFixture,
  type AuthFixture,
} from "./support/auth-workspace-test-helpers.js";

type ErrorResponseBody = {
  error_code: AuthErrorCode;
  code: AuthErrorCode;
  correlation_id: string;
};

describe("Developer PBAC enforcement (e2e) [AC-024, AC-025]", () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let fixture: AuthFixture;
  let developerToken: string;

  beforeAll(async () => {
    process.env.DATABASE_URL = TEST_DATABASE_URL;
    pushPrismaSchema();

    prisma = new PrismaClient({
      adapter: new PrismaPg(TEST_DATABASE_URL),
    });
    await prisma.$connect();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  beforeEach(async () => {
    await resetAuthWorkspaceDatabase(prisma);
    fixture = await seedAuthWorkspaceFixture(prisma);
    await seedDeveloperFixture(prisma, fixture.organizationId);

    // Obtain Developer session token
    const devSignIn = await httpRequest(app).post("/auth/sign-in").send({
      email: "developer@acme.test",
      password: "DevPassword123!",
      organization_id: fixture.organizationId,
    });
    developerToken = (devSignIn.body as SignInSuccess)?.session_token ?? "";
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  // AC-025: Developer cannot perform Manager-only actions
  it("AC-025: Developer cannot create an assessment (Manager-only action)", async () => {
    if (!developerToken) return;
    const result = await httpRequest(app)
      .post("/assessments")
      .set("Authorization", `Bearer ${developerToken}`)
      .send({ name: "Test Assessment", purpose: "Testing" });

    assert.equal(
      result.status,
      403,
      "Developer must be denied assessment creation",
    );
    assert.ok(
      (result.body as ErrorResponseBody).error_code,
      "Error response must have machine-readable code",
    );
    assert.doesNotMatch(
      JSON.stringify(result.body),
      /policyId|actions/i,
      "403 response must not leak policy internals",
    );
  });

  // AC-024: PBAC-denied action audit
  it("AC-024: PBAC denial writes AuthDecisionLog without leaking policy details", async () => {
    if (!developerToken) return;
    await httpRequest(app)
      .post("/assessments")
      .set("Authorization", `Bearer ${developerToken}`)
      .send({ name: "Denied Assessment" });

    const decisionLog = await prisma.authDecisionLog.findFirst({
      where: { decision: PBAC_DECISION.deny },
      orderBy: { createdAt: "desc" },
    });

    assert.ok(decisionLog, "AuthDecisionLog must be written on PBAC denial");
    assert.equal(decisionLog.decision, PBAC_DECISION.deny);
    // Log must not expose raw policy content
    const logJson = JSON.stringify(decisionLog);
    assert.doesNotMatch(
      logJson,
      /"policyId"\s*:\s*"[^"]{36,}"/,
      "Must not leak full policy ID",
    );
  });
});

async function seedDeveloperFixture(
  prisma: PrismaClient,
  organizationId: string,
): Promise<void> {
  await prisma.authUser.create({
    data: {
      id: "developer-user-id",
      email: "developer@acme.test",
      passwordHash: hashSecret("DevPassword123!"),
      emailVerified: true,
      failedLoginCount: 0,
    },
  });

  const devPolicyId = "policy-developer";
  await prisma.authPolicy.create({
    data: {
      id: devPolicyId,
      version: "2026-06-26",
      actions: [
        PBAC_ACTIONS.evidenceReadRedacted,
        "ai-usage-flow:read",
        "findings:read:redacted",
      ],
      subjectRole: SUBJECT_ROLES.developer,
      stateGate: PBAC_STATE_GATES.membershipActive,
      organizationId,
    },
  });

  await prisma.authMembership.create({
    data: {
      id: "membership-developer",
      userId: "developer-user-id",
      organizationId,
      status: AUTH_MEMBERSHIP_STATUSES.active,
      subjectAttributes: { role: SUBJECT_ROLES.developer },
      policyId: devPolicyId,
      policyVersion: "2026-06-26",
    },
  });
}
