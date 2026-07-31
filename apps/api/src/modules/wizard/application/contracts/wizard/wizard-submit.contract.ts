import type { WizardAnswer } from "@lcsp/contracts/wizard";

export interface SubmitWizardRequest {
  answers: WizardAnswer[];
}

export interface SubmitWizardResponse {
  wizard_profile_id: string;
  status: string;
  version: number;
  submitted_at: string;
  assessment_status: string;
  correlation_id: string;
}
