/**
 * End-to-end regression against the running local stack (gateway on :5000 by default).
 * Uses only the local simulation: creates isolated throwaway accounts and never uses real payments.
 * Covers the catalog, input validation, idempotent checkout, the buy saga, holdings, compound
 * orders, desk sells and concurrency guards.
 *
 * Run: node deploy/scripts/test-e2e.mjs   (API_BASE overrides the gateway URL; must stay local)
 */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

const base = process.env.API_BASE || 'http://localhost:5000';
if (!['localhost', '127.0.0.1'].includes(new URL(base).hostname)) throw new Error('Run this test against a local simulation.');
const STARTING_BALANCE = 10000;
const MAX_RATE_LIMIT_RETRIES = 4;

let passed = 0;
/** Runs synchronous assertions for one named check and counts it as passed. */
const check = (name, test) => {
  test();
  passed++;
  console.log(`PASS ${name}`);
};
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Calls the API and asserts the status code (`expected` may be one code or a list).
 * Retries after HTTP 429 so the gateway rate limit does not make the suite flaky.
 * Returns parsed JSON, the raw text, or null for an empty body.
 */
async function call(path, { method = 'GET', body, key, headers = {}, expected = 200, origin = base, retry = 0 } = {}) {
  const requestHeaders = {
    ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    ...(key ? { 'X-API-Key': key } : {}),
    ...headers,
  };
  const response = await fetch(`${origin}${path}`, {
    method,
    headers: requestHeaders,
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });
  const text = await response.text();
  if (response.status === 429 && retry < MAX_RATE_LIMIT_RETRIES) {
    await pause(1100);
    return call(path, { method, body, key, headers, expected, origin, retry: retry + 1 });
  }
  assert.ok([expected].flat().includes(response.status), `${method} ${path}: expected ${expected}, got ${response.status}: ${text.slice(0, 250)}`);
  const isJson = response.headers.get('content-type')?.includes('json');
  return text && isJson ? JSON.parse(text) : text || null;
}

/** Registers a fresh account, logs in and returns a new API key for it. */
async function createAccount() {
  const email = `e2e-${randomUUID()}@element.test`;
  const password = 'Element-Test123!';
  await call('/api/v1/auth/register', { method: 'POST', body: { firstName: 'E2E', lastName: 'Test', email, password }, expected: [200, 201] });
  const login = await call('/api/v1/auth/login', { method: 'POST', body: { email, password } });
  const { apiKey } = await call('/api/v1/api-keys/generate', {
    method: 'POST',
    headers: { Authorization: `Bearer ${login.token}` },
    body: { description: 'Local regression test', rateLimitTps: 50 },
    expected: [200, 201],
  });
  assert.ok(apiKey);
  return apiKey;
}

/** Polls an order until the saga completes (fails fast on "Failed"); a completed order must have a tracking number. */
async function waitForCompletedOrder(id, key) {
  for (let attempt = 0; attempt < 45; attempt++) {
    const order = await call(`/api/v1/orders/${id}`, { key });
    assert.notEqual(order.status, 'Failed', `Order failed: ${id}`);
    if (order.status === 'Completed') {
      assert.ok(order.trackingNumber);
      return order;
    }
    await pause(1000);
  }
  throw new Error(`Order did not complete: ${id}`);
}

/** AssetsCredited is async after Completed — poll holdings until `isReady(rows)` holds. */
async function waitForHoldings(key, isReady, label = 'holdings') {
  for (let attempt = 0; attempt < 30; attempt++) {
    const rows = await call('/api/v1/me/holdings', { key });
    if (isReady(rows)) return rows;
    await pause(500);
  }
  throw new Error(`${label} not ready`);
}

/** Follows the `info.next` links of a paginated list and returns every result. */
async function fetchAllPages(firstPath) {
  const results = [];
  let next = firstPath;
  while (next) {
    const page = await call(next);
    results.push(...page.results);
    next = page.info.next ? new URL(page.info.next).pathname + new URL(page.info.next).search : null;
  }
  return results;
}

