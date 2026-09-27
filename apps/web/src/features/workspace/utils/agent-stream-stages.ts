import {
  ASSESSMENT_AGENT_STREAM_EVENT_TYPES,
  ASSESSMENT_AGENT_STREAM_STAGES,
  type AssessmentAgentStreamEvent,
  type AssessmentAgentStreamStage,
  type AssessmentInterviewAnswerHistoryItem,
} from "@lcsp/contracts/evidence";

import type { AgentStreamStageEvents } from "../types/workspace-runtime.types.ts";

/**
 * Split live agent events by pipeline stage so Interview, Planner, Investigate and
 * Gate each stream on their own timeline, exactly like the Scanner does.
 */
export function groupAgentStreamEventsByStage(
  events: AssessmentAgentStreamEvent[],
): AgentStreamStageEvents {
  const grouped: AgentStreamStageEvents = {
    byStage: {
      [ASSESSMENT_AGENT_STREAM_STAGES.scanner]: [],
      [ASSESSMENT_AGENT_STREAM_STAGES.interview]: [],
      [ASSESSMENT_AGENT_STREAM_STAGES.planner]: [],
      [ASSESSMENT_AGENT_STREAM_STAGES.investigate]: [],
      [ASSESSMENT_AGENT_STREAM_STAGES.gate]: [],
    },
    unstaged: [],
  };
  for (const event of events) {
    if (event.stage === null) {
      grouped.unstaged.push(event);
    } else {
      grouped.byStage[event.stage].push(event);
    }
  }
  return grouped;
}

export type AgentStreamRunGroup = {
  runId: string;
  events: AssessmentAgentStreamEvent[];
};

/**
 * Split one stage's events into one group per run, oldest first. Interview,
 * Planner, Investigate and Gate each resume in a new run per turn; without this,
 * rendering the stage's events in one AgentStreamTimeline (which shows only the
 * latest run) silently drops every earlier turn's activity/thinking.
 */
export function groupAgentStreamEventsByRun(
  events: AssessmentAgentStreamEvent[],
): AgentStreamRunGroup[] {
  const ordered = [...events].sort((left, right) => {
    const emittedAt = left.emittedAt.localeCompare(right.emittedAt);
    if (emittedAt !== 0) return emittedAt;
    return left.sequence - right.sequence;
  });
  const groups = new Map<string, AssessmentAgentStreamEvent[]>();
  for (const event of ordered) {
    const existing = groups.get(event.runId);
    if (existing) {
      existing.push(event);
    } else {
      groups.set(event.runId, [event]);
    }
  }
  return [...groups.entries()].map(([runId, runEvents]) => ({
    runId,
    events: runEvents,
  }));
}

export type AgentStreamTurnState = "running" | "paused" | "idle";

// Matches orchestration/agent_stream.py's AgentStreamInterrupted handling: the
// worker tags the AGENT_FAILED it emits on a cooperative stop with this reason
// code, distinguishing "customer clicked stop" from a genuine failure.
const CUSTOMER_REQUESTED_STOP_REASON_CODE = "CUSTOMER_REQUESTED_STOP";

/**
 * Derive the composer's stop/play/send button state from the most recent run
 * of one stage's events: "running" while no terminal event has arrived yet,
 * "paused" once the worker reports a cooperative stop, "idle" once the turn
 * completes or genuinely fails (back to the plain send button either way).
 */
export function deriveLatestAgentStreamTurnState(
  events: AssessmentAgentStreamEvent[],
): AgentStreamTurnState {
  const latest = groupAgentStreamEventsByRun(events).at(-1);
  if (!latest) return "idle";

  let pausedByCustomer = false;
  let terminal = false;
  for (const event of latest.events) {
    const failed =
      event.eventType === ASSESSMENT_AGENT_STREAM_EVENT_TYPES.agentFailed ||
      event.eventType === ASSESSMENT_AGENT_STREAM_EVENT_TYPES.boundaryFailed;
    const completed =
      event.eventType === ASSESSMENT_AGENT_STREAM_EVENT_TYPES.agentCompleted ||
      event.eventType === ASSESSMENT_AGENT_STREAM_EVENT_TYPES.boundaryCompleted;
    if (failed) {
      terminal = true;
      pausedByCustomer = isCustomerRequestedStop(event.data);
    } else if (completed) {
      terminal = true;
      pausedByCustomer = false;
    }
  }
  if (pausedByCustomer) return "paused";
  return terminal ? "idle" : "running";
}

function isCustomerRequestedStop(data: unknown): boolean {
  return (
    data !== null &&
    typeof data === "object" &&
    !Array.isArray(data) &&
    (data as Record<string, unknown>).reasonCode ===
      CUSTOMER_REQUESTED_STOP_REASON_CODE
  );
}

export type InterviewTranscriptSegment =
  | {
      kind: "answer";
      timestamp: number;
      answer: AssessmentInterviewAnswerHistoryItem;
    }
  | {
      kind: "activity";
      timestamp: number;
      stage: AssessmentAgentStreamStage;
      runId: string;
      events: AssessmentAgentStreamEvent[];
    };

/**
 * Interleave past Interview answers with the agent activity that produced
 * each one, in the order they actually happened. Without this, every answer
 * renders first and every activity run renders afterward as one lump at the
 * end of the transcript, disconnected from the turn it belongs to.
 */
export function interleaveInterviewTranscript(
  answerHistory: AssessmentInterviewAnswerHistoryItem[],
  stageRunGroups: Array<{
    stage: AssessmentAgentStreamStage;
    groups: AgentStreamRunGroup[];
  }>,
): InterviewTranscriptSegment[] {
  const segments: InterviewTranscriptSegment[] = [];
  for (const answer of answerHistory) {
    segments.push({
      kind: "answer",
      timestamp: Date.parse(answer.answeredAt) || 0,
      answer,
    });
  }
  for (const { stage, groups } of stageRunGroups) {
    for (const group of groups) {
      const first: AssessmentAgentStreamEvent | undefined = group.events[0];
      segments.push({
        kind: "activity",
        timestamp: first ? Date.parse(first.emittedAt) || 0 : 0,
        stage,
        runId: group.runId,
        events: group.events,
      });
    }
  }
  // Array.prototype.sort is stable, so same-timestamp ties (an activity run
  // starting the instant an answer is recorded) keep answers first.
  segments.sort((left, right) => left.timestamp - right.timestamp);
  return segments;
}
