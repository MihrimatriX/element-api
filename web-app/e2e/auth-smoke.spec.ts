import { test, expect } from "@playwright/test";

/**
 * /login smoke for either build. With accounts on (PLAYWRIGHT_BASE_URL pointing at such a stack) the
 * sign-in form renders; with the default science+Vite webServer (accounts off) the route shows the
 * FeatureUnavailable page instead of crashing. Full account flows live in e2e-auth/.
 */
test.describe("auth smoke", () => {
  test("login page renders form chrome", async ({ page }) => {
    await page.goto("/login");
    await expect(page).toHaveURL(/\/login/);
    const password = page.getByLabel("Şifre", { exact: true });
    const accountsOff = page.getByRole("heading", {
      level: 1,
      name: "Bu kurulumda hesap kapalı",
    });
    await expect(password.or(accountsOff).first()).toBeVisible({
      timeout: 20000,
    });
  });
});
