import test from 'node:test';
import assert from 'node:assert/strict';
import { playgroundView } from '../src/services/apiDocs.ts';

test('playground keeps JSON on 200 and explains empty 304', () => {
  assert.deepEqual(playgroundView(200, 'W/"abc"', { symbol: 'Fe' }), { symbol: 'Fe' });
  assert.deepEqual(playgroundView(304, 'W/"abc"', null), {
    status: 304,
    etag: 'W/"abc"',
    note: 'Gövde yok. If-None-Match aynı kaydı gördü.',
  });
  assert.equal(playgroundView(400, null, { title: 'Invalid scientific query' }).title, 'Invalid scientific query');
});
