import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  CREDENTIAL_PROVIDERS,
  REPOSITORY_AUTHENTICATION_MODES,
  REPOSITORY_CONNECTION_STATUSES,
} from "@lcsp/contracts/github-integration";

import { getAuthRepositories } from "../src/lib/api/auth-client.ts";
import { getRepositoryConnections } from "../src/lib/api/github-repository-client.ts";

const read = (path: string) => readFile(new URL(path, import.meta.url), "utf8");

test("github repositories BFF route requests upstream /github/repositories", async () => {
  const source = await read("../src/app/api/github/repositories/route.ts");
  assert.equal(source.includes('upstreamRequest("/github/repositories"'), true);
});

test("getRepositoryConnections loads and validates repositories from /api/github/repositories", async () => {
  const originalFetch = globalThis.fetch;
  let capturedInput: RequestInfo | URL | undefined;

  globalThis.fetch = async (input) => {
    capturedInput = input;
    return Response.json({
      ok: true,
      data: {
        repositories: [
          {
            id: "repo-1",
            provider: CREDENTIAL_PROVIDERS.github,
            authentication_mode: REPOSITORY_AUTHENTICATION_MODES.githubApp,
            installation_id: "install-123",
            repository_name: "lcsp-platform",
            repository_full_name: "khovan123/LCSP",
            default_branch: "main",
            status: REPOSITORY_CONNECTION_STATUSES.active,
            connected_at: "2026-08-25T00:00:00.000Z",
            revoked_at: null,
            assessment_id: null,
            assessment_name: null,
          },
        ],
      },
    });
  };

  try {
    const repos = await getRepositoryConnections();
    assert.equal(capturedInput, "/api/github/repositories");
    assert.equal(repos.length, 1);
    assert.equal(repos[0].repository_name, "lcsp-platform");
    assert.equal(repos[0].repository_full_name, "khovan123/LCSP");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("getAuthRepositories remains backwards compatible and queries /api/auth/repositories", async () => {
  const originalFetch = globalThis.fetch;
  let capturedInput: RequestInfo | URL | undefined;

  globalThis.fetch = async (input) => {
    capturedInput = input;
    return Response.json({
      ok: true,
      data: {
        repositories: [
          {
            id: "repo-compat-1",
            provider: CREDENTIAL_PROVIDERS.github,
            authentication_mode:
              REPOSITORY_AUTHENTICATION_MODES.githubCliCredential,
            installation_id: null,
            repository_name: "legacy-repo",
            repository_full_name: "khovan123/legacy-repo",
            default_branch: "master",
            status: REPOSITORY_CONNECTION_STATUSES.active,
            connected_at: "2026-08-20T00:00:00.000Z",
            revoked_at: null,
            assessment_id: null,
            assessment_name: null,
          },
        ],
      },
    });
  };

  try {
    const repos = await getAuthRepositories();
    assert.equal(capturedInput, "/api/auth/repositories");
    assert.equal(repos.length, 1);
    assert.equal(repos[0].repository_name, "legacy-repo");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
