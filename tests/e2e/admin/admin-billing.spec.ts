import { expect, test } from "@playwright/test";
import {
  BILLING_ADMIN_PAYMENT_FILTERS,
  BILLING_ADMIN_PERIODS,
  PAYMENT_RECONCILIATION_STATUSES,
} from "@lcsp/contracts/billing";
import {
  authenticateBillingE2e,
  BILLING_E2E_TOKENS,
} from "../fixtures/billing-auth.js";

test.describe("Admin Billing & Revenue release gate", () => {
  test("shows account-backed domain metrics, filters, pagination, and Figma 1320:2 viewport", async ({
    page,
  }) => {
    await authenticateBillingE2e(page, BILLING_E2E_TOKENS.admin);
    await page.goto("/admin/billing");

    await expect(page).toHaveURL(/\/admin\/billing$/);
    await expect(
      page.locator('[data-testid="admin-billing-page"]'),
    ).toBeVisible();
    await expect(page.locator('a[href="/admin/billing"]')).toHaveAttribute(
      "aria-current",
      "page",
    );
    const metrics = page
      .locator('[data-testid="admin-billing-page"] section')
      .first()
      .locator("div.flex.min-h-28");
    await expect(metrics.nth(0)).toContainText("100,000");
    await expect(metrics.nth(1)).toContainText("12,500");
    await expect(metrics.nth(2)).toContainText("12");
    await expect(metrics.nth(3)).toContainText("4");
    await expect(
      page.getByText("customer1@example.test").first(),
    ).toBeVisible();
    await expect(page.getByText("TX-BILLING-E2E-01").first()).toBeVisible();

    await page
      .locator("select")
      .nth(1)
      .selectOption(BILLING_ADMIN_PAYMENT_FILTERS.unmatched);
    await expect(page.getByText("TX-BILLING-E2E-02").first()).toBeVisible();
    await expect(page.getByText("TX-BILLING-E2E-01")).toHaveCount(0);

    await page
      .locator("select")
      .nth(1)
      .selectOption(PAYMENT_RECONCILIATION_STATUSES.REJECTED);
    await expect(page.getByTestId("admin-billing-empty")).toBeVisible();
    await page
      .locator("select")
      .first()
      .selectOption(BILLING_ADMIN_PERIODS.d90);

    await page
      .locator("select")
      .nth(1)
      .selectOption(BILLING_ADMIN_PAYMENT_FILTERS.all);
    await expect(page.getByText(/(?:page 1 of 2|trang 1 \/ 2)/i)).toBeVisible();
    const pagination = page
      .locator('[data-testid="admin-billing-page"] section')
      .last();
    await pagination.locator("button").last().click();
    await expect(page.getByText(/(?:page 2 of 2|trang 2 \/ 2)/i)).toBeVisible();
    await expect(page.getByText("TX-BILLING-E2E-21").first()).toBeVisible();

    await page
      .locator("select")
      .nth(1)
      .selectOption(BILLING_ADMIN_PAYMENT_FILTERS.all);
    await page
      .locator("select")
      .first()
      .selectOption(BILLING_ADMIN_PERIODS.d30);
    await expect(page.locator('[data-figma-node="1320:2"]')).toBeVisible();
    await expect(page).toHaveScreenshot("admin-billing-node-1320-2.png", {
      animations: "disabled",
      caret: "hide",
      maxDiffPixelRatio: 0.05,
    });
  });

  test("denies customer routes and shows no fabricated metrics when the report API fails", async ({
    page,
  }) => {
    await authenticateBillingE2e(page, BILLING_E2E_TOKENS.customer);
    await page.goto("/admin/billing");
    await expect(page).toHaveURL(/\/workspace$/);

    await authenticateBillingE2e(page, BILLING_E2E_TOKENS.adminError);
    await page.goto("/admin/billing");
    await expect(page.getByRole("alert")).toBeVisible();
    await expect(page.getByText("100,000")).toHaveCount(0);
    await expect(page.getByText("12,500")).toHaveCount(0);
    await expect(page.getByText("TX-BILLING-E2E-01")).toHaveCount(0);
  });
});
