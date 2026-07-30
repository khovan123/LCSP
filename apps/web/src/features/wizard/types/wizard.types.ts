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

export type WizardStatus = WizardStatusCode | (string & {});

export type WizardAssessment = {
  assessmentId: string;
  name: string;
  wizardStatus: WizardStatus;
};

export type WizardPageOutcome =
  | { kind: typeof API_OUTCOME_KINDS.loaded; assessment: WizardAssessment }
  | { kind: typeof API_OUTCOME_KINDS.redirect; location: string }
  | {
      kind: typeof API_OUTCOME_KINDS.error;
      titleKey: string;
      detailKey: string;
    };

export type WizardSaveOutcome =
  | { kind: typeof API_OUTCOME_KINDS.saved; savedAt: string | null }
  | { kind: typeof API_OUTCOME_KINDS.redirect; location: string }
  | { kind: typeof API_OUTCOME_KINDS.alreadySubmitted }
  | { kind: typeof API_OUTCOME_KINDS.error; detailKey: string };

export type WizardSubmitOutcome =
  | { kind: typeof API_OUTCOME_KINDS.submitted }
  | { kind: typeof API_OUTCOME_KINDS.redirect; location: string }
  | { kind: typeof API_OUTCOME_KINDS.alreadySubmitted }
  | { kind: typeof API_OUTCOME_KINDS.error; detailKey: string };
import type { WizardStatusCode } from "@lcsp/contracts/assessment";

import { API_OUTCOME_KINDS } from "../../../lib/api/outcome-kinds.ts";
