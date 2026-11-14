/**
 * Read-only smoke test of the public edge (Caddy -> web + gateway). Safe against the real host:
 * it creates no account and writes nothing. Checks the site, the security headers, the open
 * scientific API, that private routes and internal paths stay closed, and (with --rate-limit) that
 * the per-IP limiter answers 429 with Retry-After.
 *
 * Run: node deploy/scripts/test-public.mjs https://elements-api.example.com [--rate-limit]
 *      (PUBLIC_BASE works too; local smoke: http://localhost:8082)
 */
import assert from 'node:assert/strict';

const base = (process.argv.find((arg) => /^https?:\/\//.test(arg)) ?? process.env.PUBLIC_BASE ?? '').replace(/\/$/, '');
if (!base) {
  console.error('usage: node deploy/scripts/test-public.mjs <https://host> [--rate-limit]');
  process.exit(2);
}
const isHttps = base.startsWith('https://');
const results = [];

/** Runs one named check, records PASS/FAIL and never throws, so every check always runs. */
async function check(name, run) {
  try {
    await run();
    results.push({ name, passed: true });
    console.log(`PASS ${name}`);
  } catch (error) {
    results.push({ name, passed: false });
    console.error(`FAIL ${name}: ${error.message}`);
  }
}

const get = (path, options = {}) =>
  fetch(base + path, { redirect: 'manual', signal: AbortSignal.timeout(20000), ...options });

await check('site answers with the app shell', async () => {
  const response = await get('/');
  assert.equal(response.status, 200);
  assert.match(await response.text(), /id="root"/);
});

await check('security headers are set and the server does not name itself', async () => {
  const { headers } = await get('/');
  assert.match(headers.get('content-security-policy') ?? '', /default-src 'self'/);
  assert.equal(headers.get('x-content-type-options'), 'nosniff');
  assert.equal(headers.get('x-frame-options'), 'DENY');
  assert.ok(headers.get('referrer-policy'));
  assert.equal(headers.get('server'), null);
  if (isHttps) assert.match(headers.get('strict-transport-security') ?? '', /max-age=\d+/);
});

if (isHttps) {
  await check('plain http redirects to https', async () => {
    const response = await fetch(base.replace('https://', 'http://') + '/', { redirect: 'manual', signal: AbortSignal.timeout(20000) });
    assert.ok([301, 302, 307, 308].includes(response.status), `HTTP ${response.status}`);
    assert.match(response.headers.get('location') ?? '', /^https:\/\//);
  });
}

await check('scientific API is open, cacheable and readable from any origin', async () => {
  const response = await get('/api/v2/elements/fe', { headers: { Origin: 'https://another-site.example' } });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).symbol, 'Fe');
  assert.ok(response.headers.get('etag'));
  assert.equal(response.headers.get('access-control-allow-origin'), '*');
});

await check('search finds a Turkish name that starts with dotted İ', async () => {
  const page = await (await get('/api/v2/elements?q=iyot&fields=symbol')).json();
  assert.ok(page.results.some((record) => record.symbol === 'I'), JSON.stringify(page.results));
});

await check('market ticker and OpenAPI document answer through the gateway', async () => {
  const ticker = await (await get('/api/v1/elements/au/ticker')).json();
  assert.ok(ticker.last > 0 && ticker.ask >= ticker.bid);
  assert.ok((await (await get('/swagger/v1/swagger.json')).json()).openapi);
});

await check('private routes need a key, and forged gateway headers do not help', async () => {
  assert.equal((await get('/api/v1/orders')).status, 401);
  const forged = await get('/api/v1/me/wallet', {
    headers: { 'X-User-Id': '00000000-0000-4000-8000-000000000000', INTERNAL_API_KEY: 'element-internal-dev-key' },
  });
  assert.equal(forged.status, 401);
});

await check('internal service routes are not reachable from outside', async () => {
  const response = await get('/api/v1/internal/api-keys/validate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', INTERNAL_API_KEY: 'element-internal-dev-key' },
    body: JSON.stringify({ rawKey: 'ele_live_00000000000000000000000000000000' }),
  });
  assert.equal(response.status, 404);
});

if (process.argv.includes('--rate-limit')) {
  await check('a burst is limited with 429 and Retry-After', async () => {
    const burst = await Promise.all(Array.from({ length: 80 }, () => get('/api/v2/elements/h?fields=symbol')));
    const limited = burst.find((response) => response.status === 429);
    assert.ok(limited, 'no 429 in 80 parallel requests');
    assert.ok(Number(limited.headers.get('retry-after')) >= 1, `Retry-After: ${limited.headers.get('retry-after')}`);
  });
}

const failed = results.filter((result) => !result.passed).length;
console.log(`\n${results.length - failed} passed, ${failed} failed (${base})`);
if (failed) process.exitCode = 1;
