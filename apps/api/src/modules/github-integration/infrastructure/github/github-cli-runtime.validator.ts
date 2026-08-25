import { constants, accessSync } from "node:fs";
import { spawnSync } from "node:child_process";

import { GITHUB_CREDENTIAL_ERROR_CODES } from "@lcsp/contracts/github-integration";

import { GitHubCliProviderError } from "./github-cli-repository.provider.js";

export const SUPPORTED_GITHUB_CLI_VERSION = "2.98.0";

type GitHubCliRuntimeValidationDependencies = {
  access: (path: string, mode: number) => void;
  spawn: (
    executablePath: string,
    args: string[],
    options: {
      encoding: "utf8";
      shell: false;
      windowsHide: true;
      timeout: number;
      env: NodeJS.ProcessEnv;
    },
  ) => { status: number | null; stdout: string };
};

export function assertGitHubCliRuntime(
  executablePath: string,
  dependencies: GitHubCliRuntimeValidationDependencies = {
    access: accessSync,
    spawn: spawnSync,
  },
): void {
  try {
    dependencies.access(executablePath, constants.X_OK);
    const result = dependencies.spawn(executablePath, ["--version"], {
      encoding: "utf8",
      shell: false,
      windowsHide: true,
      timeout: 5_000,
      env: minimalVersionEnvironment(),
    });
    if (
      result.status !== 0 ||
      !result.stdout.startsWith(`gh version ${SUPPORTED_GITHUB_CLI_VERSION}`)
    ) {
      throw new Error("unsupported");
    }
  } catch {
    throw new GitHubCliProviderError(
      GITHUB_CREDENTIAL_ERROR_CODES.providerClientUnavailable,
    );
  }
}

function minimalVersionEnvironment(): NodeJS.ProcessEnv {
  const environment: NodeJS.ProcessEnv = {};
  for (const name of ["SystemRoot", "WINDIR", "ComSpec"] as const) {
    const value = process.env[name];
    if (value) environment[name] = value;
  }
  return environment;
}
