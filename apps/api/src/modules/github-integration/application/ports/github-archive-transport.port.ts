import type { GitHubArchiveRedirectValidationStatus } from "@lcsp/contracts/github-integration";
import type { Readable } from "node:stream";

import type { CredentialLease } from "../security/credential-lease.js";

export const GITHUB_ARCHIVE_TRANSPORT = Symbol("GITHUB_ARCHIVE_TRANSPORT");

export type GitHubArchiveTransportResult = {
  stream: Readable;
  contentType: string;
  redirectValidation: GitHubArchiveRedirectValidationStatus;
  validatedHost: string;
};

/** GitHub-specific exact-SHA archive transport; all control-plane operations remain on gh. */
export interface GitHubArchiveTransportPort {
  downloadArchive(input: {
    credentialLease: CredentialLease;
    repositoryFullName: string;
    commitSha: string;
    abortSignal?: AbortSignal;
  }): Promise<GitHubArchiveTransportResult>;
}
