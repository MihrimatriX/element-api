import { test, expect } from '@playwright/test';

test('public pages render without runtime errors or viewport overflow', async ({ page }) => {
  test.setTimeout(60000);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  for (const path of ['/', '/lab', '/collection', '/compounds', '/element/fe', '/compound/h2o', '/docs', '/data', '/demo', '/nasil', '/hakkinda', '/sozluk', '/feedback']) {
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), path).toBe(true);
  }
  expect(errors).toEqual([]);
});

test('preview closes with Escape and restores focus to the element', async ({ page }) => {
  await page.goto('/');
  const tile = page.getByRole('button', { name: 'Demir, Fe, atom numarası 26; önizle', exact: true });
  await tile.click();
  await expect(page.getByRole('dialog', { name: 'Element önizlemesi' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(tile).toBeFocused();
});

test('view tabs support keyboard switching and expose the active panel', async ({ page }) => {
  await page.goto('/');
  const table = page.getByRole('tab', { name: 'Tablo', exact: true });
  await table.click();
  await table.press('ArrowRight');
  await expect(page.getByRole('tab', { name: 'Kartlar', exact: true })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('tabpanel')).toBeVisible();
  await expect(page.locator('.atlas-element-grid')).toBeVisible();
});

test('navigation reaches collection and mobile drawer closes on navigation and Escape', async ({ page }, info) => {
  await page.goto('/');
  const mobile = info.project.name === 'mobile';
  const menu = page.getByRole('button', { name: 'Menüyü aç' });
  if (mobile) {
    await menu.click();
    await expect(page.getByRole('dialog', { name: 'Gezinme' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(menu).toBeFocused();
    await menu.click();
  }
  await page.getByRole('link', { name: 'Defterim', exact: true }).click();
  await expect(page).toHaveURL(/\/collection$/);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('scientific section links open their content and filters remain usable', async ({ page }, info) => {
  await page.goto('/element/fe');
  const section = page.locator('#atomic_properties');
  if (info.project.name === 'desktop') await page.getByRole('link', { name: 'Atomik özellikler' }).click();
  else await section.getByRole('button').click();
  await expect(section).toContainText('Atom kütlesi (u)');
  const filter = page.getByRole('searchbox', { name: 'Bilimsel bölüm ara' });
  await filter.fill('Atomik');
  await expect(section.getByRole('button')).toHaveAttribute('aria-expanded', 'true');
  await filter.clear();
  await section.getByRole('button').click();
  await expect(section.getByRole('button')).toHaveAttribute('aria-expanded', 'false');
});
