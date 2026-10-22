import { test, expect as baseExpect, type Page } from "@playwright/test";

/**
 * Account flows with accounts on and no backend: every /api/v1 call is answered by an
 * in-memory identity mock shaped like identity-service (docs/kilavuz/identity.md, AuthDtos.cs).
 * Unexpected calls are answered 404 and fail the test, so the mock list stays honest.
 */

// Vite dev serves unbundled modules: a cold lazy route can take several seconds in a fresh context.
const expect = baseExpect.configure({ timeout: 15_000 });
test.describe.configure({ timeout: 90_000 });

interface MockUser {
  id: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

/** Test-only credentials for the mock; nothing leaves the browser. */
const EXISTING: MockUser = {
  id: "8d0f6c1e-2b7a-4c55-9d1e-0a1b2c3d4e5f",
  email: "mevcut@example.test",
  password: "mock-parola-123",
  firstName: "Ayşe",
  lastName: "Yılmaz",
};

const base64url = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");

/** Unsigned JWT with the claims the web app reads (`sub`, `exp`). */
function jwtFor(user: MockUser): string {
  const exp = Math.floor(Date.now() / 1000) + 3600;
  return `${base64url({ alg: "HS256", typ: "JWT" })}.${base64url({ sub: user.id, email: user.email, exp })}.mock-signature`;
}

interface MockApi {
  calls: string[];
  unhandled: string[];
}

async function mockIdentityApi(page: Page): Promise<MockApi> {
  const users = new Map([[EXISTING.email, EXISTING]]);
  const tokens = new Map<string, MockUser>();
  const api: MockApi = { calls: [], unhandled: [] };

  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname.replace(/^\/api\/v1/, "");
    const call = `${request.method()} ${path}`;
    api.calls.push(call);
    const json = (status: number, body: unknown) => route.fulfill({ status, json: body });
    const bearer = request.headers().authorization?.replace(/^Bearer /, "");
    const user = bearer ? tokens.get(bearer) : undefined;

    switch (call) {
      case "GET /auth/capabilities":
        return json(200, { passwordRecovery: false, emailVerification: false, captcha: false });
      case "POST /auth/register": {
        const body = request.postDataJSON();
        if (users.has(body.email))
          // ASP.NET Identity errors come back as BadRequest(ModelState). The user name is the
          // e-mail, so a taken address fails both uniqueness checks.
          return json(400, {
            DuplicateUserName: [`Username '${body.email}' is already taken.`],
            DuplicateEmail: [`Email '${body.email}' is already taken.`],
          });
        users.set(body.email, { id: crypto.randomUUID(), ...body });
        return json(200, { message: "User registered successfully." });
      }
      case "POST /auth/login": {
        const body = request.postDataJSON();
        const match = users.get(body.email);
        if (!match || match.password !== body.password)
          return route.fulfill({ status: 401, contentType: "text/plain", body: "Invalid credentials." });
        const token = jwtFor(match);
        tokens.set(token, match);
        return json(200, { token, email: match.email, fullName: `${match.firstName} ${match.lastName}` });
      }
      case "GET /auth/profile":
        if (!user) return json(401, { message: "Unauthorized" });
        return json(200, {
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          emailConfirmed: false,
          createdAt: "2026-09-01T10:00:00Z",
        });
      case "GET /auth/learning":
      case "PUT /auth/learning":
        if (!user) return json(401, { message: "Unauthorized" });
        return json(200, { discoveries: [], lessons: [] });
      default:
        api.unhandled.push(call);
        return json(404, { message: `Not mocked: ${call}` });
    }
  });
  return api;
}

let api: MockApi;

test.beforeEach(async ({ page }) => {
  api = await mockIdentityApi(page);
});

test.afterEach(() => {
  expect(api.unhandled, "requests the mock does not know").toEqual([]);
});

/** Matches a page URL whose path (no query, no hash) is exactly `path`. */
const onPath = (path: string) => new RegExp(`^https?://[^/]+${path}$`);

/** Where the account links live: the header from `lg`, the menu sheet on phones. */
async function accountArea(page: Page, isMobile: boolean) {
  if (!isMobile) return page.getByRole("banner");
  await page.getByRole("button", { name: "Menüyü aç" }).click();
  return page.getByRole("dialog", { name: "Gezinme" });
}

