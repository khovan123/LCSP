import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

import {
  ASSESSMENT_AGENT_STREAM_DURABILITY,
  ASSESSMENT_AGENT_STREAM_EVENT_TYPES,
  ASSESSMENT_AGENT_STREAM_SCHEMA_VERSIONS,
  ASSESSMENT_AGENT_STREAM_SEMANTIC_KINDS,
  ASSESSMENT_AGENT_STREAM_STAGES,
  ASSESSMENT_ENGINEERING_RULE_PLAN_DECISIONS,
  ASSESSMENT_INTERVIEW_CONTROLS,
  ASSESSMENT_INTERVIEW_QUESTION_INTENTS,
  ASSESSMENT_RUNTIME_RUN_STATUSES,
  ASSESSMENT_RUNTIME_PLAN_REASON_CODES,
  type AssessmentAgentStreamEvent,
  type AssessmentRuntimeSummaryValue,
} from "@lcsp/contracts/evidence";
import { JSDOM } from "jsdom";
import React, { act } from "react";

import {
  groupAgentStreamEventsByRun,
  groupAgentStreamEventsByStage,
  groupAgentStreamActivityByTurnKey,
  interleaveInterviewTranscript,
  splitCurrentInterviewActivity,
} from "../src/features/workspace/utils/agent-stream-stages.ts";

const dom = new JSDOM("<!doctype html><html><body></body></html>", {
  url: "http://localhost/",
});
for (const [key, value] of Object.entries({
  window: dom.window,
  self: dom.window,
  document: dom.window.document,
  navigator: dom.window.navigator,
  HTMLElement: dom.window.HTMLElement,
  Node: dom.window.Node,
  React,
})) {
  Object.defineProperty(globalThis, key, {
    configurable: true,
    value,
  });
}
Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", {
  configurable: true,
  value: true,
  writable: true,
});

const { createRoot } = await import("react-dom/client");
const { AgentStreamTimeline, AGENT_STREAM_RUN_OUTCOMES } =
  await import("../src/features/workspace/components/molecules/agent-stream-timeline.tsx");
const { InterviewCycleTurn } =
  await import("../src/features/workspace/components/molecules/interview-cycle-turn.tsx");
const { AgentStreamTurn } =
  await import("../src/features/workspace/components/molecules/agent-stream-turn.tsx");

const roots: ReturnType<typeof createRoot>[] = [];

test("completed scan job keeps Scanner done despite delayed running stream rows", async () => {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  roots.push(root);
  const events = [
    event(1, ASSESSMENT_AGENT_STREAM_EVENT_TYPES.boundaryStarted, null, {
      stage: ASSESSMENT_AGENT_STREAM_STAGES.scanner,
    }),
  ];
  await act(async () => root.render(<AgentStreamTimeline events={events} />));
  assert.ok(container.querySelector(".animate-spin"));
  await act(async () =>
    root.render(
      <AgentStreamTimeline
        events={events}
        outcomeOverride={AGENT_STREAM_RUN_OUTCOMES.completed}
      />,
    ),
  );
  assert.equal(container.querySelector(".animate-spin"), null);
  assert.match(
    container.querySelector("summary")?.textContent ?? "",
    /Completed|Hoàn tất/,
  );
});

test("Scanner activity renders as one agent turn with collapsed technical details, not a flat activity list", async () => {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  roots.push(root);
  const stage = ASSESSMENT_AGENT_STREAM_STAGES.scanner;
  const events = [
    event(1, ASSESSMENT_AGENT_STREAM_EVENT_TYPES.boundaryStarted, null, {
      stage,
    }),
    event(
      2,
      ASSESSMENT_AGENT_STREAM_EVENT_TYPES.modelCallCompleted,
      { model_step_id: "step-2" },
      {
        stage,
        messageId: "m-2",
        status: ASSESSMENT_RUNTIME_RUN_STATUSES.completed,
      },
    ),
    event(
      3,
      ASSESSMENT_AGENT_STREAM_EVENT_TYPES.modelCallCompleted,
      { model_step_id: "step-3" },
      {
        stage,
        messageId: "m-3",
        status: ASSESSMENT_RUNTIME_RUN_STATUSES.completed,
      },
    ),
  ];
  const render = (
    outcomeOverride?: Parameters<typeof AgentStreamTurn>[0]["outcomeOverride"],
  ) =>
    act(async () =>
      root.render(
        <AgentStreamTurn
          stages={[stage]}
          runId="run-1"
          events={events}
          stageEvents={{ [stage]: events }}
          outcomeOverride={outcomeOverride}
        />,
      ),
    );
  await render();
  assert.match(container.textContent ?? "", /LCSP Scanner/);
  assert.match(
    container.textContent ?? "",
    /Preparing repository evidence|Đang chuẩn bị evidence/,
  );
  // The flat feed is never the customer-facing surface: everything raw sits
  // behind the collapsed Technical details, whose grouped summary comes first.
  const technical = container.querySelector<HTMLDetailsElement>(
    "[data-slot=agent-stream-turn-technical-details]",
  );
  assert.ok(technical);
  assert.equal(technical.open, false);
  assert.ok(technical.querySelector("[data-stream-technical-summary]"));
  assert.equal(
    container.querySelector<HTMLDetailsElement>("[data-stream-raw-events]")
      ?.open,
    false,
  );
  const outside = container.cloneNode(true) as HTMLElement;
  outside
    .querySelector("[data-slot=agent-stream-turn-technical-details]")
    ?.remove();
  assert.equal(
    outside.querySelector("[data-slot=agent-stream-timeline]"),
    null,
  );
  // Repeated model steps collapse into one live row with a count, not one row each.
  const logRows = [
    ...outside.querySelectorAll("[data-stream-activity-log-row]"),
  ];
  const modelRows = logRows.filter(
    (row) =>
      row.getAttribute("data-stream-activity-log-row") ===
      "aiAnalysisCompleted",
  );
  assert.equal(modelRows.length, 1);
  assert.equal(
    modelRows[0]?.querySelector("[data-stream-repeat-count]")?.textContent,
    "×2",
  );
  // The authoritative scan-job state still closes a delayed running stream.
  await render(AGENT_STREAM_RUN_OUTCOMES.completed);
  assert.match(
    container.textContent ?? "",
    /Repository evidence is ready|Evidence từ repository đã sẵn sàng/,
  );
  await render(AGENT_STREAM_RUN_OUTCOMES.failed);
  assert.match(
    container.textContent ?? "",
    /Could not finish preparing|Không thể hoàn tất chuẩn bị evidence/,
  );
});

test("Scanner log shows only four activity rows and updates the latest target in place", async () => {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  roots.push(root);
  const stage = ASSESSMENT_AGENT_STREAM_STAGES.scanner;
  const toolEvent = (
    sequence: number,
    toolName: string,
    parameters: Record<string, string>,
  ) =>
    event(
      sequence,
      ASSESSMENT_AGENT_STREAM_EVENT_TYPES.semanticToolCall,
      {
        schemaVersion: ASSESSMENT_AGENT_STREAM_SCHEMA_VERSIONS.semanticV1,
        kind: ASSESSMENT_AGENT_STREAM_SEMANTIC_KINDS.toolCall,
        toolName,
        toolCallId: `tool-${sequence}`,
        parameters,
      },
      { stage, toolName, toolCallId: `tool-${sequence}` },
    );
  const initial = [
    event(1, ASSESSMENT_AGENT_STREAM_EVENT_TYPES.boundaryStarted, null, {
      stage,
    }),
    event(
      2,
      ASSESSMENT_AGENT_STREAM_EVENT_TYPES.modelCallCompleted,
      { model_step_id: "step-1" },
      {
        stage,
        messageId: "model-1",
        status: ASSESSMENT_RUNTIME_RUN_STATUSES.completed,
      },
    ),
    toolEvent(3, "read_file", { file_path: "/src/first.ts" }),
    toolEvent(4, "search_nodes", { query: "first query" }),
    event(
      5,
      ASSESSMENT_AGENT_STREAM_EVENT_TYPES.agentContextTrimmed,
      { cleared_tool_results: 1 },
      { stage },
    ),
    toolEvent(6, "git_status", { command: "git status" }),
  ];
  const render = (events: AssessmentAgentStreamEvent[]) =>
    act(async () =>
      root.render(
        <AgentStreamTurn
          stages={[stage]}
          runId="run-1"
          events={events}
          stageEvents={{ [stage]: events }}
        />,
      ),
    );
  await render(initial);
  const log = container.querySelector("[data-stream-activity-log]");
  assert.ok(log);
  assert.deepEqual(
    [...log.querySelectorAll("[data-stream-activity-log-row]")].map((row) =>
      row.getAttribute("data-stream-activity-log-row"),
    ),
    [
      "aiAnalysisCompleted",
      "sourceFilesReviewed",
      "repositorySourceSearched",
      "agentContextTrimmed",
    ],
  );
  const readRow = log.querySelector(
    '[data-stream-activity-log-row="sourceFilesReviewed"]',
  );
  assert.equal(
    readRow?.querySelector("[data-stream-target]")?.textContent,
    "/src/first.ts",
  );
  assert.equal(log.textContent?.includes("git status"), false);

  await render([
    ...initial,
    toolEvent(7, "read_file", { file_path: "/src/latest.ts" }),
    toolEvent(8, "search_nodes", { query: "latest query" }),
    event(
      9,
      ASSESSMENT_AGENT_STREAM_EVENT_TYPES.modelCallCompleted,
      { model_step_id: "step-2" },
      {
        stage,
        messageId: "model-2",
        status: ASSESSMENT_RUNTIME_RUN_STATUSES.completed,
      },
    ),
    event(
      10,
      ASSESSMENT_AGENT_STREAM_EVENT_TYPES.agentContextTrimmed,
      { cleared_tool_results: 2 },
      { stage },
    ),
  ]);
  assert.equal(
    log.querySelectorAll("[data-stream-activity-log-row]").length,
    4,
  );
  assert.equal(
    log.querySelector('[data-stream-activity-log-row="sourceFilesReviewed"]'),
    readRow,
  );
  assert.equal(
    readRow?.querySelector("[data-stream-target]")?.textContent,
    "/src/latest.ts",
  );
  assert.equal(
    log.querySelector(
      '[data-stream-activity-log-row="repositorySourceSearched"] [data-stream-target]',
    )?.textContent,
    "latest query",
  );
  for (const row of log.querySelectorAll("[data-stream-activity-log-row]")) {
    assert.equal(
      row.querySelector("[data-stream-repeat-count]")?.textContent,
      "×2",
    );
  }
});

