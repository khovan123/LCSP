export const WIZARD_EVENT_TYPES = {
  draftSaved: "WIZARD_DRAFT_SAVED",
  readinessRead: "assessment_readiness.read",
  submitted: "WIZARD_SUBMITTED",
  submittedOutbox: "event.wizard.submitted.v1",
  readinessExportGenerated: "READINESS_EXPORT_GENERATED",
  readinessExportBlocked: "READINESS_EXPORT_BLOCKED",
} as const;

export const READINESS_EXPORT_STATUSES = {
  generated: "GENERATED",
  blocked: "BLOCKED",
} as const;

export const READINESS_EXPORT_ARTIFACT_TYPES = {
  wizardReadinessExport: "WIZARD_READINESS_EXPORT",
} as const;

export const READINESS_CLASSIFICATION_STATUSES = {
  lockedEvidenceRequired: "LOCKED_EVIDENCE_REQUIRED",
} as const;

export type ReadinessExportStatus =
  (typeof READINESS_EXPORT_STATUSES)[keyof typeof READINESS_EXPORT_STATUSES];

export const READINESS_EXPORT_ERROR_CODES = {
  requiresLockedClassification: "EXPORT_REQUIRES_LOCKED_CLASSIFICATION",
  wizardNotSubmitted: "WIZARD_NOT_SUBMITTED",
  notFound: "READINESS_EXPORT_NOT_FOUND",
} as const;
