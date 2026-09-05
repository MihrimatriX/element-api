// Checks the running local platform, including cross-service routing and telemetry.
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
  await check(`${name}: readiness, liveness, info and metrics`, async () => {
    const ready = await json(`${base}/health`);
    assert.equal(ready.status, 'Healthy');
    const livePath = name === 'payment' ? '/actuator/health/liveness' : '/health/live';
    const live = await json(`${base}${livePath}`);
    assert.ok(['Healthy', 'UP'].includes(live.status));
    assert.ok(Object.keys(await json(`${base}/info`)).length > 0);
    const metricsPath = name === 'payment' ? '/actuator/prometheus' : '/metrics';
    assert.match(await (await request(`${base}${metricsPath}`)).text(), /^# (HELP|TYPE) /m);
  });
}
await check('web: SPA routes and static assets', async () => {
  for (const path of ['/', '/element/fe', '/compound/aspirin', '/compounds', '/shop', '/account', '/stack']) {
    const html = await (await request(web + path)).text();
    assert.match(html, /id="root"/);
    const assets = [...html.matchAll(/(?:src|href)="(\/assets\/[^" ]+\.(?:js|css))"/g)];
    assert.ok(assets.length > 0, `${path}: missing built assets`);
    for (const asset of assets) await request(web + asset[1]);
  }
});
await check('GraphQL resolves live catalog prices through the gateway', async () => {
  const body = await json(`${api}/graphql`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: '{ elementPrice(symbol: "Au") { symbol pricePerGram bid ask } }' }),
  });
  assert.equal(body.errors, undefined);
  assert.equal(body.data.elementPrice.symbol, 'Au');
  assert.ok(body.data.elementPrice.pricePerGram > 0);
  assert.ok(body.data.elementPrice.ask >= body.data.elementPrice.bid);
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

if (process.argv.includes('--observability')) {
  await check('Prometheus scrapes all eight backend services', async () => {
    const body = await json('http://localhost:9090/api/v1/targets');
    for (const service of services) {
      const target = body.data.activeTargets.find((item) => item.labels.job === `${service}-service`);
      assert.ok(target, `${service}: target missing`);
      assert.equal(target.health, 'up', `${service}: ${target.lastError}`);
    }
  });
  await check('Grafana database is healthy', async () => {
    assert.equal((await json('http://localhost:3001/api/health')).database, 'ok');
  });
  await check('Loki and Promtail are ready', async () => {
    await request('http://localhost:3100/ready');
    await request('http://localhost:9080/ready');
    const labels = await json('http://localhost:3100/loki/api/v1/labels');
    assert.ok(labels.data.length > 0, 'No container logs have reached Loki.');
  });
  await check('Jaeger receives application traces', async () => {
    const body = await json('http://localhost:16686/api/services');
    assert.ok(body.data.some((name) => /element/i.test(name)), 'No application trace service registered.');
  });
  await check('ELK receives application logs and metrics', async () => {
    const cluster = await json('http://localhost:9200/_cluster/health');
    assert.ok(['green', 'yellow'].includes(cluster.status));
    for (const index of ['element-app-logs-*', 'element-metrics-*']) {
      const body = await json(`http://localhost:9200/${index}/_count`);
      assert.ok(body.count > 0, `${index}: no ingested documents`);
    }
    const kibana = await json('http://localhost:5601/api/status');
    assert.equal(kibana.status.overall.level, 'available');
  });
  await check('observability hub and Seq are reachable', async () => {
    await request('http://localhost:8888');
    await request('http://localhost:5341');
  });
}
const failed = results.filter((result) => !result.passed);
console.log(JSON.stringify({ passed: results.length - failed.length, failed: failed.length, results }, null, 2));
if (failed.length) process.exitCode = 1;
