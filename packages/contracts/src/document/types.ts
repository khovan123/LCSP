export const DOCUMENT_REQUEST_STATUSES = {
  queued: "QUEUED",
  generating: "GENERATING",
  ready: "READY",
  failed: "FAILED",
  blocked: "BLOCKED",
} as const;

export type DocumentRequestStatus =
  (typeof DOCUMENT_REQUEST_STATUSES)[keyof typeof DOCUMENT_REQUEST_STATUSES];

export const DOCUMENT_TYPES = {
  finalReport: "FINAL_REPORT",
  gapAnalysis: "GAP_ANALYSIS",
  readinessExport: "READINESS_EXPORT",
} as const;

export type DocumentType = (typeof DOCUMENT_TYPES)[keyof typeof DOCUMENT_TYPES];
