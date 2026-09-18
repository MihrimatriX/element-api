import { test, expect } from '@playwright/test';

test('atlas uses real scientific records, search and linked details', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('searchbox', { name: 'Element ara', exact: true }).fill('Demir');
  await page.getByRole('button', { name: 'Demir, Fe, atom numarası 26; önizle', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('heading', { name: 'Demir Fe', exact: true })).toContainText('Demir');
  await dialog.getByRole('link', { name: 'Tam kayıt' }).click();
  await expect(page.getByRole('heading', { name: 'Demir', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Elektromanyetik ve optik' })).toHaveCount(0);
  await page.getByRole('checkbox', { name: 'Eksik alanları göster' }).check();
  await expect(page.getByRole('heading', { name: 'Elektromanyetik ve optik' })).toBeVisible();
});

test('discover, reload, finish a learning route and download progress', async ({ page }) => {
  await page.goto('/lab');
  for (const steps of [
    ['Hidrojen', 'Hidrojen', 'Oksijen'],
    ['Karbon', 'Oksijen', 'Oksijen'],
    ['Azot', 'Hidrojen', 'Hidrojen', 'Hidrojen'],
  ]) {
    await page.getByRole('button', { name: 'Alanı temizle', exact: true }).click();
    for (const name of steps) await page.getByRole('button', { name: `${name} kartını seç`, exact: true }).click();
    await page.getByRole('button', { name: 'Birleştir', exact: true }).click();
    await expect(page.getByRole('status', { name: 'Keşif sonucu' })).toContainText('Yeni keşif');
  }
  await page.reload();
  await expect(page.getByRole('progressbar', { name: 'Keşif ilerlemesi' })).toHaveAttribute('aria-valuenow', '3');
  if (await page.getByRole('button', { name: 'Menüyü aç' }).isVisible()) await page.getByRole('button', { name: 'Menüyü aç' }).click();
  await page.getByRole('link', { name: 'Defterim', exact: true }).click();
  const lesson = page.locator('article').filter({ has: page.getByRole('heading', { name: 'Günlük maddeler', exact: true }) });
  await lesson.getByRole('button', { name: 'İki oksijen ve bir hidrojen atomu', exact: true }).click();
  await expect(lesson.getByRole('status')).toContainText('Bir daha düşün');
  await lesson.getByRole('button', { name: 'İki hidrojen ve bir oksijen atomu', exact: true }).click();
  await expect(lesson).toContainText('Tamamlandı');
  await page.reload();
  await expect(page.getByText(/3 \/ \d+ bileşik · 1 \/ 6 rota tamamlandı/)).toBeVisible();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Kaydımı indir' }).click();
  expect((await download).suggestedFilename()).toBe('elementapi-koleksiyon.json');
});

test('wrong ratio is rejected and duplicate discovery counts once', async ({ page }) => {
  await page.goto('/lab');
  await page.getByRole('button', { name: 'Hidrojen kartını seç' }).click();
  await page.getByRole('button', { name: 'Oksijen kartını seç' }).click();
  await page.getByRole('button', { name: 'Birleştir', exact: true }).click();
  await expect(page.getByRole('status', { name: 'Keşif sonucu' })).toContainText('atom sayıları tutmuyor');
  await page.getByRole('button', { name: 'Hidrojen kartını seç' }).click();
  await page.getByRole('button', { name: 'Birleştir', exact: true }).click();
  await page.getByRole('button', { name: 'Birleştir', exact: true }).click();
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1');
});

test('API failure still opens catalog details from local records', async ({ page }) => {
  await page.route('**/api/v2/**', route => route.abort());
  await page.goto('/');
  await expect(page.getByText('Yeniden dene', { exact: true })).toHaveCount(0);
  await page.getByRole('searchbox', { name: 'Element ara', exact: true }).fill('Demir');
  await page.getByRole('button', { name: 'Demir, Fe, atom numarası 26; önizle', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('heading', { name: 'Demir Fe', exact: true })).toContainText('Demir');
  await expect(dialog.getByText('Ayrıntı yüklenemedi.', { exact: false })).toHaveCount(0);
  await dialog.getByRole('link', { name: 'Tam kayıt' }).click();
  await expect(page.getByRole('heading', { name: 'Demir', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Yeniden dene', exact: true })).toHaveCount(0);
  await page.goto('/lab');
  await page.getByRole('button', { name: 'Hidrojen kartını seç' }).click();
  await page.getByRole('button', { name: 'Hidrojen kartını seç' }).click();
  await page.getByRole('button', { name: 'Oksijen kartını seç' }).click();
  await page.getByRole('button', { name: 'Birleştir', exact: true }).click();
  await expect(page.getByRole('status', { name: 'Keşif sonucu' })).toContainText('Yeni keşif: Su');
  await page.getByRole('link', { name: 'Bilimsel kaydı aç' }).click();
  await expect(page.getByRole('heading', { name: 'Su', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Yeniden dene', exact: true })).toHaveCount(0);
});

test('science profile has no fake account promise and the first action fits mobile', async ({ page }, info) => {
  await page.goto('/');
  await page.locator('#main-content').getByRole('link', { name: 'Laboratuvar', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Kayıt', exact: true })).toBeHidden();
  const button = page.getByRole('button', { name: 'Birleştir', exact: true });
  await expect(button).toBeVisible();
  if (info.project.name === 'mobile') {
    const box = await button.boundingBox();
    expect(box!.y + box!.height).toBeLessThan(844);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
});

test('scientific projection and conditional requests preserve their contract', async ({ request }) => {
  const url = 'http://127.0.0.1:5080/api/v2/elements/fe?fields=symbol,names';
  const first = await request.get(url);
  expect(first.status()).toBe(200);
  expect(Object.keys(await first.json()).sort()).toEqual(['names', 'symbol']);
  const cached = await request.get(url, { headers: { 'If-None-Match': first.headers().etag } });
  expect(cached.status()).toBe(304);
  expect((await request.get('http://127.0.0.1:5080/api/v2/elements?fields=not_a_field')).status()).toBe(400);
});

test('API playground uses the configured science host and published schemas', async ({ page }) => {
  await page.goto('/docs');
  const response = page.waitForResponse(r => r.url().includes('/api/v2/elements/fe') && r.status() === 200);
  await page.getByRole('button', { name: 'İsteği gönder', exact: true }).click();
  expect((await (await response).json()).symbol).toBe('Fe');
  await page.getByRole('link', { name: 'Element JSON Schema' }).click();
  await expect(page.locator('body')).toContainText('ElementAPI v2 full elements snapshot');
});

test('collection import merges progress and optional diagnostics stay local', async ({ page }) => {
  await page.goto('/feedback');
  await page.getByRole('checkbox', { name: 'Bu cihazda deneme olaylarını kaydet' }).check();
  await page.goto('/lab');
  await page.getByRole('button', { name: 'Hidrojen kartını seç' }).click();
  await page.getByRole('button', { name: 'Hidrojen kartını seç' }).click();
  await page.getByRole('button', { name: 'Oksijen kartını seç' }).click();
  await page.getByRole('button', { name: 'Birleştir', exact: true }).click();
  await page.goto('/collection');
  await page.getByText('Koleksiyon dosyası aktar', { exact: true }).click();
  await page.getByLabel('İndirdiğin koleksiyonu geri yükle').setInputFiles({ name: 'progress.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ version: 1, discoveries: ['co2'], lessons: [] })) });
  await expect(page.getByText(/2 \/ \d+ bileşik · 0 \/ 6 rota tamamlandı/)).toBeVisible();
  await page.goto('/feedback');
  const events = await page.evaluate(() => JSON.parse(localStorage.getItem('elementapi:diagnostics:v1') ?? '[]'));
  expect(events.some((event: { event: string }) => event.event === 'discovery_completed')).toBe(true);
  await page.getByRole('checkbox', { name: 'Bu cihazda deneme olaylarını kaydet' }).uncheck();
  expect(await page.evaluate(() => localStorage.getItem('elementapi:diagnostics:v1'))).toBeNull();
});

test('disabled browser storage still allows discoveries for the current session', async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => { throw Error('Storage unavailable'); };
    Storage.prototype.setItem = () => { throw Error('Storage unavailable'); };
  });
  await page.goto('/lab');
  await page.getByRole('button', { name: 'Hidrojen kartını seç' }).click();
  await page.getByRole('button', { name: 'Hidrojen kartını seç' }).click();
  await page.getByRole('button', { name: 'Oksijen kartını seç' }).click();
  await page.getByRole('button', { name: 'Birleştir', exact: true }).click();
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1');
  await expect(page.getByText('Tarayıcı kaydı kapalı; ilerleme bu oturumda tutuluyor.', { exact: false })).toBeVisible();
});

test('formula and detective games stay off the discovery ledger', async ({ page }) => {
  await page.goto('/lab/formula?compound=h2o');
  await page.getByRole('button', { name: 'Hidrojen artır' }).click();
  await page.getByRole('button', { name: 'Hidrojen artır' }).click();
  await page.getByRole('button', { name: 'Oksijen artır' }).click();
  await page.getByRole('button', { name: 'Kontrol et' }).click();
  await expect(page.getByRole('status')).toContainText('Doğru');
  await page.goto('/lab/detective?element=H');
  await page.getByRole('button', { name: 'Hidrojen H', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Hidrojen');
  await page.goto('/lab');
  await expect(page.getByRole('progressbar', { name: 'Keşif ilerlemesi' })).toHaveAttribute('aria-valuenow', '0');
});
