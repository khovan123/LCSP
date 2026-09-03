import * as assert from "node:assert/strict";

import {
  ASSESSMENT_INTERVIEW_BLOCKED_ACTIONS,
  ASSESSMENT_INTERVIEW_OUTCOMES,
} from "@lcsp/contracts/evidence";
import type { INestApplication } from "@nestjs/common";
import { Test, type TestingModule } from "@nestjs/testing";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

import { AppModule } from "../src/app.module.js";
import {
  pushPrismaSchema,
  resetAuthWorkspaceDatabase,
  seedAuthWorkspaceFixture,
  TEST_DATABASE_URL,
} from "./support/auth-workspace-test-helpers.js";
import { httpRequest, successBody } from "./support/http.js";

describe("Assessment Interview Runtime (e2e) [LCSP-278]", () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let token: string;

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
    const signIn = await httpRequest(app).post("/auth/sign-in").send({
      email: "manager@acme.test",
      password: "CorrectHorseBatteryStaple!",
      organization_id: "org-1",
    });
    token = successBody<{ session_token: string }>(signIn).session_token;
    await prisma.assessment.create({
      data: { id: "assessment-1", ownerId: "user-1", name: "Interview E2E" },
    });
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  it("persists Customer answers with audit provenance and returns canonical state", async () => {
    const initial = await httpRequest(app)
      .get("/assessments/assessment-1/interview")
      .set("Authorization", `Bearer ${token}`);
    assert.equal(initial.status, 200, JSON.stringify(initial.body));
    assert.equal(
      successBody<{ outcome: string }>(initial).outcome,
      ASSESSMENT_INTERVIEW_OUTCOMES.waitingForCustomer,
    );

    const answered = await httpRequest(app)
      .post("/assessments/assessment-1/interview/answers")
      .set("Authorization", `Bearer ${token}`)
      .send({
        questionId: "agent-question-1",
        freeText: "Payment assistant recommends review actions.",
      });
    assert.equal(answered.status, 201, JSON.stringify(answered.body));
    const state = successBody<{
      outcome: string;
      contextRevision: number;
      orchestrationRequested: boolean;
      audit: { authenticatedActorId: string; relatedQuestionId: string };
    }>(answered);
    assert.equal(state.outcome, ASSESSMENT_INTERVIEW_OUTCOMES.contextReady);
    assert.equal(state.contextRevision, 1);
    assert.equal(state.orchestrationRequested, true);
    assert.equal(state.audit.authenticatedActorId, "user-1");
    assert.equal(state.audit.relatedQuestionId, "agent-question-1");

    const event = await prisma.assessmentRuntimeEvent.findFirstOrThrow({
      where: { assessmentId: "assessment-1", toolName: "assessment_interview" },
    });
    assert.equal(event.stage, "INTERVIEW");
    assert.equal(event.runStatus, "RUNNING");
  });

  it("persists unresolved actions without writing browser-only draft state", async () => {
    const blocked = await httpRequest(app)
      .post("/assessments/assessment-1/interview/blocked-actions")
      .set("Authorization", `Bearer ${token}`)
      .send({
        action: ASSESSMENT_INTERVIEW_BLOCKED_ACTIONS.saveAndExit,
        draft: "Need internal legal owner confirmation.",
      });
    assert.equal(blocked.status, 201, JSON.stringify(blocked.body));
    const state = successBody<{ outcome: string; blockedActions: string[] }>(
      blocked,
    );
    assert.equal(
      state.outcome,
      ASSESSMENT_INTERVIEW_OUTCOMES.blockedOrUnresolved,
    );
    assert.deepEqual(state.blockedActions, [
      ASSESSMENT_INTERVIEW_BLOCKED_ACTIONS.provideMoreContext,
      ASSESSMENT_INTERVIEW_BLOCKED_ACTIONS.checkInternally,
      ASSESSMENT_INTERVIEW_BLOCKED_ACTIONS.saveAndExit,
    ]);

    const resumed = await httpRequest(app)
      .get("/assessments/assessment-1/interview")
      .set("Authorization", `Bearer ${token}`);
    assert.equal(resumed.status, 200, JSON.stringify(resumed.body));
    assert.equal(
      successBody<{ outcome: string }>(resumed).outcome,
      ASSESSMENT_INTERVIEW_OUTCOMES.blockedOrUnresolved,
    );
  });
});
