export const ASSESSMENT_LOCK_REASONS = {
  evidenceRequired: "LOCKED_EVIDENCE_REQUIRED",
} as const;

export const ASSESSMENT_MISSING_EVIDENCE_CODES = {
  technicalEvidenceReport: "technical_evidence_report",
} as const;

export const ASSESSMENT_NEXT_ACTION_KEYS = {
  wizardNotStarted: "pages.workspace.nextActions.wizardNotStarted",
  wizardInProgress: "pages.workspace.nextActions.wizardInProgress",
  wizardSubmitted: "pages.workspace.nextActions.wizardSubmitted",
} as const;

export type AssessmentLockReason =
  (typeof ASSESSMENT_LOCK_REASONS)[keyof typeof ASSESSMENT_LOCK_REASONS];

export type AssessmentMissingEvidenceCode =
  (typeof ASSESSMENT_MISSING_EVIDENCE_CODES)[keyof typeof ASSESSMENT_MISSING_EVIDENCE_CODES];

export type AssessmentNextActionKey =
  (typeof ASSESSMENT_NEXT_ACTION_KEYS)[keyof typeof ASSESSMENT_NEXT_ACTION_KEYS];
