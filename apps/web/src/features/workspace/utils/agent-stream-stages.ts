import {
  ASSESSMENT_AGENT_STREAM_STAGES,
  type AssessmentAgentStreamEvent,
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
