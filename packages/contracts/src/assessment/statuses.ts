export const ASSESSMENT_STATUS_CODES = {
  wizardInProgress: "WIZARD_IN_PROGRESS",
  wizardSubmitted: "WIZARD_SUBMITTED",
  evidenceRequired: "EVIDENCE_REQUIRED",
  scanInProgress: "SCAN_IN_PROGRESS",
  classificationLocked: "CLASSIFICATION_LOCKED",
  readyForReview: "READY_FOR_REVIEW",
} as const;

export const WIZARD_STATUS_CODES = {
  notStarted: "NOT_STARTED",
  inProgress: "IN_PROGRESS",
  submitted: "SUBMITTED",
} as const;
