import { test, expect as baseExpect } from "@playwright/test";

// Vite dev serves unbundled modules: a cold lazy route can take several seconds in a fresh context.
const expect = baseExpect.configure({ timeout: 15_000 });
test.describe.configure({ timeout: 60_000 });

/**
 * /periodic explorer: Enter in the search box opens the best match through the router,
 * and the family chips filter the card view.
 */
test.describe("periodic explorer", () => {
  test("search 'demir' + Enter opens /element/fe without a full reload", async ({ page }) => {
    await page.goto("/periodic");
    await page.evaluate(() => {
      (window as unknown as { __e2eMarker?: string }).__e2eMarker = "kept";
    });

    const search = page.getByRole("searchbox", { name: "Element ara" });
    await search.fill("demir");
    await expect(page.locator('[data-symbol="Fe"]')).toBeVisible();
    await expect(page.getByText("1 / 118")).toBeVisible();

    await search.press("Enter");
    await expect(page).toHaveURL(/\/element\/fe$/);
    await expect(page.getByRole("heading", { level: 1, name: "Demir (Fe)" })).toBeVisible();
    // A full page load would have dropped the marker.
    expect(
      await page.evaluate(() => (window as unknown as { __e2eMarker?: string }).__e2eMarker),
    ).toBe("kept");
  });

  test("a family chip narrows the cards to that family", async ({ page }) => {
    await page.goto("/periodic");
    // Phones open on cards already; desktop switches from the table.
    await page.getByRole("radiogroup", { name: "Görünüm" }).getByRole("radio", { name: "Kartlar" }).click();
    const cards = page.getByRole("group", { name: "Element kartları" });
    const tiles = cards.locator("[data-symbol]");
    await expect(tiles).toHaveCount(118);

    const noble = page.getByRole("toolbar", { name: "Element aileleri" }).getByRole("button", { name: "Soy gaz" });
    await noble.click();
    await expect(noble).toHaveAttribute("aria-pressed", "true");
    await expect(tiles).toHaveCount(7);
    await expect(cards.locator('[data-symbol]:not([data-family="noble"])')).toHaveCount(0);
    await expect(cards.locator('[data-symbol="Ne"]')).toBeVisible();

    await page.getByRole("button", { name: "Temizle" }).click();
    await expect(tiles).toHaveCount(118);
  });
});
