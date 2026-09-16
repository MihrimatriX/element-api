import { test, expect } from '@playwright/test';

test('new specimen photographs decode and expose their attribution', async ({ page }) => {
  for (const symbol of ['al', 'si', 'ti', 'zn', 'co', 'ni']) {
    await page.goto(`/element/${symbol}`);
    const visual = page.locator('.atlas-detail-hero .atlas-visual');
    const photo = visual.locator('img');
    await expect(photo).toBeVisible();
    await expect.poll(() => photo.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth >= 500)).toBe(true);
    await expect(visual.locator('figcaption a').first()).toBeVisible();
    await visual.getByRole('button', { name: 'Atom şeması', exact: true }).click();
    await expect(visual.getByRole('img', { name: /şematik elektron kabukları/ })).toBeVisible();
  }
});

test('a broken specimen image leaves the atomic schematic usable', async ({ page }) => {
  await page.route('**/media/atlas/si.jpg', route => route.abort());
  await page.goto('/element/si');
  const visual = page.locator('.atlas-detail-hero .atlas-visual');
  await expect(visual.getByText('Görsel yüklenemedi. Şematik gösterim.')).toBeVisible();
  await expect(visual.getByRole('img', { name: /Si, şematik elektron kabukları/ })).toBeVisible();
});
