export const PBAC_DECISION = {
  allow: "ALLOW",
  deny: "DENY",
} as const;

export const PBAC_REASON_CODE = {
  actionNotGranted: "ACTION_NOT_GRANTED",
  authorized: "AUTHORIZED",
  denied: "PBAC_DENIED",
  evaluatorError: "EVALUATOR_ERROR",
  loadError: "LOAD_ERROR",
  membershipMissing: "MEMBERSHIP_MISSING",
  metadataMissing: "PBAC_METADATA_MISSING",
  mfaRequired: "MFA_REQUIRED",
  organizationMismatch: "ORGANIZATION_MISMATCH",
  policyNotFound: "POLICY_NOT_FOUND",
  sessionInvalid: "SESSION_INVALID",
  stateGateFailed: "STATE_GATE_FAILED",
  subjectRoleMismatch: "SUBJECT_ROLE_MISMATCH",
  subjectAttributeMissing: "SUBJECT_ATTRIBUTE_MISSING",
} as const;

export type PbacDecisionValue =
  (typeof PBAC_DECISION)[keyof typeof PBAC_DECISION];

export type PbacReasonCode =
  (typeof PBAC_REASON_CODE)[keyof typeof PBAC_REASON_CODE];
