import { randomBytes } from "node:crypto";
import { test, expect, type Page } from "@playwright/test";

/**
 * One end-to-end journey against the running Docker platform (web :6241, gateway :5000):
 * a fresh account gets the 10.000 KREDI welcome grant, buys 1 g Au in the shop, waits for
 * the order saga to deliver it, sells it back on the market and checks the wallet each time.
 * The password is random per run and never logged.
 */

/** Value of a Stat tile (`<dl><dt>label</dt><dd>9.876,54 kredi</dd></dl>`). */
function stat(page: Page, label: string) {
  return page
    .locator("dl")
    .filter({ has: page.locator("dt", { hasText: new RegExp(`^${label}$`) }) })
    .locator("dd")
    .first();
}

/** Reads a Turkish-formatted KREDI amount ("10.000,00") from a Stat tile. */
async function kredi(page: Page, label: string): Promise<number> {
  const text = (await stat(page, label).textContent()) ?? "";
  const amount = text.match(/-?[\d.]+,\d{2}/)?.[0];
  if (!amount) throw new Error(`${label}: no amount in "${text}"`);
  return Number(amount.replace(/\./g, "").replace(",", "."));
}

test("register → welcome grant → buy 1 g Au → order delivered → sell → wallet follows", async ({ page }) => {
  // The order saga is asynchronous (stock → payment → shipment), so the journey gets room.
  test.setTimeout(300_000);
  const email = `e2e-live-${Date.now()}-${randomBytes(3).toString("hex")}@example.test`;
  const password = randomBytes(18).toString("base64url");

  await test.step("register through the UI", async () => {
    await page.goto("/register");
    await page.getByLabel("Ad", { exact: true }).fill("E2E");
    await page.getByLabel("Soyad").fill("Canlı");
    await page.getByLabel("E-posta").fill(email);
    await page.getByLabel("Şifre", { exact: true }).fill(password);
    await page.getByLabel("Şifre tekrar").fill(password);
    await page.getByRole("button", { name: "Hesap aç", exact: true }).click();
    // Signed in straight away and sent to the notebook (no returnTo).
    await expect(page.getByRole("heading", { level: 1, name: "Keşif defterim" })).toBeVisible({ timeout: 30_000 });
  });

  await test.step("/account shows the 10.000 KREDI welcome grant", async () => {
    await page.goto("/account");
    await expect(page.getByRole("heading", { level: 1, name: "Hesabım" })).toBeVisible();
    await expect(stat(page, "Bakiye")).toHaveText(/^10\.000,00/, { timeout: 30_000 });
  });

  let order: { id: string; elementSymbol: string; quantity: number; totalPrice: number };
  await test.step("/shop buys 1 g of elemental gold", async () => {
    await page.goto("/shop?symbol=AU");
    await page.getByRole("radiogroup", { name: "Paket gram" }).getByRole("radio", { name: "1 g" }).click();
    const sku = page.getByRole("article").filter({ hasText: "Altın (saf gram)" });
    // Enabled once the live quote (ask, stock) has arrived.
    await sku
      .getByRole("button", { name: "Altın (saf gram) · Au: sepete 1 g ekle", exact: true })
      .click({ timeout: 30_000 });

    const placed = page.waitForResponse(
      (response) =>
        response.request().method() === "POST" && new URL(response.url()).pathname === "/api/v1/orders",
    );
    await page.getByRole("button", { name: "Sipariş ver" }).click();
    const response = await placed;
    expect(response.status()).toBe(202);
    order = await response.json();
    expect(order.elementSymbol.toUpperCase()).toBe("AU");
    expect(order.quantity).toBe(1);
    expect(order.totalPrice).toBeGreaterThan(0);
    await expect(page.getByRole("status").filter({ hasText: "1 sipariş iletildi." })).toBeVisible();
  });

  await test.step("the order reaches 'Teslim' in the account view and the gold is in the vault", async () => {
    await page.goto("/account");
    const orderRow = page.getByRole("row").filter({ hasText: `#${order.id.slice(0, 8)}` });
    const gold = page.getByRole("region", { name: "Varlıklar" }).getByRole("row").filter({ hasText: "Altın" });
    // Orders poll every 15 s, holdings and wallet load once per visit: reload until the saga is done.
    await expect(async () => {
      await page.reload();
      await expect(orderRow.locator('[data-slot="badge"]')).toHaveText("Teslim", { timeout: 10_000 });
      await expect(gold).toBeVisible({ timeout: 10_000 });
      await expect(stat(page, "Bakiye")).not.toHaveText(/^10\.000,00/, { timeout: 10_000 });
    }).toPass({ timeout: 180_000, intervals: [2_000] });
    expect(await kredi(page, "Bakiye")).toBeCloseTo(10_000 - order.totalPrice, 1);
  });

  await test.step("/market sells the gram back and the wallet grows by the proceeds", async () => {
    await page
      .getByRole("region", { name: "Varlıklar" })
      .getByRole("row")
      .filter({ hasText: "Altın" })
      .getByRole("link", { name: "Sat" })
      .click();
    await expect(page).toHaveURL(/\/market\?symbol=AU$/i);
    await expect(stat(page, "Cüzdan")).toHaveText(/\d,\d{2}/, { timeout: 30_000 });
    const before = await kredi(page, "Cüzdan");

    await page.getByRole("button", { name: "Tümü" }).click({ timeout: 30_000 });
    await expect(page.getByLabel("Gram")).toHaveValue("1");
    const sold = page.waitForResponse(
      (response) =>
        response.request().method() === "POST" && new URL(response.url()).pathname === "/api/v1/desk/sell",
    );
    await page.getByRole("button", { name: "Sat", exact: true }).click();
    const response = await sold;
    expect(response.ok()).toBe(true);
    const { proceedsElx } = await response.json();
    expect(proceedsElx).toBeGreaterThan(0);

    await expect(page.getByText("Kasanda Altın yok.")).toBeVisible({ timeout: 30_000 });
    await expect.poll(() => kredi(page, "Cüzdan"), { timeout: 30_000 }).toBeCloseTo(before + proceedsElx, 1);
  });
});
