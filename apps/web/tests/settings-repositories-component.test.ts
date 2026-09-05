import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";

const componentPath = new URL(
  "../src/features/settings/components/organisms/repositories-settings-section.tsx",
  import.meta.url,
);
const credentialDialogPath = new URL(
  "../src/features/settings/components/molecules/provider-credential-dialog.tsx",
  import.meta.url,
);
const queriesPath = new URL(
  "../src/lib/api/github-repository-queries.ts",
  import.meta.url,
);
const queryKeysPath = new URL("../src/lib/api/query-keys.ts", import.meta.url);

async function source() {
  return readFile(componentPath, "utf8");
}

test("Settings repository section contains credential-only controls and safe status", async () => {
  const component = await source();
  assert.match(component, /data-component="ConnectorsSettingsPanel"/);
  assert.match(component, /data-component="ConnectorProviderList"/);
  assert.match(component, /githubPatAccessTitle/);
  assert.match(component, /repositoryReadAccess/);
  assert.doesNotMatch(
    component,
    /id="provider-credential"|type="password"|glpat-|ghp_|repositoryUrl|connectedRepositories|auth\/repositories/,
  );
});

test("Settings repository section supports provider rows and never renders a stored PAT", async () => {
  const component = await source();
  assert.match(component, /githubProvider/);
  assert.match(component, /gitlabProvider/);
  assert.match(component, /bitbucketProvider/);
  assert.match(component, /azureDevOpsProvider/);
  assert.match(component, /logo-github\.svg/);
  assert.match(component, /logo-gitlab\.svg/);
  assert.match(component, /logo-bitbucket\.svg/);
  assert.match(component, /logo-azure-devops\.svg/);
  assert.doesNotMatch(component, /Personal access token value/);
});

test("provider credential input is isolated in the credential dialog", async () => {
  const dialog = await readFile(credentialDialogPath, "utf8");
  assert.match(dialog, /provider-credential/);
  assert.match(dialog, /type="password"/);
  assert.match(dialog, /autoComplete="new-password"/);
});

test("initial configure and rotation refresh the shared provider credential status query", async () => {
  const [queries, queryKeys] = await Promise.all([
    readFile(queriesPath, "utf8"),
    readFile(queryKeysPath, "utf8"),
  ]);

  assert.match(
    queryKeys,
    /providerCredentials:\s*\(\)\s*=>\s*\["provider-credentials"\]\s*as const/,
  );
  assert.equal(
    queries.match(/apiQueryKeys\.githubIntegration\.providerCredentials\(\)/g)
      ?.length,
    2,
  );
  assert.match(
    queries,
    /onSuccess:\s*async\s*\(\)\s*=>\s*{[\s\S]*?invalidateQueries\([\s\S]*?providerCredentials\(\)/,
  );
});

test("successful credential submission clears the plaintext PAT without exposing it", async () => {
  const dialog = await readFile(credentialDialogPath, "utf8");
  assert.match(dialog, /onSuccess:\s*\(\)\s*=>\s*{\s*setCredential\(""\)/);
  assert.match(dialog, /type="password"/);
  assert.doesNotMatch(dialog, /setCredential\([^"e]/);
});

test("reauthentication retries the pending credential update", async () => {
  const component = await readFile(credentialDialogPath, "utf8");
  assert.match(component, /onReauthenticate\?\.\(\(\)\s*=>\s*{/);
  assert.match(
    component,
    /queueMicrotask\(\(\)\s*=>\s*{[\s\S]*?mutation\.mutate\(\{\s*provider,\s*credential:\s*submittedCredential\s*\}\)/,
  );
});
