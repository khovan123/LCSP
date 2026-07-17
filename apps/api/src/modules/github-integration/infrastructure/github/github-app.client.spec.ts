import { generateKeyPairSync } from "node:crypto";

import { afterEach, describe, expect, it, jest } from "@jest/globals";
import type { ConfigService } from "@nestjs/config";

import { GitHubAppClient } from "./github-app.client.js";

const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const privateKeyPem = privateKey.export({
  type: "pkcs8",
  format: "pem",
}) as string;

function client() {
  const values: Record<string, string> = {
    "github.appId": "123456",
    "github.privateKey": privateKeyPem,
  };
  const configService = {
    get: (key: string, fallback: string) => values[key] ?? fallback,
  } as ConfigService;
  return new GitHubAppClient(configService);
}

afterEach(() => {
  jest.restoreAllMocks();
});

describe("GitHubAppClient.resolveCommit", () => {
  it("uses an ephemeral installation token and returns metadata-only commit data", async () => {
    const sha = "a".repeat(40);
    const fetchMock = jest
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(Response.json({ token: "installation-token" }))
      .mockResolvedValueOnce(
        Response.json({
          sha,
          url: `https://api.github.com/repos/acme/example-repo/commits/${sha}`,
          html_url: `https://github.com/acme/example-repo/commit/${sha}`,
          commit: {
            author: { date: "2026-07-18T00:00:00.000Z" },
            committer: { date: "2026-07-18T00:00:01.000Z" },
            message: "must not be persisted",
          },
          files: [{ filename: "secret.ts", patch: "raw source" }],
        }),
      );

    const result = await client().resolveCommit({
      installationId: "installation-1",
      repositoryFullName: "acme/example-repo",
      revision: "refs/heads/main",
    });

    expect(result).toEqual({
      sha,
      repositoryFullName: "acme/example-repo",
      htmlUrl: `https://github.com/acme/example-repo/commit/${sha}`,
      authorDate: "2026-07-18T00:00:00.000Z",
      committerDate: "2026-07-18T00:00:01.000Z",
    });
    expect(JSON.stringify(result)).not.toContain("raw source");
    expect(JSON.stringify(result)).not.toContain("installation-token");

    const tokenRequest = fetchMock.mock.calls[0];
    expect(tokenRequest[0]).toBe(
      "https://api.github.com/app/installations/installation-1/access_tokens",
    );
    expect(tokenRequest[1]).toMatchObject({ method: "POST" });
    const appAuthorization = (
      tokenRequest[1]?.headers as Record<string, string>
    ).authorization;
    const jwt = appAuthorization.replace("Bearer ", "");
    expect(jwt.split(".")).toHaveLength(3);
    expect(
      JSON.parse(Buffer.from(jwt.split(".")[1], "base64url").toString()),
    ).toMatchObject({ iss: "123456" });

    expect(fetchMock.mock.calls[1][1]).toMatchObject({
      headers: expect.objectContaining({
        authorization: "Bearer installation-token",
      }),
    });
  });

  it("rejects malformed or repository-mismatched provider responses", async () => {
    jest
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(Response.json({ token: "installation-token" }))
      .mockResolvedValueOnce(
        Response.json({
          sha: "short-sha",
          url: "https://api.github.com/repos/other/repo/commits/short-sha",
          html_url: "https://github.com/other/repo/commit/short-sha",
        }),
      );

    await expect(
      client().resolveCommit({
        installationId: "installation-1",
        repositoryFullName: "acme/example-repo",
        revision: "main",
      }),
    ).rejects.toThrow("github_commit_resolution_failed");
  });
});
