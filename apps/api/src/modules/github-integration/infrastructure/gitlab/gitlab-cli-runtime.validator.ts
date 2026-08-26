import { existsSync, statSync } from "node:fs";
import { isAbsolute } from "node:path";
import { spawnSync } from "node:child_process";

import { GITHUB_CREDENTIAL_ERROR_CODES } from "@lcsp/contracts/github-integration";
import { GitLabCliProviderError } from "./gitlab-cli-repository.provider.js";

export const SUPPORTED_GITLAB_CLI_VERSION = "1.113.0";

export function assertGitLabCliRuntime(executablePath: string): void {
  if (
    !isAbsolute(executablePath) ||
    !existsSync(executablePath) ||
    !statSync(executablePath).isFile()
  ) {
    throw new GitLabCliProviderError(
      GITHUB_CREDENTIAL_ERROR_CODES.providerClientUnavailable,
    );
  }
  const result = spawnSync(executablePath, ["--version"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
    shell: false,
  });
  if (
    result.status !== 0 ||
    !String(result.stdout ?? "").includes(
      `glab ${SUPPORTED_GITLAB_CLI_VERSION}`,
    )
  ) {
    throw new GitLabCliProviderError(
      GITHUB_CREDENTIAL_ERROR_CODES.providerClientUnavailable,
    );
  }
}
