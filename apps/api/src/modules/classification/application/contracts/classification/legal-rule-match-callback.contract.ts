export interface LegalRuleMatchItemDto {
  match_id: string;
  rule_id: string;
  legal_rule_catalog_version_id: string;
  article_ref: string;
  clause_ref: string;
  match_type: "PRIMARY_MATCH" | "PARENT_CONTEXT" | "REFERENCED_CONTEXT";
  citation_chunk_ids: string[];
  confidence: number;
  coverage_status: "NO_CITATION" | "PARTIAL_CITATION" | "COMPLETE_CITATION";
  usage_claim_ref: string;
  legal_status?: string;
}

export interface AcceptLegalRuleMatchDto {
  verified_profile_id: string;
  assessment_id: string;
  corpus_version_id: string;
  legal_rule_catalog_version_id: string;
  schema_version: string;
  matches: LegalRuleMatchItemDto[];
  citation_allowlist: string[];
  overall_coverage_status:
    "NO_CITATION" | "PARTIAL_CITATION" | "COMPLETE_CITATION";
}

export interface LegalRuleMatchCallbackResponseDto {
  accepted: boolean;
  legal_rule_match_id: string;
  guardrail_status: "passed" | "blocked";
  correlation_id?: string;
}
