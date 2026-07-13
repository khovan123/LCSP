import * as assert from "node:assert/strict";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import type { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { httpRequest } from "./support/http.js";

import { AppModule } from "../src/app.module.js";
import { DEVELOPER_ALLOWED_ACTIONS } from "@lcsp/contracts/pbac";
import type { SignInSuccess } from "../src/modules/auth-workspace/application/contracts/auth-workspace/sign-in.contract.js";
import { hashSecret } from "../src/modules/auth-workspace/infrastructure/security/security.utils.js";
import {
  TEST_DATABASE_URL,
  pushPrismaSchema,
  resetAuthWorkspaceDatabase,
  seedAuthWorkspaceFixture,
  type AuthFixture,
} from "./support/auth-workspace-test-helpers.js";

type AcceptInvitationBody = {
  user_id: string;
  session_token: string;
  expires_at: string;
  organization_id: string;
  allowed_actions: string[];
  correlation_id: string;
};

type ErrorBody = {
  code?: string;
  error_code?: string;
  correlation_id?: string;
};

describe("Accept Developer Invitation endpoint (e2e) [MW-auth-011]", () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let fixture: AuthFixture;
  let managerToken: string;

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
    await seedDeveloperPolicy(prisma, fixture.organizationId);
    await seedDeveloperInvitation(prisma, fixture.organizationId);

    const signIn = await httpRequest(app).post("/auth/sign-in").send({
      email: "manager@acme.test",
      password: "CorrectHorseBatteryStaple!",
      organization_id: fixture.organizationId,
    });
    managerToken = (signIn.body as SignInSuccess).session_token;
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  it("T01/T08/T10 accepts a valid scoped invitation once and creates user, membership, and session", async () => {
    const result = await httpRequest(app)
      .post("/auth/accept-invitation")
      .set("x-correlation-id", "corr-accept-1")
      .send({
        invitation_token: "developer-invite-1",
        display_name: "Dev Collaborator",
        password: "DeveloperPass123!",
      });

    assert.equal(result.status, 201);
    const body = result.body as AcceptInvitationBody;
    assert.equal(body.organization_id, fixture.organizationId);
    assert.equal(body.correlation_id, "corr-accept-1");
    assert.deepEqual(body.allowed_actions, DEVELOPER_ALLOWED_ACTIONS);
    assert.ok(body.user_id);
    assert.ok(body.session_token);
    assert.ok(Date.parse(body.expires_at));

    const invitation = await prisma.authInvitation.findUniqueOrThrow({
      where: { id: "developer-invite-1" },
    });
    assert.equal(invitation.state, "consumed");

    const user = await prisma.authUser.findUniqueOrThrow({
      where: { id: body.user_id },
    });
    assert.equal(user.email, "newdeveloper@acme.test");
    assert.equal(user.displayName, "Dev Collaborator");
    assert.equal(user.emailVerified, true);

    const membership = await prisma.authMembership.findUniqueOrThrow({
      where: {
        userId_organizationId: {
          userId: body.user_id,
          organizationId: fixture.organizationId,
        },
      },
    });
    assert.deepEqual(membership.subjectAttributes, {
      role: "Developer",
      scope: "assessment-1",
      allowed_actions: DEVELOPER_ALLOWED_ACTIONS,
    });
    assert.equal(membership.policyId, "policy-developer");
  });

  it("T02 rejects a missing token with INVITATION_INVALID", async () => {
    const result = await httpRequest(app).post("/auth/accept-invitation").send({
      invitation_token: "missing-invite",
      display_name: "Dev Collaborator",
      password: "DeveloperPass123!",
    });

    assert.equal(result.status, 400);
    assert.equal((result.body as ErrorBody).error_code, "INVITATION_INVALID");
  });

  it("T03 rejects an already consumed invitation", async () => {
    await prisma.authInvitation.update({
      where: { id: "developer-invite-1" },
      data: { state: "consumed" },
    });

    const result = await httpRequest(app).post("/auth/accept-invitation").send({
      invitation_token: "developer-invite-1",
      display_name: "Dev Collaborator",
      password: "DeveloperPass123!",
    });

    assert.equal(result.status, 400);
    assert.equal((result.body as ErrorBody).error_code, "INVITATION_INVALID");
  });

  it("T04 rejects an expired invitation", async () => {
    await prisma.authInvitation.update({
      where: { id: "developer-invite-1" },
      data: { expiresAt: new Date(Date.now() - 60_000) },
    });

    const result = await httpRequest(app).post("/auth/accept-invitation").send({
      invitation_token: "developer-invite-1",
      display_name: "Dev Collaborator",
      password: "DeveloperPass123!",
    });

    assert.equal(result.status, 400);
    assert.equal((result.body as ErrorBody).error_code, "INVITATION_INVALID");
  });

  it("T05 rejects when the invitation email already has an account", async () => {
    await prisma.authUser.create({
      data: {
        id: "existing-developer-user",
        email: "newdeveloper@acme.test",
        passwordHash: hashSecret("ExistingPassword123!"),
        emailVerified: true,
        failedLoginCount: 0,
      },
    });

    const result = await httpRequest(app).post("/auth/accept-invitation").send({
      invitation_token: "developer-invite-1",
      display_name: "Dev Collaborator",
      password: "DeveloperPass123!",
    });

    assert.equal(result.status, 409);
    assert.equal((result.body as ErrorBody).error_code, "EMAIL_ALREADY_EXISTS");
  });

  it("T06 rejects a short password", async () => {
    const result = await httpRequest(app).post("/auth/accept-invitation").send({
      invitation_token: "developer-invite-1",
      display_name: "Dev Collaborator",
      password: "short",
    });

    assert.equal(result.status, 422);
    assert.equal((result.body as ErrorBody).error_code, "PASSWORD_TOO_SHORT");
  });

  it("T09 writes a clean audit event without password or invitation token material", async () => {
    await httpRequest(app).post("/auth/accept-invitation").send({
      invitation_token: "developer-invite-1",
      display_name: "Dev Collaborator",
      password: "DeveloperPass123!",
    });

    const audit = await prisma.authAuditEvent.findFirstOrThrow({
      where: { eventType: "AUTH_DEVELOPER_INVITATION_ACCEPTED" },
    });
    const serialized = JSON.stringify(audit);
    assert.doesNotMatch(serialized, /DeveloperPass123!|developer-invite-1/);
    assert.equal(audit.organizationId, fixture.organizationId);
  });

  it("T11 leaves the Manager golden path available after Developer acceptance", async () => {
    await httpRequest(app).post("/auth/accept-invitation").send({
      invitation_token: "developer-invite-1",
      display_name: "Dev Collaborator",
      password: "DeveloperPass123!",
    });

    const result = await httpRequest(app)
      .post("/assessments")
      .set("Authorization", `Bearer ${managerToken}`)
      .send({ name: "Manager Continues" });

    assert.equal(result.status, 201);
  });
});

