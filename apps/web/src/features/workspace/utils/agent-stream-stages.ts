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
  const ordered = [...events].sort((left, right) => {
    const timestamp = left.emittedAt.localeCompare(right.emittedAt);
    return timestamp || left.sequence - right.sequence;
  });
  const firstStages = new Map<string, AssessmentAgentStreamStage>();
  for (const event of ordered) {
    const key = agentStreamTurnKey(event);
    if (event.stage !== null && !firstStages.has(key)) {
      firstStages.set(key, event.stage);
    }
  }
  const activeStages = new Map<string, AssessmentAgentStreamStage>();
  const participatingStages = new Map<
    string,
    Set<AssessmentAgentStreamStage>
  >();
  for (const event of ordered) {
    const key = agentStreamTurnKey(event);
    const dispatchEnded =
      event.eventType ===
        ASSESSMENT_AGENT_STREAM_EVENT_TYPES.boundaryCompleted ||
      event.eventType === ASSESSMENT_AGENT_STREAM_EVENT_TYPES.boundaryFailed ||
      event.eventType === ASSESSMENT_AGENT_STREAM_EVENT_TYPES.boundaryPaused;
    if (dispatchEnded) {
      const stages = participatingStages.get(key);
      if (stages?.size) {
        // The outer boundary may be Interview while its synchronous children
        // are Planner/Investigator. End every participant of this dispatch only.
        for (const participant of stages) {
          grouped.byStage[participant].push({ ...event, stage: participant });
        }
        continue;
      }
    }
    if (event.stage !== null) activeStages.set(key, event.stage);
    // Untagged boundary envelopes belong to their own dispatch's stage, never
    // the previous Scanner run or a separate anonymous completed timeline.
    const stage = event.stage ?? activeStages.get(key) ?? firstStages.get(key);
    if (stage === undefined) {
      grouped.unstaged.push(event);
    } else {
      grouped.byStage[stage].push(
        event.stage === stage ? event : { ...event, stage },
      );
      const stages =
        participatingStages.get(key) ?? new Set<AssessmentAgentStreamStage>();
      stages.add(stage);
      participatingStages.set(key, stages);
    }
  }
  return grouped;
}

function agentStreamTurnKey(event: AssessmentAgentStreamEvent): string {
  return JSON.stringify([event.runId, event.correlationId]);
}

export type AgentStreamRunGroup = {
  turnKey: string;
  runId: string;
  events: AssessmentAgentStreamEvent[];
};

/**
 * Split a stage by dispatch, oldest first. Resumes may share the scan-job runId,
 * but each dispatch carries its own correlationId. Neither a new answer nor a
 * resumed boundary may update an earlier turn's activity block.
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
    const turnKey = agentStreamTurnKey(event);
    const existing = groups.get(turnKey);
    if (existing) {
      existing.push(event);
    } else {
      groups.set(turnKey, [event]);
    }
  }
  return [...groups.entries()].map(([turnKey, runEvents]) => ({
    turnKey,
    runId: runEvents[0]!.runId,
    events: runEvents,
  }));
}

export const AGENT_STREAM_TURN_STATES = {
  running: "running",
  paused: "paused",
  idle: "idle",
} as const;
export type AgentStreamTurnState =
  (typeof AGENT_STREAM_TURN_STATES)[keyof typeof AGENT_STREAM_TURN_STATES];

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
    if (
      event.eventType === ASSESSMENT_AGENT_STREAM_EVENT_TYPES.boundaryPaused
    ) {
      terminal = true;
      pausedByCustomer = true;
      continue;
    }
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
      turnKey: string;
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
        turnKey: group.turnKey,
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

/** Put the current agent's activity below its message, not above its question. */
export function splitCurrentInterviewActivity(
  segments: InterviewTranscriptSegment[],
) {
  let activity: Extract<
    InterviewTranscriptSegment,
    { events: AssessmentAgentStreamEvent[] }
  >[] = [];
  const history = segments.flatMap((segment) => {
    if (segment.kind === "activity") {
      activity.push(segment);
      return [];
    }
    const turn = { answer: segment.answer, activity };
    activity = [];
    return [turn];
  });
  return {
    history,
    currentActivity: activity,
  };
}
