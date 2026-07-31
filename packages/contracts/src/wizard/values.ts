export const DECISION_ROLES = {
  noDecisionSupport: "NO_DECISION_SUPPORT",
  assistsDecision: "ASSISTS_DECISION",
  informsDecision: "INFORMS_DECISION",
  recommendsOutcome: "RECOMMENDS_OUTCOME",
  directlyDrivesOutcome: "DIRECTLY_DRIVES_OUTCOME",
  unknown: "UNKNOWN",
} as const;

export type DecisionRole =
  (typeof DECISION_ROLES)[keyof typeof DECISION_ROLES];

export const EXTERNAL_LLM_USAGES = {
  none: "NONE",
  possible: "POSSIBLE",
  confirmed: "CONFIRMED",
  unknown: "UNKNOWN",
} as const;

export type ExternalLlmUsage =
  (typeof EXTERNAL_LLM_USAGES)[keyof typeof EXTERNAL_LLM_USAGES];
