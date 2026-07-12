import type { MessageKey } from "@lcsp/i18n";

export type WorkspaceAction = "assessment:create" | (string & {});

export type WorkspaceContext = {
  organization: {
    id: string;
    name: string;
  };
  membership: {
    role: string;
  };
  granted_actions: WorkspaceAction[];
};

export type AssessmentStatus =
  | "WIZARD_IN_PROGRESS"
  | "WIZARD_SUBMITTED"
  | "EVIDENCE_REQUIRED"
  | "SCAN_IN_PROGRESS"
  | "CLASSIFICATION_LOCKED"
  | "READY_FOR_REVIEW";

export type AssessmentSummary = {
  id: string;
  name: string;
  status: AssessmentStatus;
  wizard_status: AssessmentStatus;
  created_at: string;
};

export type WorkspaceRedirectOutcome = {
  kind: "redirect";
  location: string;
};

export type WorkspaceLoadedOutcome = {
  kind: "loaded";
  workspace: WorkspaceContext;
};

export type WorkspaceErrorOutcome = {
  kind: "error";
  titleKey: MessageKey;
  detailKey: MessageKey;
};

export type WorkspaceOutcome =
  | WorkspaceLoadedOutcome
  | WorkspaceRedirectOutcome
  | WorkspaceErrorOutcome;

export type AssessmentsOutcome =
  | {
      kind: "loaded";
      assessments: AssessmentSummary[];
    }
  | WorkspaceErrorOutcome;
