import { test, expect as baseExpect } from "@playwright/test";

// Vite dev serves unbundled modules: a cold lazy route can take several seconds in a fresh context.
const expect = baseExpect.configure({ timeout: 15_000 });
test.describe.configure({ timeout: 60_000 });

/** Atlas-only build (VITE_ACCOUNTS_ENABLED=false): commerce is closed and phone layouts fit. */
test.describe("accounts off", () => {
  test("/market shows the accounts-closed page", async ({ page }) => {
    await page.goto("/market");
    await expect(
      page.getByRole("heading", { level: 1, name: "Bu kurulumda hesap kapalı" }),
    ).toBeVisible();
    await expect(page.getByRole("main").getByRole("link", { name: "Laboratuvara git" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Giriş yap" })).toHaveCount(0);
  });

  for (const path of ["/", "/periodic", "/lab", "/kilavuz"]) {
    test(`no horizontal page overflow at 390px on ${path}`, async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expect(page.getByRole("contentinfo")).toBeAttached();
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(scrollWidth).toBeLessThanOrEqual(390);
    });
  }
});
