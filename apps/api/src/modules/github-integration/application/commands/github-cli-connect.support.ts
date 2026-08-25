import { HttpStatus } from "@nestjs/common";
import {
  GITHUB_CREDENTIAL_ERROR_CODES,
  GITHUB_INTEGRATION_ERROR_CODES,
  type GitHubCredentialErrorCode,
} from "@lcsp/contracts/github-integration";

import { problemException } from "../../../../platform/problems/problem-factory.js";
import { GitHubCliProviderError } from "../../infrastructure/github/github-cli-repository.provider.js";

export const GITHUB_CREDENTIAL_MIN_LENGTH = 20;
export const GITHUB_CREDENTIAL_MAX_LENGTH = 2048;
export const GITHUB_REPOSITORY_PATTERN = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/u;

export function assertCredential(
  value: unknown,
  correlationId: string,
): asserts value is string {
  if (
    typeof value !== "string" ||
    value.length < GITHUB_CREDENTIAL_MIN_LENGTH ||
    value.length > GITHUB_CREDENTIAL_MAX_LENGTH ||
    /[\r\n\0]/u.test(value)
  ) {
    throw problemException(
      GITHUB_INTEGRATION_ERROR_CODES.credentialRequestInvalid,
      correlationId,
      { status: HttpStatus.BAD_REQUEST },
    );
  }
}

export function mapProviderFailure(
  error: unknown,
  correlationId: string,
): never {
  const category =
    error instanceof GitHubCliProviderError
      ? error.category
      : GITHUB_CREDENTIAL_ERROR_CODES.providerResponseInvalid;
  throw problemException(category, correlationId, {
    status: providerStatus(category),
  });
}

function providerStatus(category: GitHubCredentialErrorCode): number {
  const statuses: Record<GitHubCredentialErrorCode, number> = {
    [GITHUB_CREDENTIAL_ERROR_CODES.credentialInvalid]: HttpStatus.UNAUTHORIZED,
    [GITHUB_CREDENTIAL_ERROR_CODES.credentialExpired]: HttpStatus.UNAUTHORIZED,
    [GITHUB_CREDENTIAL_ERROR_CODES.credentialApprovalRequired]:
      HttpStatus.FORBIDDEN,
    [GITHUB_CREDENTIAL_ERROR_CODES.repositoryAccessDenied]:
      HttpStatus.NOT_FOUND,
    [GITHUB_CREDENTIAL_ERROR_CODES.repositoryUnavailable]: HttpStatus.NOT_FOUND,
    [GITHUB_CREDENTIAL_ERROR_CODES.providerRateLimited]:
      HttpStatus.TOO_MANY_REQUESTS,
    [GITHUB_CREDENTIAL_ERROR_CODES.providerTimeout]: HttpStatus.GATEWAY_TIMEOUT,
    [GITHUB_CREDENTIAL_ERROR_CODES.operationCancelled]: 499,
    [GITHUB_CREDENTIAL_ERROR_CODES.providerClientUnavailable]:
      HttpStatus.SERVICE_UNAVAILABLE,
    [GITHUB_CREDENTIAL_ERROR_CODES.providerResponseInvalid]:
      HttpStatus.BAD_GATEWAY,
  };
  return statuses[category];
}
