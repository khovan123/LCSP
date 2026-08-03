import type {
  DeveloperFinding,
  DeveloperTaskContext,
} from "./developer-task.types";

export type RedactedFindingsListProps = {
  findings: DeveloperFinding[];
};

export type ScopeSummaryCardProps = {
  context: DeveloperTaskContext;
};

export type DeveloperTaskWorkspaceProps = {
  assessmentId: string;
};
