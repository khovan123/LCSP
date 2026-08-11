/** Shared value sets for the first protected agentic-evidence tools. */
export const AGENTIC_TOOL_NAMES = {
  getArtifactChain: "get_artifact_chain",
  getFindingDetail: "get_finding_detail",
  searchEvidence: "search_evidence",
  findProviderInvocations: "find_provider_invocations",
  getReconciliationContext: "get_reconciliation_context",
} as const;

export type AgenticToolName =
  (typeof AGENTIC_TOOL_NAMES)[keyof typeof AGENTIC_TOOL_NAMES];

export const AGENTIC_TOOL_STATUSES = {
  ready: "READY",
} as const;

export type AgenticToolStatus =
  (typeof AGENTIC_TOOL_STATUSES)[keyof typeof AGENTIC_TOOL_STATUSES];

export const AGENTIC_TOOL_COVERAGE_STATES = {
  sufficient: "SUFFICIENT",
  limited: "LIMITED",
} as const;

export type AgenticToolCoverageState =
  (typeof AGENTIC_TOOL_COVERAGE_STATES)[keyof typeof AGENTIC_TOOL_COVERAGE_STATES];

export const ARTIFACT_CHAIN_STAGES = {
  technicalEvidence: "TECHNICAL_EVIDENCE",
  wizardProfile: "WIZARD_PROFILE",
  aiUsageFlow: "AI_USAGE_FLOW",
  conflict: "CONFLICT",
  verifiedProfile: "VERIFIED_PROFILE",
} as const;

export type ArtifactChainStage =
  (typeof ARTIFACT_CHAIN_STAGES)[keyof typeof ARTIFACT_CHAIN_STAGES];

export const ARTIFACT_CHAIN_INTEGRITY = {
  valid: "VALID",
  limited: "LIMITED",
} as const;

export type ArtifactChainIntegrity =
  (typeof ARTIFACT_CHAIN_INTEGRITY)[keyof typeof ARTIFACT_CHAIN_INTEGRITY];

export const AGENTIC_TOOL_EVENT_TYPES = {
  artifactChainRead: "AGENTIC_TOOL_ARTIFACT_CHAIN_READ",
  reconciliationContextRead: "AGENTIC_TOOL_RECONCILIATION_CONTEXT_READ",
  findingDetailRead: "AGENTIC_TOOL_FINDING_DETAIL_READ",
  evidenceSearchRead: "AGENTIC_TOOL_EVIDENCE_SEARCH_READ",
  providerInvocationRead: "AGENTIC_TOOL_PROVIDER_INVOCATION_READ",
} as const;
