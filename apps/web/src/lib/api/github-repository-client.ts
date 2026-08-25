import { apiRequest } from "./api-request.ts";
import {
  GITHUB_CREDENTIAL_ERROR_CODES,
  GITHUB_INTEGRATION_ERROR_CODES,
} from "@lcsp/contracts/github-integration";
import type { MessageKey } from "@lcsp/i18n";

export type GitHubRepositorySummary = {
  repository_id: string;
  name: string;
  full_name: string;
  default_branch: string;
  private: boolean;
};

export type GitHubRepositoryDiscovery = {
  authenticated_account: { id: string; login: string };
  repositories: GitHubRepositorySummary[];
  next_cursor: string | null;
};

export type GitHubRepositoryConnection = {
  connection_id: string;
  repository: GitHubRepositorySummary;
  connection_status: string;
  credential_status: string;
  connected_at: string;
};

export class GitHubRepositoryRequestError extends Error {
  constructor(readonly problemCode: string | undefined) {
    super("github-repository-request-failed");
  }
}

export function githubRepositoryProblemMessageKey(error: unknown): MessageKey {
  const code =
    error instanceof GitHubRepositoryRequestError
      ? error.problemCode
      : undefined;
  switch (code) {
    case GITHUB_CREDENTIAL_ERROR_CODES.credentialInvalid:
    case GITHUB_CREDENTIAL_ERROR_CODES.credentialExpired:
      return "pages.workspace.settingsHub.repositories.credentialInvalidDescription";
    case GITHUB_CREDENTIAL_ERROR_CODES.credentialApprovalRequired:
      return "pages.workspace.settingsHub.repositories.approvalRequiredDescription";
    case GITHUB_CREDENTIAL_ERROR_CODES.repositoryAccessDenied:
    case GITHUB_CREDENTIAL_ERROR_CODES.repositoryUnavailable:
      return "pages.workspace.settingsHub.repositories.repositoryDeniedDescription";
    case GITHUB_INTEGRATION_ERROR_CODES.cliConnectDisabled:
    case GITHUB_CREDENTIAL_ERROR_CODES.providerClientUnavailable:
      return "pages.workspace.settingsHub.repositories.serviceUnavailableDescription";
    default:
      return "pages.workspace.settingsHub.repositories.requestFailedDescription";
  }
}

export async function discoverGitHubRepositories(input: {
  credential: string;
  limit: number;
}): Promise<GitHubRepositoryDiscovery> {
  const response = await apiRequest("/api/github/repository-discoveries", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok || !isDiscovery(response.payload)) {
    throw new GitHubRepositoryRequestError(response.problemCode);
  }
  return response.payload;
}

export async function connectGitHubRepository(input: {
  credential: string;
  repository_full_name: string;
  assessment_id?: string;
}): Promise<GitHubRepositoryConnection> {
  const response = await apiRequest("/api/github/repository-connections", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok || !isConnection(response.payload)) {
    throw new GitHubRepositoryRequestError(response.problemCode);
  }
  return response.payload;
}

function isRepository(value: unknown): value is GitHubRepositorySummary {
  if (typeof value !== "object" || value === null) return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.repository_id === "string" &&
    typeof item.name === "string" &&
    typeof item.full_name === "string" &&
    typeof item.default_branch === "string" &&
    typeof item.private === "boolean"
  );
}

function isDiscovery(value: unknown): value is GitHubRepositoryDiscovery {
  if (typeof value !== "object" || value === null) return false;
  const result = value as Record<string, unknown>;
  const account = result.authenticated_account as Record<string, unknown>;
  return (
    typeof account?.id === "string" &&
    typeof account.login === "string" &&
    Array.isArray(result.repositories) &&
    result.repositories.every(isRepository) &&
    (typeof result.next_cursor === "string" || result.next_cursor === null)
  );
}

function isConnection(value: unknown): value is GitHubRepositoryConnection {
  if (typeof value !== "object" || value === null) return false;
  const result = value as Record<string, unknown>;
  return (
    typeof result.connection_id === "string" &&
    isRepository(result.repository) &&
    typeof result.connection_status === "string" &&
    typeof result.credential_status === "string" &&
    typeof result.connected_at === "string"
  );
}
