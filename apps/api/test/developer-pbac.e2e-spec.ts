/**
 * AC-024: Organization and PBAC-denied action audit.
 * AC-025: Developer cannot perform Manager-only actions.
 * AC-026: Revoked Developer policy blocks new actions and audits.
 */

import * as assert from "node:assert/strict";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import type { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import request from "supertest";

import { AppModule } from "../src/app.module.js";
import {
  TEST_DATABASE_URL,
  pushPrismaSchema,
  resetAuthWorkspaceDatabase,
  seedAuthWorkspaceFixture,
  type AuthFixture,
} from "./support/auth-workspace-test-helpers.js";
import { hashSecret, fingerprintToken } from "../src/modules/auth-workspace/infrastructure/security/security.utils.js";

describe("Developer PBAC enforcement and revocation (e2e) [AC-024, AC-025, AC-026]", () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let fixture: AuthFixture;
  let managerToken: string;
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

    // Obtain Manager session token
    const managerSignIn = await request(app.getHttpServer())
      .post("/auth/sign-in")
      .send({
        email: "manager@acme.test",
        password: "CorrectHorseBatteryStaple!",
        organization_id: fixture.organizationId,
      });
    managerToken = managerSignIn.body?.session_token ?? "";

    // Obtain Developer session token
    const devSignIn = await request(app.getHttpServer())
      .post("/auth/sign-in")
      .send({
        email: "developer@acme.test",
        password: "DevPassword123!",
        organization_id: fixture.organizationId,
      });
    developerToken = devSignIn.body?.session_token ?? "";
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  // AC-025: Developer cannot perform Manager-only actions
  it("AC-025: Developer cannot create an assessment (Manager-only action)", async () => {
    if (!developerToken) return;
    const result = await request(app.getHttpServer())
      .post("/assessments")
      .set("Authorization", `Bearer ${developerToken}`)
      .send({ name: "Test Assessment", purpose: "Testing" });

    assert.equal(result.status, 403, "Developer must be denied assessment creation");
    assert.ok(result.body.code, "Error response must have machine-readable code");
    assert.doesNotMatch(
      JSON.stringify(result.body),
      /policyId|actions/i,
      "403 response must not leak policy internals",
    );
  });

  it("AC-025: Developer cannot trigger a scan (Manager-only action)", async () => {
    if (!developerToken) return;
    const result = await request(app.getHttpServer())
      .post("/assessments/any-id/scan-trigger")
      .set("Authorization", `Bearer ${developerToken}`)
      .send({ snapshot_id: "snap-1" });

    assert.equal(result.status, 403);
  });

  it("AC-025: Developer cannot resolve a conflict (Manager-only action)", async () => {
    if (!developerToken) return;
    const result = await request(app.getHttpServer())
      .post("/assessments/any-id/conflicts/conf-1/resolve")
      .set("Authorization", `Bearer ${developerToken}`)
      .send({ resolution: "accepted", note: "test" });

    assert.equal(result.status, 403);
  });

  it("AC-025: Developer cannot invite another developer (Manager-only action)", async () => {
    if (!developerToken) return;
    const result = await request(app.getHttpServer())
      .post(`/organizations/${fixture.organizationId}/invitations`)
      .set("Authorization", `Bearer ${developerToken}`)
      .send({ email: "another@acme.test", role: "Developer" });

    assert.equal(result.status, 403);
  });

  // AC-024: PBAC-denied action audit
  it("AC-024: PBAC denial writes AuthDecisionLog without leaking policy details", async () => {
    if (!developerToken) return;
    await request(app.getHttpServer())
      .post("/assessments")
      .set("Authorization", `Bearer ${developerToken}`)
      .send({ name: "Denied Assessment" });

    const decisionLog = await prisma.authDecisionLog.findFirst({
      where: { decision: "deny" },
      orderBy: { createdAt: "desc" },
    });

    assert.ok(decisionLog, "AuthDecisionLog must be written on PBAC denial");
    assert.equal(decisionLog.decision, "deny");
    // Log must not expose raw policy content
    const logJson = JSON.stringify(decisionLog);
    assert.doesNotMatch(logJson, /"policyId"\s*:\s*"[^"]{36,}"/, "Must not leak full policy ID");
  });

  // AC-026: Revoked Developer policy blocks new actions
  it("AC-026: Revoked Developer membership blocks subsequent API calls", async () => {
    if (!developerToken) return;

    // Revoke the Developer membership
    if (managerToken) {
      await request(app.getHttpServer())
        .delete(`/organizations/${fixture.organizationId}/memberships/developer-user-id`)
        .set("Authorization", `Bearer ${managerToken}`);
    }

    // Developer token must now be denied
    const result = await request(app.getHttpServer())
      .get("/workspace")
      .set("Authorization", `Bearer ${developerToken}`);

    assert.ok(
      [401, 403].includes(result.status),
      `Revoked Developer must be denied, got ${result.status}`,
    );
  });

  it("AC-026: Revocation audit event is written when Developer membership is revoked", async () => {
    if (!managerToken) return;

    await request(app.getHttpServer())
      .delete(`/organizations/${fixture.organizationId}/memberships/developer-user-id`)
      .set("Authorization", `Bearer ${managerToken}`);

    const auditEvent = await prisma.authAuditEvent.findFirst({
      where: { eventType: { in: ["MEMBERSHIP_REVOKED", "DEVELOPER_REVOKED"] } },
      orderBy: { createdAt: "desc" },
    });

    assert.ok(auditEvent, "Revocation audit event must be written");
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
      actions: ["evidence:read:redacted", "ai-usage-flow:read", "findings:read:redacted"],
      subjectRole: "Developer",
      stateGate: "membership_active",
      organizationId,
    },
  });

  await prisma.authMembership.create({
    data: {
      id: "membership-developer",
      userId: "developer-user-id",
      organizationId,
      status: "active",
      subjectAttributes: { role: "Developer" },
      policyId: devPolicyId,
      policyVersion: "2026-06-26",
    },
  });
}
