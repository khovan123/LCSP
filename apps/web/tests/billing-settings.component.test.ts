import assert from "node:assert/strict";
import { test } from "node:test";
import { JSDOM } from "jsdom";
import { act, createElement } from "react";
import {
  BILLING_ORDER_STATUSES,
  BILLING_PAYMENT_PROVIDERS,
  PREPAID_BILLING_CONFIG,
} from "@lcsp/contracts/billing";
import type {
  BillingHistoryView,
  BillingOrderView,
  BillingWalletView,
} from "@lcsp/contracts/billing";

const dom = new JSDOM("<!doctype html><html><body></body></html>", {
  url: "http://localhost/",
  pretendToBeVisual: true,
});
const testWindow = dom.window;
for (const name of [
  "window",
  "document",
  "navigator",
  "Element",
  "HTMLElement",
  "HTMLInputElement",
  "HTMLButtonElement",
  "HTMLFormElement",
  "Node",
  "Event",
  "MouseEvent",
  "KeyboardEvent",
  "MutationObserver",
  "getComputedStyle",
] as const) {
  Object.defineProperty(globalThis, name, {
    configurable: true,
    value: name === "window" ? testWindow : testWindow[name],
  });
}
for (const name of ["requestAnimationFrame", "cancelAnimationFrame"] as const) {
  Object.defineProperty(globalThis, name, {
    configurable: true,
    value: testWindow[name].bind(testWindow),
  });
}
Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", {
  configurable: true,
  value: true,
});
Object.defineProperty(testWindow, "matchMedia", {
  configurable: true,
  value: () => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
  }),
});

const { createRoot } = await import("react-dom/client");
const { QueryClient, QueryClientProvider } =
  await import("@tanstack/react-query");
const { apiQueryKeys } = await import("../src/lib/api/query-keys.ts");
const { BillingSettingsPanel } =
  await import("../src/features/billing/components/organisms/billing-settings-panel.tsx");

type BillingFixture = {
  orders: BillingOrderView[];
  wallet: BillingWalletView;
  historyCalls: number;
  orderCalls: Map<string, number>;
  missingOrderDetails: Set<string>;
};

function order(
  id: string,
  status: BillingOrderView["status"],
  createdAt: string,
): BillingOrderView {
  return {
    id,
    amountVnd: "10000",
    creditUnits: "10000",
    paymentCode: `LCSP${id.toUpperCase()}`,
    status,
    expiresAt: "2026-09-20T00:00:00.000Z",
    creditedAt:
      status === BILLING_ORDER_STATUSES.CREDITED
        ? "2026-09-19T01:00:00.000Z"
        : null,
    createdAt,
    updatedAt: createdAt,
    paymentInstructions: {
      provider: BILLING_PAYMENT_PROVIDERS.sepay,
      currency: PREPAID_BILLING_CONFIG.currency,
      paymentCode: `LCSP${id.toUpperCase()}`,
      amountVnd: "10000",
      bankName: "Example Bank",
      bankAccountNumber: "0123456789",
      accountHolder: "LCSP",
      transferContent: `LCSP${id.toUpperCase()}`,
      qrCodeUrl: "",
    },
  };
}

function wallet(availableCredits: string): BillingWalletView {
  return {
    walletId: "wallet-current-user",
    availableCredits,
    reservedCredits: "0",
    totalCredits: availableCredits,
    version: Number(availableCredits),
  };
}

function success(data: unknown) {
  return Response.json({ ok: true, data });
}

function historyView(orders: BillingOrderView[]): BillingHistoryView {
  return { orders, page: 1, pageSize: 20, totalCount: orders.length };
}

function mockBillingApi(fixture: BillingFixture) {
  return async (input: RequestInfo | URL) => {
    const path = String(input);
    if (path === "/api/billing/wallet") return success(fixture.wallet);
    if (path.startsWith("/api/billing/history")) {
      fixture.historyCalls += 1;
      return success(historyView(fixture.orders));
    }
    const orderId = path.match(/^\/api\/billing\/orders\/([^/?]+)/)?.[1];
    if (orderId) {
      fixture.orderCalls.set(
        orderId,
        (fixture.orderCalls.get(orderId) ?? 0) + 1,
      );
      if (fixture.missingOrderDetails.has(orderId)) {
        return Response.json(
          { ok: false, problem: { code: "BILLING_NOT_FOUND" } },
          { status: 404 },
        );
      }
      const found = fixture.orders.find((item) => item.id === orderId);
      assert.ok(found, `unexpected billing order request for ${orderId}`);
      return success(found);
    }
    throw new Error(`Unexpected billing API request: ${path}`);
  };
}

async function renderBilling(
  fixture: BillingFixture,
  context: { after(callback: () => void | Promise<void>): void },
  seededOrder?: BillingOrderView,
) {
  const previousFetch = globalThis.fetch;
  globalThis.fetch = mockBillingApi(fixture);
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: Infinity,
        refetchOnWindowFocus: false,
      },
      mutations: { retry: false, gcTime: Infinity },
    },
  });
  if (seededOrder) {
    queryClient.setQueryData(
      apiQueryKeys.billing.order(seededOrder.id),
      seededOrder,
    );
  }
  const container = testWindow.document.createElement("div");
  testWindow.document.body.append(container);
  const root = createRoot(container);
  context.after(async () => {
    await act(async () => root.unmount());
    queryClient.clear();
    globalThis.fetch = previousFetch;
    container.remove();
  });
  await act(async () => {
    root.render(
      createElement(
        QueryClientProvider,
        { client: queryClient },
        createElement(BillingSettingsPanel, { locale: "en" }),
      ),
    );
  });
  return container;
}

