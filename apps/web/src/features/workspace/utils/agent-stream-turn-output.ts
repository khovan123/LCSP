import { ASSESSMENT_AGENT_STREAM_STAGES } from "@lcsp/contracts/evidence";
import type {
  AgentStreamTurnOutput,
  AgentStreamTurnProps,
} from "../types/agent-stream-turn.types";
import { projectAgentStreamRuleHeaders } from "./agent-stream-rule-groups";

/** Keep planning decisions separate from actual investigation results. */
export function projectAgentStreamTurnOutput(
  stageEvents: AgentStreamTurnProps["stageEvents"],
): AgentStreamTurnOutput {
  return {
    plannerRules: [
      ...projectAgentStreamRuleHeaders(
        stageEvents[ASSESSMENT_AGENT_STREAM_STAGES.planner] ?? [],
      ).values(),
    ],
    investigatorRules: [
      ...projectAgentStreamRuleHeaders(
        stageEvents[ASSESSMENT_AGENT_STREAM_STAGES.investigate] ?? [],
      ).values(),
    ],
  };
}
