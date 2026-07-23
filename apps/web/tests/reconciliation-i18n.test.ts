import * as assert from "node:assert/strict";
import { test } from "node:test";
import { resolveMessage } from "@lcsp/i18n";

import { appLocale } from "../src/lib/locale.ts";

test("reconciliation access-revoked messaging resolves to friendly localized copy", () => {
  const title = resolveMessage(
    appLocale,
    "pages.reconciliation.accessRevokedTitle",
  );
  const detail = resolveMessage(
    appLocale,
    "pages.reconciliation.accessRevokedDetail",
  );

  assert.notEqual(title, "pages.reconciliation.accessRevokedTitle");
  assert.notEqual(detail, "pages.reconciliation.accessRevokedDetail");
  assert.equal(title.includes("PBAC_DENIED"), false);
  assert.equal(detail.includes("PBAC_DENIED"), false);
});

test("workspace assessment card action label for conflict resolution is localized", () => {
  const label = resolveMessage(appLocale, "pages.workspace.openConflictResolution");
  assert.notEqual(label, "pages.workspace.openConflictResolution");
});