test("billing pause closes its dispatch without changing a real Investigator failure or another dispatch", async () => {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  roots.push(root);
  const events = [
    event(1, ASSESSMENT_AGENT_STREAM_EVENT_TYPES.boundaryStarted, null),
    event(2, ASSESSMENT_AGENT_STREAM_EVENT_TYPES.modelCallStarted, null),
    event(3, ASSESSMENT_AGENT_STREAM_EVENT_TYPES.boundaryPaused, null, {
      status: ASSESSMENT_RUNTIME_RUN_STATUSES.waiting,
    }),
  ];
  await act(async () => root.render(<AgentStreamTimeline events={events} />));
  assert.equal(container.querySelectorAll(".animate-spin").length, 0);
  assert.match(container.textContent ?? "", /billing/);
  await act(async () =>
    root.render(
      <AgentStreamTimeline
        events={[
          ...events.slice(0, 2),
          event(3, ASSESSMENT_AGENT_STREAM_EVENT_TYPES.agentFailed, null, {
            status: ASSESSMENT_RUNTIME_RUN_STATUSES.failed,
          }),
          event(
            4,
            ASSESSMENT_AGENT_STREAM_EVENT_TYPES.boundaryCompleted,
            null,
            { status: ASSESSMENT_RUNTIME_RUN_STATUSES.completed },
          ),
        ]}
      />,
    ),
  );
  assert.equal(container.querySelectorAll(".animate-spin").length, 0);
  assert.match(
    container.querySelector("summary")?.textContent ?? "",
    /Thất bại|Failed/,
  );
  await act(async () =>
    root.render(
      <AgentStreamTimeline
        events={[
          ...events,
          event(4, ASSESSMENT_AGENT_STREAM_EVENT_TYPES.boundaryStarted, null, {
            correlationId: "corr-2",
          }),
          event(5, ASSESSMENT_AGENT_STREAM_EVENT_TYPES.modelCallStarted, null, {
            correlationId: "corr-2",
          }),
        ]}
      />,
    ),
  );
  assert.ok(container.querySelectorAll(".animate-spin").length > 0);
});

afterEach(() => {
  act(() => {
    for (const root of roots.splice(0)) {
      root.unmount();
    }
  });
  document.body.replaceChildren();
});

function event(
  sequence: number,
  eventType: AssessmentAgentStreamEvent["eventType"],
  data: AssessmentAgentStreamEvent["data"],
  overrides: Partial<AssessmentAgentStreamEvent> = {},
): AssessmentAgentStreamEvent {
  return {
    eventId: `event-${sequence}`,
    sequence,
    clientSequence: sequence,
    emittedAt: "2026-09-20T00:00:00.000Z",
    assessmentId: "assessment-1",
    runId: "run-1",
    correlationId: "corr-1",
    eventType,
    stage: null,
    engineeringRuleId: null,
    source: "engineering",
    agentName: "investigator",
    subagentName: null,
    namespace: ["node"],
    nodeName: "model",
    messageId: "m",
    toolName: "search_nodes",
    toolCallId: "call-1",
    status: ASSESSMENT_RUNTIME_RUN_STATUSES.running,
    text: null,
    data,
    ...overrides,
  };
}

test("historical interview activity follows the answer that triggered it", async () => {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  roots.push(root);
  await act(async () => {
    root.render(
      <InterviewCycleTurn
        answer={{
          questionId: "q-1",
          questionPrompt: "Question turn",
          answeredAt: "2026-09-27T09:56:00Z",
          summary: "Customer answer",
        }}
        activity={
          <div data-slot="question-turn-activity">
            <AgentStreamTimeline
              events={[
                event(
                  1,
                  ASSESSMENT_AGENT_STREAM_EVENT_TYPES.modelCallCompleted,
                  { model_step_id: "step-1" },
                  {
                    stage: ASSESSMENT_AGENT_STREAM_STAGES.interview,
                    status: ASSESSMENT_RUNTIME_RUN_STATUSES.completed,
                  },
                ),
              ]}
            />
          </div>
        }
      />,
    );
  });
  const question = [...container.querySelectorAll("p")].find(
    (node) => node.textContent === "Question turn",
  );
  const activity = container.querySelector(
    '[data-slot="question-turn-activity"]',
  );
  const answer = [...container.querySelectorAll("p")].find(
    (node) => node.textContent === "Customer answer",
  );
  assert.ok(question && activity && answer);
  assert.ok(
    answer.compareDocumentPosition(activity) & Node.DOCUMENT_POSITION_FOLLOWING,
  );
  assert.ok(
    question.compareDocumentPosition(answer) & Node.DOCUMENT_POSITION_FOLLOWING,
  );
});

test("a confirmAdjust cycle reads as question -> structured answer -> processing output -> next question", async () => {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  roots.push(root);

  await act(async () => {
    root.render(
      <>
        <InterviewCycleTurn
          activity={
            <div data-slot="confirm-follow-up-activity">
              Reviewing confirmation
            </div>
          }
          answer={{
            questionId: "q-confirm",
            answeredAt: "2026-09-27T10:00:00Z",
            summary: "Customer confirmed prior material context.",
            question: {
              id: "q-confirm",
              intent: ASSESSMENT_INTERVIEW_QUESTION_INTENTS.clarify,
              control: ASSESSMENT_INTERVIEW_CONTROLS.confirmAdjust,
              prompt: "Please confirm this interpretation.",
            },
          }}
        />
        <InterviewCycleTurn
          answer={{
            questionId: "q-next",
            questionPrompt: "What happens after confirmation?",
            answeredAt: "2026-09-27T10:01:00Z",
            summary: "Planning proceeds automatically.",
          }}
        />
      </>,
    );
  });

  const firstQuestion = container.querySelector(
    '[data-slot="assessment-question-turn"]',
  );
  const outputPanel = container.querySelector(
    '[data-slot="interview-output-panel"]',
  );
  const nextQuestion = [...container.querySelectorAll("p")].find(
    (node) => node.textContent === "What happens after confirmation?",
  );
  const customerConfirm = container.querySelector(
    '[data-slot="interview-customer-confirmation"]',
  );
  const activity = container.querySelector(
    '[data-slot="confirm-follow-up-activity"]',
  );
  assert.ok(
    firstQuestion && customerConfirm && activity && outputPanel && nextQuestion,
  );
  assert.equal(
    customerConfirm
      .closest('[data-slot="agent-turn"]')
      ?.getAttribute("data-role"),
    "user",
  );
  assert.match(customerConfirm.textContent ?? "", /I confirm\.|Tôi xác nhận\./);
  for (const [before, after] of [
    [firstQuestion, customerConfirm],
    [customerConfirm, activity],
    [activity, outputPanel],
  ]) {
    assert.ok(
      before!.compareDocumentPosition(after!) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    );
  }
  assert.ok(
    outputPanel.compareDocumentPosition(nextQuestion) &
      Node.DOCUMENT_POSITION_FOLLOWING,
    "the next question must follow the previous turn's processing output",
  );
});

test("rendering the next answered turn keeps all earlier question activity in the transcript", async () => {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  roots.push(root);
  const stage = ASSESSMENT_AGENT_STREAM_STAGES.interview;
  const answers = [1, 2, 3].map((turn) => ({
    questionId: `q-${turn}`,
    questionPrompt: `Question ${turn}`,
    answeredAt: `2026-09-27T11:0${turn * 2 + 1}:00Z`,
    summary: `Answer ${turn}`,
  }));
  const events = [1, 2, 3].map((turn) =>
    event(
      turn,
      ASSESSMENT_AGENT_STREAM_EVENT_TYPES.modelCallCompleted,
      { model_step_id: `step-${turn}` },
      {
        stage,
        correlationId: `dispatch-${turn}`,
        emittedAt: `2026-09-27T11:0${turn * 2 + 1}:30Z`,
        status: ASSESSMENT_RUNTIME_RUN_STATUSES.completed,
      },
    ),
  );
  for (const count of [1, 2, 3]) {
    const { history } = splitCurrentInterviewActivity(
      interleaveInterviewTranscript(answers.slice(0, count), [
        { stage, groups: groupAgentStreamEventsByRun(events.slice(0, count)) },
      ]),
    );
    await act(async () =>
      root.render(
        <>
          {history.map((turn) => (
            <InterviewCycleTurn
              key={turn.answer.questionId}
              answer={turn.answer}
              activity={
                <div data-question-activity={turn.answer.questionId}>
                  {turn.followUpActivity.map((segment) => (
                    <AgentStreamTimeline
                      key={segment.turnKey}
                      events={segment.events}
                      activeRunId={segment.runId}
                    />
                  ))}
                </div>
              }
            />
          ))}
        </>,
      ),
    );
    assert.equal(
      container.querySelectorAll("[data-question-activity]").length,
      count,
    );
    for (let turn = 1; turn <= count; turn++) {
      const activity = container.querySelector(
        `[data-question-activity="q-${turn}"]`,
      );
      assert.ok(activity);
      assert.ok(activity.querySelector("details[data-stream-activity]"));
      const question = [...container.querySelectorAll("p")].find(
        (node) => node.textContent === `Question ${turn}`,
      );
      const answer = [...container.querySelectorAll("p")].find(
        (node) => node.textContent === `Answer ${turn}`,
      );
      assert.ok(question && answer);
      assert.ok(
        answer.compareDocumentPosition(activity) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      );
      assert.ok(
        question.compareDocumentPosition(answer) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      );
    }
  }
});

test("semantic agent stream rows render structured tool model and skill fields", async () => {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  roots.push(root);

  await act(async () => {
    root.render(
      <AgentStreamTimeline
        events={[
          event(1, ASSESSMENT_AGENT_STREAM_EVENT_TYPES.semanticToolCall, {
            schemaVersion: ASSESSMENT_AGENT_STREAM_SCHEMA_VERSIONS.semanticV1,
            kind: ASSESSMENT_AGENT_STREAM_SEMANTIC_KINDS.toolCall,
            durability: ASSESSMENT_AGENT_STREAM_DURABILITY.durable,
            toolName: "search_nodes",
            toolCallId: "call-1",
            parameters: {
              nodeType: "AI_MODEL_INVOCATION",
              limit: 7,
              api_key: "[REDACTED]",
            },
          }),
          event(2, ASSESSMENT_AGENT_STREAM_EVENT_TYPES.semanticToolResult, {
            schemaVersion: ASSESSMENT_AGENT_STREAM_SCHEMA_VERSIONS.semanticV1,
            kind: ASSESSMENT_AGENT_STREAM_SEMANTIC_KINDS.toolResult,
            durability: ASSESSMENT_AGENT_STREAM_DURABILITY.durable,
            toolName: "search_nodes",
            toolCallId: "call-1",
            resultSummary: {
              count: 42,
              observationId: "obs-42",
            },
          }),
          event(
            3,
            ASSESSMENT_AGENT_STREAM_EVENT_TYPES.modelRequest,
            {
              schemaVersion: ASSESSMENT_AGENT_STREAM_SCHEMA_VERSIONS.semanticV1,
              kind: ASSESSMENT_AGENT_STREAM_SEMANTIC_KINDS.modelRequest,
              durability: ASSESSMENT_AGENT_STREAM_DURABILITY.durable,
              provider: "openai",
              model: "gpt-5-test",
              goalSummary: "Execute node model",
              availableToolNames: ["search_nodes", "list_observations"],
              inputArtifactRefs: ["artifact:1"],
            },
            { toolName: null },
          ),
          event(
            4,
            ASSESSMENT_AGENT_STREAM_EVENT_TYPES.modelResult,
            {
              schemaVersion: ASSESSMENT_AGENT_STREAM_SCHEMA_VERSIONS.semanticV1,
              kind: ASSESSMENT_AGENT_STREAM_SEMANTIC_KINDS.modelOutput,
              durability: ASSESSMENT_AGENT_STREAM_DURABILITY.durable,
              finishReason: "stop",
              usage: { input_tokens: 11, output_tokens: 13 },
              outputRefs: ["output:final"],
            },
            {
              toolName: null,
              status: ASSESSMENT_RUNTIME_RUN_STATUSES.completed,
            },
          ),
          event(
            5,
            ASSESSMENT_AGENT_STREAM_EVENT_TYPES.skillUsage,
            {
              schemaVersion: ASSESSMENT_AGENT_STREAM_SCHEMA_VERSIONS.semanticV1,
              kind: ASSESSMENT_AGENT_STREAM_SEMANTIC_KINDS.skillUsage,
              durability: ASSESSMENT_AGENT_STREAM_DURABILITY.durable,
              skillName: "lcsp",
              skillVersionOrHash: "sha256:abc123",
              promptVersion: "prompt/v1",
            },
            {
              toolName: null,
              status: ASSESSMENT_RUNTIME_RUN_STATUSES.completed,
            },
          ),
        ]}
      />,
    );
  });

  const activities = container.querySelectorAll<HTMLDetailsElement>(
    "details[data-stream-activity]",
  );
  // The model request and its result are one AI analysis row.
  assert.equal(activities.length, 3);

  const toolSummary =
    activities[0]?.querySelector("summary")?.textContent ?? "";
  assert.match(
    toolSummary,
    /Searched repository source|Đã tìm kiếm trong source repository/,
  );
  assert.doesNotMatch(toolSummary, /search_nodes|AI_MODEL_INVOCATION|obs-42/);

  const technical =
    activities[0]?.querySelector("[data-stream-technical-details]")
      ?.textContent ?? "";
  assert.match(technical, /search_nodes/);
  assert.match(technical, /AI_MODEL_INVOCATION/);
  assert.match(technical, /obs-42/);
  assert.match(technical, /\[REDACTED\]/);

  const modelTechnical =
    activities[1]?.querySelector("[data-stream-technical-details]")
      ?.textContent ?? "";
  assert.match(modelTechnical, /list_observations/);
  assert.match(modelTechnical, /artifact:1/);
  assert.match(modelTechnical, /output:final/);
  assert.match(modelTechnical, /output_tokens/);

  const skillTechnical =
    activities[2]?.querySelector("[data-stream-technical-details]")
      ?.textContent ?? "";
  assert.match(skillTechnical, /sha256:abc123/);
  assert.match(skillTechnical, /prompt\/v1/);
});

