import { test, expect } from "@playwright/test";
import {
  createAdminTestServer,
  type AdminTestServer,
} from "./support/admin-test-server.js";

test.describe("Admin User Lifecycle & Destructive Action Safeguards (E2E)", () => {
  let server: AdminTestServer;

  test.beforeAll(async () => {
    server = await createAdminTestServer();
  });

  test.afterAll(async () => {
    await server.close();
  });

  test.beforeEach(() => {
    server.resetMutationCount();
  });

  test("destructive suspend modal dismissal paths cause 0 mutations in live browser", async ({
    page,
  }) => {
    await page.goto(`${server.url}/admin`);

    const suspendBtn = page.locator('[data-testid="suspend-btn-customer-1"]');
    const suspendModal = page.locator('[data-testid="suspend-modal"]');
    const cancelBtn = page.locator('[data-testid="cancel-suspend-btn"]');
    const confirmBtn = page.locator('[data-testid="confirm-suspend-btn"]');

    // 1. Dismiss via Cancel button -> 0 mutations
    await suspendBtn.click();
    await expect(suspendModal).toBeVisible();
    await cancelBtn.click();
    await expect(suspendModal).toBeHidden();
    expect(server.getMutationCount()).toBe(0);

    // 2. Dismiss via Escape key -> 0 mutations
    await suspendBtn.click();
    await expect(suspendModal).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(suspendModal).toBeHidden();
    expect(server.getMutationCount()).toBe(0);

    // 3. Dismiss via Backdrop click -> 0 mutations
    await suspendBtn.click();
    await expect(suspendModal).toBeVisible();
    // Click outside dialog (e.g. top-left corner of backdrop)
    await suspendModal.click({ position: { x: 10, y: 10 } });
    await expect(suspendModal).toBeHidden();
    expect(server.getMutationCount()).toBe(0);

    // 4. Confirm action -> 1 mutation
    await suspendBtn.click();
    await expect(suspendModal).toBeVisible();
    await confirmBtn.click();
    await expect(suspendModal).toBeHidden();
    expect(server.getMutationCount()).toBe(1);
  });

  test("validates last-admin protection invariant in live UI", async ({
    page,
  }) => {
    await page.goto(`${server.url}/admin`);

    const demoteAdminBtn = page.locator('[data-testid="demote-btn-admin-1"]');
    await expect(demoteAdminBtn).toBeVisible();
    await expect(demoteAdminBtn).toBeDisabled();
  });
});
