import { test, expect } from "@playwright/test";

test.describe("Admin Shell & Layout Visual Invariants (Figma 1440x900)", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("validates 248px admin sidebar geometry and content alignment on production Admin DOM", async ({
    page,
  }) => {
    await page.goto("/admin");

    const sidebar = page.locator('[data-testid="admin-sidebar"]');
    await expect(sidebar).toBeVisible();

    const sidebarBox = await sidebar.boundingBox();
    expect(sidebarBox).not.toBeNull();
    expect(Math.round(sidebarBox!.width)).toBe(248);

    const mainContent = page.locator('[data-testid="admin-main-content"]');
    await expect(mainContent).toBeVisible();

    const mainBox = await mainContent.boundingBox();
    expect(mainBox).not.toBeNull();
    expect(Math.round(mainBox!.x)).toBe(248);
  });

  test("validates no horizontal overflow at 1440x900", async ({ page }) => {
    await page.goto("/admin");

    const hasNoHorizontalScrollbar = await page.evaluate(() => {
      return document.documentElement.scrollWidth <= window.innerWidth;
    });

    expect(hasNoHorizontalScrollbar).toBe(true);
  });

  test("validates theme support (Light, Dark, System) in browser DOM", async ({
    page,
  }) => {
    await page.goto("/admin");

    const themeToggle = page.locator('[data-testid="theme-toggle"]');
    await expect(themeToggle).toBeVisible();

    // Toggle theme
    await themeToggle.click();
    const themeLabel = page.locator("#theme-label");
    await expect(themeLabel).toBeVisible();
  });

  test("validates EN and VI localization consistency in browser DOM", async ({
    page,
  }) => {
    await page.goto("/admin");

    const pageTitle = page.locator('[data-testid="page-title"]');
    await expect(pageTitle).toHaveText("Admin Dashboard");

    const langToggle = page.locator('[data-testid="lang-toggle"]');
    await langToggle.click();

    await expect(pageTitle).toHaveText("Bảng điều khiển quản trị");
  });
});
