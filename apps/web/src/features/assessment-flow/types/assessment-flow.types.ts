import type { AssessmentRepositoryProvider } from "@lcsp/contracts/assessment";
import type { ToolActivityStatus } from "@/features/workspace/types/assessment-chat.types";

export type RepositoryHistory = {
  provider: string;
  repositoryFullName: string;
  commitSha: string;
};

export type ScannerActivityItem = {
  id: string;
  labelKey: string;
  status: ToolActivityStatus;
};

export type GitProviderValue = AssessmentRepositoryProvider;
