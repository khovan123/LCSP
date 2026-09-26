import assert from "node:assert/strict";
import { test } from "node:test";

import {
  ASSESSMENT_AGENT_STREAM_EVENT_TYPES,
  ASSESSMENT_AGENT_STREAM_STAGES,
  type AssessmentAgentStreamEvent,
  type AssessmentAgentStreamStage,
} from "@lcsp/contracts/evidence";

import { groupAgentStreamEventsByStage } from "../src/features/workspace/utils/agent-stream-stages.ts";

function event(
  sequence: number,
  stage: AssessmentAgentStreamStage | null,
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
