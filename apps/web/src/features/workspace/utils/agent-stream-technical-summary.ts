import {
  ASSESSMENT_AGENT_STREAM_EVENT_TYPES,
  ASSESSMENT_AGENT_STREAM_STAGES,
  type AssessmentAgentStreamEvent,
} from "@lcsp/contracts/evidence";
import type { AgentStreamTurnProps } from "../types/agent-stream-turn.types";
import { projectAgentStreamRuleHeaders } from "./agent-stream-rule-groups";
import { projectStreamRows } from "./agent-stream-projection";

/** Summaries count projected calls, rather than tokens or lifecycle envelopes. */
export function projectAgentStreamTechnicalSummary(
  events: AssessmentAgentStreamEvent[],
  stageEvents: AgentStreamTurnProps["stageEvents"],
) {
  const rows = projectStreamRows(events);
  const sourceRows = rows.filter(
    (row) => row.activity === "sourceFilesReviewed" && row.status === "completed",
  );
  return {
    planning: projectAgentStreamRuleHeaders(
      stageEvents[ASSESSMENT_AGENT_STREAM_STAGES.planner] ?? [],
    ).size,
    investigation: projectAgentStreamRuleHeaders(
      stageEvents[ASSESSMENT_AGENT_STREAM_STAGES.investigate] ?? [],
    ).size,
    sourceFiles: new Set(sourceRows.map((row) => row.target).filter(Boolean))
      .size,
    analysis: rows.filter((row) => row.kind === "model").length,
    tools: rows.filter(
      (row) => row.kind === "tool" && row.activity !== "sourceFilesReviewed",
    ).length,
    failures: events.filter(
      (event) =>
        event.eventType === ASSESSMENT_AGENT_STREAM_EVENT_TYPES.modelCallFailed,
    ).length,
    files: [
      ...new Set(
        sourceRows
          .map((row) => row.target)
          .filter((target): target is string => target !== null),
      ),
    ],
  };
}
