import { describe, expect, it, jest } from "@jest/globals";
import { GITHUB_CREDENTIAL_ERROR_CODES } from "@lcsp/contracts/github-integration";

import {
  assertGitHubCliRuntime,
  SUPPORTED_GITHUB_CLI_VERSION,
} from "./github-cli-runtime.validator.js";

describe("GitHub CLI runtime validation", () => {
  it("accepts only the packaged supported executable version", () => {
    const access = jest.fn();
    const spawn = jest.fn(() => ({
      status: 0,
      stdout: `gh version ${SUPPORTED_GITHUB_CLI_VERSION} (test)\n`,
    }));

    expect(() =>
      assertGitHubCliRuntime("/usr/bin/gh", {
        access,
        spawn,
      }),
    ).not.toThrow();
    expect(access).toHaveBeenCalled();
    expect((spawn.mock.calls as unknown[][])[0]).toEqual([
      "/usr/bin/gh",
      ["--version"],
      expect.objectContaining({ shell: false }),
    ]);
  });

  it("fails closed for a missing or unsupported executable", () => {
    expect(() =>
      assertGitHubCliRuntime("/usr/bin/gh", {
        access: jest.fn(() => {
          throw new Error("missing");
        }),
        spawn: jest.fn(() => ({ status: 0, stdout: "" })),
      }),
    ).toThrow(GITHUB_CREDENTIAL_ERROR_CODES.providerClientUnavailable);

    expect(() =>
      assertGitHubCliRuntime("/usr/bin/gh", {
        access: jest.fn(),
        spawn: jest.fn(() => ({
          status: 0,
          stdout: "gh version 0.0.0",
        })),
      }),
    ).toThrow(GITHUB_CREDENTIAL_ERROR_CODES.providerClientUnavailable);
  });
});
