export const RBAC_DECISION = {
  allow: "ALLOW",
  deny: "DENY",
} as const;

export const RBAC_REASON_CODE = {
  actionNotGranted: "ACTION_NOT_GRANTED",
  authorized: "AUTHORIZED",
  denied: "RBAC_DENIED",
  evaluatorError: "EVALUATOR_ERROR",
  loadError: "LOAD_ERROR",
  metadataMissing: "RBAC_METADATA_MISSING",
  mfaRequired: "MFA_REQUIRED",
  sessionInvalid: "SESSION_INVALID",
  stateGateFailed: "STATE_GATE_FAILED",
  subjectRoleMismatch: "SUBJECT_ROLE_MISMATCH",
} as const;

export type RbacDecisionValue =
  (typeof RBAC_DECISION)[keyof typeof RBAC_DECISION];

export type RbacReasonCode =
  (typeof RBAC_REASON_CODE)[keyof typeof RBAC_REASON_CODE];
