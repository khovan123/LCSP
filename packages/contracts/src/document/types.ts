export const DOCUMENT_REQUEST_STATUSES = {
  queued: "QUEUED",
  generating: "GENERATING",
  ready: "READY",
  failed: "FAILED",
} as const;

export type DocumentRequestStatus =
  (typeof DOCUMENT_REQUEST_STATUSES)[keyof typeof DOCUMENT_REQUEST_STATUSES];

export const DOCUMENT_TYPES = {
  finalReport: "FinalReport",
  gapAnalysis: "GapAnalysis",
} as const;

export type DocumentType = (typeof DOCUMENT_TYPES)[keyof typeof DOCUMENT_TYPES];
