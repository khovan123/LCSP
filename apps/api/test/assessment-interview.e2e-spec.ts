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
const WORKER_KEY = "test-only-worker-api-key-at-least-32-chars";

function jsonRecord(value: unknown): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

describe("Assessment Interview Runtime (e2e) [LCSP-278]", () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let token: string;

  beforeAll(async () => {
    process.env.DATABASE_URL = TEST_DATABASE_URL;
    process.env.WORKER_API_KEY = WORKER_KEY;
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
    assert.equal(shortcut.status, 409, JSON.stringify(shortcut.body));

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

    const resumePayload = jsonRecord(resumeCommand.payload);
    const privateRevision = await httpRequest(app)
      .get("/internal/assessment-interviews/assessment-1/private-context/1")
      .query({
        source_version:
          typeof resumePayload.sourceVersion === "string"
            ? resumePayload.sourceVersion
            : undefined,
        pge_version:
          typeof resumePayload.pgeVersion === "string"
            ? resumePayload.pgeVersion
            : undefined,
      })
      .set("x-worker-api-key", WORKER_KEY);
    assert.equal(
      privateRevision.status,
      200,
      JSON.stringify(privateRevision.body),
    );
    const privateState = successBody<{
      status: string;
      privateRevision: { answer: { freeText: string }; authority: string };
    }>(privateRevision);
    assert.equal(privateState.status, "CURRENT");
    assert.equal(privateState.privateRevision.answer.freeText, RAW_ANSWER);
    assert.equal(
      privateState.privateRevision.authority,
      ASSESSMENT_CONTEXT_AUTHORITY_STATUSES.customerStated,
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

  it("rejects stale duplicate submissions for the same active question revision", async () => {
    await seedWaitingQuestion(prisma);
    const first = await httpRequest(app)
      .post("/assessments/assessment-1/interview/answers")
      .set("Authorization", `Bearer ${token}`)
      .send({ questionId: QUESTION_ID, freeText: RAW_ANSWER });
    const stale = await httpRequest(app)
      .post("/assessments/assessment-1/interview/answers")
      .set("Authorization", `Bearer ${token}`)
      .send({
        questionId: QUESTION_ID,
        freeText: "Contradictory second answer.",
      });

    assert.equal(first.status, 201, JSON.stringify(first.body));
    assert.equal(stale.status, 409, JSON.stringify(stale.body));
    const thread = await prisma.assessmentInterviewThread.findUniqueOrThrow({
      where: { assessmentId: "assessment-1" },
    });
    assert.equal(thread.contextRevision, 1);
    assert.equal(
      Array.isArray(thread.privateContextJson)
        ? thread.privateContextJson.length
        : 0,
      1,
    );
  });

  it("uses internal guarded decision write-back and blocks false ready", async () => {
    await seedWaitingQuestion(prisma);
    await httpRequest(app)
      .post("/assessments/assessment-1/interview/answers")
      .set("Authorization", `Bearer ${token}`)
      .send({ questionId: QUESTION_ID, freeText: RAW_ANSWER });

    const falseReady = await httpRequest(app)
      .post("/internal/assessment-interviews/assessment-1/agent-decisions")
      .set("x-worker-api-key", WORKER_KEY)
      .send({
        expectedContextRevision: 1,
        outcome: ASSESSMENT_INTERVIEW_OUTCOMES.contextReady,
        contextAuthority: ASSESSMENT_CONTEXT_AUTHORITY_STATUSES.customerStated,
      });
    assert.equal(falseReady.status, 409, JSON.stringify(falseReady.body));

    const ready = await httpRequest(app)
      .post("/internal/assessment-interviews/assessment-1/agent-decisions")
      .set("x-worker-api-key", WORKER_KEY)
      .send({
        expectedContextRevision: 1,
        outcome: ASSESSMENT_INTERVIEW_OUTCOMES.contextReady,
        contextAuthority:
          ASSESSMENT_CONTEXT_AUTHORITY_STATUSES.customerConfirmed,
        confirmedContext: { decision_authority: "human approval required" },
      });
    assert.equal(ready.status, 201, JSON.stringify(ready.body));
    assert.equal(
      successBody<{ outcome: string }>(ready).outcome,
      ASSESSMENT_INTERVIEW_OUTCOMES.contextReady,
    );

    const duplicate = await httpRequest(app)
      .post("/internal/assessment-interviews/assessment-1/agent-decisions")
      .set("x-worker-api-key", WORKER_KEY)
      .send({
        expectedContextRevision: 1,
        outcome: ASSESSMENT_INTERVIEW_OUTCOMES.contextReady,
        contextAuthority:
          ASSESSMENT_CONTEXT_AUTHORITY_STATUSES.customerConfirmed,
      });
    assert.equal(duplicate.status, 409, JSON.stringify(duplicate.body));
  });

  it("persists an Interview Agent-authored initial question through the worker entry", async () => {
    const seeded = await httpRequest(app)
      .post("/internal/assessment-interviews/assessment-1/initial-question")
      .set("x-worker-api-key", WORKER_KEY)
      .send({
        outcome: ASSESSMENT_INTERVIEW_OUTCOMES.waitingForCustomer,
        activeQuestion: {
          id: QUESTION_ID,
          intent: ASSESSMENT_INTERVIEW_QUESTION_INTENTS.ask,
          control: ASSESSMENT_INTERVIEW_CONTROLS.boolean,
          prompt: "Agent-authored runtime question",
        },
      });
    assert.equal(seeded.status, 201, JSON.stringify(seeded.body));

    const publicState = await httpRequest(app)
      .get("/assessments/assessment-1/interview")
      .set("Authorization", `Bearer ${token}`);
    assert.equal(publicState.status, 200, JSON.stringify(publicState.body));
    const state = successBody<{
      outcome: string;
      activeQuestion: { id: string; control: string; prompt: string };
    }>(publicState);
    assert.equal(
      state.outcome,
      ASSESSMENT_INTERVIEW_OUTCOMES.waitingForCustomer,
    );
    assert.equal(state.activeQuestion.id, QUESTION_ID);
    assert.equal(
      state.activeQuestion.control,
      ASSESSMENT_INTERVIEW_CONTROLS.boolean,
    );
    assert.equal(
      state.activeQuestion.prompt,
      "Agent-authored runtime question",
    );
  });

  it("detects stale source and PGE versions before worker resume", async () => {
    await seedWaitingQuestion(prisma);
    await httpRequest(app)
      .post("/assessments/assessment-1/interview/answers")
      .set("Authorization", `Bearer ${token}`)
      .send({ questionId: QUESTION_ID, freeText: RAW_ANSWER });

    const stale = await httpRequest(app)
      .get("/internal/assessment-interviews/assessment-1/private-context/1")
      .query({ source_version: "snapshot-old", pge_version: "ter-old" })
      .set("x-worker-api-key", WORKER_KEY);
    assert.equal(stale.status, 200, JSON.stringify(stale.body));
    assert.equal(
      successBody<{ status: string }>(stale).status,
      "STALE_PROVENANCE",
    );
  });

  it("blocks targeted false resolved decisions that do not satisfy criteria", async () => {
    await seedWaitingQuestion(prisma);
    await httpRequest(app)
      .post("/assessments/assessment-1/interview/answers")
      .set("Authorization", `Bearer ${token}`)
      .send({ questionId: QUESTION_ID, freeText: RAW_ANSWER });

    const unresolved = await httpRequest(app)
      .post("/internal/assessment-interviews/assessment-1/agent-decisions")
      .set("x-worker-api-key", WORKER_KEY)
      .send({
        expectedContextRevision: 1,
        mode: "TARGETED_INTERVIEW",
        outcome: ASSESSMENT_INTERVIEW_OUTCOMES.contextResolved,
        contextAuthority:
          ASSESSMENT_CONTEXT_AUTHORITY_STATUSES.customerConfirmed,
        confirmedContext: { unrelated: "yes" },
        resolutionCriteria: ["decision_authority"],
        originatingInvestigationReference: "investigation:one",
        continuation: {
          originatingInvestigationReference: "investigation:one",
          consumed: false,
          investigatorExecutionId: "investigator-run-1",
          affectedRuleIds: ["ENG-1"],
          artifactVersions: { technicalEvidenceReportId: "ter-1" },
        },
      });
    assert.equal(unresolved.status, 409, JSON.stringify(unresolved.body));
  });

  it("re-enters Interview when Customer chooses Provide More Context", async () => {
    await prisma.outboxMessage.deleteMany({
      where: { aggregateId: "assessment-1" },
    });
    await seedWaitingQuestion(prisma);
    const blocked = await httpRequest(app)
      .post("/assessments/assessment-1/interview/blocked-actions")
      .set("Authorization", `Bearer ${token}`)
      .send({
        action: ASSESSMENT_INTERVIEW_BLOCKED_ACTIONS.provideMoreContext,
      });
    assert.equal(blocked.status, 201, JSON.stringify(blocked.body));
    assert.equal(
      successBody<{ orchestrationRequested: boolean }>(blocked)
        .orchestrationRequested,
      true,
    );
    const resumeCommand = await prisma.outboxMessage.findFirstOrThrow({
      where: {
        aggregateId: "assessment-1",
        eventType: ASSESSMENT_EVENT_TYPES.interviewAgentResumeRequestedOutbox,
      },
    });
    assert.match(
      JSON.stringify(resumeCommand.payload),
      /PROVIDE_MORE_CONTEXT/u,
    );
  });
});

async function seedWaitingQuestion(prisma: PrismaClient): Promise<void> {
  await prisma.assessmentInterviewThread.upsert({
    where: { assessmentId: "assessment-1" },
    update: {
      contextRevision: 0,
      activeQuestionId: QUESTION_ID,
      processedRevision: 0,
      privateContextJson: [],
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
      contextRevision: 0,
      activeQuestionId: QUESTION_ID,
      processedRevision: 0,
      privateContextJson: [],
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
