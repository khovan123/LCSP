export interface AIUsageFlowClaimRequest {
  claim_id: string;
  claim_type: string;
  confidence: string;
  evidence_refs: string[];
  uncertainty_reason: string | null;
  description: string;
  is_material: boolean;
}

export interface AIUsageFlowCallbackRequest {
  technical_profile_id: string;
  assessment_id: string;
  schema_version: string;
  provider_version: string;
  claims: AIUsageFlowClaimRequest[];
  unknown_usages: Record<string, unknown>[];
  privacy_flags: Record<string, unknown>;
}

export interface AIUsageFlowCallbackDto {
  accepted: boolean;
  ai_usage_flow_id: string;
  correlation_id: string;
}
