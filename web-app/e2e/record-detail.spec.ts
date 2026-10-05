import { readFile } from "node:fs/promises";
import { test, expect as baseExpect, type Page } from "@playwright/test";

// Vite dev serves unbundled modules: a cold lazy route can take several seconds in a fresh context.
const expect = baseExpect.configure({ timeout: 15_000 });
test.describe.configure({ timeout: 60_000 });

/** Value cell of a key-fact row (`<dt>label</dt><dd>value</dd>`) in the record hero. */
function fact(page: Page, label: string) {
  return page
    .locator("dl > div")
    .filter({ has: page.locator("dt", { hasText: new RegExp(`^${label}$`) }) })
    .locator("dd");
}

/** Element and compound record pages from the science API, plus the 404 state. */
test.describe("record detail", () => {
  test("/element/fe shows the title, key facts and a JSON download", async ({ page }) => {
    await page.goto("/element/fe");
    await expect(page.getByRole("heading", { level: 1, name: "Demir (Fe)" })).toBeVisible();
    await expect(fact(page, "İngilizce adı")).toHaveText("Iron");
    await expect(fact(page, "Atom kütlesi")).toContainText("55,8");
    await expect(fact(page, "Periyot · grup · blok")).toHaveText("4 · 8 · d");

    const downloadStarted = page.waitForEvent("download");
    await page.getByRole("button", { name: "JSON indir" }).first().click();
    const download = await downloadStarted;
    // Named after the record id ("fe-26").
    expect(download.suggestedFilename()).toBe("fe-26.json");
    const record = JSON.parse(await readFile(await download.path(), "utf8"));
    expect(record).toMatchObject({ symbol: "Fe", atomic_number: 26 });
  });

  test("/compound/h2o shows the formula", async ({ page }) => {
    await page.goto("/compound/h2o");
    await expect(page.getByRole("heading", { level: 1, name: "Su (H₂O)" })).toBeVisible();
    await expect(fact(page, "Formül")).toContainText("H2O");
    await expect(fact(page, "Molar kütle")).toContainText("18,0");
  });

  test("/element/zz shows the not-found state", async ({ page }) => {
    await page.goto("/element/zz");
    await expect(page.getByRole("heading", { level: 1, name: "Kayıt bulunamadı" })).toBeVisible();
    await expect(page.getByText("için bir element kaydı yok")).toBeVisible();
    await expect(page.getByRole("main").getByRole("link", { name: "Periyodik tablo" })).toBeVisible();
  });
});
