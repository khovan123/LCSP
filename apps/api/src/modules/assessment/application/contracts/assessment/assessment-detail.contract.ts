export { ASSESSMENT_ERROR_CODES as ASSESSMENT_DETAIL_ERROR_CODES } from "@lcsp/contracts/assessment";
import {
  ASSESSMENT_ERROR_CODES as ASSESSMENT_DETAIL_ERROR_CODES,
  WIZARD_STATUS_CODES,
} from "@lcsp/contracts/assessment";

export type AssessmentDetailErrorCode =
  (typeof ASSESSMENT_DETAIL_ERROR_CODES)[keyof typeof ASSESSMENT_DETAIL_ERROR_CODES];

export type WizardStatus =
  (typeof WIZARD_STATUS_CODES)[keyof typeof WIZARD_STATUS_CODES];

export interface ReadinessState {
  classification_locked: boolean;
  lock_reason: string | null;
  missing_evidence: string[];
}

export interface AssessmentDetailDto {
  assessment_id: string;
  name: string;
  status: string;
  owner_id: string;
  organization_id: string;
  wizard_status: WizardStatus;
  readiness_state: ReadinessState;
  next_action: string;
  created_at: string;
  updated_at: string;
  correlation_id: string;
}
