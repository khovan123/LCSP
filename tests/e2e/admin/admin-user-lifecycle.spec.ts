import { test, expect } from "@playwright/test";

test.describe("Admin User Lifecycle & Destructive Action Safeguards (E2E)", () => {
  test("destructive suspend modal dismissal paths cause 0 mutations in live browser", async ({
    page,
  }) => {
    let mutationCount = 0;
    await page.route("**/api/admin/users/*/suspend", async (route) => {
      mutationCount += 1;
      await route.fulfill({
        status: 200,
        json: { ok: true, data: { status: "SUSPENDED" } },
      });
    });

    await page.goto("/admin");

    const suspendBtn = page.locator('[data-testid="suspend-btn-customer-1"]');
    const suspendModal = page.locator('[data-testid="suspend-modal"]');
    const cancelBtn = page.locator('[data-testid="cancel-suspend-btn"]');
    const confirmBtn = page.locator('[data-testid="confirm-suspend-btn"]');

    // 1. Dismiss via Cancel button -> 0 mutations
    await suspendBtn.click();
    await expect(suspendModal).toBeVisible();
    await cancelBtn.click();
    await expect(suspendModal).toBeHidden();
    expect(mutationCount).toBe(0);

    // 2. Dismiss via Escape key -> 0 mutations
    await suspendBtn.click();
    await expect(suspendModal).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(suspendModal).toBeHidden();
    expect(mutationCount).toBe(0);

    // 3. Dismiss via Backdrop click -> 0 mutations
    await suspendBtn.click();
    await expect(suspendModal).toBeVisible();
    await suspendModal.click({ position: { x: 10, y: 10 } });
    await expect(suspendModal).toBeHidden();
    expect(mutationCount).toBe(0);

    // 4. Confirm action -> 1 mutation
    await suspendBtn.click();
    await expect(suspendModal).toBeVisible();
    await confirmBtn.click();
    await expect(suspendModal).toBeHidden();
    expect(mutationCount).toBe(1);
  });

  test("validates last-admin protection invariant in live UI", async ({
    page,
  }) => {
    await page.goto("/admin");

    const demoteAdminBtn = page.locator('[data-testid="demote-btn-admin-1"]');
    await expect(demoteAdminBtn).toBeVisible();
    await expect(demoteAdminBtn).toBeDisabled();
  });
});
