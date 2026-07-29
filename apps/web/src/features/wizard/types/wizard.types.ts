export type WizardAnswers = {
  ps_001_ai_scope?: string;
  ps_002_affected_people?: string[];
  ps_003_personal_or_sensitive_data?: string;
  ps_004_decision_importance?: string;
  purpose?: string;
  sector?: string;
  data_type?: string[];
  user_group?: string;
  user_impact?: string;
  decision_role?: string;
  human_oversight?: string;
  external_llm_usage?: boolean;
  biometric_indicator?: string;
  high_impact_indicator?: string;
};

export type WizardStatus =
  | "NOT_STARTED"
  | "IN_PROGRESS"
  | "SUBMITTED"
  | (string & {});

export type WizardAssessment = {
  assessmentId: string;
  name: string;
  wizardStatus: WizardStatus;
};

export type WizardPageOutcome =
  | { kind: "loaded"; assessment: WizardAssessment }
  | { kind: "redirect"; location: string }
  | { kind: "error"; titleKey: string; detailKey: string };

export type WizardSaveOutcome =
  | { kind: "saved"; savedAt: string | null }
  | { kind: "redirect"; location: string }
  | { kind: "already_submitted" }
  | { kind: "error"; detailKey: string };

export type WizardSubmitOutcome =
  | { kind: "submitted" }
  | { kind: "redirect"; location: string }
  | { kind: "already_submitted" }
  | { kind: "error"; detailKey: string };
