export interface SaveWizardDraftRequest {
  answers?: Record<string, any>;
}

export interface SaveWizardDraftResponse {
  wizard_profile_id: string;
  status: string;
  version: number;
  updated_at: string;
  correlation_id: string;
}
