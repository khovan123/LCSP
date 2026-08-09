import { generateKeyPairSync } from "node:crypto";

import { describe, expect, it, jest } from "@jest/globals";
import { ConfigService } from "@nestjs/config";

import { GitHubAppClient } from "./github-app.client.js";

describe("GitHubAppClient", () => {
  it("requests repository archives with the GitHub REST media type", async () => {
    const privateKey = generateKeyPairSync("rsa", { modulusLength: 2048 })
      .privateKey.export({ type: "pkcs1", format: "pem" })
      .toString();
    const configService = {
      get: jest.fn((key: string) => {
        if (key === "github.appId") return "123";
        if (key === "github.privateKey") return privateKey;
        return "";
      }),
    } as unknown as ConfigService;
    const archiveResponse = new Response("archive", {
      headers: { "content-type": "application/gzip" },
    });
    Object.defineProperty(archiveResponse, "url", {
      value: "https://codeload.github.com/acme/example/tar.gz/commit",
    });
    const fetchMock = jest
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ token: "installation-token" }), {
          status: 201,
        }),
      )
      .mockResolvedValueOnce(archiveResponse);

    try {
      const client = new GitHubAppClient(configService);

      await client.downloadRepositoryArchive({
        installationId: "installation-1",
        repositoryFullName: "acme/example",
        commitSha: "a".repeat(40),
      });

      expect(fetchMock).toHaveBeenNthCalledWith(
        2,
        "https://api.github.com/repos/acme/example/tarball/" + "a".repeat(40),
        expect.objectContaining({
          headers: expect.objectContaining({
            accept: "application/vnd.github+json",
            "x-github-api-version": "2022-11-28",
          }),
        }),
      );
    } finally {
      fetchMock.mockRestore();
    }
  });
});
