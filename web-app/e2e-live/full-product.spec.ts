import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';

test('real registration, cross-device collection and complete simulated purchase', async ({ page, browser, baseURL }) => {
  const email = `browser-${randomUUID()}@element.test`, password = 'Local-Product123!';
  await page.goto('/');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `${baseURL}/`);
  await page.goto('/register');
  await page.getByLabel('Ad', { exact: true }).fill('Yerel');
  await page.getByLabel('Soyad', { exact: true }).fill('Deneme');
  await page.getByLabel('E-posta Adresi').fill(email);
  await page.getByLabel('Şifre', { exact: true }).fill(password);
  await page.getByLabel('Şifre Tekrar').fill(password);
  await page.getByRole('button', { name: 'Kayıt Ol', exact: true }).click();
  await expect(page).toHaveURL(/\/collection$/);
  await page.getByRole('link', { name: 'Laboratuvarı aç', exact: true }).click();
  await page.getByRole('button', { name: 'Hidrojen kartını seç' }).click();
  await page.getByRole('button', { name: 'Hidrojen kartını seç' }).click();
  await page.getByRole('button', { name: 'Oksijen kartını seç' }).click();
  const saved = page.waitForResponse(r => r.url().endsWith('/auth/learning') && r.request().method() === 'PUT' && r.request().postData()?.includes('h2o') === true && r.status() === 200);
  await page.getByRole('button', { name: 'Birleştir', exact: true }).click();
  await saved;
  const device = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  try {
    const phone = await device.newPage(); await phone.goto(`${baseURL}/login`);
    await phone.getByLabel('E-posta Adresi').fill(email);
    await phone.getByLabel('Şifre', { exact: true }).fill(password);
    await phone.getByRole('button', { name: 'Giriş Yap', exact: true }).click();
    await expect(phone.getByText(/1 \/ \d+ bileşik · 0 \/ 6 rota tamamlandı/)).toBeVisible();
    await page.goto('/shop');
    const product = page.locator('.compound-grid article').first();
    await expect(product).toBeVisible();
    await product.getByRole('button', { name: /^\+\d+ g$/ }).click();
    await page.getByRole('button', { name: 'Sipariş ver', exact: true }).click();
    await expect(page.getByText('Teslim', { exact: true })).toBeVisible({ timeout: 45000 });
    const snapshot = await page.evaluate(() => ({ token: localStorage.getItem('token'), key: localStorage.getItem('apiKey') }));
    expect(snapshot.key).toMatch(/^ele_live_/);
    // A second device can enter commerce without revoking this browser's key.
    await phone.goto(`${baseURL}/account`);
    await expect(phone.getByRole('heading', { name: 'API anahtarları', exact: true })).toBeVisible();
    const response = await page.request.get('http://localhost:5000/api/v1/me/holdings', { headers: { 'X-API-Key': snapshot.key! } });
    expect(response.status()).toBe(200); expect((await response.json()).length).toBeGreaterThan(0);
  } finally { await device.close(); }
});

test('real password rotation, private export and account deletion revoke access', async ({ page }) => {
  const email = `lifecycle-${randomUUID()}@element.test`;
  const password = 'Local-Product123!', nextPassword = 'Updated-Product456!';
  const api = 'http://localhost:5000/api/v1';
  const register = await page.request.post(`${api}/auth/register`, { data: { firstName: 'Test', lastName: 'Lifecycle', email, password } });
  expect(register.ok()).toBeTruthy();
  async function login(secret: string) {
    await page.goto('/login');
    await page.getByLabel('E-posta Adresi').fill(email);
    await page.getByLabel('Şifre', { exact: true }).fill(secret);
    await page.getByRole('button', { name: 'Giriş Yap', exact: true }).click();
    await expect(page).toHaveURL(/\/collection$/);
  }
  await login(password);
  await page.goto('/account');
  await expect.poll(() => page.evaluate(() => localStorage.getItem('apiKey'))).toMatch(/^ele_live_/);
  const old = await page.evaluate(() => ({ token: localStorage.getItem('token')!, key: localStorage.getItem('apiKey')! }));
  const seed = await page.request.put(`${api}/auth/learning`, { headers: { Authorization: `Bearer ${old.token}` }, data: { discoveries: ['h2o'], lessons: [] } });
  expect(seed.ok()).toBeTruthy();
  await page.goto('/settings');
  await expect(page.getByText('E-posta gönderimi bu kurulumda kapalı.')).toBeVisible();
  await page.getByLabel('Mevcut şifre').fill(password);
  await page.getByLabel('Yeni şifre').fill(nextPassword);
  await page.getByRole('button', { name: 'Şifreyi değiştir', exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  expect((await page.request.get(`${api}/auth/export`, { headers: { Authorization: `Bearer ${old.token}` } })).status()).toBe(401);
  expect((await page.request.get(`${api}/me/holdings`, { headers: { 'X-API-Key': old.key } })).status()).toBe(401);
  await login(nextPassword);
  await expect(page.getByText(/1 \/ \d+ bileşik · 0 \/ 6 rota tamamlandı/)).toBeVisible();
  await page.goto('/settings');
  const downloadEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Hesap ve öğrenme verilerimi indir' }).click();
  const download = await downloadEvent;
  const exported = await readFile((await download.path())!, 'utf8');
  const data = JSON.parse(exported);
  expect(data.profile.email).toBe(email);
  expect(data.learning).toContain('discovery:h2o');
  expect(exported).not.toContain(old.key);
  expect(exported).not.toContain(nextPassword);
  const currentToken = await page.evaluate(() => localStorage.getItem('token'));
  await page.getByLabel('Şifren', { exact: true }).fill(nextPassword);
  await page.getByLabel('Onay için HESABIMI SİL yaz').fill('HESABIMI SİL');
  await page.getByRole('button', { name: 'Hesabımı ve öğrenme kayıtlarımı sil' }).click();
  await expect(page).toHaveURL(/:\d+\/$/);
  expect(await page.evaluate(() => localStorage.getItem('token'))).toBeNull();
  expect((await page.request.get(`${api}/auth/profile`, { headers: { Authorization: `Bearer ${currentToken}` } })).status()).toBe(401);
  expect((await page.request.post(`${api}/auth/login`, { data: { email, password: nextPassword } })).status()).toBe(401);
});
