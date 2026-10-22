import { test, expect as baseExpect } from "@playwright/test";

// Vite dev serves unbundled modules: a cold lazy route can take several seconds in a fresh context.
const expect = baseExpect.configure({ timeout: 15_000 });
test.describe.configure({ timeout: 60_000 });

/** /kilavuz: the in-app system guide built from docs/kilavuz. */
test.describe("system guide", () => {
  test("search finds an order-service function and deep-links to its row", async ({ page }) => {
    await page.goto("/kilavuz");
    // One search field is rendered per layout (sidebar from lg, toolbar below); only one is visible.
    const search = page.getByRole("searchbox", { name: "Kılavuzda ara" });
    await search.fill("consumeSagaEvents");
    await expect(page.getByRole("heading", { level: 1, name: "Arama sonuçları" })).toBeVisible();

    await page.getByRole("link", { name: /consumeSagaEvents\(channel\)/ }).click();
    await expect(page).toHaveURL(/\/kilavuz\/order#src-index-ts-consumesagaevents-channel$/);
    await expect(page.getByRole("heading", { level: 1, name: "Sipariş servisi" })).toBeVisible();
    const row = page.locator("#src-index-ts-consumesagaevents-channel");
    await expect(row).toHaveAttribute("data-state", "selected");
    await expect(row).toContainText("consumeSagaEvents(channel)");
    await expect(row).toBeInViewport();
    await expect(search).toHaveValue("");
  });
});
