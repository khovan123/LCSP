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

export const SCAN_EVIDENCE_SCHEMA_VERSIONS = ["1.0.0"] as const;

export const SCAN_EVENT_TYPES = {
  evidenceAccepted: "scan.evidence-accepted",
  evidenceAcceptedAudit: "SCAN_EVIDENCE_ACCEPTED",
  evidenceRejectedAudit: "SCAN_EVIDENCE_REJECTED",
} as const;
