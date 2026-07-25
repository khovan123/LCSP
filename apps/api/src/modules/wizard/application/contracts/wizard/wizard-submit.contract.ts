export interface SubmitWizardRequest {
  answers: Record<string, any>;
}

export interface SubmitWizardResponse {
  wizard_profile_id: string;
  status: string;
  version: number;
  submitted_at: string;
  assessment_status: string;
  correlation_id: string;
}
