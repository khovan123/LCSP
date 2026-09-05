import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const read = (path: string) => readFile(new URL(path, import.meta.url), "utf8");

test("LCSP-269 modal shell preserves Figma desktop geometry", async () => {
  const [modal, sidebar, tab] = await Promise.all([
    read("../src/features/settings/components/organisms/settings-modal.tsx"),
    read("../src/features/settings/components/organisms/settings-sidebar.tsx"),
    read("../src/features/settings/components/molecules/settings-tab.tsx"),
  ]);

  assert.match(modal, /max-w-295/);
  assert.match(modal, /max-h-205/);
  assert.match(modal, /rounded-\[14px\]/);
  assert.match(modal, /data-slot=dialog-close/);
  assert.match(sidebar, /md:w-60/);
  assert.match(sidebar, /h-9\.5 w-52/);
  assert.match(sidebar, /mt-3\.5/);
  assert.match(tab, /h-9 w-52/);
  assert.match(tab, /text-\[13px\]/);
});

test("General settings panel uses compact Figma rows, not legacy cards", async () => {
  const [settings, theme] = await Promise.all([
    read("../src/features/settings/components/organisms/settings-page.tsx"),
    read("../src/components/molecules/theme-preference-control.tsx"),
  ]);

  assert.match(settings, /dataComponent="GeneralSettingsPanel"/);
  assert.match(settings, /id="settings-full-name"[\s\S]*?className="h-9 w-51/);
  assert.match(settings, /ThemePreferenceControl variant="compact"/);
  assert.match(theme, /data-component="CompactThemePreferenceControl"/);
  assert.match(theme, /h-9\.5 w-30/);
  assert.doesNotMatch(settings, /<Card[\s\S]*GeneralSettingsPanel/);
});

test("Account tab hides legacy account presentation and renders compact sessions", async () => {
  const settings = await read(
    "../src/features/settings/components/organisms/settings-page.tsx",
  );

  assert.match(settings, /dataComponent="AccountSettingsPanel"/);
  assert.match(settings, /logOutAllDevicesTitle/);
  assert.match(settings, /trustedDevicesDescription/);
  assert.match(settings, /data-component="CompactSessionRow"/);
  assert.match(settings, /group-hover:opacity-100/);
  assert.match(settings, /DropdownMenuTrigger/);
  assert.doesNotMatch(settings, /<AccountSettingsSection/);
  assert.doesNotMatch(settings, /<EmailSettingsSection/);
  assert.doesNotMatch(settings, /<PasswordAuthenticationSettingsSection/);
  assert.doesNotMatch(settings, /<SessionsSettingsSection/);
});

test("Connectors tab matches provider-list structure without inline repository form", async () => {
  const connectors = await read(
    "../src/features/settings/components/organisms/repositories-settings-section.tsx",
  );

  assert.match(connectors, /data-component="ConnectorProviderList"/);
  assert.match(connectors, /data-component="ConnectorProviderRow"/);
  assert.match(connectors, /githubPatAccessTitle/);
  assert.match(connectors, /ProviderCredentialDialog/);
  assert.doesNotMatch(connectors, /connectTitle/);
  assert.doesNotMatch(connectors, /repositoryUrl/);
  assert.doesNotMatch(connectors, /id="provider-credential"|type="password"/);
  assert.doesNotMatch(connectors, /unsupportedProviderDescription/);
});
