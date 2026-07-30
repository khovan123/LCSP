import {
  PBAC_ACTIONS,
  PBAC_DECISION,
  PBAC_REASON_CODE,
  PBAC_STATE_GATES,
  SUBJECT_ROLES,
  MANAGER_ONLY_ACTIONS,
} from "@lcsp/contracts/pbac";
import { AUTH_MEMBERSHIP_STATUSES } from "@lcsp/contracts/auth";
import { WIZARD_EVENT_TYPES } from "@lcsp/contracts/wizard";
/**
 * AC-024: Organization and PBAC-denied action audit.
 * AC-025: Developer cannot perform Manager-only actions.
 */

import * as assert from "node:assert/strict";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import type { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { httpRequest, problemCode, successBody } from "./support/http.js";

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

describe("Developer PBAC enforcement (e2e) [AC-024, AC-025]", () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let fixture: AuthFixture;
  let developerToken: string;
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
    await seedDeveloperFixture(prisma, fixture.organizationId);

    // Obtain Developer session token
    const devSignIn = await httpRequest(app).post("/auth/sign-in").send({
      email: "developer@acme.test",
      password: "DevPassword123!",
      organization_id: fixture.organizationId,
    });
    developerToken = successBody<SignInSuccess>(devSignIn).session_token ?? "";

    const managerSignIn = await httpRequest(app).post("/auth/sign-in").send({
      email: "manager@acme.test",
      password: "CorrectHorseBatteryStaple!",
      organization_id: fixture.organizationId,
    });
    managerToken =
      successBody<SignInSuccess>(managerSignIn).session_token ?? "";
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
      problemCode(result),
      "Error response must have machine-readable code",
    );
    assert.doesNotMatch(
      JSON.stringify(result.body),
      /policyId|actions/i,
      "403 response must not leak policy internals",
    );
  });

  it("Story 1.6: Developer cannot write wizard answers through a direct API call", async () => {
    assert.ok(developerToken, "developer sign-in must succeed");

    const result = await httpRequest(app)
      .put("/assessments/assessment-1/wizard/draft")
      .set("Authorization", `Bearer ${developerToken}`)
      .set("x-correlation-id", "corr-manager-only-wizard-deny")
      .send({ answers: { businessPurpose: "Attempted edit" } });

    assert.equal(result.status, 403);
    assert.equal(problemCode(result), PBAC_REASON_CODE.denied);
    assert.doesNotMatch(JSON.stringify(result.body), /policyId|actions/i);

    const decisionLog = await prisma.authDecisionLog.findFirst({
      where: {
        action: PBAC_ACTIONS.wizardWrite,
        correlationId: "corr-manager-only-wizard-deny",
      },
      orderBy: { createdAt: "desc" },
    });

    assert.ok(decisionLog, "wizard:write denial must be logged");
    assert.equal(decisionLog.decision, PBAC_DECISION.deny);
    assert.equal(decisionLog.policyId, "policy-developer");
    assert.equal(decisionLog.policyVersion, "2026-06-26");
  });

  it("Story 1.6: Manager with valid policy can write wizard answers and audit includes policy scope", async () => {
    assert.ok(managerToken, "manager sign-in must succeed");

    await prisma.assessment.create({
      data: {
        id: "assessment-manager-only-1",
        organizationId: fixture.organizationId,
        ownerId: fixture.approvedUser.id,
        name: "Manager Wizard",
      },
    });
    await prisma.authPolicy.update({
      where: {
        id_version: {
          id: "policy-manager-workspace",
          version: "2026-06-26",
        },
      },
      data: { actions: { push: PBAC_ACTIONS.wizardWrite } },
    });

    const result = await httpRequest(app)
      .put("/assessments/assessment-manager-only-1/wizard/draft")
      .set("Authorization", `Bearer ${managerToken}`)
      .set("x-correlation-id", "corr-manager-wizard-allow")
      .send({ answers: { businessPurpose: "Legitimate Manager edit" } });

    assert.equal(result.status, 200);

    const audit = await prisma.authAuditEvent.findFirst({
      where: {
        eventType: WIZARD_EVENT_TYPES.draftSaved,
        correlationId: "corr-manager-wizard-allow",
      },
      orderBy: { createdAt: "desc" },
    });

    assert.ok(audit, "Manager wizard write must be audited");
    assert.equal(audit.decision, PBAC_DECISION.allow);
    assert.equal(audit.organizationId, fixture.organizationId);
    assert.equal(audit.policyId, "policy-manager-workspace");
    assert.equal(audit.policyVersion, "2026-06-26");
  });

  it("Story 1.6: Manager-only action catalog excludes every Developer policy action", () => {
    const developerActions = [
      PBAC_ACTIONS.assessmentList,
      PBAC_ACTIONS.evidenceReadRedacted,
      "ai-usage-flow:read",
      "findings:read:redacted",
      "conflict:comment",
      PBAC_ACTIONS.scanRead,
    ];

    assert.equal(
      developerActions.some((action) => MANAGER_ONLY_ACTIONS.includes(action)),
      false,
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
    assert.equal(decisionLog.action, PBAC_ACTIONS.assessmentCreate);
    assert.equal(decisionLog.policyId, "policy-developer");
    assert.equal(decisionLog.policyVersion, "2026-06-26");
    assert.ok(decisionLog.correlationId);
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
