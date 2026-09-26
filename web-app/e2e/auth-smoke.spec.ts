import { test, expect } from "@playwright/test";

/**
 * Auth UI smoke against staging/test when WEB_BASE / PLAYWRIGHT_BASE_URL points at a stack
 * with accounts enabled. Against the default science+Vite webServer (accounts off),
 * login still renders FeatureUnavailable and does not crash.
 */
test.describe("auth smoke", () => {
  test("login page renders form chrome", async ({ page }) => {
    await page.goto("/login");
    await expect(page).toHaveURL(/\/login/);
    await expect(page.locator("body")).toBeVisible();
    const password = page.locator(
      'input[type="password"], input[name="password"], input[autocomplete="current-password"]',
    );
    const accountsOff = page.getByText(
      /Hesap ve ticaret servisleri|keşif için hazır/i,
    );
    await expect(password.or(accountsOff).first()).toBeVisible({
      timeout: 20000,
    });
  });
});
