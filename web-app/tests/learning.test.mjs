import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeLearning, mergeLearning } from '../src/services/lessons.ts';
import { safeReturnTo } from '../src/services/session.ts';
test('two devices merge discoveries without duplicates or lost progress', () => {
  const merged = mergeLearning({ discoveries: ['h2o', 'co2'], lessons: [] }, { discoveries: ['h2o', 'nh3'], lessons: ['everyday'] });
  assert.deepEqual(merged.discoveries, ['h2o', 'co2', 'nh3']);
  assert.deepEqual(merged.lessons, ['everyday']);
});
test('unearned, unknown and corrupt progress cannot unlock a lesson', () => {
  assert.deepEqual(normalizeLearning({ discoveries: ['h2o', 'unknown', 'h2o'], lessons: ['everyday', 'made-up'] }), { discoveries: ['h2o'], lessons: [] });
  assert.deepEqual(normalizeLearning(null), { discoveries: [], lessons: [] });
  assert.deepEqual(normalizeLearning({ discoveries: ['h2so4', 'hno3', 'h3po4'], lessons: ['acids'] }).lessons, ['acids']);
});
test('post-login destinations stay inside the app', () => {
  for (const value of ['https://evil.test', '//evil.test', '/\\evil.test', null]) assert.equal(safeReturnTo(value), '/collection');
  assert.equal(safeReturnTo('/shop?symbol=Au'), '/shop?symbol=Au');
});
