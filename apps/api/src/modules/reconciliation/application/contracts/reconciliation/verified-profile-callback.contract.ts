export interface VerifiedProfileCallbackRequest {
  ai_usage_flow_id: string;
  assessment_id: string;
  schema_version: string;
  provider_version: string;
  profile_data: Record<string, unknown>;
  gates_passed_at: Record<string, unknown>;
}

export interface VerifiedProfileCallbackDto {
  accepted: boolean;
  verified_profile_id: string;
  status: string;
  correlation_id: string;
}