test("model call events render provider progress and terminal failures", async () => {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  roots.push(root);

  await act(async () => {
    root.render(
      <AgentStreamTimeline
        events={[
          event(
            1,
            ASSESSMENT_AGENT_STREAM_EVENT_TYPES.modelCallStarted,
            {
              provider: "google_genai",
              model: "gemini-3.5-flash-lite",
              timeout_seconds: 30,
              attempt: 1,
            },
            { text: "model call started", toolName: null },
          ),
          event(
            2,
            ASSESSMENT_AGENT_STREAM_EVENT_TYPES.modelCallHeartbeat,
            {
              provider: "google_genai",
              model: "gemini-3.5-flash-lite",
              elapsed_seconds: 10,
              timeout_seconds: 30,
            },
            { text: "model call waiting", toolName: null },
          ),
          event(
            3,
            ASSESSMENT_AGENT_STREAM_EVENT_TYPES.modelCallTimeout,
            {
              provider: "google_genai",
              model: "gemini-3.5-flash-lite",
              elapsed_seconds: 30,
              timeout_seconds: 30,
            },
            {
              text: "model call timed out",
              toolName: null,
              status: ASSESSMENT_RUNTIME_RUN_STATUSES.failed,
            },
          ),
        ]}
      />,
    );
  });

  const modelRows = container.querySelectorAll('[data-stream-kind="model"]');
  assert.equal(modelRows.length, 1);
  assert.equal(modelRows[0]?.getAttribute("data-stream-status"), "failed");

  const activity = modelRows[0]?.querySelector<HTMLDetailsElement>(
    "details[data-stream-activity]",
  );
  assert.ok(activity);
  assert.equal(activity.open, false);

  const summary = activity.querySelector("summary")?.textContent ?? "";
  assert.match(
    summary,
    /AI provider could not complete this analysis step|AI provider không thể hoàn tất bước phân tích này/,
  );
  assert.doesNotMatch(
    summary,
    /google_genai|gemini|model call|timeout_seconds/,
  );

  const technical =
    activity.querySelector("[data-stream-technical-details]")?.textContent ??
    "";
  assert.match(technical, /gemini-3\.5-flash-lite/);
  assert.match(technical, /google_genai/);
  assert.match(technical, /MODEL_CALL_STARTED/);
  // Heartbeats update the row in place instead of growing it into a long log.
  assert.doesNotMatch(technical, /MODEL_CALL_HEARTBEAT/);
  assert.match(technical, /MODEL_CALL_TIMEOUT/);
  assert.match(technical, /model call timed out/);
  assert.match(technical, /elapsed_seconds/);
  assert.match(technical, /timeout_seconds/);
});

test("tool calls pair input and output into one expandable activity row", async () => {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  roots.push(root);

  await act(async () => {
    root.render(
      <AgentStreamTimeline
        events={[
          event(1, ASSESSMENT_AGENT_STREAM_EVENT_TYPES.semanticToolCall, {
            schemaVersion: ASSESSMENT_AGENT_STREAM_SCHEMA_VERSIONS.semanticV1,
            kind: ASSESSMENT_AGENT_STREAM_SEMANTIC_KINDS.toolCall,
            durability: ASSESSMENT_AGENT_STREAM_DURABILITY.durable,
            toolName: "search_nodes",
            toolCallId: "call-1",
            parameters: { query: "billing", limit: 5 },
          }),
          event(
            2,
            ASSESSMENT_AGENT_STREAM_EVENT_TYPES.semanticToolResult,
            {
              schemaVersion: ASSESSMENT_AGENT_STREAM_SCHEMA_VERSIONS.semanticV1,
              kind: ASSESSMENT_AGENT_STREAM_SEMANTIC_KINDS.toolResult,
              durability: ASSESSMENT_AGENT_STREAM_DURABILITY.durable,
              toolName: "search_nodes",
              toolCallId: "call-1",
              resultSummary: { count: 2, status: "ok" },
            },
            { status: ASSESSMENT_RUNTIME_RUN_STATUSES.completed },
          ),
        ]}
      />,
    );
  });

  const toolRows = container.querySelectorAll('[data-stream-kind="tool"]');
  assert.equal(toolRows.length, 1);
  assert.equal(toolRows[0]?.getAttribute("data-stream-status"), "completed");

  const activity = toolRows[0]?.querySelector<HTMLDetailsElement>(
    "details[data-stream-activity]",
  );
  assert.ok(activity);
  assert.equal(activity.open, false);
  assert.equal(toolRows[0]?.querySelectorAll("details").length, 1);

  const summary = activity.querySelector("summary")?.textContent ?? "";
  assert.match(
    summary,
    /Searched repository source|Đã tìm kiếm trong source repository/,
  );
  // The summary names the activity and its current target, never raw tool data.
  assert.doesNotMatch(summary, /count|search_nodes/);
  assert.equal(
    activity.querySelector("[data-stream-target]")?.textContent,
    "billing",
  );

  const technical =
    activity.querySelector("[data-stream-technical-details]")?.textContent ??
    "";
  assert.match(technical, /billing/);
  assert.match(technical, /count/);
  assert.match(technical, /call-1/);
  assert.match(technical, /SEMANTIC_TOOL_CALL/);
  assert.match(technical, /SEMANTIC_TOOL_RESULT/);
});

test("private graph state and PII middleware noise are not rendered", async () => {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  roots.push(root);

  await act(async () => {
    root.render(
      <AgentStreamTimeline
        events={[
          event(
            1,
            ASSESSMENT_AGENT_STREAM_EVENT_TYPES.graphState,
            { messages: "[HIDDEN_PRIVATE_RUNTIME_STATE]" },
            {
              nodeName: "repository-analyst",
              text: '{"messages":"[HIDDEN_PRIVATE_RUNTIME_STATE]"}',
            },
          ),
          event(
            2,
            ASSESSMENT_AGENT_STREAM_EVENT_TYPES.customProgress,
            { status: "RUNNING" },
            {
              nodeName: "PIIMiddleware[email].before_model",
              text: "middleware progress",
            },
          ),
          event(
            3,
            ASSESSMENT_AGENT_STREAM_EVENT_TYPES.customProgress,
            {
              schemaVersion: ASSESSMENT_AGENT_STREAM_SCHEMA_VERSIONS.semanticV1,
              kind: ASSESSMENT_AGENT_STREAM_SEMANTIC_KINDS.reasoningSummary,
              durability: ASSESSMENT_AGENT_STREAM_DURABILITY.bestEffort,
              resultSummary: { summary: "Checking repository architecture." },
            },
            { text: "provider reasoning summary" },
          ),
        ]}
      />,
    );
  });

  const text = container.textContent ?? "";
  assert.doesNotMatch(text, /HIDDEN_PRIVATE_RUNTIME_STATE/);
  assert.doesNotMatch(text, /PIIMiddleware/);
  assert.match(text, /Checking repository architecture/);
  // Reasoning streams into the single AI analysis row.
  assert.equal(
    container.querySelectorAll('[data-stream-kind="model"]').length,
    1,
  );
});

test("thinking header closes after the matching agent lifecycle completes", async () => {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  roots.push(root);

  await act(async () => {
    root.render(
      <AgentStreamTimeline
        events={[
          event(1, ASSESSMENT_AGENT_STREAM_EVENT_TYPES.agentStarted, null, {
            agentName: "repository-analyst",
            toolName: null,
            toolCallId: null,
            status: ASSESSMENT_RUNTIME_RUN_STATUSES.running,
            emittedAt: "2026-09-20T00:00:00.000Z",
          }),
          event(2, ASSESSMENT_AGENT_STREAM_EVENT_TYPES.agentCompleted, null, {
            agentName: "repository-analyst",
            toolName: null,
            toolCallId: null,
            status: ASSESSMENT_RUNTIME_RUN_STATUSES.completed,
            emittedAt: "2026-09-20T00:00:03.000Z",
          }),
        ]}
      />,
    );
  });

  const timeline = container.querySelector<HTMLDetailsElement>(
    'details[data-slot="agent-stream-timeline"]',
  );
  assert.ok(timeline);
  assert.equal(timeline.open, false);
  assert.match(timeline.textContent ?? "", /3s/);
  assert.doesNotMatch(timeline.textContent ?? "", /Đang suy nghĩ|Thinking/i);
});

