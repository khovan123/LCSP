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

test("Readiness repository component selects a connected repository without handling credentials", async () => {
  const source = await readFile(componentPath, "utf8");
  assert.match(source, /useAuthRepositoriesQuery/);
  assert.match(source, /selectedRepositoryId/);
  assert.match(source, /<Select/);
  assert.match(source, /section=repositories/);
  assert.match(source, /useStartRepositoryAnalysisMutation/);
  assert.doesNotMatch(
    source,
    /type=\"password\"|PAT|GITLAB_TOKEN|GH_TOKEN|credential/,
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

test("Readiness repository selection starts snapshot analysis with the selected connection", async () => {
  const source = await readFile(componentPath, "utf8");
  assert.match(source, /useStartRepositoryAnalysisMutation/);
  assert.match(source, /analysisMutation\.mutate/);
  assert.match(source, /connectionId: selectedRepository\.id/);
  assert.match(source, /branch: selectedRepository\.default_branch/);
});