async function seedDeveloperPolicy(
  prisma: PrismaClient,
  organizationId: string,
): Promise<void> {
  await prisma.authPolicy.create({
    data: {
      id: "policy-developer",
      version: "2026-06-26",
      actions: DEVELOPER_ALLOWED_ACTIONS,
      subjectRole: "Developer",
      stateGate: "membership_active",
      organizationId,
    },
  });
}

async function seedDeveloperInvitation(
  prisma: PrismaClient,
  organizationId: string,
): Promise<void> {
  await prisma.assessment.upsert({
    where: { id: "assessment-1" },
    create: {
      id: "assessment-1",
      organizationId,
      ownerId: "user-approved",
      name: "Assessment 1",
      description: null,
      status: "WIZARD_IN_PROGRESS",
    },
    update: {
      organizationId,
      ownerId: "user-approved",
      name: "Assessment 1",
      description: null,
      status: "WIZARD_IN_PROGRESS",
    },
  });
  await prisma.authInvitation.create({
    data: {
      id: "developer-invite-1",
      email: "newdeveloper@acme.test",
      organizationId,
      state: "approved",
      emailVerified: false,
      membershipStatus: "active",
      subjectAttributes: {
        role: "Developer",
        scope: "assessment-1",
        allowed_actions: DEVELOPER_ALLOWED_ACTIONS,
      },
      policyId: "policy-developer",
      policyVersion: "2026-06-26",
      expiresAt: new Date(Date.now() + 72 * 60 * 60_000),
    },
  });
}
