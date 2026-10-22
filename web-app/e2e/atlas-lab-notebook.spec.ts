import { test, expect } from "@playwright/test";

/**
 * Smoke over the three learning pages: /periodic (element tiles), /lab (bench) and /collection (notebook).
 * Uses playwright.config webServer (science :5080 + Vite :5173) unless PLAYWRIGHT_BASE_URL is set.
 */
test.describe("atlas lab notebook path", () => {
  test("periodic open, lab reachable, collection notebook reachable", async ({
    page,
  }) => {
    await page.goto("/periodic");
    await expect(page.getByRole("heading", { level: 1, name: "Periyodik tablo" })).toBeVisible();
    // Every element tile (table cell or card) carries data-symbol.
    await expect(page.locator("[data-symbol]").first()).toBeVisible({ timeout: 30000 });

    await page.goto("/lab");
    await expect(page.getByRole("heading", { level: 1, name: "Laboratuvar" })).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole("heading", { level: 2, name: "Palet" })).toBeVisible();

    await page.goto("/collection");
    await expect(page.getByRole("heading", { level: 1, name: "Keşif defterim" })).toBeVisible({ timeout: 15000 });
  });
});
