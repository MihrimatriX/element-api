import { test, expect as baseExpect } from "@playwright/test";

// Vite dev serves unbundled modules: a cold lazy route can take several seconds in a fresh context.
const expect = baseExpect.configure({ timeout: 15_000 });
test.describe.configure({ timeout: 60_000 });

/** Lab bench, element detective and formula builder. */
test.describe("lab", () => {
  test("keyboard-only water discovery lands in the notebook", async ({ page }) => {
    await page.goto("/lab");
    const hydrogen = page.getByRole("button", { name: /^Hidrojen tezgâha ekle/ });
    const oxygen = page.getByRole("button", { name: /^Oksijen tezgâha ekle/ });

    // Palette tiles are buttons: focus + Enter adds one atom, focus stays on the tile.
    await hydrogen.focus();
    await page.keyboard.press("Enter");
    await expect(hydrogen).toHaveAccessibleName("Hidrojen tezgâha ekle, tezgâhta 1");
    await page.keyboard.press("Enter");
    await expect(hydrogen).toHaveAccessibleName("Hidrojen tezgâha ekle, tezgâhta 2");
    await oxygen.focus();
    await page.keyboard.press("Space");
    await expect(oxygen).toHaveAccessibleName("Oksijen tezgâha ekle, tezgâhta 1");

    const tryIt = page.getByRole("button", { name: "Dene", exact: true });
    await tryIt.focus();
    await page.keyboard.press("Enter");

    await expect(
      page.getByRole("status").filter({ hasText: "Yeni keşif" }),
    ).toContainText("Su deftere işlendi.");
    await expect(page.getByRole("heading", { level: 3, name: "Su", exact: true })).toBeVisible();

    await page.goto("/collection");
    await expect(page.getByRole("heading", { level: 1, name: "Keşif defterim" })).toBeVisible();
    // The discovery grid card (the lesson card also links water, as "H2O , Su, keşfedildi").
    await expect(page.getByRole("link", { name: "H2O Su", exact: true })).toHaveAttribute(
      "href",
      "/compound/h2o",
    );
    await expect(page.getByText("1 bileşik", { exact: true })).toBeVisible();
  });

  test("detective ?element=fe is iron; 'Pas geç' moves to another case", async ({ page }) => {
    const clues = page.getByRole("region", { name: "İpuçları" });
    const guess = page.getByLabel("Element adı veya sembol");

    /** Opens every clue with "Başka ipucu" and returns their texts. */
    async function revealAll(): Promise<string[]> {
      const counter = clues.getByText(/^\d+ \/ \d+$/);
      const total = Number((await counter.textContent())?.split("/")[1]);
      for (let open = 2; open <= total; open++) {
        await clues.getByRole("button", { name: /^Başka ipucu/ }).click();
        await expect(counter).toHaveText(`${open} / ${total}`);
      }
      return clues.getByRole("listitem").allTextContents();
    }

    await page.goto("/lab/detective?element=fe");
    await expect(clues.getByText(/^1 \/ \d+$/)).toBeVisible();
    const ironClues = await revealAll();

    await guess.fill("Demir");
    await guess.press("Enter");
    await expect(page.getByRole("status").filter({ hasText: "Doğru" })).toContainText("Demir (Fe).");
    await expect(page.getByRole("link", { name: "Element kaydını aç" })).toHaveAttribute("href", "/element/fe");

    // Skip the iron case: the clues change and iron is no longer the answer.
    await page.goto("/lab/detective?element=fe");
    await expect(clues.getByRole("listitem").first()).toHaveText(ironClues[0]);
    await clues.getByRole("button", { name: "Pas geç" }).click();
    await expect(clues.getByText(/^1 \/ \d+$/)).toBeVisible();
    expect(await revealAll()).not.toEqual(ironClues);
    await guess.fill("Demir");
    await guess.press("Enter");
    await expect(page.getByRole("status").filter({ hasText: "Henüz değil" })).toBeVisible();
  });

  test("formula builder: 'Başka kayıt' changes the compound", async ({ page }) => {
    await page.goto("/lab/formula?compound=h2o");
    const water = page.getByRole("heading", { level: 2, name: "Su", exact: true });
    await expect(water).toBeVisible();
    await page.getByRole("button", { name: "Hidrojen artır" }).click();
    await expect(page.getByRole("button", { name: "Kontrol et" })).toBeEnabled();

    await page.getByRole("button", { name: "Başka kayıt" }).click();
    await expect(water).toHaveCount(0);
    // A new puzzle starts with empty counts.
    await expect(page.getByRole("button", { name: "Kontrol et" })).toBeDisabled();
  });
});
