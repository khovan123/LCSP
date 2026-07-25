export interface MissingEvidenceItem {
  type: string;
  label: string;
  description: string;
}

export interface ReadinessResponse {
  assessment_id: string;
  wizard_status: string;
  classification_locked: boolean;
  lock_reason: string | null;
  missing_evidence: MissingEvidenceItem[];
  completed_steps: string[];
  next_action: string;
  updated_at: string;
  correlation_id: string;
}
