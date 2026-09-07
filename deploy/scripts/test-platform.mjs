// Checks the running local platform, including cross-service routing.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const api = process.env.API_BASE ?? 'http://localhost:5000';
const web = process.env.WEB_BASE ?? 'http://localhost:3000';
for (const base of [api, web]) {
  assert.ok(['localhost', '127.0.0.1'].includes(new URL(base).hostname), 'Use a local test environment.');
}
const services = ['gateway', 'identity', 'catalog', 'order', 'shipment', 'payment', 'notification', 'compound'];
const results = [];
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
async function request(url, options = {}) {
  const response = await fetch(url, { ...options, signal: AbortSignal.timeout(15000) });
  assert.equal(response.status, 200, `${url}: HTTP ${response.status}`);
  return response;
}
const json = async (url, options) => (await request(url, options)).json();

for (const [index, name] of services.entries()) {
  const base = `http://localhost:${5000 + index}`;
  await check(`${name}: readiness, liveness and info`, async () => {
    const ready = await json(`${base}/health`);
    assert.equal(ready.status, 'Healthy');
    const livePath = name === 'payment' ? '/actuator/health/liveness' : '/health/live';
    const live = await json(`${base}${livePath}`);
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
await check('SignalR receives a real price event through the gateway', async () => {
  const require = createRequire(new URL('../../web-app/package.json', import.meta.url));
  const { HubConnectionBuilder, LogLevel } = require('@microsoft/signalr');
  const connection = new HubConnectionBuilder().withUrl(`${api}/hub/notifications`).configureLogging(LogLevel.None).build();
  let timer;
  try {
    const event = new Promise((resolve, reject) => {
      timer = setTimeout(() => reject(new Error('No PriceUpdated event within 45 seconds.')), 45000);
      connection.on('PriceUpdated', resolve);
      connection.start().catch(reject);
    });
    const payload = await event;
    assert.equal(typeof payload.symbol, 'string');
    assert.ok(payload.price > 0);
  } finally {
    clearTimeout(timer);
    await connection.stop();
  }
});


const failed = results.filter(result => !result.passed);
console.log(JSON.stringify({ passed: results.length - failed.length, failed: failed.length, results }, null, 2));
if (failed.length) process.exitCode = 1;
