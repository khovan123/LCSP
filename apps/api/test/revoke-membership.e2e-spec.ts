import * as assert from "node:assert/strict";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import type { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { httpRequest } from "./support/http.js";

import { AppModule } from "../src/app.module.js";
import type { SignInSuccess } from "../src/modules/auth-workspace/application/contracts/auth-workspace/sign-in.contract.js";
import {
  fingerprintToken,
  hashSecret,
} from "../src/modules/auth-workspace/infrastructure/security/security.utils.js";
import {
  TEST_DATABASE_URL,
  pushPrismaSchema,
  resetAuthWorkspaceDatabase,
  seedAuthWorkspaceFixture,
  type AuthFixture,
} from "./support/auth-workspace-test-helpers.js";

type RevokeMembershipBody = {
  revoked: boolean;
  affected_sessions: number;
  correlation_id: string;
};

type ErrorBody = {
  code?: string;
  error_code?: string;
};

describe("Revoke Developer Membership endpoint (e2e) [MW-auth-012]", () => {
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
    await seedDeveloper(prisma, fixture.organizationId);

    const managerSignIn = await httpRequest(app).post("/auth/sign-in").send({
      email: "manager@acme.test",
      password: "CorrectHorseBatteryStaple!",
      organization_id: fixture.organizationId,
    });
    managerToken = (managerSignIn.body as SignInSuccess).session_token;

    const developerSignIn = await httpRequest(app).post("/auth/sign-in").send({
      email: "developer-revoke@acme.test",
      password: "DevPassword123!",
      organization_id: fixture.organizationId,
    });
    developerToken = (developerSignIn.body as SignInSuccess).session_token;
    await seedSecondDeveloperSession(prisma, fixture.organizationId);
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  it("T01/T07 revokes Developer membership and invalidates active sessions", async () => {
    await grantManagerRevokeAction(prisma);

    const result = await httpRequest(app)
      .delete(`/organizations/${fixture.organizationId}/memberships/user-dev`)
      .set("Authorization", `Bearer ${managerToken}`)
      .set("x-correlation-id", "corr-revoke-1");

    assert.equal(result.status, 200);
    const body = result.body as RevokeMembershipBody;
    assert.equal(body.revoked, true);
    assert.equal(body.affected_sessions, 2);
    assert.equal(body.correlation_id, "corr-revoke-1");

    const membership = await prisma.authMembership.findUniqueOrThrow({
      where: {
        userId_organizationId: {
          userId: "user-dev",
          organizationId: fixture.organizationId,
        },
      },
    });
    assert.equal(membership.status, "revoked");
    assert.ok(membership.revokedAt);

    const activeSessions = await prisma.authSession.count({
      where: {
        userId: "user-dev",
        organizationId: fixture.organizationId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
    assert.equal(activeSessions, 0);

    const decision = await prisma.authDecisionLog.findFirstOrThrow({
      where: {
        correlationId: "corr-revoke-1",
        action: "membership:revoke",
        decision: "allow",
      },
    });
    assert.equal(decision.resourceType, "HttpRoute");
  });

  it("T02 returns PBAC_DENIED and writes AuthDecisionLog when Manager lacks revoke action", async () => {
    const result = await httpRequest(app)
      .delete(`/organizations/${fixture.organizationId}/memberships/user-dev`)
      .set("Authorization", `Bearer ${managerToken}`);

    assert.equal(result.status, 403);
    assert.equal((result.body as ErrorBody).error_code, "PBAC_DENIED");

    const decision = await prisma.authDecisionLog.findFirstOrThrow({
      where: { action: "membership:revoke", decision: "deny" },
      orderBy: { createdAt: "desc" },
    });
    assert.equal(decision.resourceType, "HttpRoute");
  });

  it("T03 returns MEMBERSHIP_NOT_FOUND when target has no active Developer membership", async () => {
    await grantManagerRevokeAction(prisma);

    const result = await httpRequest(app)
      .delete(
        `/organizations/${fixture.organizationId}/memberships/user-missing`,
      )
      .set("Authorization", `Bearer ${managerToken}`);

    assert.equal(result.status, 404);
    assert.equal((result.body as ErrorBody).error_code, "MEMBERSHIP_NOT_FOUND");
  });

  it("T04 rejects Manager self-revoke", async () => {
    await grantManagerRevokeAction(prisma);

    const result = await httpRequest(app)
      .delete(
        `/organizations/${fixture.organizationId}/memberships/${fixture.approvedUser.id}`,
      )
      .set("Authorization", `Bearer ${managerToken}`);

    assert.equal(result.status, 400);
    assert.equal((result.body as ErrorBody).error_code, "CANNOT_SELF_REVOKE");
  });

  it("T05 rejects organization scope mismatch", async () => {
    await grantManagerRevokeAction(prisma);

    const result = await httpRequest(app)
      .delete("/organizations/org-other/memberships/user-dev")
      .set("Authorization", `Bearer ${managerToken}`);

    assert.equal(result.status, 400);
    assert.equal((result.body as ErrorBody).error_code, "ORG_SCOPE_MISMATCH");
  });

  it("T06 Developer active session is invalid immediately after revoke", async () => {
    await grantManagerRevokeAction(prisma);

    await httpRequest(app)
      .delete(`/organizations/${fixture.organizationId}/memberships/user-dev`)
      .set("Authorization", `Bearer ${managerToken}`);

    const result = await httpRequest(app)
      .get("/workspace")
      .query({ organization_id: fixture.organizationId })
      .set("Authorization", `Bearer ${developerToken}`);

    assert.equal(result.status, 401);
    assert.equal((result.body as ErrorBody).error_code, "SESSION_INVALID");
  });

  it("T08 writes clean audit payload without session token material", async () => {
    await grantManagerRevokeAction(prisma);

    await httpRequest(app)
      .delete(`/organizations/${fixture.organizationId}/memberships/user-dev`)
      .set("Authorization", `Bearer ${managerToken}`);

    const audit = await prisma.authAuditEvent.findFirstOrThrow({
      where: { eventType: "AUTH_DEVELOPER_REVOKED" },
    });
    const serialized = JSON.stringify(audit);
    assert.doesNotMatch(serialized, new RegExp(developerToken));
    assert.doesNotMatch(serialized, /developer-second-token/);
    assert.equal(audit.organizationId, fixture.organizationId);
  });

  it("T09 leaves Manager session and workspace access unaffected", async () => {
    await grantManagerRevokeAction(prisma);

    await httpRequest(app)
      .delete(`/organizations/${fixture.organizationId}/memberships/user-dev`)
      .set("Authorization", `Bearer ${managerToken}`);

    const workspace = await httpRequest(app)
      .get("/workspace")
      .query({ organization_id: fixture.organizationId })
      .set("Authorization", `Bearer ${managerToken}`);

    assert.equal(workspace.status, 200);
    assert.equal((workspace.body as { ok?: boolean }).ok, true);
  });

  it("T10 returns MEMBERSHIP_NOT_FOUND for already revoked membership", async () => {
    await grantManagerRevokeAction(prisma);
    await prisma.authMembership.update({
      where: {
        userId_organizationId: {
          userId: "user-dev",
          organizationId: fixture.organizationId,
        },
      },
      data: { status: "revoked", revokedAt: new Date() },
    });

    const result = await httpRequest(app)
      .delete(`/organizations/${fixture.organizationId}/memberships/user-dev`)
      .set("Authorization", `Bearer ${managerToken}`);

    assert.equal(result.status, 404);
    assert.equal((result.body as ErrorBody).error_code, "MEMBERSHIP_NOT_FOUND");
  });
});

async function grantManagerRevokeAction(prisma: PrismaClient): Promise<void> {
  await prisma.authPolicy.update({
    where: {
      id_version: {
        id: "policy-manager-workspace",
        version: "2026-06-26",
      },
    },
    data: { actions: { push: "membership:revoke" } },
  });
}

async function seedDeveloper(
  prisma: PrismaClient,
  organizationId: string,
): Promise<void> {
  await prisma.authUser.create({
    data: {
      id: "user-dev",
      email: "developer-revoke@acme.test",
      passwordHash: hashSecret("DevPassword123!"),
      emailVerified: true,
      failedLoginCount: 0,
    },
  });
  await prisma.authPolicy.create({
    data: {
      id: "policy-developer-revoke",
      version: "2026-07-13",
      actions: ["workspace:read"],
      subjectRole: "Developer",
      stateGate: "membership_active",
      organizationId,
    },
  });
  await prisma.authMembership.create({
    data: {
      id: "membership-dev",
      userId: "user-dev",
      organizationId,
      status: "active",
      subjectAttributes: { role: "Developer", scope: "assessment-1" },
      policyId: "policy-developer-revoke",
      policyVersion: "2026-07-13",
    },
  });
}

async function seedSecondDeveloperSession(
  prisma: PrismaClient,
  organizationId: string,
): Promise<void> {
  await prisma.authSession.create({
    data: {
      id: "session-dev-second",
      userId: "user-dev",
      organizationId,
      tokenHash: hashSecret("developer-second-token"),
      tokenFingerprint: fingerprintToken("developer-second-token"),
      expiresAt: new Date(Date.now() + 60 * 60_000),
      revokedAt: null,
    },
  });
}