async function waitFor(
  condition: () => boolean,
  message: string,
  timeoutMs = 2_000,
) {
  const deadline = Date.now() + timeoutMs;
  while (!condition()) {
    if (Date.now() >= deadline) assert.fail(message);
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 25));
    });
  }
}

function fixtureFor(
  orders: BillingOrderView[],
  balance = "10000",
): BillingFixture {
  return {
    orders,
    wallet: wallet(balance),
    historyCalls: 0,
    orderCalls: new Map(),
    missingOrderDetails: new Set(),
  };
}

async function assertLifecycleStatus(
  context: { after(callback: () => void | Promise<void>): void },
  id: string,
  status: BillingOrderView["status"],
  visible: string,
) {
  const currentOrder = order(id, status, "2026-09-19T01:00:00.000Z");
  const container = await renderBilling(
    fixtureFor([currentOrder], "23000"),
    context,
  );
  await waitFor(
    () => container.textContent?.includes(visible) ?? false,
    `expected visible status: ${visible}`,
  );
  assert.match(container.textContent ?? "", /23,000 VND/);
  assert.match(
    container.textContent ?? "",
    new RegExp(currentOrder.paymentCode),
  );
}

test("Billing Settings visibly renders a pending payment", async (context) => {
  await assertLifecycleStatus(
    context,
    "pending",
    BILLING_ORDER_STATUSES.PENDING_PAYMENT,
    "Pending payment",
  );
});

test("Billing Settings visibly renders credited state", async (context) => {
  await assertLifecycleStatus(
    context,
    "credited",
    BILLING_ORDER_STATUSES.CREDITED,
    "Credited",
  );
});

test("Billing Settings visibly renders expired state", async (context) => {
  await assertLifecycleStatus(
    context,
    "expired",
    BILLING_ORDER_STATUSES.EXPIRED,
    "Expired",
  );
});

test("Billing Settings visibly renders pending reconciliation", async (context) => {
  await assertLifecycleStatus(
    context,
    "reconciliation",
    BILLING_ORDER_STATUSES.PENDING_RECONCILIATION,
    "Payment pending reconciliation",
  );
});

test("order-detail 404 falls back to authenticated history and stops retry polling", async (context) => {
  const currentOrder = order(
    "history-fallback",
    BILLING_ORDER_STATUSES.PENDING_PAYMENT,
    "2026-09-19T01:00:00.000Z",
  );
  const fixture = fixtureFor([currentOrder]);
  fixture.missingOrderDetails.add(currentOrder.id);
  const container = await renderBilling(fixture, context, currentOrder);

  await waitFor(
    () =>
      fixture.orderCalls.get(currentOrder.id) === 1 &&
      container.textContent?.includes("Pending payment") === true,
    "expected history to keep the payment visible after detail 404",
  );
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 250));
  });
  assert.equal(
    fixture.orderCalls.get(currentOrder.id),
    1,
    "not-found details must not repeatedly poll a stale cached order",
  );
  assert.match(
    container.textContent ?? "",
    new RegExp(currentOrder.paymentCode),
  );
});

test("a credited non-selected order refreshes history and prepaid balance while the selected order stays pending", async (context) => {
  const selectedOrder = order(
    "newer",
    BILLING_ORDER_STATUSES.PENDING_PAYMENT,
    "2026-09-19T02:00:00.000Z",
  );
  const otherPendingOrder = order(
    "older",
    BILLING_ORDER_STATUSES.PENDING_PAYMENT,
    "2026-09-19T01:00:00.000Z",
  );
  const fixture = fixtureFor([selectedOrder, otherPendingOrder], "10000");
  const container = await renderBilling(fixture, context);

  await waitFor(
    () => fixture.historyCalls > 0 && fixture.orderCalls.has("newer"),
    "expected initial history and selected-order requests",
  );
  assert.match(container.textContent ?? "", /Pending payment/);

  fixture.orders = [
    selectedOrder,
    {
      ...otherPendingOrder,
      status: BILLING_ORDER_STATUSES.CREDITED,
      creditedAt: "2026-09-19T03:00:00.000Z",
      updatedAt: "2026-09-19T03:00:00.000Z",
    },
  ];
  fixture.wallet = wallet("20000");

  await waitFor(
    () =>
      fixture.historyCalls > 1 &&
      container.textContent?.includes("20,000 VND") === true &&
      container.textContent?.includes("Credited") === true,
    "history polling should discover the other settlement and refresh wallet",
    8_000,
  );
  assert.ok(
    (fixture.orderCalls.get("newer") ?? 0) > 1,
    "the selected order remains independently refreshed",
  );
  const olderRow = [...container.querySelectorAll("tbody tr")].find((row) =>
    row.textContent?.includes(otherPendingOrder.paymentCode),
  );
  assert.match(olderRow?.textContent ?? "", /Credited/);
  assert.match(container.textContent ?? "", /Pending payment/);
});
