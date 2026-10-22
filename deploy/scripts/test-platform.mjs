/**
 * Checks the running local platform: health/info of every service port, the built SPA routes and
 * assets, and two cross-service routes through the gateway. Prints a JSON summary; exit code 1 on
 * any failure. API_BASE / WEB_BASE override the URLs but must stay on localhost.
 *
 * Run: node deploy/scripts/test-platform.mjs
 */
import assert from 'node:assert/strict';

const api = process.env.API_BASE ?? 'http://localhost:5000';
const web = process.env.WEB_BASE ?? 'http://localhost:6241';
for (const base of [api, web]) {
  assert.ok(['localhost', '127.0.0.1'].includes(new URL(base).hostname), 'Use a local test environment.');
}
/** Host port of every service in docker-compose.yml. */
const services = [
  ['gateway', 5000],
  ['identity', 5001],
  ['catalog', 5002],
  ['order', 5003],
  ['shipment', 5004],
  ['wallet', 5005],
  ['notification', 5006],
  ['compound', 5007],
  ['inventory', 5008],
];
const results = [];

/** Runs one named async check, records PASS/FAIL and never throws (all checks always run). */
async function check(name, run) {
  try {
    await run();
    results.push({ name, passed: true });
    console.log(`PASS ${name}`);
  } catch (error) {
    results.push({ name, passed: false, error: error.message });
    console.error(`FAIL ${name}: ${error.message}`);
  }
}

/** GET (by default) that must answer HTTP 200 within 15 s. */
async function request(url, options = {}) {
  const response = await fetch(url, { ...options, signal: AbortSignal.timeout(15000) });
  assert.equal(response.status, 200, `${url}: HTTP ${response.status}`);
  return response;
}
const json = async (url, options) => (await request(url, options)).json();

for (const [name, port] of services) {
  const base = `http://localhost:${port}`;
  await check(`${name}: readiness, liveness and info`, async () => {
    const ready = await json(`${base}/health`);
    assert.equal(ready.status, 'Healthy');
    const live = await json(`${base}/health/live`);
    // .NET services answer "Healthy", the Spring Boot services answer "UP".
    assert.ok(['Healthy', 'UP'].includes(live.status));
    assert.ok(Object.keys(await json(`${base}/info`)).length > 0);
  });
}
await check('web: SPA routes and static assets', async () => {
  for (const path of ['/', '/element/fe', '/compound/aspirin', '/compounds', '/shop', '/account', '/lab']) {
    const html = await (await request(web + path)).text();
    assert.match(html, /id="root"/);
    const assets = [...html.matchAll(/(?:src|href)="(\/assets\/[^" ]+\.(?:js|css))"/g)];
    assert.ok(assets.length > 0, `${path}: missing built assets`);
    for (const asset of assets) await request(web + asset[1]);
  }
});
await check('REST ticker resolves live catalog prices through the gateway', async () => {
  const body = await json(`${api}/api/v1/elements/Au/ticker`);
  assert.equal(body.symbol, 'Au');
  assert.ok(body.last > 0);
  assert.ok(body.ask >= body.bid);
});
await check('inventory stock via gateway', async () => {
  const body = await json(`${api}/api/v1/stock/au`);
  assert.equal(String(body.symbol).toUpperCase(), 'AU');
  assert.ok(body.availableGrams > 0);
});

const failed = results.filter(result => !result.passed);
console.log(JSON.stringify({ passed: results.length - failed.length, failed: failed.length, results }, null, 2));
if (failed.length) process.exitCode = 1;
