import { test, expect } from "@playwright/test";
import {
  createAdminTestServer,
  type AdminTestServer,
} from "./support/admin-test-server.js";

test.describe("Admin Corpus Lifecycle & Publication Readiness (E2E)", () => {
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

  test("publication readiness gating: publishing forbidden unless authoritative state is READY in UI", async ({
    page,
  }) => {
    await page.goto(`${server.url}/admin`);

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
    await page.goto(`${server.url}/admin`);

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
    expect(server.getMutationCount()).toBe(0);

    // 2. Discard modal dismissal
    const discardBtn = page.locator('[data-testid="discard-corpus-btn"]');
    const discardModal = page.locator('[data-testid="discard-modal"]');
    const cancelDiscardBtn = page.locator(
      '[data-testid="cancel-discard-btn"]',
    );

    await discardBtn.click();
    await expect(discardModal).toBeVisible();
    await cancelDiscardBtn.click();
    await expect(discardModal).toBeHidden();
    expect(server.getMutationCount()).toBe(0);

    // 3. Confirm Publish -> 1 mutation
    const confirmPublishBtn = page.locator(
      '[data-testid="confirm-publish-btn"]',
    );
    await publishBtn.click();
    await expect(publishModal).toBeVisible();
    await confirmPublishBtn.click();
    await expect(publishModal).toBeHidden();
    expect(server.getMutationCount()).toBe(1);
  });
});
