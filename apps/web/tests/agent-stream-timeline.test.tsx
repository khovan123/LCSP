import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

import {
  ASSESSMENT_AGENT_STREAM_DURABILITY,
  ASSESSMENT_AGENT_STREAM_EVENT_TYPES,
  ASSESSMENT_AGENT_STREAM_SCHEMA_VERSIONS,
  ASSESSMENT_AGENT_STREAM_SEMANTIC_KINDS,
  ASSESSMENT_AGENT_STREAM_STAGES,
  ASSESSMENT_RUNTIME_RUN_STATUSES,
  type AssessmentAgentStreamEvent,
  type AssessmentRuntimeSummaryValue,
} from "@lcsp/contracts/evidence";
import { JSDOM } from "jsdom";
import React, { act } from "react";

import {
  groupAgentStreamEventsByRun,
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
const { AgentStreamTimeline } =
  await import("../src/features/workspace/components/molecules/agent-stream-timeline.tsx");
const { InterviewAnswerHistory } =
  await import("../src/features/workspace/components/molecules/interview-answer-history.tsx");

const roots: ReturnType<typeof createRoot>[] = [];

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

test("historical interview activity sits below its agent question and above the customer answer", async () => {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  roots.push(root);
  await act(async () => {
    root.render(
      <InterviewAnswerHistory
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
    question.compareDocumentPosition(activity) &
      Node.DOCUMENT_POSITION_FOLLOWING,
  );
  assert.ok(
    activity.compareDocumentPosition(answer) & Node.DOCUMENT_POSITION_FOLLOWING,
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
        emittedAt: `2026-09-27T11:0${turn * 2}:00Z`,
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
            <InterviewAnswerHistory
              key={turn.answer.questionId}
              answer={turn.answer}
              activity={
                <div data-question-activity={turn.answer.questionId}>
                  {turn.activity.map((segment) => (
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
        question.compareDocumentPosition(activity) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      );
      assert.ok(
        activity.compareDocumentPosition(answer) &
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
