import { test, expect, type Page } from '@playwright/test';

// Browser UI contract tests; real authentication and persistence run in LearningIntegrationTests.
const token = `test.${Buffer.from(JSON.stringify({ sub: '11111111-1111-1111-1111-111111111111', exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url')}.test`;
async function mockAccount(page: Page) {
  await page.route('**/api/v1/**', async route => {
    const path = new URL(route.request().url()).pathname;
    let data: unknown;
    if (path.endsWith('/login')) data = { token };
    else if (path.endsWith('/profile')) data = { email: 'learner@test.local', firstName: 'Deneme', lastName: 'Kullanıcı', emailConfirmed: false };
    else if (path.endsWith('/capabilities')) data = { passwordRecovery: false, emailVerification: false };
    else if (path.endsWith('/learning')) data = route.request().method() === 'PUT' ? route.request().postDataJSON() : { discoveries: [], lessons: [] };
    else if (path.endsWith('/change')) data = { message: 'Şifren değişti.' };
    else if (path.endsWith('/export')) data = { profile: { email: 'learner@test.local' }, learning: [] };
    else if (path.endsWith('/delete')) data = { message: 'Hesabın silindi.' };
    else if (path.endsWith('/wallet')) data = { balanceElx: 10000, currency: 'KREDI' };
    else if (path.endsWith('/api-keys/generate')) data = { apiKey: 'ele_live_12345678901234567890123456789012' };
    else { await route.fulfill({ status: 503, json: { message: 'Unavailable in UI contract test' } }); return; }
    await route.fulfill({ json: data });
  });
}
test('account and simulation surfaces fit the viewport', async ({ page }) => {
  await mockAccount(page);
  await page.addInitScript(value => localStorage.setItem('token', value), token);
  for (const path of ['/market', '/shop', '/account', '/settings']) {
    await page.goto(path);
    await expect(page.locator('main')).toBeVisible();
    await expect(page.locator('main').getByRole('heading').first()).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), path).toBe(true);
  }
});
test('login returns to collection and never follows an external return URL', async ({ page }) => {
  await mockAccount(page); await page.goto('/login?returnTo=//example.com');
  await page.getByLabel('E-posta Adresi', { exact: true }).fill('learner@test.local');
  await page.getByLabel('Şifre', { exact: true }).fill('Password1!');
  await page.getByRole('button', { name: 'Giriş Yap', exact: true }).click();
  await expect(page).toHaveURL(/\/collection$/);
  await expect(page.getByText('İlerlemen hesabınla eşitlendi.')).toBeVisible();
});
test('settings expose disabled mail, data export and close session after password change', async ({ page }) => {
  await mockAccount(page); await page.addInitScript(value => localStorage.setItem('token', value), token);
  await page.goto('/settings'); await expect(page.getByText('learner@test.local')).toBeVisible();
  await expect(page.getByText('E-posta gönderimi bu kurulumda kapalı.')).toBeVisible();
  const download = page.waitForEvent('download'); await page.getByRole('button', { name: 'Hesap ve öğrenme verilerimi indir' }).click();
  expect((await download).suggestedFilename()).toBe('elementapi-hesabim.json');
  await page.getByLabel('Mevcut şifre', { exact: true }).fill('Password1!');
  await page.getByLabel(/^Yeni şifre/).fill('Replacement1!');
  await page.getByRole('button', { name: 'Şifreyi değiştir', exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  expect(await page.evaluate(() => localStorage.getItem('token'))).toBeNull();
});
test('deleted account removes its local collection without deleting guest progress', async ({ page }) => {
  await mockAccount(page); await page.addInitScript(value => {
    localStorage.setItem('token', value);
    localStorage.setItem('elementapi:learning:11111111-1111-1111-1111-111111111111:v1', JSON.stringify({ discoveries: ['co2'], lessons: [] }));
    localStorage.setItem('elementapi:learning:guest:v1', JSON.stringify({ discoveries: ['h2o'], lessons: [] }));
  }, token);
  await page.goto('/settings');
  const button = page.getByRole('button', { name: 'Hesabımı ve öğrenme kayıtlarımı sil' });
  await expect(button).toBeDisabled();
  await page.getByLabel('Şifren', { exact: true }).fill('Password1!');
  await page.getByLabel('Onay için HESABIMI SİL yaz').fill('HESABIMI SİL');
  await button.click(); await expect(page).toHaveURL('http://127.0.0.1:5174/');
  expect(await page.evaluate(() => localStorage.getItem('elementapi:learning:11111111-1111-1111-1111-111111111111:v1'))).toBeNull();
  expect(await page.evaluate(() => localStorage.getItem('elementapi:learning:guest:v1'))).toContain('h2o');
});

test('email verification sends the fragment token in the request body and clears the URL', async ({ page }) => {
  await mockAccount(page);
  let body: unknown;
  await page.route('**/api/v1/auth/email/verify', async route => {
    expect(new URL(route.request().url()).search).toBe('');
    body = route.request().postDataJSON();
    await route.fulfill({ json: { message: 'E-posta adresin doğrulandı.' } });
  });
  await page.goto('/verify-email#email=learner%40test.local&token=sample%2Btoken');
  await page.getByRole('button', { name: 'Adresimi doğrula' }).click();
  await expect(page.getByText('E-posta adresin doğrulandı.', { exact: true })).toBeVisible();
  expect(body).toEqual({ email: 'learner@test.local', token: 'sample+token' });
  await expect(page).toHaveURL('http://127.0.0.1:5174/verify-email');
});
