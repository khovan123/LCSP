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

export const SCAN_EVIDENCE_SCHEMA_VERSIONS = ["1.0.0"] as const;
export const TECHNICAL_PROFILE_SCHEMA_VERSIONS = ["1.0.0"] as const;

export const SCAN_EVENT_TYPES = {
  evidenceAccepted: "event.technical-evidence.accepted.v1",
  technicalProfileReady: "event.technical-profile.ready.v1",
  evidenceAcceptedAudit: "SCAN_EVIDENCE_ACCEPTED",
  evidenceRejectedAudit: "SCAN_EVIDENCE_REJECTED",
  technicalProfileAcceptedAudit: "TECHNICAL_PROFILE_ACCEPTED",
} as const;
