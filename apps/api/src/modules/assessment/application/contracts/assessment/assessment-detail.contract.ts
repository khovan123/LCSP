export { ASSESSMENT_ERROR_CODES as ASSESSMENT_DETAIL_ERROR_CODES } from "@lcsp/contracts/assessment";
import {
  ASSESSMENT_ERROR_CODES as ASSESSMENT_DETAIL_ERROR_CODES,
  WIZARD_STATUS_CODES,
  type AssessmentLockReason,
  type AssessmentMissingEvidenceCode,
  type AssessmentNextActionKey,
  type AssessmentStatusCode,
} from "@lcsp/contracts/assessment";
import type {
  ClassificationGuardrailStatus,
  LegalRuleMatchGuardrailStatus,
} from "@lcsp/contracts/scan";

export type AssessmentDetailErrorCode =
  (typeof ASSESSMENT_DETAIL_ERROR_CODES)[keyof typeof ASSESSMENT_DETAIL_ERROR_CODES];

export type WizardStatus =
  (typeof WIZARD_STATUS_CODES)[keyof typeof WIZARD_STATUS_CODES];

export interface ReadinessState {
  classification_locked: boolean;
  lock_reason: AssessmentLockReason | null;
  missing_evidence: AssessmentMissingEvidenceCode[];
}

export interface ClassificationResultSummaryDto {
  risk_level: string | null;
  applicability_assessment: string | null;
  citation_basis: string[];
  rationale: string | null;
}

export interface VerifiedProfileReviewDto {
  verified_profile_id: string;
  status: string;
  provider_version: string;
  verified_claims: Record<string, unknown>[];
  verification_source: string | null;
  wizard_context: Record<string, unknown> | null;
  conflict_resolutions: Record<string, unknown>[];
  gates_passed_at: Record<string, unknown>;
  evidence_chain_integrity: boolean | null;
  created_at: string;
  approved_at: string | null;
  approved_by_id: string | null;
}

export interface LegalRuleEvaluationDiagnosticDto {
  rule_id: string;
  status: string;
  rationale: string[];
  matched_required_facts: string[];
  blocking_facts: string[];
}

export interface LegalRuleMatchDiagnosticsDto {
  no_match_reason: string | null;
  rule_count: number | null;
  candidate_rule_count: number | null;
  chunk_count: number | null;
  deterministic_match_count: number | null;
  matched_without_citation_count: number | null;
  match_count: number | null;
  profile_fact_fields: string[];
  profile_evidence_fields: string[];
  evaluations: LegalRuleEvaluationDiagnosticDto[];
  evaluations_truncated: boolean;
  verified_profile_id: string;
  corpus_version_id: string;
  legal_rule_catalog_version_id: string;
  snapshot_id: string | null;
}

export interface AssessmentDetailDto {
  assessment_id: string;
  name: string;
  status: AssessmentStatusCode;
  owner_id: string;
  organization_id: string;
  wizard_status: WizardStatus;
  readiness_state: ReadinessState;
  guardrail_status: ClassificationGuardrailStatus | null;
  legal_rule_match_guardrail_status: LegalRuleMatchGuardrailStatus | null;
  legal_rule_match_diagnostics: LegalRuleMatchDiagnosticsDto | null;
  classification_result: ClassificationResultSummaryDto | null;
  verified_profile_review: VerifiedProfileReviewDto | null;
  can_rerun_classification: boolean;
  next_action: AssessmentNextActionKey;
  created_at: string;
  updated_at: string;
  correlationId: string;
}
