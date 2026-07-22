export const SCAN_ERROR_CODES = {
  jobNotFound: "SCAN_JOB_NOT_FOUND",
  jobWrongState: "SCAN_JOB_WRONG_STATE",
  evidenceSchemaInvalid: "EVIDENCE_SCHEMA_INVALID",
  privacyFlagsInvalid: "PRIVACY_FLAGS_INVALID",
  evidenceReportNotFound: "EVIDENCE_REPORT_NOT_FOUND",
  profileAlreadyExists: "PROFILE_ALREADY_EXISTS",
  technicalProfileSchemaInvalid: "SCHEMA_INVALID",
  technicalProfileNotFound: "TECHNICAL_PROFILE_NOT_FOUND",
  aiUsageFlowAlreadyExists: "FLOW_ALREADY_EXISTS",
  aiUsageFlowSchemaInvalid: "SCHEMA_INVALID",
  claimMissingEvidenceRef: "CLAIM_MISSING_EVIDENCE_REF",
} as const;
