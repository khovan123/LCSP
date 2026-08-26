import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const componentPath = new URL(
  "../src/features/readiness/components/molecules/repository-readiness-action.tsx",
  import.meta.url,
);
const clientPath = new URL(
  "../src/lib/api/repository-analysis-client.ts",
  import.meta.url,
);

test("Readiness repository component is URL-only and accessible", async () => {
  const source = await readFile(componentPath, "utf8");
  assert.match(source, /id="readiness-repository-url"/);
  assert.match(source, /htmlFor="readiness-repository-url"/);
  assert.match(source, /connectMutation\.isPending/);
  assert.match(source, /href="\/workspace\/settings\?section=repositories"/);
  assert.doesNotMatch(
    source,
    /type=\"password\"|PAT|GITLAB_TOKEN|GH_TOKEN|credentialId/,
  );
  assert.doesNotMatch(
    source,
    /selectedRepository|connectedRepositories|repositoryList/,
  );
});

test("Readiness connection client sends only repositoryUrl", async () => {
  const source = await readFile(clientPath, "utf8");
  const connect = source.slice(
    source.indexOf("export async function connectAssessmentRepository"),
    source.indexOf("export type StartRepositoryAnalysisResult"),
  );
  assert.match(connect, /body: JSON\.stringify\(\{ repositoryUrl \}\)/);
  assert.doesNotMatch(
    connect,
    /credential|token|providerCredential|authorizationId/,
  );
});

test("Readiness connection success starts snapshot analysis with the new connection", async () => {
  const source = await readFile(componentPath, "utf8");
  assert.match(source, /useStartRepositoryAnalysisMutation/);
  assert.match(source, /snapshotMutation\.mutateAsync/);
  assert.match(source, /connectionId: connection\.connectionId/);
  assert.match(source, /branch: connection\.defaultBranch/);
  assert.match(source, /setConnectionCreated\(true\)/);
});
