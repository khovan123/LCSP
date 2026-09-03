import * as assert from "node:assert/strict";

import { ASSESSMENT_EVENT_TYPES } from "@lcsp/contracts/assessment";
import {
  ASSESSMENT_CONTEXT_AUTHORITY_STATUSES,
  ASSESSMENT_INTERVIEW_BLOCKED_ACTIONS,
  ASSESSMENT_INTERVIEW_CONTROLS,
  ASSESSMENT_INTERVIEW_OUTCOMES,
  ASSESSMENT_INTERVIEW_QUESTION_INTENTS,
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

const QUESTION_ID = "agent-question-1";
const RAW_ANSWER = "Payment assistant recommends review actions.";
const RAW_DRAFT = "Need internal legal owner confirmation.";

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

  it("keeps Customer answers non-authoritative until Interview Agent sufficiency", async () => {
    const shortcut = await httpRequest(app)
      .post("/assessments/assessment-1/interview/answers")
      .set("Authorization", `Bearer ${token}`)
      .send({ questionId: "anything" });
    assert.equal(shortcut.status, 400, JSON.stringify(shortcut.body));

    await seedWaitingQuestion(prisma);
    const answered = await httpRequest(app)
      .post("/assessments/assessment-1/interview/answers")
      .set("Authorization", `Bearer ${token}`)
      .send({ questionId: QUESTION_ID, freeText: RAW_ANSWER });
    assert.equal(answered.status, 201, JSON.stringify(answered.body));
    const state = successBody<{
      outcome: string;
      contextAuthority: string;
      contextRevision: number;
      orchestrationRequested: boolean;
      answerHistory: Array<{ questionId: string; summary: string }>;
      audit: { authenticatedActorId: string; relatedQuestionId: string };
    }>(answered);
    assert.equal(
      state.outcome,
      ASSESSMENT_INTERVIEW_OUTCOMES.waitingForCustomer,
    );
    assert.equal(
      state.contextAuthority,
      ASSESSMENT_CONTEXT_AUTHORITY_STATUSES.customerStated,
    );
    assert.equal(state.contextRevision, 1);
    assert.equal(state.orchestrationRequested, true);
    assert.equal(state.answerHistory[0]?.questionId, QUESTION_ID);
    assert.notEqual(state.answerHistory[0]?.summary, RAW_ANSWER);
    assert.equal(state.audit.authenticatedActorId, "user-1");
    assert.equal(state.audit.relatedQuestionId, QUESTION_ID);

    const event = await prisma.assessmentRuntimeEvent.findFirstOrThrow({
      where: { assessmentId: "assessment-1", toolName: "assessment_interview" },
      orderBy: { sequence: "desc" },
    });
    assert.equal(event.stage, "INTERVIEW");
    assert.equal(event.runStatus, "WAITING");
    assert.doesNotMatch(
      JSON.stringify(event.inputSummaryJson),
      /Payment assistant/u,
    );
    assert.doesNotMatch(
      JSON.stringify(event.outputSummaryJson),
      /Payment assistant/u,
    );

    const resumeCommand = await prisma.outboxMessage.findFirstOrThrow({
      where: {
        aggregateId: "assessment-1",
        eventType: ASSESSMENT_EVENT_TYPES.interviewAgentResumeRequestedOutbox,
      },
    });
    assert.match(JSON.stringify(resumeCommand.payload), /assessment-1/u);
    assert.match(
      JSON.stringify(resumeCommand.payload),
      /INTERVIEW_ANSWER_SUBMITTED/u,
    );
    assert.doesNotMatch(
      JSON.stringify(resumeCommand.payload),
      /Payment assistant/u,
    );
  });

  it("persists Save & Exit draft and answer history in the Interview read model", async () => {
    await seedWaitingQuestion(prisma);
    const answered = await httpRequest(app)
      .post("/assessments/assessment-1/interview/answers")
      .set("Authorization", `Bearer ${token}`)
      .send({ questionId: QUESTION_ID, freeText: RAW_ANSWER });
    assert.equal(answered.status, 201, JSON.stringify(answered.body));

    const blocked = await httpRequest(app)
      .post("/assessments/assessment-1/interview/blocked-actions")
      .set("Authorization", `Bearer ${token}`)
      .send({
        action: ASSESSMENT_INTERVIEW_BLOCKED_ACTIONS.saveAndExit,
        draft: RAW_DRAFT,
      });
    assert.equal(blocked.status, 201, JSON.stringify(blocked.body));
    const state = successBody<{
      outcome: string;
      blockedActions: string[];
      pendingDraft: string;
      answerHistory: unknown[];
    }>(blocked);
    assert.equal(
      state.outcome,
      ASSESSMENT_INTERVIEW_OUTCOMES.blockedOrUnresolved,
    );
    assert.equal(state.pendingDraft, RAW_DRAFT);
    assert.equal(state.answerHistory.length, 1);
    assert.deepEqual(state.blockedActions, [
      ASSESSMENT_INTERVIEW_BLOCKED_ACTIONS.provideMoreContext,
      ASSESSMENT_INTERVIEW_BLOCKED_ACTIONS.checkInternally,
      ASSESSMENT_INTERVIEW_BLOCKED_ACTIONS.saveAndExit,
    ]);

    const resumed = await httpRequest(app)
      .get("/assessments/assessment-1/interview")
      .set("Authorization", `Bearer ${token}`);
    assert.equal(resumed.status, 200, JSON.stringify(resumed.body));
    const resumedState = successBody<{
      outcome: string;
      pendingDraft: string;
      answerHistory: unknown[];
    }>(resumed);
    assert.equal(
      resumedState.outcome,
      ASSESSMENT_INTERVIEW_OUTCOMES.blockedOrUnresolved,
    );
    assert.equal(resumedState.pendingDraft, RAW_DRAFT);
    assert.equal(resumedState.answerHistory.length, 1);

    const runtimeEvent = await prisma.assessmentRuntimeEvent.findFirstOrThrow({
      where: { assessmentId: "assessment-1", waitingReason: "SAVE_AND_EXIT" },
    });
    assert.doesNotMatch(
      JSON.stringify(runtimeEvent.inputSummaryJson),
      /Need internal/u,
    );
    assert.doesNotMatch(
      JSON.stringify(runtimeEvent.outputSummaryJson),
      /Need internal/u,
    );
  });
});

async function seedWaitingQuestion(prisma: PrismaClient): Promise<void> {
  await prisma.assessmentInterviewThread.upsert({
    where: { assessmentId: "assessment-1" },
    update: {
      stateJson: {
        outcome: ASSESSMENT_INTERVIEW_OUTCOMES.waitingForCustomer,
        threadId: "interview:assessment-1",
        contextRevision: 0,
        activeQuestion: {
          id: QUESTION_ID,
          intent: ASSESSMENT_INTERVIEW_QUESTION_INTENTS.ask,
          control: ASSESSMENT_INTERVIEW_CONTROLS.freeText,
          prompt: "Runtime-authored Interview Agent question",
        },
        answerHistory: [],
      },
    },
    create: {
      id: "interview:assessment-1",
      assessmentId: "assessment-1",
      stateJson: {
        outcome: ASSESSMENT_INTERVIEW_OUTCOMES.waitingForCustomer,
        threadId: "interview:assessment-1",
        contextRevision: 0,
        activeQuestion: {
          id: QUESTION_ID,
          intent: ASSESSMENT_INTERVIEW_QUESTION_INTENTS.ask,
          control: ASSESSMENT_INTERVIEW_CONTROLS.freeText,
          prompt: "Runtime-authored Interview Agent question",
        },
        answerHistory: [],
      },
    },
  });
}
