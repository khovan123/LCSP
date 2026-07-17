import type { GITHUB_INTEGRATION_ERROR_CODES } from "./codes.ts";

export type GithubIntegrationErrorCode =
  (typeof GITHUB_INTEGRATION_ERROR_CODES)[keyof typeof GITHUB_INTEGRATION_ERROR_CODES];
