export const WIZARD_EVENT_TYPES = {
  draftSaved: "WIZARD_DRAFT_SAVED",
  submitted: "WIZARD_SUBMITTED",
  submittedOutbox: "event.wizard.submitted.v1",
  readinessExportGenerated: "READINESS_EXPORT_GENERATED",
  readinessExportBlocked: "READINESS_EXPORT_BLOCKED",
} as const;

export const READINESS_EXPORT_STATUSES = {
  generated: "GENERATED",
  blocked: "BLOCKED",
} as const;

export const READINESS_EXPORT_ERROR_CODES = {
  requiresLockedClassification: "EXPORT_REQUIRES_LOCKED_CLASSIFICATION",
  wizardNotSubmitted: "WIZARD_NOT_SUBMITTED",
} as const;