test("runtime events map to meaningful activities with per-activity technical details", async () => {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  roots.push(root);

  await act(async () => {
    root.render(
      <AgentStreamTimeline
        events={[
          event(
            1,
            ASSESSMENT_AGENT_STREAM_EVENT_TYPES.runtimeEvent,
            {
              runtimeEventType: "RUN_STARTED",
              stage: "SCAN",
              inputSummary: {
                boundaryName: "scan_requested",
                timeoutSeconds: 1800,
                attempt: 1,
              },
            },
            {
              source: "agent_runtime",
              toolName: "agent_runtime",
              nodeName: null,
              text: "Agent Runtime claimed repository scan job",
            },
          ),
          event(
            2,
            ASSESSMENT_AGENT_STREAM_EVENT_TYPES.runtimeEvent,
            {
              runtimeEventType: "TOOL_STARTED",
              stage: "SCAN",
              outputSummary: {
                runId: "01a0-test",
                schedulerState: "pending",
              },
            },
            {
              source: "langgraph_run",
              toolName: "langgraph_run",
              nodeName: null,
              text: "LangGraph repository run queued",
            },
          ),
          event(
            3,
            ASSESSMENT_AGENT_STREAM_EVENT_TYPES.runtimeEvent,
            {
              runtimeEventType: "TOOL_STARTED",
              stage: "SCAN",
            },
            {
              source: "repository_archive_download",
              toolName: "repository_archive_download",
              nodeName: null,
              text: "Downloading repository archive",
            },
          ),
          event(
            4,
            ASSESSMENT_AGENT_STREAM_EVENT_TYPES.providerFallback,
            {
              current_provider: "llm7",
              fallback_provider: "google_genai",
              fallback_index: 1,
            },
            {
              source: "scan_requested",
              toolName: null,
              nodeName: null,
              text: "provider fallback attempt",
            },
          ),
        ]}
      />,
    );
  });

  const activities = container.querySelectorAll<HTMLDetailsElement>(
    "details[data-stream-activity]",
  );
  assert.equal(activities.length, 4);

  const summaries = [...activities].map(
    (activity) => activity.querySelector("summary")?.textContent ?? "",
  );
  assert.match(
    summaries[0] ?? "",
    /Started repository scan|Bắt đầu quét repository/,
  );
  assert.match(
    summaries[1] ?? "",
    /Queued repository analysis|Đã xếp hàng phân tích repository/,
  );
  assert.match(
    summaries[2] ?? "",
    /Downloading repository source|Đang tải source repository/,
  );
  assert.match(
    summaries[3] ?? "",
    /Switched to a backup AI provider|Đã chuyển sang AI provider dự phòng/,
  );

  for (const summary of summaries) {
    assert.doesNotMatch(
      summary,
      /runtimeEventType|langgraph_run|agent_runtime|scan_requested|current_provider|fallback_provider/,
    );
  }

  const firstTechnical =
    activities[0]?.querySelector("[data-stream-technical-details]")
      ?.textContent ?? "";
  assert.match(firstTechnical, /RUN_STARTED/);
  assert.match(firstTechnical, /scan_requested/);
  assert.match(firstTechnical, /run-1/);

  const fallbackTechnical =
    activities[3]?.querySelector("[data-stream-technical-details]")
      ?.textContent ?? "";
  assert.match(fallbackTechnical, /llm7/);
  assert.match(fallbackTechnical, /google_genai/);
  assert.match(fallbackTechnical, /PROVIDER_FALLBACK/);
});

test("terminal failure stops orphaned running spinners without failing completed fallback activities", async () => {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  roots.push(root);

  await act(async () => {
    root.render(
      <AgentStreamTimeline
        events={[
          event(
            1,
            ASSESSMENT_AGENT_STREAM_EVENT_TYPES.modelCallStarted,
            {
              provider: "google_genai",
              model: "gemini-3.5-flash-lite",
              timeout_seconds: 30,
            },
            {
              messageId: "model-orphan",
              toolCallId: null,
              text: "model call started",
            },
          ),
          event(
            2,
            ASSESSMENT_AGENT_STREAM_EVENT_TYPES.providerFallback,
            {
              current_provider: "llm7",
              fallback_provider: "google_genai",
              fallback_index: 1,
            },
            {
              source: "scan_requested",
              toolName: null,
              toolCallId: null,
              text: "provider fallback attempt",
            },
          ),
          event(
            3,
            ASSESSMENT_AGENT_STREAM_EVENT_TYPES.boundaryFailed,
            {
              boundary: "scan_requested",
              exception_type: "BillingReservationUnavailable",
            },
            {
              source: "scan_requested",
              toolName: null,
              toolCallId: null,
              status: ASSESSMENT_RUNTIME_RUN_STATUSES.failed,
              text: "Provider invocation group capacity is exhausted",
            },
          ),
        ]}
      />,
    );
  });

  assert.equal(
    container.querySelectorAll('[data-stream-status="running"]').length,
    0,
  );

  const modelRow = container.querySelector('[data-stream-kind="model"]');
  assert.ok(modelRow);
  assert.equal(modelRow.getAttribute("data-stream-status"), "failed");

  const fallbackActivity = [
    ...container.querySelectorAll<HTMLElement>(
      '[data-stream-status="completed"]',
    ),
  ].find((node) =>
    /backup AI provider|AI provider dự phòng/.test(node.textContent ?? ""),
  );
  assert.ok(fallbackActivity);

  const timeline = container.querySelector<HTMLDetailsElement>(
    'details[data-slot="agent-stream-timeline"]',
  );
  assert.ok(timeline);
  assert.equal(timeline.open, false);
  assert.match(
    timeline.querySelector("summary")?.textContent ?? "",
    /Failed|Thất bại/,
  );
});

test("recovered provider attempts do not render as repeated terminal failures", async () => {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  roots.push(root);

  await act(async () => {
    root.render(
      <AgentStreamTimeline
        events={[
          event(
            1,
            ASSESSMENT_AGENT_STREAM_EVENT_TYPES.modelCallStarted,
            {
              provider: "llm7",
              model: "GLM-5.3-Flash",
              timeout_seconds: 30,
            },
            {
              messageId: "llm7-failed-attempt",
              toolCallId: null,
              text: "model call started",
            },
          ),
          event(
            2,
            ASSESSMENT_AGENT_STREAM_EVENT_TYPES.modelCallFailed,
            {
              provider: "llm7",
              model: "GLM-5.3-Flash",
              elapsed_seconds: 1,
              error_type: "UnprocessableEntityError",
            },
            {
              messageId: "llm7-failed-attempt",
              toolCallId: null,
              status: ASSESSMENT_RUNTIME_RUN_STATUSES.failed,
              text: "model call failed",
            },
          ),
          event(
            3,
            ASSESSMENT_AGENT_STREAM_EVENT_TYPES.providerFallback,
            {
              current_provider: "llm7",
              fallback_provider: "google_genai",
              fallback_index: 1,
            },
            {
              source: "scan_requested",
              toolName: null,
              toolCallId: null,
              text: "provider fallback attempt",
            },
          ),
          event(
            4,
            ASSESSMENT_AGENT_STREAM_EVENT_TYPES.toolResult,
            { entries: ["src"] },
            {
              toolName: "ls",
              toolCallId: "tool-after-fallback",
              status: ASSESSMENT_RUNTIME_RUN_STATUSES.completed,
            },
          ),
          event(
            5,
            ASSESSMENT_AGENT_STREAM_EVENT_TYPES.boundaryFailed,
            {
              boundary: "scan_requested",
              exception_type: "AgentServerRunError",
            },
            {
              source: "scan_requested",
              toolName: null,
              toolCallId: null,
              status: ASSESSMENT_RUNTIME_RUN_STATUSES.failed,
              text: "repository analysis failed",
            },
          ),
        ]}
      />,
    );
  });

  const summaries = [
    ...container.querySelectorAll<HTMLDetailsElement>(
      "details[data-stream-activity]",
    ),
  ].map((activity) => activity.querySelector("summary")?.textContent ?? "");
  assert.equal(
    summaries.filter((summary) =>
      /AI provider could not complete this analysis step|AI provider không thể hoàn tất bước phân tích này/.test(
        summary,
      ),
    ).length,
    0,
  );
  assert.equal(
    summaries.filter((summary) =>
      /Switched to a backup AI provider|Đã chuyển sang AI provider dự phòng/.test(
        summary,
      ),
    ).length,
    1,
  );
  assert.ok(
    summaries.some((summary) =>
      /Inspected repository files|Đã kiểm tra các file trong repository/.test(
        summary,
      ),
    ),
  );
  assert.equal(
    container.querySelectorAll('[data-stream-status="failed"]').length,
    1,
  );
});

test("runtime TOOL_STARTED and TOOL_COMPLETED merge into one completed activity even when outer status stays RUNNING", async () => {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  roots.push(root);

  await act(async () => {
    root.render(
      <AgentStreamTimeline
        events={[
          event(
            1,
            ASSESSMENT_AGENT_STREAM_EVENT_TYPES.runtimeEvent,
            {
              runtimeEventType: "TOOL_STARTED",
              stage: "SCAN",
            },
            {
              source: "repository_archive_download",
              toolName: "repository_archive_download",
              nodeName: null,
              text: "Downloading repository archive",
            },
          ),
          event(
            2,
            ASSESSMENT_AGENT_STREAM_EVENT_TYPES.runtimeEvent,
            {
              runtimeEventType: "TOOL_COMPLETED",
              stage: "SCAN",
              outputSummary: { bytes: 1234 },
            },
            {
              source: "repository_archive_download",
              toolName: "repository_archive_download",
              nodeName: null,
              text: "Repository archive downloaded",
              status: ASSESSMENT_RUNTIME_RUN_STATUSES.running,
            },
          ),
        ]}
      />,
    );
  });

  const activities = container.querySelectorAll(
    "details[data-stream-activity]",
  );
  assert.equal(activities.length, 1);

  const row = container.querySelector('[data-stream-status="completed"]');
  assert.ok(row);
  assert.equal(
    container.querySelectorAll('[data-stream-status="running"]').length,
    0,
  );
  assert.match(
    row.textContent ?? "",
    /Downloaded repository source|Đã tải source repository/,
  );
  assert.match(
    row.querySelector("[data-stream-technical-details]")?.textContent ?? "",
    /TOOL_STARTED/,
  );
  assert.match(
    row.querySelector("[data-stream-technical-details]")?.textContent ?? "",
    /TOOL_COMPLETED/,
  );
});

test("retry reset clears previous scanner activities before the replacement run emits events", async () => {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  roots.push(root);

  const oldEvents = [
    event(
      1,
      ASSESSMENT_AGENT_STREAM_EVENT_TYPES.runtimeEvent,
      {
        runtimeEventType: "TOOL_COMPLETED",
        stage: "SCAN",
      },
      {
        eventId: "old-event-1",
        runId: "scan-old",
        emittedAt: "2026-09-25T00:00:00.000Z",
        source: "repository_archive_download",
        toolName: "repository_archive_download",
        text: "Repository archive downloaded",
      },
    ),
  ];

  await act(async () => {
    root.render(
      <AgentStreamTimeline events={oldEvents} activeRunId="scan-old" />,
    );
  });
  assert.equal(
    container.querySelectorAll("details[data-stream-activity]").length,
    1,
  );

  await act(async () => {
    root.render(
      <AgentStreamTimeline events={oldEvents} activeRunId="scan-old" reset />,
    );
  });

  assert.equal(
    container.querySelectorAll("details[data-stream-activity]").length,
    0,
  );
  assert.doesNotMatch(
    container.textContent ?? "",
    /Downloaded repository source|Đã tải source repository/,
  );
});

