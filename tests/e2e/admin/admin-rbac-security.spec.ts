import { test, expect } from "@playwright/test";
import {
  createAdminTestServer,
  type AdminTestServer,
} from "./support/admin-test-server.js";

test.describe("Admin RBAC & Security Isolation (E2E)", () => {
  let server: AdminTestServer;

  test.beforeAll(async () => {
    server = await createAdminTestServer();
  });

  test.afterAll(async () => {
    await server.close();
  });

  test("asserts browser never sends worker credentials or hits internal worker endpoints during live Admin navigation", async ({
    page,
  }) => {
    const interceptedHeaders: Record<string, string>[] = [];
    const interceptedUrls: string[] = [];

    page.on("request", (req) => {
      interceptedUrls.push(req.url());
      interceptedHeaders.push(req.headers());
    });

    // Navigate to Admin dashboard and perform actions
    await page.goto(`${server.url}/admin`);
    await expect(page.locator('[data-testid="admin-sidebar"]')).toBeVisible();

    // Trigger Admin action
    const exportBtn = page.locator('[data-testid="export-audit-btn"]');
    await exportBtn.click();

    // Ensure requests were captured
    expect(interceptedUrls.length).toBeGreaterThan(0);

    // Verify network isolation assertions across all intercepted requests
    for (const headers of interceptedHeaders) {
      expect(headers["x-worker-api-key"]).toBeUndefined();
      expect(headers["worker_api_key"]).toBeUndefined();
    }

    for (const url of interceptedUrls) {
      expect(url).not.toContain("/internal/worker/");
    }
  });

  test("asserts non-admin role is rejected server-side from admin routes", async ({
    page,
  }) => {
    // Set customer role header to simulate customer session
    await page.setExtraHTTPHeaders({
      "x-test-role": "CUSTOMER",
    });

    const response = await page.goto(`${server.url}/admin`);
    expect(response?.status()).toBe(403);

    const deniedMessage = page.locator('[data-testid="rbac-denied-message"]');
    await expect(deniedMessage).toBeVisible();
    await expect(deniedMessage).toContainText("Admin privileges required");
  });
});
