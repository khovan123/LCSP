import { test, expect } from "@playwright/test";

test.describe("Admin Corpus Lifecycle & Publication Readiness (E2E)", () => {
  test("publication readiness gating: publishing forbidden unless authoritative state is READY in UI", async ({
    page,
  }) => {
    await page.goto("/admin");

    // Ready draft has enabled Publish button
    const readyPublishBtn = page.locator('[data-testid="publish-corpus-btn"]');
    await expect(readyPublishBtn).toBeVisible();
    await expect(readyPublishBtn).toBeEnabled();

    // Blocked draft has disabled Publish button
    const blockedPublishBtn = page.locator(
      '[data-testid="publish-blocked-btn"]',
    );
    await expect(blockedPublishBtn).toBeVisible();
    await expect(blockedPublishBtn).toBeDisabled();
  });

  test("destructive publish & discard modal dismissals cause 0 mutations in live browser", async ({
    page,
  }) => {
    let publishMutations = 0;
    let discardMutations = 0;

    await page.route("**/api/admin/corpus/*/publish", async (route) => {
      publishMutations += 1;
      await route.fulfill({
        status: 200,
        json: { ok: true, data: { status: "ACTIVE" } },
      });
    });

    await page.route("**/api/admin/corpus/*/discard", async (route) => {
      discardMutations += 1;
      await route.fulfill({
        status: 200,
        json: { ok: true, data: { status: "DISCARDED" } },
      });
    });

    await page.goto("/admin");

    // 1. Publish modal dismissal
    const publishBtn = page.locator('[data-testid="publish-corpus-btn"]');
    const publishModal = page.locator('[data-testid="publish-modal"]');
    const cancelPublishBtn = page.locator(
      '[data-testid="cancel-publish-btn"]',
    );

    await publishBtn.click();
    await expect(publishModal).toBeVisible();
    await cancelPublishBtn.click();
    await expect(publishModal).toBeHidden();
    expect(publishMutations).toBe(0);

    // 2. Discard modal dismissal
    const discardBtn = page
      .locator('[data-testid="discard-corpus-btn"]')
      .first();
    const discardModal = page.locator('[data-testid="discard-modal"]');
    const cancelDiscardBtn = page.locator(
      '[data-testid="cancel-discard-btn"]',
    );

    await discardBtn.click();
    await expect(discardModal).toBeVisible();
    await cancelDiscardBtn.click();
    await expect(discardModal).toBeHidden();
    expect(discardMutations).toBe(0);

    // 3. Confirm Publish -> 1 mutation
    const confirmPublishBtn = page.locator(
      '[data-testid="confirm-publish-btn"]',
    );
    await publishBtn.click();
    await expect(publishModal).toBeVisible();
    await confirmPublishBtn.click();
    await expect(publishModal).toBeHidden();
    expect(publishMutations).toBe(1);
  });
});