try {
  // Public catalog: real elements only, scientific values with units and sources.
  const catalog = await call('/api/v1/elements?pageSize=100');
  check('118 real elements', () => assert.equal(catalog.info.count, 118));
  await call('/api/v1/elements/119', { expected: 404 });
  check('hypothetical element hidden', () => {});
  const hydrogen = await call('/api/v1/elements/h');
  check('scientific units, known value and source', () => {
    assert.equal(hydrogen.detail.electronegativity, 2.2);
    assert.equal(hydrogen.detail.block, 's');
    assert.equal(hydrogen.units.density, 'g/cm3');
    assert.ok(hydrogen.density > 0 && hydrogen.density < 0.0001);
    assert.ok(hydrogen.sourceUrl.includes('pubchem'));
    assert.equal(hydrogen.market.priceSource, 'simulation');
  });
  const helium = await call('/api/v1/elements/he');
  check('unknown scientific values stay null', () => assert.equal(helium.detail.electronegativity, null));

  const products = await fetchAllPages('/api/v1/compounds?pageSize=100');
  check('118 pure element products and 50 sourced compounds', () => {
    assert.equal(products.filter((p) => p.slug.startsWith('elemental-')).length, 118);
    assert.equal(products.filter((p) => p.properties?.pubChemId).length, 50);
    assert.equal(new Set(products.map((p) => p.slug)).size, products.length);
  });
  const salt = await call('/api/v1/compounds/nacl');
  check('compound scientific properties', () => {
    assert.equal(salt.properties.molecularWeight, 58.44);
    assert.equal(salt.properties.molecularWeightUnit, 'g/mol');
  });

  // Private routes: no key, or a forged X-User-Id sent straight to the wallet service, must be rejected.
  await call('/api/v1/orders', { expected: 401 });
  await call('/api/v1/me/wallet', { origin: 'http://localhost:5005', headers: { 'X-User-Id': randomUUID() }, expected: 401 });
  check('private endpoints reject unauthenticated and forged identity', () => {});

  const key = await createAccount();
  const wallet = await call('/api/v1/me/wallet', { key });
  check('initial 10000 Kredi balance', () => {
    assert.equal(wallet.balanceElx, STARTING_BALANCE);
    assert.equal(wallet.currency, 'KREDI');
  });

  for (const quantity of [0, -1, '1', null, 0.00001, 1000001, {}, [1]]) {
    await call('/api/v1/orders', { method: 'POST', key, body: { elementSymbol: 'Au', quantity }, expected: 400 });
  }
  await call('/api/v1/orders/not-a-uuid', { key, expected: 404 });
  await call('/api/v1/orders/search?page=-1', { key, expected: 400 });
  check('invalid input fails without crashing the service', () => {});

  // Idempotent checkout: the same Idempotency-Key sent twice at once must create exactly one order.
  const id = randomUUID();
  const request = { method: 'POST', key, headers: { 'Idempotency-Key': id }, body: { elementSymbol: 'Au', quantity: 1 }, expected: [200, 202] };
  const simultaneous = await Promise.all([call('/api/v1/orders', request), call('/api/v1/orders', request)]);
  check('concurrent duplicate checkout creates one order', () => assert.ok(simultaneous.every((o) => o.id === id)));
  const order = await waitForCompletedOrder(id, key);
  await call('/api/v1/orders', { ...request, body: { elementSymbol: 'Au', quantity: 2 }, expected: 409 });
  check('same request key cannot buy a different quantity', () => {});
  const replay = await call('/api/v1/orders', request);
  const afterBuy = await call('/api/v1/me/wallet', { key });
  const orders = await call('/api/v1/orders', { key });
  const holdings = await waitForHoldings(
    key,
    (h) => h.length === 1 && h[0].grams === 1 && h[0].compoundSlug === 'elemental',
  );
  check('payment, shipment and holdings complete exactly once', () => {
    assert.equal(orders.length, 1);
    assert.equal(replay.totalPrice, order.totalPrice);
    assert.ok(Math.abs(afterBuy.balanceElx - (STARTING_BALANCE - order.totalPrice)) < 0.00001);
    assert.equal(holdings.length, 1);
    assert.equal(holdings[0].grams, 1);
    assert.equal(holdings[0].compoundSlug, 'elemental');
  });

  const other = await createAccount();
  await call(`/api/v1/orders/${id}`, { key: other, expected: 404 });
  check('orders isolated between accounts', () => {});

  // Compound orders keep their own holding and sell at the compound's price.
  const saltOrder = await call('/api/v1/orders', { method: 'POST', key, body: { elementSymbol: 'Na', quantity: 10, compoundSlug: 'nacl' }, expected: 202 });
  await waitForCompletedOrder(saltOrder.id, key);
  const saltHoldings = await waitForHoldings(
    key,
    (h) => h.find((x) => x.compoundSlug === 'nacl')?.grams === 10,
    'nacl holdings',
  );
  check('compound has its own holding', () => {
    assert.equal(saltHoldings.find((h) => h.compoundSlug === 'nacl')?.grams, 10);
    assert.ok(!saltHoldings.some((h) => h.symbol === 'NA' && h.compoundSlug === 'elemental'));
  });
  await call('/api/v1/desk/sell', { method: 'POST', key, body: { symbol: 'Na', grams: 1 }, expected: 400 });
  check('compound cannot be sold as a pure element', () => {});
  const beforeSell = await call('/api/v1/me/wallet', { key });
  const soldSalt = await call('/api/v1/desk/sell', { method: 'POST', key, body: { symbol: 'Na', grams: 10, compoundSlug: 'nacl' } });
  const afterSell = await call('/api/v1/me/wallet', { key });
  check('compound sale uses product price and credits wallet', () => {
    assert.ok(soldSalt.proceedsElx > 0);
    assert.ok(soldSalt.proceedsElx < saltOrder.totalPrice * 1.2);
    assert.ok(Math.abs(afterSell.balanceElx - beforeSell.balanceElx - soldSalt.proceedsElx) < 0.00001);
  });

  // Two simultaneous sells of the only gram: exactly one may succeed.
  const sell = { method: 'POST', key, body: { symbol: 'Au', grams: 1 }, expected: [200, 400] };
  const sold = await Promise.all([call('/api/v1/desk/sell', sell), call('/api/v1/desk/sell', sell)]);
  check('concurrent sales cannot oversell holdings', () => assert.equal(sold.filter((r) => r.proceedsElx > 0).length, 1));
  const empty = await call('/api/v1/me/holdings', { key });
  check('sold products removed from holdings', () => assert.deepEqual(empty, []));
  console.log(`\n${passed} end-to-end checks passed.`);
} catch (error) {
  console.error(`FAIL after ${passed} checks:`, error.message);
  process.exitCode = 1;
}
