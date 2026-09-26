import { test, expect } from "@playwright/test";

/**
 * Atlas → /lab → defter (collection) smoke.
 * Uses playwright.config webServer (science :5080 + Vite :5173) unless PLAYWRIGHT_BASE_URL is set.
 */
test.describe("atlas lab notebook path", () => {
  test("periodic open, lab reachable, collection notebook reachable", async ({
    page,
  }) => {
    await page.goto("/periodic");
    await expect(page.locator("body")).toBeVisible();
    // Table or museum chart should render at least one element tile / link.
    // Do not match bare `button` — desktop keeps the mobile menu trigger in DOM but hidden.
    const tile = page.locator("a[href*='/element/'], [data-symbol]").first();
    await expect(tile).toBeVisible({ timeout: 30000 });

    await page.goto("/lab");
    await expect(page).toHaveURL(/\/lab/);
    await expect(page.locator("body")).toContainText(/Lab|Laboratuvar|tezgâh|Dene|palet/i);

    await page.goto("/collection");
    await expect(page).toHaveURL(/\/collection/);
    await expect(page.locator("body")).toContainText(/Defter|koleksiyon|rota|Collection/i);
  });
});
