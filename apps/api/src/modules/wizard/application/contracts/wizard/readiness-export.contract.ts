import type {
  READINESS_EXPORT_STATUSES,
  ReadinessExportContent,
  ReadinessExportResponse,
} from "@lcsp/contracts/wizard";

export type ReadinessExportStatus =
  (typeof READINESS_EXPORT_STATUSES)[keyof typeof READINESS_EXPORT_STATUSES];

export type { ReadinessExportContent, ReadinessExportResponse };