test("replacement scan shows only the new run and never mixes previous scanner activity", async () => {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  roots.push(root);

  const mixedEvents = [
    event(
      120,
      ASSESSMENT_AGENT_STREAM_EVENT_TYPES.runtimeEvent,
      {
        runtimeEventType: "TOOL_COMPLETED",
        stage: "SCAN",
      },
      {
        eventId: "old-event-120",
        runId: "scan-old",
        emittedAt: "2026-09-25T00:00:00.000Z",
        source: "repository_archive_download",
        toolName: "repository_archive_download",
        text: "Repository archive downloaded",
      },
    ),
    event(
      1,
      ASSESSMENT_AGENT_STREAM_EVENT_TYPES.runtimeEvent,
      {
        runtimeEventType: "TOOL_STARTED",
        stage: "SCAN",
      },
      {
        eventId: "retry-event-1",
        runId: "scan-retry",
        emittedAt: "2026-09-25T00:01:00.000Z",
        source: "repository_sandbox_hydration",
        toolName: "repository_sandbox_hydration",
        text: "Hydrating repository archive into Docker sandbox",
      },
    ),
  ];

  await act(async () => {
    root.render(
      <AgentStreamTimeline events={mixedEvents} activeRunId="scan-retry" />,
    );
  });

  const activities = container.querySelectorAll(
    "details[data-stream-activity]",
  );
  assert.equal(activities.length, 1);
  assert.match(
    activities[0]?.textContent ?? "",
    /Preparing isolated repository workspace|Đang chuẩn bị workspace phân tích cô lập/,
  );
  assert.doesNotMatch(
    container.textContent ?? "",
    /Downloaded repository source|Đã tải source repository/,
  );
  assert.equal(
    container.querySelectorAll('[data-stream-status="running"]').length,
    1,
  );
});

function engineeringRuleEvent(
  sequence: number,
  ruleId: string,
  status: AssessmentAgentStreamEvent["status"],
  semantic: Record<string, AssessmentRuntimeSummaryValue>,
): AssessmentAgentStreamEvent {
  return event(
    sequence,
    ASSESSMENT_AGENT_STREAM_EVENT_TYPES.engineeringRule,
    {
      schemaVersion: ASSESSMENT_AGENT_STREAM_SCHEMA_VERSIONS.semanticV1,
      kind: ASSESSMENT_AGENT_STREAM_SEMANTIC_KINDS.engineeringRule,
      durability: ASSESSMENT_AGENT_STREAM_DURABILITY.durable,
      engineeringRuleId: ruleId,
      ...semantic,
    },
    {
      engineeringRuleId: ruleId,
      status,
      toolName: null,
      toolCallId: null,
      messageId: null,
    },
  );
}

test("Planner shows selected goals as output and uses goals instead of rule IDs in activity", async () => {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  roots.push(root);

  const plannerEvents = [
    {
      ...engineeringRuleEvent(
        1,
        "ER-SELECT",
        ASSESSMENT_RUNTIME_RUN_STATUSES.completed,
        {
          decision: ASSESSMENT_ENGINEERING_RULE_PLAN_DECISIONS.select,
          concept: "Token validation",
          investigationGoals: [
            "Verify tokens before use",
            "Check expiry handling",
          ],
        },
      ),
      stage: ASSESSMENT_AGENT_STREAM_STAGES.planner,
    },
    {
      ...engineeringRuleEvent(
        2,
        "ER-SKIP",
        ASSESSMENT_RUNTIME_RUN_STATUSES.completed,
        {
          decision: ASSESSMENT_ENGINEERING_RULE_PLAN_DECISIONS.skip,
          investigationGoals: ["Inspect skipped path"],
        },
      ),
      stage: ASSESSMENT_AGENT_STREAM_STAGES.planner,
    },
  ];
  await act(async () => {
    root.render(
      <AgentStreamTurn
        stages={[ASSESSMENT_AGENT_STREAM_STAGES.planner]}
        runId="run-1"
        events={plannerEvents}
        stageEvents={{
          [ASSESSMENT_AGENT_STREAM_STAGES.planner]: plannerEvents,
        }}
      />,
    );
  });

  const timeline = container.querySelector(
    "[data-slot='agent-stream-timeline']",
  );
  const output = container.querySelector("[data-stream-planner-output]");
  assert.ok(timeline);
  assert.ok(output);
  assert.equal(
    container.querySelectorAll("[data-stream-planner-output]").length,
    1,
  );
  assert.equal(timeline.contains(output), false);
  assert.match(output.textContent ?? "", /Verify tokens before use/);
  assert.match(output.textContent ?? "", /Check expiry handling/);
  assert.doesNotMatch(
    output.textContent ?? "",
    /Inspect skipped path|ER-SELECT|ER-SKIP/,
  );
  assert.equal(
    container.querySelectorAll("[data-stream-planner-goal]").length,
    1,
  );
  const selectedActivity = container.querySelector(
    "[data-stream-rule='ER-SELECT'] summary",
  );
  assert.match(selectedActivity?.textContent ?? "", /Verify tokens before use/);
  assert.doesNotMatch(selectedActivity?.textContent ?? "", /ER-SELECT/);

  await act(async () =>
    root.render(<AgentStreamTimeline events={plannerEvents} />),
  );
  assert.equal(container.querySelector("[data-stream-planner-output]"), null);
});

