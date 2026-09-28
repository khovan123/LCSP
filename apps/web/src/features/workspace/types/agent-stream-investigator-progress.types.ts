import type { AssessmentAgentStreamEvent } from "@lcsp/contracts/evidence";

import type { AgentStreamRuleHeader } from "./agent-stream-rule.types";

export type AgentStreamInvestigatorProgressProps = {
  /** Investigate-stage rule headers, including the rule still running. */
  rules: AgentStreamRuleHeader[];
  /** The Investigator turn's events; each rule keeps only its own. */
  events: AssessmentAgentStreamEvent[];
  /** Rule IDs in the Planner's order (the order the Investigator runs them). */
  planOrder?: readonly string[];
  /** The dispatch is still running (later unfinished rules are queued). */
  dispatchRunning?: boolean;
};

export type AgentStreamRuleQueue = {
  rules: AgentStreamRuleHeader[];
  /** Rules the running attempt has not reached yet. */
  queuedRuleIds: ReadonlySet<string>;
};
