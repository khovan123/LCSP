import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";

const componentPath = new URL(
  "../src/features/settings/components/organisms/repositories-settings-section.tsx",
  import.meta.url,
);

async function source() {
  return readFile(componentPath, "utf8");
}

test("Settings repository section contains credential-only controls and safe status", async () => {
  const component = await source();
  assert.match(component, /provider-credential/);
  assert.match(component, /type="password"/);
  assert.match(component, /account/);
  assert.doesNotMatch(
    component,
    /glpat-|ghp_|repositoryUrl|connectedRepositories|auth\/repositories/,
  );
});

test("Settings repository section supports both providers and never renders a stored PAT", async () => {
  const component = await source();
  assert.match(component, /GitHub/);
  assert.match(component, /GitLab/);
  assert.match(component, /autoComplete="new-password"/);
  assert.doesNotMatch(component, /Personal access token value/);
});
