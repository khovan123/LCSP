export const SCAN_CALLBACK_STATUSES = {
  success: "success",
  partial: "partial",
  failed: "failed",
} as const;

export type ScanCallbackStatus =
  (typeof SCAN_CALLBACK_STATUSES)[keyof typeof SCAN_CALLBACK_STATUSES];

export const TECHNICAL_EVIDENCE_REPORT_STATUSES = {
  accepted: "accepted",
  rejected: "rejected",
} as const;

export const TECHNICAL_PROFILE_STATUSES = {
  accepted: "accepted",
  rejected: "rejected",
} as const;

export const AI_USAGE_FLOW_STATUSES = {
  accepted: "accepted",
  rejected: "rejected",
} as const;

export const CONFLICT_RECORD_STATUSES = {
  pending: "PENDING",
  resolved: "RESOLVED",
  dismissed: "DISMISSED",
} as const;

export const VERIFIED_PROFILE_STATUSES = {
  pendingApproval: "pending_approval",
  approved: "approved",
  autoApproved: "auto_approved",
} as const;

export const SCAN_EVIDENCE_SCHEMA_VERSIONS = ["1.0.0"] as const;
export const TECHNICAL_PROFILE_SCHEMA_VERSIONS = ["1.0.0"] as const;
export const AI_USAGE_FLOW_SCHEMA_VERSIONS = ["1.0.0"] as const;
export const CONFLICT_DETECTION_SCHEMA_VERSIONS = ["1.0.0"] as const;
export const VERIFIED_PROFILE_SCHEMA_VERSIONS = ["1.0.0"] as const;

export const SCAN_EVENT_TYPES = {
  evidenceAccepted: "event.technical-evidence.accepted.v1",
  technicalProfileReady: "event.technical-profile.ready.v1",
  aiUsageFlowReady: "event.ai-usage-flow.ready.v1",
  reconciliationConflictsDetected:
    "event.reconciliation.conflicts-detected.v1",
  reconciliationNoConflicts: "event.reconciliation.no-conflicts.v1",
  reconciliationAllConflictsResolved:
    "event.reconciliation.all-conflicts-resolved.v1",
  verifiedProfileReady: "event.verified-profile.ready.v1",
  evidenceAcceptedAudit: "SCAN_EVIDENCE_ACCEPTED",
  evidenceRejectedAudit: "SCAN_EVIDENCE_REJECTED",
  technicalProfileAcceptedAudit: "TECHNICAL_PROFILE_ACCEPTED",
  aiUsageFlowAcceptedAudit: "AI_USAGE_FLOW_ACCEPTED",
  conflictDetectedAudit: "CONFLICT_DETECTED",
  conflictResolvedAudit: "CONFLICT_RESOLVED",
  conflictDismissedAudit: "CONFLICT_DISMISSED",
  noConflictsDetectedAudit: "NO_CONFLICTS_DETECTED",
  verifiedProfileAcceptedAudit: "VERIFIED_PROFILE_ACCEPTED",
} as const;
