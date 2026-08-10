export { ASSESSMENT_ERROR_CODES as ASSESSMENT_DETAIL_ERROR_CODES } from "@lcsp/contracts/assessment";
import {
  ASSESSMENT_ERROR_CODES as ASSESSMENT_DETAIL_ERROR_CODES,
  WIZARD_STATUS_CODES,
  type AssessmentLockReason,
  type AssessmentMissingEvidenceCode,
  type AssessmentNextActionKey,
  type AssessmentStatusCode,
} from "@lcsp/contracts/assessment";
import type { ClassificationGuardrailStatus } from "@lcsp/contracts/scan";

export type AssessmentDetailErrorCode =
  (typeof ASSESSMENT_DETAIL_ERROR_CODES)[keyof typeof ASSESSMENT_DETAIL_ERROR_CODES];

export type WizardStatus =
  (typeof WIZARD_STATUS_CODES)[keyof typeof WIZARD_STATUS_CODES];

export interface ReadinessState {
  classification_locked: boolean;
  lock_reason: AssessmentLockReason | null;
  missing_evidence: AssessmentMissingEvidenceCode[];
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
  next_action: AssessmentNextActionKey;
  created_at: string;
  updated_at: string;
  correlation_id: string;
}
