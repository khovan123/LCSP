import type {
  AssessmentAction,
  AssessmentStatusCode,
  WizardStatusCode,
} from "@lcsp/contracts/assessment";
import type { MessageKey } from "@lcsp/i18n";

export type WorkspaceAction = AssessmentAction | (string & {});

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

export type AssessmentStatus = AssessmentStatusCode;

export type AssessmentSummary = {
  id: string;
  name: string;
  status: AssessmentStatus;
  wizard_status: WizardStatusCode;
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
  WorkspaceLoadedOutcome | WorkspaceRedirectOutcome | WorkspaceErrorOutcome;

export type AssessmentsOutcome =
  | {
      kind: "loaded";
      assessments: AssessmentSummary[];
    }
  | WorkspaceErrorOutcome;
