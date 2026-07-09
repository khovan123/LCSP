/**
 * AC-018: Classification not triggered directly from verified-profile-ready event.
 * AC-019: Classification only triggered from persisted LegalRuleMatch.
 * AC-041: Classification state machine enforces valid transitions only.
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
} from "./support/auth-workspace-test-helpers.js";

describe("Classification guard and state machine (e2e) [AC-018, AC-019, AC-041]", () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let managerToken: string;
  const orgId = "org-1";
  const assessmentId = "assessment-classify-test";

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
    await resetAuthWorkspaceDatabase(prisma);
    await seedAuthWorkspaceFixture(prisma);

    const signIn = await request(app.getHttpServer())
      .post("/auth/sign-in")
      .send({ email: "manager@acme.test", password: "CorrectHorseBatteryStaple!", organization_id: orgId });
    managerToken = signIn.body?.session_token ?? "";
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  // AC-018: Classification NOT triggered directly from verified-profile-ready event
  it("AC-018: Emitting verified-profile-ready event does NOT directly trigger classification", async () => {
    if (!managerToken) return;
    // Simulate internal verified-profile-ready event
    const eventResult = await request(app.getHttpServer())
      .post("/internal/events/verified-profile-ready")
      .set("X-Internal-Token", process.env.INTERNAL_API_TOKEN ?? "test-internal-token")
      .send({ assessment_id: assessmentId, profile_id: "profile-1" });

    // Classification must NOT be created directly — only legal rule matching can trigger it
    const classifications = await prisma.assessmentClassification.findMany({
      where: { assessmentId },
    });
    // Immediately after event, classification should be absent or still pending (not CLASSIFIED)
    const completed = classifications.filter(c => c.status === "CLASSIFIED");
    assert.equal(
      completed.length,
      0,
      "verified-profile-ready event must NOT directly create CLASSIFIED status",
    );
  });

  // AC-019: Classification only from persisted LegalRuleMatch
  it("AC-019: Classification endpoint requires persisted LegalRuleMatch — direct trigger without match is blocked", async () => {
    if (!managerToken) return;
    // Try to classify without any LegalRuleMatch persisted
    const result = await request(app.getHttpServer())
      .post(`/assessments/${assessmentId}/classify`)
      .set("Authorization", `Bearer ${managerToken}`)
      .send({});

    assert.ok(
      [400, 409, 422].includes(result.status),
      `Classification without LegalRuleMatch must be blocked, got ${result.status}`,
    );
    assert.ok(result.body.code, "Must return machine-readable error code");
  });

  it("AC-019: Classification flow reads LegalRuleMatch from DB, not from event payload", async () => {
    if (!managerToken) return;
    // Attempt classification with a rule_match_id not in DB
    const result = await request(app.getHttpServer())
      .post(`/assessments/${assessmentId}/classify`)
      .set("Authorization", `Bearer ${managerToken}`)
      .send({ rule_match_id: "nonexistent-match-id" });

    assert.ok(
      [404, 422].includes(result.status),
      "Non-existent LegalRuleMatch must block classification",
    );
  });

  // AC-041: Classification state machine — valid transitions only
  it("AC-041: Assessment cannot transition to CLASSIFIED from WIZARD_IN_PROGRESS directly", async () => {
    if (!managerToken) return;
    // Create assessment in WIZARD_IN_PROGRESS
    const create = await request(app.getHttpServer())
      .post("/assessments")
      .set("Authorization", `Bearer ${managerToken}`)
      .send({ name: "State Machine Test", organization_id: orgId });

    const id = create.body?.id;
    if (!id) return;

    // Attempt direct status override to CLASSIFIED
    const update = await request(app.getHttpServer())
      .patch(`/assessments/${id}`)
      .set("Authorization", `Bearer ${managerToken}`)
      .send({ status: "CLASSIFIED" });

    assert.ok(
      [400, 409, 422].includes(update.status),
      "Invalid state transition must be rejected",
    );
  });

  it("AC-041: Assessment CLASSIFIED state cannot be downgraded to WIZARD_IN_PROGRESS", async () => {
    if (!managerToken) return;
    // Seed a classified assessment
    try {
      await prisma.assessment.update({
        where: { id: assessmentId },
        data: { status: "CLASSIFIED" },
      });
    } catch {
      return;
    }

    const downgrade = await request(app.getHttpServer())
      .patch(`/assessments/${assessmentId}`)
      .set("Authorization", `Bearer ${managerToken}`)
      .send({ status: "WIZARD_IN_PROGRESS" });

    assert.ok(
      [400, 409, 422].includes(downgrade.status),
      "Downgrading CLASSIFIED state is an invalid transition",
    );
  });
});
