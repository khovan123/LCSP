import assert from "node:assert/strict";
import { test } from "node:test";

import {
  ASSESSMENT_AGENT_STREAM_EVENT_TYPES,
  ASSESSMENT_AGENT_STREAM_STAGES,
  type AssessmentAgentStreamEvent,
  type AssessmentAgentStreamStage,
} from "@lcsp/contracts/evidence";

import {
  deriveLatestAgentStreamTurnState,
  groupAgentStreamEventsByRun,
  groupAgentStreamEventsByStage,
  interleaveInterviewTranscript,
} from "../src/features/workspace/utils/agent-stream-stages.ts";

function answer(
  questionId: string,
  answeredAt: string,
): import("@lcsp/contracts/evidence").AssessmentInterviewAnswerHistoryItem {
  return { questionId, answeredAt, summary: `answer-${questionId}` };
}

function event(
  sequence: number,
  stage: AssessmentAgentStreamStage | null,
  overrides: Partial<AssessmentAgentStreamEvent> = {},
): AssessmentAgentStreamEvent {
  return {
    eventId: `event-${sequence}`,
    sequence,
    clientSequence: sequence,
    emittedAt: "2026-09-26T00:00:00.000Z",
    assessmentId: "assessment-1",
    runId: "scan-job-1",
    correlationId: "corr-1",
    eventType: ASSESSMENT_AGENT_STREAM_EVENT_TYPES.modelContentDelta,
    stage,
    engineeringRuleId: null,
    source: null,
    agentName: null,
    subagentName: null,
    namespace: [],
    nodeName: null,
    messageId: null,
    toolName: null,
    toolCallId: null,
    status: null,
    text: `delta-${sequence}`,
    data: null,
    ...overrides,
  };
}

test("agent stream events split into one timeline per pipeline stage", () => {
  const grouped = groupAgentStreamEventsByStage([
    event(1, ASSESSMENT_AGENT_STREAM_STAGES.scanner),
    event(2, ASSESSMENT_AGENT_STREAM_STAGES.interview),
    event(3, ASSESSMENT_AGENT_STREAM_STAGES.planner),
    event(4, ASSESSMENT_AGENT_STREAM_STAGES.investigate),
    event(5, ASSESSMENT_AGENT_STREAM_STAGES.planner),
    event(6, ASSESSMENT_AGENT_STREAM_STAGES.gate),
    event(7, null),
  ]);

  const sequences = (events: AssessmentAgentStreamEvent[]) =>
    events.map((item) => item.sequence);
  assert.deepEqual(
    sequences(grouped.byStage[ASSESSMENT_AGENT_STREAM_STAGES.scanner]),
    [1],
  );
  assert.deepEqual(
    sequences(grouped.byStage[ASSESSMENT_AGENT_STREAM_STAGES.interview]),
    [2],
  );
  assert.deepEqual(
    sequences(grouped.byStage[ASSESSMENT_AGENT_STREAM_STAGES.planner]),
    [3, 5],
  );
  assert.deepEqual(
    sequences(grouped.byStage[ASSESSMENT_AGENT_STREAM_STAGES.investigate]),
    [4],
  );
  assert.deepEqual(
    sequences(grouped.byStage[ASSESSMENT_AGENT_STREAM_STAGES.gate]),
    [6],
  );
  assert.deepEqual(sequences(grouped.unstaged), [7]);
});

test("agent stream events split into one group per run, oldest turn first", () => {
  const groups = groupAgentStreamEventsByRun([
    event(2, ASSESSMENT_AGENT_STREAM_STAGES.interview, {
      runId: "interview-turn-2",
      emittedAt: "2026-09-26T00:05:00.000Z",
    }),
    event(1, ASSESSMENT_AGENT_STREAM_STAGES.interview, {
      runId: "interview-turn-1",
      emittedAt: "2026-09-26T00:00:00.000Z",
    }),
    event(3, ASSESSMENT_AGENT_STREAM_STAGES.interview, {
      runId: "interview-turn-1",
      emittedAt: "2026-09-26T00:01:00.000Z",
    }),
  ]);

  // Each interview turn resumes in its own run; grouping by run keeps every
  // turn's own activity/thinking visible instead of only the latest run.
  assert.deepEqual(
    groups.map((group) => group.runId),
    ["interview-turn-1", "interview-turn-2"],
  );
  assert.deepEqual(
    groups.map((group) => group.events.map((item) => item.sequence)),
    [[1, 3], [2]],
  );
});

