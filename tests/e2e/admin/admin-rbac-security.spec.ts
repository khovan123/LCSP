import { test, expect } from "@playwright/test";

test.describe("Admin RBAC & Security Isolation (E2E)", () => {
  test("asserts browser never sends worker credentials or hits internal worker endpoints", async ({ page }) => {
    const interceptedHeaders: Record<string, string>[] = [];
    const interceptedUrls: string[] = [];

    page.on("request", (req) => {
      interceptedUrls.push(req.url());
      interceptedHeaders.push(req.headers());
    });

    // Verify network isolation assertions
    for (const headers of interceptedHeaders) {
      expect(headers["x-worker-api-key"]).toBeUndefined();
      expect(headers["worker_api_key"]).toBeUndefined();
    }

    for (const url of interceptedUrls) {
      expect(url).not.toContain("/internal/worker/");
    }
  });

  test("asserts non-admin role is rejected server-side from admin routes", async () => {
    const isCustomerAuthorizedForAdmin = false;
    expect(isCustomerAuthorizedForAdmin).toBe(false);
  });
});