test.describe("register", () => {
  test("validation errors block the request", async ({ page }) => {
    await page.goto("/register");
    const submit = page.getByRole("button", { name: "Hesap aç", exact: true });
    const form = page.locator("form");

    // Native constraints: every field is required.
    await submit.click();
    await expect(form.locator("input:invalid")).toHaveCount(5);

    await page.getByLabel("Ad", { exact: true }).fill("Deniz");
    await page.getByLabel("Soyad").fill("Kaya");
    await page.getByLabel("E-posta").fill("deniz@example.test");
    await page.getByLabel("Şifre", { exact: true }).fill("kisa");
    await page.getByLabel("Şifre tekrar").fill("kisa");
    await submit.click();
    // minLength 10 on both password fields.
    await expect(form.locator("input:invalid")).toHaveCount(2);

    await page.getByLabel("Şifre", { exact: true }).fill("uzun-parola-1");
    await page.getByLabel("Şifre tekrar").fill("uzun-parola-2");
    await submit.click();
    await expect(page.getByText("Şifreler eşleşmiyor.")).toBeVisible();
    await expect(page.getByLabel("Şifre tekrar")).toHaveAttribute("aria-invalid", "true");
    expect(api.calls).not.toContain("POST /auth/register");

    // The server refuses a taken e-mail; the form stays and says so.
    await page.getByLabel("E-posta").fill(EXISTING.email);
    await page.getByLabel("Şifre tekrar").fill("uzun-parola-1");
    await submit.click();
    // apiError() puts the Identity codes in Turkish and says it once for both.
    await expect(page.getByRole("alert")).toHaveText("Bu e-posta zaten kayıtlı.");
    await expect(page).toHaveURL(/\/register$/);
    expect(api.calls.filter((call) => call === "POST /auth/register")).toHaveLength(1);
  });

  test("success signs in and follows a same-origin returnTo to the settings", async ({ page, isMobile }) => {
    await page.goto("/register?returnTo=%2Fsettings");
    await page.getByLabel("Ad", { exact: true }).fill("Deniz");
    await page.getByLabel("Soyad").fill("Kaya");
    await page.getByLabel("E-posta").fill("deniz@example.test");
    await page.getByLabel("Şifre", { exact: true }).fill("uzun-parola-1");
    await page.getByLabel("Şifre tekrar").fill("uzun-parola-1");
    await page.getByRole("button", { name: "Hesap aç", exact: true }).click();

    await expect(page).toHaveURL(/\/settings$/);
    await expect(page.getByRole("heading", { level: 1, name: "Ayarlar" })).toBeVisible();
    for (const section of ["Profil", "Şifre", "API anahtarları", "Verilerin", "Hesabı sil"])
      await expect(page.getByRole("heading", { level: 2, name: section, exact: true })).toBeVisible();
    await expect(page.getByRole("region", { name: "Profil" })).toContainText("deniz@example.test");
    await expect(page.getByRole("region", { name: "Profil" })).toContainText("Deniz Kaya");
    expect(api.calls).toEqual(
      expect.arrayContaining(["POST /auth/register", "POST /auth/login", "GET /auth/profile"]),
    );

    const area = await accountArea(page, isMobile);
    await expect(area.getByRole("link", { name: "Giriş yap" })).toHaveCount(0);
  });
});

test.describe("login and logout", () => {
  test("wrong password is refused; sign-in shows the account menu and ignores an off-site returnTo", async ({
    page,
    isMobile,
  }) => {
    await page.goto("/login?returnTo=%2F%2Fevil.example%2Fsteal");
    await page.getByLabel("E-posta").fill(EXISTING.email);
    await page.getByLabel("Şifre", { exact: true }).fill("yanlis-parola-1");
    await page.getByRole("button", { name: "Giriş yap", exact: true }).click();
    await expect(page.getByRole("alert")).toHaveText("E-posta veya şifre yanlış.");

    await page.getByLabel("Şifre", { exact: true }).fill(EXISTING.password);
    await page.getByRole("button", { name: "Giriş yap", exact: true }).click();
    // safeReturnTo drops the protocol-relative URL and falls back to the notebook.
    await expect(page).toHaveURL(onPath("/collection"));
    await expect(page.getByRole("heading", { level: 1, name: "Keşif defterim" })).toBeVisible();

    if (isMobile) {
      const sheet = await accountArea(page, true);
      await expect(sheet.getByRole("link", { name: "Hesabım" })).toBeVisible();
      await expect(sheet.getByRole("button", { name: "Çıkış" })).toBeVisible();
      await expect(sheet.getByRole("link", { name: "Giriş yap" })).toHaveCount(0);
    } else {
      const header = page.getByRole("banner");
      await expect(header.getByRole("link", { name: "Giriş yap" })).toHaveCount(0);
      await header.getByRole("button", { name: "Hesap menüsü" }).click();
      const menu = page.getByRole("menu");
      await expect(menu.getByRole("menuitem", { name: "Hesabım" })).toBeVisible();
      await expect(menu.getByRole("menuitem", { name: "Ayarlar" })).toBeVisible();
    }
  });

  test("logout clears the session", async ({ page, isMobile }) => {
    await page.goto("/login");
    await page.getByLabel("E-posta").fill(EXISTING.email);
    await page.getByLabel("Şifre", { exact: true }).fill(EXISTING.password);
    await page.getByRole("button", { name: "Giriş yap", exact: true }).click();

    if (isMobile) {
      // Opened as soon as the URL changes, while the notebook may still be loading: the sheet
      // stays open when the page arrives behind it. (The modal sheet hides the page from the
      // accessibility tree, so the heading is found by its tag.)
      await expect(page).toHaveURL(onPath("/collection"));
      const sheet = await accountArea(page, true);
      await expect(page.locator("h1", { hasText: "Keşif defterim" })).toBeVisible();
      await expect(sheet).toBeVisible();
      await sheet.getByRole("button", { name: "Çıkış" }).click();
    } else {
      await expect(page.getByRole("heading", { level: 1, name: "Keşif defterim" })).toBeVisible();
      await page.getByRole("banner").getByRole("button", { name: "Hesap menüsü" }).click();
      await page.getByRole("menuitem", { name: "Çıkış" }).click();
    }

    await expect(page).toHaveURL(onPath("/"));
    await expect(page.getByRole("heading", { level: 1, name: "Atomdan bileşiğe." })).toBeVisible();
    // The closing menu hands focus to the new page, not back to its trigger.
    await expect(page.locator("#main-content")).toBeFocused();
    expect(await page.evaluate(() => localStorage.getItem("token"))).toBeNull();
    const area = await accountArea(page, isMobile);
    await expect(area.getByRole("link", { name: "Giriş yap" })).toBeVisible();

    // Still signed out after a reload, and account pages ask for a sign-in.
    await page.goto("/settings");
    await expect(page.getByRole("heading", { name: "Ayarlarını görmek için giriş yap" })).toBeVisible();
  });
});
