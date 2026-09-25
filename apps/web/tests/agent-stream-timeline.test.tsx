import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

import {
  ASSESSMENT_AGENT_STREAM_DURABILITY,
  ASSESSMENT_AGENT_STREAM_EVENT_TYPES,
  ASSESSMENT_AGENT_STREAM_SCHEMA_VERSIONS,
  ASSESSMENT_AGENT_STREAM_SEMANTIC_KINDS,
  ASSESSMENT_RUNTIME_RUN_STATUSES,
  type AssessmentAgentStreamEvent,
} from "@lcsp/contracts/evidence";
import { JSDOM } from "jsdom";
import React, { act } from "react";

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
const { AgentStreamTimeline } = await import(
  "../src/features/workspace/components/molecules/agent-stream-timeline.tsx"
);

const roots: ReturnType<typeof createRoot>[] = [];

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
            { toolName: null, status: ASSESSMENT_RUNTIME_RUN_STATUSES.completed },
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
            { toolName: null, status: ASSESSMENT_RUNTIME_RUN_STATUSES.completed },
          ),
        ]}
      />,
    );
  });

  const activities = container.querySelectorAll<HTMLDetailsElement>(
    "details[data-stream-activity]",
  );
  assert.equal(activities.length, 4);

  const toolSummary = activities[0]?.querySelector("summary")?.textContent ?? "";
  assert.match(
    toolSummary,
    /Searched repository source|Đã tìm kiếm trong source repository/,
  );
  assert.doesNotMatch(toolSummary, /search_nodes|AI_MODEL_INVOCATION|obs-42/);

  const technical = activities[0]?.querySelector(
    "[data-stream-technical-details]",
  )?.textContent ?? "";
  assert.match(technical, /search_nodes/);
  assert.match(technical, /AI_MODEL_INVOCATION/);
  assert.match(technical, /obs-42/);
  assert.match(technical, /\[REDACTED\]/);

  const modelRequestTechnical = activities[1]?.querySelector(
    "[data-stream-technical-details]",
  )?.textContent ?? "";
  assert.match(modelRequestTechnical, /list_observations/);
  assert.match(modelRequestTechnical, /artifact:1/);

  const modelResultTechnical = activities[2]?.querySelector(
    "[data-stream-technical-details]",
  )?.textContent ?? "";
  assert.match(modelResultTechnical, /output:final/);
  assert.match(modelResultTechnical, /output_tokens/);

  const skillTechnical = activities[3]?.querySelector(
    "[data-stream-technical-details]",
  )?.textContent ?? "";
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
  assert.doesNotMatch(summary, /google_genai|gemini|model call|timeout_seconds/);

  const technical =
    activity.querySelector("[data-stream-technical-details]")?.textContent ?? "";
  assert.match(technical, /gemini-3\.5-flash-lite/);
  assert.match(technical, /google_genai/);
  assert.match(technical, /MODEL_CALL_STARTED/);
  assert.match(technical, /MODEL_CALL_HEARTBEAT/);
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
  assert.doesNotMatch(summary, /billing|count|search_nodes/);

  const technical =
    activity.querySelector("[data-stream-technical-details]")?.textContent ?? "";
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
  assert.equal(
    container.querySelectorAll('[data-stream-kind="reasoning"]').length,
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
          event(
            1,
            ASSESSMENT_AGENT_STREAM_EVENT_TYPES.agentStarted,
            null,
            {
              agentName: "repository-analyst",
              toolName: null,
              toolCallId: null,
              status: ASSESSMENT_RUNTIME_RUN_STATUSES.running,
              emittedAt: "2026-09-20T00:00:00.000Z",
            },
          ),
          event(
            2,
            ASSESSMENT_AGENT_STREAM_EVENT_TYPES.agentCompleted,
            null,
            {
              agentName: "repository-analyst",
              toolName: null,
              toolCallId: null,
              status: ASSESSMENT_RUNTIME_RUN_STATUSES.completed,
              emittedAt: "2026-09-20T00:00:03.000Z",
            },
          ),
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
    activities[0]?.querySelector("[data-stream-technical-details]")?.textContent ??
    "";
  assert.match(firstTechnical, /RUN_STARTED/);
  assert.match(firstTechnical, /scan_requested/);
  assert.match(firstTechnical, /run-1/);

  const fallbackTechnical =
    activities[3]?.querySelector("[data-stream-technical-details]")?.textContent ??
    "";
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

  const fallbackActivity = [...container.querySelectorAll<HTMLElement>(
    '[data-stream-status="completed"]',
  )].find((node) =>
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
    'details[data-stream-activity]',
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
