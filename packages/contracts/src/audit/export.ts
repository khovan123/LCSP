export const AUDIT_EXPORT_STATUSES = {
  queued: "QUEUED",
  generating: "GENERATING",
  ready: "READY",
  failed: "FAILED",
} as const;

export type AuditExportStatus =
  (typeof AUDIT_EXPORT_STATUSES)[keyof typeof AUDIT_EXPORT_STATUSES];

export const AUDIT_ERROR_CODES = {
  exportNotFound: "AUDIT_EXPORT_NOT_FOUND",
  invalidQuery: "INVALID_AUDIT_QUERY",
  invalidDateRange: "INVALID_DATE_RANGE",
  dateRangeExceeded: "AUDIT_DATE_RANGE_EXCEEDED",
  downloadUrlInvalid: "AUDIT_DOWNLOAD_URL_INVALID",
} as const;

export const AUDIT_EVENT_TYPES = {
  exportGenerated: "AUDIT_EXPORT_GENERATED",
} as const;
