export interface VerifiedProfileCallbackRequest {
  /** Immutable source identities required by the canonical reconciliation command. */
  ai_usage_flow_id: string;
  assessment_id: string;
  wizard_profile_id: string;
  technical_evidence_report_id: string;
  reconciliation_decision_refs: string[];
  idempotency_key: string;
  organization_id: string;
}

export interface VerifiedProfileCallbackDto {
  accepted: boolean;
  verified_profile_id: string;
  status: string;
  correlationId: string;
}
