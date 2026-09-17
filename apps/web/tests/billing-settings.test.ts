import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const read = (path: string) => readFile(new URL(path, import.meta.url), "utf8");

test("Billing Settings renders the server-backed customer surface", async () => {
  const [settings, billing] = await Promise.all([
    read("../src/features/settings/components/organisms/settings-page.tsx"),
    read(
      "../src/features/billing/components/organisms/billing-settings-panel.tsx",
    ),
  ]);
  const billingStart = settings.indexOf(
    "activeSection === SETTINGS_SECTION_IDS.billing ?",
  );
  const billingEnd = settings.indexOf(
    "activeSection === SETTINGS_SECTION_IDS.usage ?",
    billingStart,
  );
  const billingBranch = settings.slice(billingStart, billingEnd);

  assert.match(billingBranch, /BillingSettingsPanel/);
  assert.doesNotMatch(billingBranch, /UnsupportedSettingsPanel/);
  assert.match(billing, /useBillingWalletQuery/);
  assert.match(billing, /useBillingHistoryQuery/);
  assert.match(billing, /useCreateBillingOrderMutation/);
  assert.doesNotMatch(billing, /mock|fake|fixture/i);
});

test("Billing Settings covers authoritative payment lifecycle states", async () => {
  const [component, queries, client] = await Promise.all([
    read(
      "../src/features/billing/components/organisms/billing-settings-panel.tsx",
    ),
    read("../src/lib/api/billing-queries.ts"),
    read("../src/lib/api/billing-client.ts"),
  ]);

  for (const state of [
    "PENDING_PAYMENT",
    "CREDITED",
    "EXPIRED",
    "CANCELLED",
    "PENDING_RECONCILIATION",
  ]) {
    assert.match(component, new RegExp(`BILLING_ORDER_STATUSES\\.${state}`));
  }
  assert.match(component, /pendingReconciliationTitle/);
  assert.match(component, /insufficientPricingConfiguration/);
  assert.match(client, /BILLING_ORDER_STATUSES/);
  assert.match(queries, /PENDING_RECONCILIATION/);
  assert.match(queries, /refetchInterval/);
});

test("Billing top-up uses authenticated BFF requests and idempotency", async () => {
  const [client, ordersRoute, historyRoute, walletRoute] = await Promise.all([
    read("../src/lib/api/billing-client.ts"),
    read("../src/app/api/billing/orders/route.ts"),
    read("../src/app/api/billing/history/route.ts"),
    read("../src/app/api/billing/wallet/route.ts"),
  ]);

  assert.match(client, /apiRequest/);
  assert.match(client, /idempotency-key/);
  assert.match(ordersRoute, /requireSessionToken/);
  assert.match(ordersRoute, /idempotency-key/);
  assert.match(historyRoute, /requireSessionToken/);
  assert.match(walletRoute, /requireSessionToken/);
});