test("investigation renders one section per rule with its own activity and reasoning result", async () => {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  roots.push(root);

  await act(async () => {
    root.render(
      <AgentStreamTimeline
        events={[
          engineeringRuleEvent(
            1,
            "ER-1",
            ASSESSMENT_RUNTIME_RUN_STATUSES.running,
            {
              concept: "Token validation",
              status: ASSESSMENT_RUNTIME_RUN_STATUSES.running,
            },
          ),
          event(
            2,
            ASSESSMENT_AGENT_STREAM_EVENT_TYPES.customProgress,
            {
              schemaVersion: ASSESSMENT_AGENT_STREAM_SCHEMA_VERSIONS.semanticV1,
              kind: ASSESSMENT_AGENT_STREAM_SEMANTIC_KINDS.reasoningSummary,
              durability: ASSESSMENT_AGENT_STREAM_DURABILITY.durable,
              resultSummary: {
                summary: "Token checks live in auth/tokens.py.",
              },
            },
            {
              engineeringRuleId: "ER-1",
              messageId: "m-1",
              toolName: null,
              toolCallId: null,
            },
          ),
          event(
            3,
            ASSESSMENT_AGENT_STREAM_EVENT_TYPES.semanticToolCall,
            {
              schemaVersion: ASSESSMENT_AGENT_STREAM_SCHEMA_VERSIONS.semanticV1,
              kind: ASSESSMENT_AGENT_STREAM_SEMANTIC_KINDS.toolCall,
              durability: ASSESSMENT_AGENT_STREAM_DURABILITY.durable,
              toolName: "read_file",
              toolCallId: "call-read",
              parameters: { file_path: "/auth/tokens.py" },
            },
            {
              engineeringRuleId: "ER-1",
              toolName: "read_file",
              toolCallId: "call-read",
            },
          ),
          event(
            4,
            ASSESSMENT_AGENT_STREAM_EVENT_TYPES.modelResult,
            {
              schemaVersion: ASSESSMENT_AGENT_STREAM_SCHEMA_VERSIONS.semanticV1,
              kind: ASSESSMENT_AGENT_STREAM_SEMANTIC_KINDS.modelOutput,
              durability: ASSESSMENT_AGENT_STREAM_DURABILITY.durable,
              resultSummary: { text: "Tokens are validated before use." },
            },
            {
              engineeringRuleId: "ER-1",
              messageId: "m-2",
              toolName: null,
              toolCallId: null,
              status: ASSESSMENT_RUNTIME_RUN_STATUSES.completed,
            },
          ),
          engineeringRuleEvent(
            5,
            "ER-1",
            ASSESSMENT_RUNTIME_RUN_STATUSES.completed,
            {
              decision: "RULE_REQUIREMENT_MET",
              resultSummary: {
                claims: [
                  {
                    claimType: "RULE_REQUIREMENT_MET",
                    criterion: "Tokens are validated",
                    confidence: 0.9,
                    sourceLocations: "auth/tokens.py#L3-L9",
                  },
                ],
              },
            },
          ),
          engineeringRuleEvent(
            6,
            "ER-2",
            ASSESSMENT_RUNTIME_RUN_STATUSES.running,
            {
              concept: "Audit logging",
            },
          ),
        ]}
      />,
    );
  });

  const rules = container.querySelectorAll<HTMLElement>("[data-stream-rule]");
  assert.deepEqual(
    [...rules].map((rule) => [
      rule.getAttribute("data-stream-rule"),
      rule.getAttribute("data-stream-rule-status"),
    ]),
    [
      ["ER-1", ASSESSMENT_RUNTIME_RUN_STATUSES.completed],
      ["ER-2", ASSESSMENT_RUNTIME_RUN_STATUSES.running],
    ],
  );

  const firstRule = rules[0];
  assert.ok(firstRule);
  assert.match(firstRule.textContent ?? "", /Token validation/);
  const activities = firstRule.querySelectorAll(
    "details[data-stream-activity]",
  );
  // The two model messages and the tool call retain their own activity rows.
  assert.equal(activities.length, 3);
  const aiDetails = [
    ...firstRule.querySelectorAll(
      '[data-stream-kind="model"] [data-stream-detail]',
    ),
  ].map((detail) => detail.textContent);
  assert.deepEqual(aiDetails, [
    "Token checks live in auth/tokens.py.",
    "Tokens are validated before use.",
  ]);

  const result =
    firstRule.querySelector("[data-stream-rule-result]")?.textContent ?? "";
  assert.match(result, /RULE_REQUIREMENT_MET/);
  assert.match(result, /Tokens are validated/);
  assert.match(result, /90%/);
  assert.match(result, /auth\/tokens\.py#L3-L9/);

  // Lifecycle events are the section itself, never separate rows.
  assert.equal(
    container.querySelectorAll(":scope details[data-stream-activity]").length,
    3,
  );
});

test("each AI step remains visible while the next step is running", async () => {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  roots.push(root);
  const step = (
    sequence: number,
    eventType: AssessmentAgentStreamEvent["eventType"],
    modelStepId: string,
  ) =>
    event(
      sequence,
      eventType,
      {
        provider: "llm7",
        model: "GLM-5.3-Flash",
        elapsed_seconds: 1,
        model_step_id: modelStepId,
      },
      { toolName: null, toolCallId: null },
    );

  const firstTurn = [
    event(0, ASSESSMENT_AGENT_STREAM_EVENT_TYPES.boundaryStarted, null, {
      toolName: null,
      toolCallId: null,
    }),
    step(1, ASSESSMENT_AGENT_STREAM_EVENT_TYPES.modelCallStarted, "step-1"),
    step(2, ASSESSMENT_AGENT_STREAM_EVENT_TYPES.modelCallCompleted, "step-1"),
  ];
  await act(async () => {
    root.render(<AgentStreamTimeline events={firstTurn} />);
  });
  assert.equal(
    container.querySelectorAll('[data-stream-kind="model"]').length,
    1,
  );
  assert.equal(
    container.querySelector<HTMLDetailsElement>(
      'details[data-slot="agent-stream-timeline"]',
    )?.open,
    true,
  );

  await act(async () => {
    root.render(
      <AgentStreamTimeline
        events={[
          ...firstTurn,
          step(
            3,
            ASSESSMENT_AGENT_STREAM_EVENT_TYPES.credentialRotation,
            "step-2",
          ),
          step(
            4,
            ASSESSMENT_AGENT_STREAM_EVENT_TYPES.modelCallStarted,
            "step-2",
          ),
          step(
            5,
            ASSESSMENT_AGENT_STREAM_EVENT_TYPES.modelCallHeartbeat,
            "step-2",
          ),
        ]}
      />,
    );
  });

  const modelRows = container.querySelectorAll('[data-stream-kind="model"]');
  assert.equal(modelRows.length, 2);
  assert.equal(modelRows[0]?.getAttribute("data-stream-status"), "completed");
  assert.equal(modelRows[1]?.getAttribute("data-stream-status"), "running");
  assert.equal(
    container.querySelectorAll("details[data-stream-activity]").length,
    3,
  );
});

test("completed AI turns group incrementally with a count and retain every turn detail", async () => {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  roots.push(root);
  const result = (sequence: number) =>
    event(
      sequence,
      ASSESSMENT_AGENT_STREAM_EVENT_TYPES.modelResult,
      {
        schemaVersion: ASSESSMENT_AGENT_STREAM_SCHEMA_VERSIONS.semanticV1,
        kind: ASSESSMENT_AGENT_STREAM_SEMANTIC_KINDS.modelOutput,
        durability: ASSESSMENT_AGENT_STREAM_DURABILITY.durable,
        resultSummary: { text: `Completed turn ${sequence}` },
      },
      {
        messageId: `message-${sequence}`,
        toolName: null,
        toolCallId: null,
        status: ASSESSMENT_RUNTIME_RUN_STATUSES.completed,
      },
    );
  const running = event(
    3,
    ASSESSMENT_AGENT_STREAM_EVENT_TYPES.modelCallStarted,
    {
      model_step_id: "step-3",
    },
    { toolName: null, toolCallId: null },
  );

  await act(async () => {
    root.render(<AgentStreamTimeline events={[result(1), running]} />);
  });
  assert.equal(
    container.querySelectorAll('[data-stream-kind="model"]').length,
    2,
  );
  assert.equal(container.querySelector("[data-stream-repeat-count]"), null);

  await act(async () => {
    root.render(
      <AgentStreamTimeline events={[result(1), result(2), running]} />,
    );
  });
  const rows = container.querySelectorAll('[data-stream-kind="model"]');
  assert.equal(rows.length, 2);
  assert.equal(rows[0]?.getAttribute("data-stream-status"), "completed");
  assert.equal(
    rows[0]?.querySelector("[data-stream-repeat-count]")?.textContent,
    "×2",
  );
  assert.equal(rows[0]?.querySelectorAll("[data-stream-turn]").length, 2);
  assert.deepEqual(
    [...rows[0]!.querySelectorAll("[data-stream-detail]")].map(
      (detail) => detail.textContent,
    ),
    ["Completed turn 1", "Completed turn 2"],
  );
  assert.equal(rows[1]?.getAttribute("data-stream-status"), "running");
  assert.equal(
    container.querySelector<HTMLDetailsElement>(
      'details[data-slot="agent-stream-timeline"]',
    )?.open,
    true,
  );
});

test("repeated reads and AI completions update compact rows while preserving every detail", async () => {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  roots.push(root);
  const events: AssessmentAgentStreamEvent[] = [];
  for (const turn of [1, 2, 3]) {
    const sequence = turn * 3;
    events.push(
      event(
        sequence,
        ASSESSMENT_AGENT_STREAM_EVENT_TYPES.modelCallCompleted,
        { model_step_id: `step-${turn}` },
        {
          toolName: null,
          toolCallId: null,
          messageId: `m-${turn}`,
          status: ASSESSMENT_RUNTIME_RUN_STATUSES.completed,
        },
      ),
      event(
        sequence + 1,
        ASSESSMENT_AGENT_STREAM_EVENT_TYPES.semanticToolCall,
        {
          schemaVersion: ASSESSMENT_AGENT_STREAM_SCHEMA_VERSIONS.semanticV1,
          kind: ASSESSMENT_AGENT_STREAM_SEMANTIC_KINDS.toolCall,
          toolName: "read_file",
          toolCallId: `read-${turn}`,
          parameters: { file_path: `/src/file-${turn}.ts` },
        },
        { toolName: "read_file", toolCallId: `read-${turn}` },
      ),
      event(
        sequence + 2,
        ASSESSMENT_AGENT_STREAM_EVENT_TYPES.semanticToolResult,
        {
          schemaVersion: ASSESSMENT_AGENT_STREAM_SCHEMA_VERSIONS.semanticV1,
          kind: ASSESSMENT_AGENT_STREAM_SEMANTIC_KINDS.toolResult,
          toolName: "read_file",
          toolCallId: `read-${turn}`,
          result: `contents-${turn}`,
        },
        {
          toolName: "read_file",
          toolCallId: `read-${turn}`,
          status: ASSESSMENT_RUNTIME_RUN_STATUSES.completed,
        },
      ),
    );
    await act(async () =>
      root.render(<AgentStreamTimeline events={[...events]} />),
    );
    const reads = container.querySelectorAll('[data-stream-kind="tool"]');
    const models = container.querySelectorAll('[data-stream-kind="model"]');
    assert.equal(reads.length, 1);
    assert.equal(models.length, 1);
    assert.equal(
      reads[0]?.querySelector("[data-stream-target]")?.textContent,
      `/src/file-${turn}.ts`,
    );
    if (turn > 1) {
      assert.equal(
        reads[0]?.querySelector("[data-stream-repeat-count]")?.textContent,
        `×${turn}`,
      );
      assert.equal(
        models[0]?.querySelector("[data-stream-repeat-count]")?.textContent,
        `×${turn}`,
      );
      assert.equal(
        reads[0]?.querySelectorAll("[data-stream-turn]").length,
        turn,
      );
      for (let prior = 1; prior <= turn; prior++)
        assert.match(
          reads[0]!.textContent ?? "",
          new RegExp(`file-${prior}\\.ts`),
        );
    }
  }
});

test("completed AI grouping never crosses unfinished tools, stages, rules, agents, or failures", async () => {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  roots.push(root);
  const completed = (
    sequence: number,
    overrides: Partial<AssessmentAgentStreamEvent> = {},
  ) =>
    event(
      sequence,
      ASSESSMENT_AGENT_STREAM_EVENT_TYPES.modelCallCompleted,
      { model_step_id: `step-${sequence}` },
      {
        toolName: null,
        toolCallId: null,
        status: ASSESSMENT_RUNTIME_RUN_STATUSES.completed,
        ...overrides,
      },
    );

  await act(async () => {
    root.render(
      <AgentStreamTimeline
        events={[
          completed(1),
          event(
            2,
            ASSESSMENT_AGENT_STREAM_EVENT_TYPES.semanticToolCall,
            {
              schemaVersion: ASSESSMENT_AGENT_STREAM_SCHEMA_VERSIONS.semanticV1,
              kind: ASSESSMENT_AGENT_STREAM_SEMANTIC_KINDS.toolCall,
              toolName: "read_file",
              toolCallId: "read-2",
              parameters: { file_path: "/src/app.py" },
            },
            { toolCallId: "read-2" },
          ),
          completed(3),
          completed(4, { stage: ASSESSMENT_AGENT_STREAM_STAGES.interview }),
          completed(5, { engineeringRuleId: "ER-other" }),
          completed(6, { agentName: "other-agent" }),
          completed(7, { namespace: ["other-node"] }),
          event(
            8,
            ASSESSMENT_AGENT_STREAM_EVENT_TYPES.modelCallFailed,
            { model_step_id: "step-8" },
            {
              toolName: null,
              toolCallId: null,
              status: ASSESSMENT_RUNTIME_RUN_STATUSES.failed,
            },
          ),
          completed(9),
        ]}
      />,
    );
  });
  assert.equal(
    container.querySelectorAll('[data-stream-kind="model"]').length,
    8,
  );
  assert.equal(
    container.querySelectorAll('[data-stream-kind="tool"]').length,
    1,
  );
  assert.equal(container.querySelector("[data-stream-repeat-count]"), null);
  assert.equal(
    container.querySelectorAll('[data-stream-status="failed"]').length,
    1,
  );
});

test("scanner, interview, planner, and investigator publish visible turns before boundary completion", async () => {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  roots.push(root);
  const events: AssessmentAgentStreamEvent[] = [];
  const stages = [
    ASSESSMENT_AGENT_STREAM_STAGES.scanner,
    ASSESSMENT_AGENT_STREAM_STAGES.interview,
    ASSESSMENT_AGENT_STREAM_STAGES.planner,
    ASSESSMENT_AGENT_STREAM_STAGES.investigate,
  ];

  for (const [index, stage] of stages.entries()) {
    const sequence = index * 4;
    events.push(
      event(
        sequence,
        ASSESSMENT_AGENT_STREAM_EVENT_TYPES.boundaryStarted,
        null,
        {
          stage,
          messageId: null,
          toolCallId: null,
          toolName: null,
        },
      ),
      event(
        sequence + 1,
        ASSESSMENT_AGENT_STREAM_EVENT_TYPES.modelRequest,
        {
          schemaVersion: ASSESSMENT_AGENT_STREAM_SCHEMA_VERSIONS.semanticV1,
          kind: ASSESSMENT_AGENT_STREAM_SEMANTIC_KINDS.modelRequest,
          durability: ASSESSMENT_AGENT_STREAM_DURABILITY.durable,
        },
        { stage, messageId: `turn-${index}`, toolCallId: null, toolName: null },
      ),
      event(
        sequence + 2,
        ASSESSMENT_AGENT_STREAM_EVENT_TYPES.modelResult,
        {
          schemaVersion: ASSESSMENT_AGENT_STREAM_SCHEMA_VERSIONS.semanticV1,
          kind: ASSESSMENT_AGENT_STREAM_SEMANTIC_KINDS.modelOutput,
          durability: ASSESSMENT_AGENT_STREAM_DURABILITY.durable,
          resultSummary: { text: `Turn ${index + 1} complete` },
        },
        {
          stage,
          messageId: `turn-${index}`,
          toolCallId: null,
          toolName: null,
          status: ASSESSMENT_RUNTIME_RUN_STATUSES.completed,
        },
      ),
    );
    await act(async () => {
      root.render(<AgentStreamTimeline events={[...events]} />);
    });
    const rows = container.querySelectorAll<HTMLElement>(
      '[data-stream-kind="model"]',
    );
    assert.equal(rows.length, index + 1);
    assert.equal(rows[index]?.getAttribute("data-stream-status"), "completed");
    assert.match(
      rows[index]?.textContent ?? "",
      new RegExp(`Turn ${index + 1} complete`),
    );
    assert.equal(
      container.querySelector<HTMLDetailsElement>(
        'details[data-slot="agent-stream-timeline"]',
      )?.open,
      true,
    );
    events.push(
      event(
        sequence + 3,
        ASSESSMENT_AGENT_STREAM_EVENT_TYPES.boundaryCompleted,
        null,
        {
          stage,
          messageId: null,
          toolCallId: null,
          toolName: null,
          status: ASSESSMENT_RUNTIME_RUN_STATUSES.completed,
        },
      ),
    );
  }
});

test("late completion from a previous stage does not close the active agent turn", async () => {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  roots.push(root);

  await act(async () => {
    root.render(
      <AgentStreamTimeline
        events={[
          event(1, ASSESSMENT_AGENT_STREAM_EVENT_TYPES.boundaryStarted, null, {
            stage: ASSESSMENT_AGENT_STREAM_STAGES.scanner,
            messageId: null,
            toolName: null,
            toolCallId: null,
          }),
          event(2, ASSESSMENT_AGENT_STREAM_EVENT_TYPES.boundaryStarted, null, {
            stage: ASSESSMENT_AGENT_STREAM_STAGES.interview,
            messageId: null,
            toolName: null,
            toolCallId: null,
          }),
          event(
            3,
            ASSESSMENT_AGENT_STREAM_EVENT_TYPES.boundaryCompleted,
            null,
            {
              stage: ASSESSMENT_AGENT_STREAM_STAGES.scanner,
              messageId: null,
              toolName: null,
              toolCallId: null,
              status: ASSESSMENT_RUNTIME_RUN_STATUSES.completed,
            },
          ),
        ]}
      />,
    );
  });

  assert.equal(
    container.querySelector<HTMLDetailsElement>(
      'details[data-slot="agent-stream-timeline"]',
    )?.open,
    true,
  );
  assert.equal(
    container.querySelectorAll('[data-stream-status="running"]').length,
    1,
  );
});

test("budget and context trimming render as their own progress rows", async () => {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  roots.push(root);

  await act(async () => {
    root.render(
      <AgentStreamTimeline
        events={[
          event(
            1,
            ASSESSMENT_AGENT_STREAM_EVENT_TYPES.agentContextTrimmed,
            { cleared_tool_results: 4 },
            {
              toolName: null,
              toolCallId: null,
              status: ASSESSMENT_RUNTIME_RUN_STATUSES.completed,
            },
          ),
          event(
            2,
            ASSESSMENT_AGENT_STREAM_EVENT_TYPES.agentBudgetReached,
            { reason: "MODEL_CALL_BUDGET", model_calls: 24 },
            { toolName: null, toolCallId: null },
          ),
        ]}
      />,
    );
  });

  const progress = container.querySelectorAll('[data-stream-kind="progress"]');
  assert.equal(progress.length, 2);
  assert.match(
    progress[0]?.textContent ?? "",
    /Trimmed older tool results|Đã lược bớt kết quả tool cũ/,
  );
  assert.match(
    progress[1]?.textContent ?? "",
    /Step budget reached|Đã chạm giới hạn số bước/,
  );
});

test("repeated tool calls retain each target and result", async () => {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  roots.push(root);
  const call = (
    sequence: number,
    callId: string,
    parameters: Record<string, AssessmentRuntimeSummaryValue>,
  ) =>
    event(
      sequence,
      ASSESSMENT_AGENT_STREAM_EVENT_TYPES.semanticToolCall,
      {
        schemaVersion: ASSESSMENT_AGENT_STREAM_SCHEMA_VERSIONS.semanticV1,
        kind: ASSESSMENT_AGENT_STREAM_SEMANTIC_KINDS.toolCall,
        durability: ASSESSMENT_AGENT_STREAM_DURABILITY.durable,
        toolName: "read_file",
        toolCallId: callId,
        parameters,
      },
      {
        toolName: "read_file",
        toolCallId: callId,
        agentName: "repository-analyst",
      },
    );
  const result = (sequence: number, callId: string, text: string) =>
    event(
      sequence,
      ASSESSMENT_AGENT_STREAM_EVENT_TYPES.semanticToolResult,
      {
        schemaVersion: ASSESSMENT_AGENT_STREAM_SCHEMA_VERSIONS.semanticV1,
        kind: ASSESSMENT_AGENT_STREAM_SEMANTIC_KINDS.toolResult,
        durability: ASSESSMENT_AGENT_STREAM_DURABILITY.durable,
        toolName: "read_file",
        toolCallId: callId,
        resultSummary: { text },
      },
      {
        toolName: "read_file",
        toolCallId: callId,
        agentName: "repository-analyst",
        status: ASSESSMENT_RUNTIME_RUN_STATUSES.completed,
      },
    );

  await act(async () => {
    root.render(
      <AgentStreamTimeline
        events={[
          call(1, "c1", { file_path: "/src/app.py", offset: 0, limit: 100 }),
          result(2, "c1", "first page"),
          call(3, "c2", { file_path: "/src/app.py", offset: 100, limit: 100 }),
          result(4, "c2", "second page"),
          call(5, "c3", { file_path: "/src/other.py" }),
          result(6, "c3", "other file"),
          call(7, "c4", { file_path: "/src/app.py", offset: 200, limit: 100 }),
          result(8, "c4", "third page"),
        ]}
      />,
    );
  });

  const toolRows = container.querySelectorAll<HTMLElement>(
    '[data-stream-kind="tool"]',
  );
  assert.equal(toolRows.length, 1);
  assert.equal(
    toolRows[0]?.querySelector("[data-stream-target]")?.textContent,
    "/src/app.py",
  );
  assert.equal(
    toolRows[0]?.querySelector("[data-stream-repeat-count]")?.textContent,
    "×4",
  );
  const calls = toolRows[0]!.querySelectorAll("[data-stream-turn]");
  assert.equal(calls.length, 4);
  assert.match(calls[2]?.textContent ?? "", /\/src\/other\.py/);
  for (const [index, text] of [
    "first page",
    "second page",
    "other file",
    "third page",
  ].entries()) {
    assert.equal(toolRows[0]?.getAttribute("data-stream-status"), "completed");
    assert.match(calls[index]?.textContent ?? "", new RegExp(text));
  }
});

test("tool activities keep one row per call and use their activity icon", async () => {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  roots.push(root);
  const call = (
    sequence: number,
    toolName: string,
    parameters: Record<string, AssessmentRuntimeSummaryValue>,
  ) =>
    event(
      sequence,
      ASSESSMENT_AGENT_STREAM_EVENT_TYPES.semanticToolCall,
      {
        schemaVersion: ASSESSMENT_AGENT_STREAM_SCHEMA_VERSIONS.semanticV1,
        kind: ASSESSMENT_AGENT_STREAM_SEMANTIC_KINDS.toolCall,
        durability: ASSESSMENT_AGENT_STREAM_DURABILITY.durable,
        toolName,
        toolCallId: `call-${sequence}`,
        parameters,
      },
      { toolName, toolCallId: `call-${sequence}` },
    );

  await act(async () => {
    root.render(
      <AgentStreamTimeline
        events={[
          call(1, "ls", { path: "/workspace/repository" }),
          call(2, "grep", { pattern: "openai", path: "/workspace/repository" }),
          call(3, "execute", {
            command: "cd /workspace/repository && grep -n llm src",
          }),
          call(4, "read_file", {
            file_path: "/workspace/repository/src/app.py",
          }),
          call(5, "execute", {
            command: "cd /workspace/repository && sed -n '1,20p' src/app.py",
          }),
        ]}
      />,
    );
  });

  const icons = [
    ...container.querySelectorAll(
      '[data-stream-kind="tool"] [data-stream-activity-icon]',
    ),
  ].map((icon) => icon.getAttribute("data-stream-activity-icon"));
  // A shell grep is the same "searched" activity as the grep tool, and a shell
  // sed is the same "read" activity as read_file.
  assert.deepEqual(icons, [
    "repositoryFilesInspected",
    "repositorySourceSearched",
    "repositorySourceSearched",
    "sourceFilesReviewed",
    "sourceFilesReviewed",
  ]);
  const counts = [
    ...container.querySelectorAll('[data-stream-kind="tool"]'),
  ].map(
    (row) =>
      row
        .querySelector("[data-stream-repeat-count]")
        ?.getAttribute("data-stream-repeat-count") ?? "1",
  );
  assert.deepEqual(counts, ["1", "1", "1", "1", "1"]);
});

test("repeated activities such as context trimming retain each occurrence", async () => {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  roots.push(root);
  const trimmed = (sequence: number, cleared: number) =>
    event(
      sequence,
      ASSESSMENT_AGENT_STREAM_EVENT_TYPES.agentContextTrimmed,
      { cleared_tool_results: cleared },
      {
        toolName: null,
        toolCallId: null,
        status: ASSESSMENT_RUNTIME_RUN_STATUSES.completed,
      },
    );

  await act(async () => {
    root.render(
      <AgentStreamTimeline
        events={[trimmed(1, 2), trimmed(2, 3), trimmed(3, 5)]}
      />,
    );
  });

  const rows = container.querySelectorAll('[data-stream-kind="progress"]');
  assert.equal(rows.length, 3);
  for (const [index, count] of [2, 3, 5].entries()) {
    const technical =
      rows[index]?.querySelector("[data-stream-technical-details]")
        ?.textContent ?? "";
    assert.match(technical, new RegExp(`"cleared_tool_results": ${count}`));
  }
});

test("one pipeline dispatch spanning Planner and Investigator renders as a single AgentStreamTurn", async () => {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  roots.push(root);

  const plannerEvents = [
    {
      ...engineeringRuleEvent(
        1,
        "ER-COMBINED",
        ASSESSMENT_RUNTIME_RUN_STATUSES.completed,
        {
          decision: ASSESSMENT_ENGINEERING_RULE_PLAN_DECISIONS.select,
          concept: "AI risk classification before use",
          investigationGoals: ["Verify classification happens before use"],
        },
      ),
      stage: ASSESSMENT_AGENT_STREAM_STAGES.planner,
    },
  ];
  const investigateEvents = [
    {
      ...engineeringRuleEvent(
        2,
        "ER-COMBINED",
        ASSESSMENT_RUNTIME_RUN_STATUSES.completed,
        {
          concept: "AI risk classification before use",
          resultSummary: {
            claims: [
              {
                claimType: "CLASSIFICATION_GATE_FOUND",
                criterion:
                  "The system classifies AI risk before the feature is used.",
                confidence: 0.85,
                limitations: [],
                sourceLocations: "apps/api/src/risk/classifier.ts#L10-L40",
              },
            ],
          },
        },
      ),
      stage: ASSESSMENT_AGENT_STREAM_STAGES.investigate,
    },
  ];

  await act(async () => {
    root.render(
      <AgentStreamTurn
        stages={[
          ASSESSMENT_AGENT_STREAM_STAGES.planner,
          ASSESSMENT_AGENT_STREAM_STAGES.investigate,
        ]}
        runId="run-1"
        events={[...plannerEvents, ...investigateEvents]}
        stageEvents={{
          [ASSESSMENT_AGENT_STREAM_STAGES.planner]: plannerEvents,
          [ASSESSMENT_AGENT_STREAM_STAGES.investigate]: investigateEvents,
        }}
      />,
    );
  });

  assert.equal(
    container.querySelectorAll("[data-slot='agent-turn']").length,
    1,
    "Planner and Investigator sharing a dispatch must render as ONE turn, not two",
  );
  assert.match(container.textContent ?? "", /LCSP Assessment Agent/);
  assert.match(
    container.textContent ?? "",
    /Verify classification happens before use/,
  );
  assert.match(
    container.textContent ?? "",
    /classifies AI risk before the feature is used/,
  );

  const technicalDetails = container.querySelector(
    "[data-slot='agent-stream-turn-technical-details']",
  );
  assert.ok(technicalDetails, "raw codes stay reachable via Technical details");
  const clone = container.cloneNode(true) as HTMLElement;
  clone
    .querySelector("[data-slot='agent-stream-turn-technical-details']")
    ?.remove();
  const customerFacingText = clone.textContent ?? "";
  assert.doesNotMatch(customerFacingText, /ER-COMBINED/);
  assert.doesNotMatch(customerFacingText, /CLASSIFICATION_GATE_FOUND/);
  assert.match(
    technicalDetails?.textContent ?? "",
    /CLASSIFICATION_GATE_FOUND/,
  );
});

test("Planner output falls back to the rule's concept when investigationGoals have not streamed in yet", async () => {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  roots.push(root);

  const plannerEvents = [
    {
      ...engineeringRuleEvent(
        1,
        "ER-NO-GOALS",
        ASSESSMENT_RUNTIME_RUN_STATUSES.completed,
        {
          decision: ASSESSMENT_ENGINEERING_RULE_PLAN_DECISIONS.select,
          concept: "Automated decision review path",
        },
      ),
      stage: ASSESSMENT_AGENT_STREAM_STAGES.planner,
    },
  ];

  await act(async () => {
    root.render(
      <AgentStreamTurn
        stages={[ASSESSMENT_AGENT_STREAM_STAGES.planner]}
        runId="run-1"
        events={plannerEvents}
        stageEvents={{
          [ASSESSMENT_AGENT_STREAM_STAGES.planner]: plannerEvents,
        }}
      />,
    );
  });

  assert.equal(
    container.querySelectorAll("[data-stream-planner-goal]").length,
    1,
    "a selected rule with a concept must still show a planning summary",
  );
  assert.match(container.textContent ?? "", /Automated decision review path/);
  const output = container.querySelector("[data-stream-planner-output]");
  assert.doesNotMatch(output?.textContent ?? "", /ER-NO-GOALS/);
});

test("customer-facing Investigator output never shows raw ruleId, decision, or claimType", async () => {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  roots.push(root);

  const investigateEvents = [
    {
      ...engineeringRuleEvent(
        1,
        "AUTO-VN-LEGAL-2026-08-134-2025-QH15::art-10::cl-1::ENG::1",
        ASSESSMENT_RUNTIME_RUN_STATUSES.failed,
        { reasonCode: "MISSING_EVIDENCE" },
      ),
      stage: ASSESSMENT_AGENT_STREAM_STAGES.investigate,
    },
  ];

  await act(async () => {
    root.render(
      <AgentStreamTurn
        stages={[ASSESSMENT_AGENT_STREAM_STAGES.investigate]}
        runId="run-1"
        events={investigateEvents}
        stageEvents={{
          [ASSESSMENT_AGENT_STREAM_STAGES.investigate]: investigateEvents,
        }}
      />,
    );
  });

  const output = container.querySelector("[data-stream-investigator-output]");
  assert.ok(output, "a failed investigation must still surface a result card");
  assert.doesNotMatch(
    output.textContent ?? "",
    /AUTO-VN-LEGAL-2026-08-134-2025-QH15/,
  );
  assert.doesNotMatch(output.textContent ?? "", /MISSING_EVIDENCE/);
  assert.doesNotMatch(output.textContent ?? "", /\bFAILED\b/);
});

test("failed Investigator dispatch shows one summary and keeps rule failures in nested raw events", async () => {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  roots.push(root);
  const stage = ASSESSMENT_AGENT_STREAM_STAGES.investigate;
  const events = [
    event(1, ASSESSMENT_AGENT_STREAM_EVENT_TYPES.boundaryStarted, null, {
      stage,
    }),
    ...[2, 3].map((sequence) => ({
      ...engineeringRuleEvent(
        sequence,
        `RAW_RULE_${sequence}`,
        ASSESSMENT_RUNTIME_RUN_STATUSES.failed,
        { concept: "Human review of automated decisions" },
      ),
      stage,
    })),
    event(4, ASSESSMENT_AGENT_STREAM_EVENT_TYPES.boundaryFailed, null, {
      stage,
      status: ASSESSMENT_RUNTIME_RUN_STATUSES.failed,
    }),
  ];
  await act(async () =>
    root.render(
      <AgentStreamTurn
        stages={[stage]}
        runId="run-1"
        events={events}
        stageEvents={{ [stage]: events }}
      />,
    ),
  );
  assert.equal(
    container.querySelectorAll("[data-stream-investigator-failure-summary]")
      .length,
    1,
  );
  assert.equal(
    container.querySelectorAll("[data-stream-investigator-rule]").length,
    0,
  );
  const technical = container.querySelector(
    "[data-slot='agent-stream-turn-technical-details']",
  );
  const raw = container.querySelector("[data-stream-raw-events]");
  assert.ok(technical && raw && technical.contains(raw));
  assert.equal(technical.hasAttribute("open"), false);
  assert.equal(raw.hasAttribute("open"), false);
  assert.ok(container.querySelector("[data-stream-technical-summary]"));
  const customer = container.cloneNode(true) as HTMLElement;
  customer
    .querySelector("[data-slot='agent-stream-turn-technical-details']")
    ?.remove();
  assert.doesNotMatch(customer.textContent ?? "", /RAW_RULE_/);
});

test("untagged dispatch timeout closes Investigator and shows one customer-safe failure", async () => {
  const stages = ASSESSMENT_AGENT_STREAM_STAGES;
  const types = ASSESSMENT_AGENT_STREAM_EVENT_TYPES;
  const events = [
    event(1, types.boundaryStarted, null, { stage: stages.interview }),
    event(2, types.modelCallStarted, null, { stage: stages.investigate }),
    event(
      3,
      types.boundaryFailed,
      { reasonCode: "AGENT_RUNTIME_BOUNDARY_TIMEOUT" },
      {
        stage: null,
        status: ASSESSMENT_RUNTIME_RUN_STATUSES.failed,
      },
    ),
  ];
  const grouped = groupAgentStreamEventsByStage(events);
  const activity = groupAgentStreamActivityByTurnKey(
    [stages.interview, stages.investigate].map((stage) => ({
      stage,
      groups: groupAgentStreamEventsByRun(grouped.byStage[stage]),
    })),
  )[0]!;
  assert.equal(activity.events.length, 3);
  assert.ok(
    activity.stageEvents[stages.investigate]?.some(
      (item) => item.eventId === events[2]!.eventId,
    ),
  );

  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  roots.push(root);
  await act(async () => root.render(<AgentStreamTurn {...activity} />));
  assert.equal(
    container.querySelectorAll("[data-stream-investigator-failure-summary]")
      .length,
    1,
  );
  const technical = container.querySelector(
    "[data-slot='agent-stream-turn-technical-details']",
  );
  assert.ok(technical?.querySelector("[data-stream-raw-events]"));
  assert.match(technical?.textContent ?? "", /AGENT_RUNTIME_BOUNDARY_TIMEOUT/);
  const customer = container.cloneNode(true) as HTMLElement;
  customer
    .querySelector("[data-slot='agent-stream-turn-technical-details']")
    ?.remove();
  assert.doesNotMatch(
    customer.textContent ?? "",
    /AGENT_RUNTIME_BOUNDARY_TIMEOUT|reasonCode/,
  );
});

test("failed Planner fallback has a clean summary and no selected-goal output", async () => {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  roots.push(root);
  const stage = ASSESSMENT_AGENT_STREAM_STAGES.planner;
  const events = [
    {
      ...engineeringRuleEvent(
        1,
        "RAW_PLANNER_RULE",
        ASSESSMENT_RUNTIME_RUN_STATUSES.completed,
        {
          decision: ASSESSMENT_ENGINEERING_RULE_PLAN_DECISIONS.select,
          reasonCode: ASSESSMENT_RUNTIME_PLAN_REASON_CODES.plannerFailure,
        },
      ),
      stage,
    },
  ];
  await act(async () =>
    root.render(
      <AgentStreamTurn
        stages={[stage]}
        runId="run-1"
        events={events}
        stageEvents={{ [stage]: events }}
      />,
    ),
  );
  const failure = container.querySelector(
    "[data-stream-planner-failure-summary]",
  );
  assert.ok(failure);
  assert.match(
    failure.textContent ?? "",
    /investigation planning|lập kế hoạch điều tra/,
  );
  assert.equal(container.querySelector("[data-stream-planner-output]"), null);
  const technical = container.querySelector(
    "[data-slot=agent-stream-turn-technical-details]",
  );
  assert.ok(technical?.querySelector("[data-stream-raw-events]"));
  assert.match(technical?.textContent ?? "", /PLANNER_FAILURE/);
  const customer = container.cloneNode(true) as HTMLElement;
  customer
    .querySelector("[data-slot=agent-stream-turn-technical-details]")
    ?.remove();
  assert.doesNotMatch(
    customer.textContent ?? "",
    /PLANNER_FAILURE|reasonCode|RAW_PLANNER_RULE/,
  );
  // Failure fallback metadata never masquerades as a successful selected plan.
  const withMetadata = [
    {
      ...events[0]!,
      data: {
        ...(events[0]!.data as object),
        concept: "Human review",
        investigationGoals: ["Verify approval"],
      },
    },
  ];
  await act(async () =>
    root.render(
      <AgentStreamTurn
        stages={[stage]}
        runId="run-1"
        events={withMetadata}
        stageEvents={{ [stage]: withMetadata }}
      />,
    ),
  );
  assert.ok(container.querySelector("[data-stream-planner-failure-summary]"));
  assert.equal(container.querySelector("[data-stream-planner-output]"), null);
});

test("merged copied terminal events retain stage closure without duplicate React keys", async () => {
  const stages = [
    ASSESSMENT_AGENT_STREAM_STAGES.interview,
    ASSESSMENT_AGENT_STREAM_STAGES.planner,
    ASSESSMENT_AGENT_STREAM_STAGES.investigate,
  ];
  const events = [
    event(1, ASSESSMENT_AGENT_STREAM_EVENT_TYPES.boundaryStarted, null, {
      stage: stages[0]!,
    }),
    event(
      2,
      ASSESSMENT_AGENT_STREAM_EVENT_TYPES.modelCallCompleted,
      { model_step_id: "planning" },
      { stage: stages[1]!, status: ASSESSMENT_RUNTIME_RUN_STATUSES.completed },
    ),
    event(
      3,
      ASSESSMENT_AGENT_STREAM_EVENT_TYPES.modelCallCompleted,
      { model_step_id: "investigating" },
      { stage: stages[2]!, status: ASSESSMENT_RUNTIME_RUN_STATUSES.completed },
    ),
    event(4, ASSESSMENT_AGENT_STREAM_EVENT_TYPES.boundaryCompleted, null, {
      stage: stages[0]!,
      status: ASSESSMENT_RUNTIME_RUN_STATUSES.completed,
    }),
  ];
  const grouped = groupAgentStreamEventsByStage(events);
  const activity = groupAgentStreamActivityByTurnKey(
    stages.map((stage) => ({
      stage,
      groups: groupAgentStreamEventsByRun(grouped.byStage[stage]),
    })),
  )[0]!;
  assert.equal(activity.events.length, events.length);
  for (const stage of stages)
    assert.ok(
      activity.stageEvents[stage]?.some(
        (e) => e.eventId === events[3]!.eventId,
      ),
    );
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  roots.push(root);
  const errors: string[] = [];
  const originalError = console.error;
  console.error = (...args: unknown[]) => {
    errors.push(args.map(String).join(" "));
  };
  try {
    await act(async () => root.render(<AgentStreamTurn {...activity} />));
    await act(async () =>
      root.render(
        <AgentStreamTurn {...activity} events={[...activity.events]} />,
      ),
    );
  } finally {
    console.error = originalError;
  }
  assert.equal(
    errors.filter((message) => /same key|unique.*key/i.test(message)).length,
    0,
    errors.join("\n"),
  );
  assert.equal(
    container.querySelectorAll(".animate-spin").length,
    0,
    "deduplication must preserve terminal closure",
  );
});
