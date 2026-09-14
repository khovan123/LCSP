import { ASSESSMENT_RUNTIME_GATE_TOOL_NAMES } from "@lcsp/contracts/evidence";

export const ENGINEERING_RULE_ACTIVITY_TOOL_PREFIXES = {
  planner: "engineering_rule_plan:",
  investigator: "engineering_rule_investigation:",
} as const;

export const ENGINEERING_RULE_GATE_TOOL_NAME =
  ASSESSMENT_RUNTIME_GATE_TOOL_NAMES.engineeringRuleGate;
