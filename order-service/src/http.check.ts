import assert from 'node:assert/strict';
import express from 'express';
import { once } from 'node:events';
import { asyncRouter, httpErrorHandler, isQuantity } from './http.js';

const app = express();
const router = asyncRouter();
router.get('/failure', async () => { throw new Error('private database detail'); });
router.get('/healthy', (_req, res) => { res.json({ ok: true }); });
app.use(router);
app.use(httpErrorHandler);
const server = app.listen(0, '127.0.0.1');
await once(server, 'listening');
try {
  const address = server.address();
  assert(address && typeof address === 'object');
  const base = `http://127.0.0.1:${address.port}`;
  const failure = await fetch(`${base}/failure`);
  assert.equal(failure.status, 503);
  assert(!(await failure.text()).includes('private database detail'));
  assert.equal((await fetch(`${base}/healthy`)).status, 200, 'async error must not crash process');
  for (const invalid of [null, '1', {}, true, NaN, Infinity, -1, 0, 0.00001, 1.00001, 1000001]) assert.equal(isQuantity(invalid), false);
  for (const valid of [0.0001, 1.2345, 100, 1000000]) assert.equal(isQuantity(valid), true);
  console.log('http.check: async failures contained; invalid and sub-precision quantities rejected.');
} finally { server.close(); }