test("turn state is idle with no events", () => {
  assert.equal(deriveLatestAgentStreamTurnState([]), "idle");
});

test("turn state is running before any terminal event arrives", () => {
  const state = deriveLatestAgentStreamTurnState([
    event(1, ASSESSMENT_AGENT_STREAM_STAGES.interview, {
      eventType: ASSESSMENT_AGENT_STREAM_EVENT_TYPES.modelRequest,
    }),
  ]);
  assert.equal(state, "running");
});

test("turn state is idle once the run completes normally", () => {
  const state = deriveLatestAgentStreamTurnState([
    event(1, ASSESSMENT_AGENT_STREAM_STAGES.interview, {
      eventType: ASSESSMENT_AGENT_STREAM_EVENT_TYPES.modelRequest,
    }),
    event(2, ASSESSMENT_AGENT_STREAM_STAGES.interview, {
      eventType: ASSESSMENT_AGENT_STREAM_EVENT_TYPES.boundaryCompleted,
    }),
  ]);
  assert.equal(state, "idle");
});

test("turn state is idle when the run genuinely fails, not paused", () => {
  const state = deriveLatestAgentStreamTurnState([
    event(1, ASSESSMENT_AGENT_STREAM_STAGES.interview, {
      eventType: ASSESSMENT_AGENT_STREAM_EVENT_TYPES.agentFailed,
      data: { reasonCode: "PROVIDER_TIMEOUT" },
    }),
  ]);
  assert.equal(state, "idle");
});

test("turn state is paused when the worker reports a cooperative stop", () => {
  const state = deriveLatestAgentStreamTurnState([
    event(1, ASSESSMENT_AGENT_STREAM_STAGES.interview, {
      eventType: ASSESSMENT_AGENT_STREAM_EVENT_TYPES.modelRequest,
    }),
    event(2, ASSESSMENT_AGENT_STREAM_STAGES.interview, {
      eventType: ASSESSMENT_AGENT_STREAM_EVENT_TYPES.agentFailed,
      data: { reasonCode: "CUSTOMER_REQUESTED_STOP" },
    }),
  ]);
  assert.equal(state, "paused");
});

test("interview transcript interleaves each turn's activity between its own answer and the next one", () => {
  const segments = interleaveInterviewTranscript(
    [
      answer("q-1", "2026-09-27T11:01:00.000Z"),
      answer("q-2", "2026-09-27T11:25:00.000Z"),
    ],
    [
      {
        stage: ASSESSMENT_AGENT_STREAM_STAGES.interview,
        groups: groupAgentStreamEventsByRun([
          // Ran right after q-1 was answered, well before q-2.
          event(1, ASSESSMENT_AGENT_STREAM_STAGES.interview, {
            runId: "turn-1",
            emittedAt: "2026-09-27T11:01:05.000Z",
          }),
          // Ran right after q-2 was answered.
          event(2, ASSESSMENT_AGENT_STREAM_STAGES.interview, {
            runId: "turn-2",
            emittedAt: "2026-09-27T11:25:05.000Z",
          }),
        ]),
      },
      { stage: ASSESSMENT_AGENT_STREAM_STAGES.planner, groups: [] },
      { stage: ASSESSMENT_AGENT_STREAM_STAGES.investigate, groups: [] },
      { stage: ASSESSMENT_AGENT_STREAM_STAGES.gate, groups: [] },
    ],
  );

  // Previously every answer rendered first and every activity block rendered
  // afterward as one lump; each run must now sit right after its own turn.
  assert.deepEqual(
    segments.map((segment) =>
      segment.kind === "answer" ? segment.answer.questionId : segment.runId,
    ),
    ["q-1", "turn-1", "q-2", "turn-2"],
  );
});

test("turn state reflects only the latest run, not an earlier paused one", () => {
  const state = deriveLatestAgentStreamTurnState([
    event(1, ASSESSMENT_AGENT_STREAM_STAGES.interview, {
      runId: "turn-1",
      emittedAt: "2026-09-26T00:00:00.000Z",
      eventType: ASSESSMENT_AGENT_STREAM_EVENT_TYPES.agentFailed,
      data: { reasonCode: "CUSTOMER_REQUESTED_STOP" },
    }),
    event(2, ASSESSMENT_AGENT_STREAM_STAGES.interview, {
      runId: "turn-2",
      emittedAt: "2026-09-26T00:05:00.000Z",
      eventType: ASSESSMENT_AGENT_STREAM_EVENT_TYPES.modelRequest,
    }),
  ]);
  assert.equal(state, "running");
});
