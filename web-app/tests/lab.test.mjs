import test from 'node:test';
import assert from 'node:assert/strict';
import { catalogSize, discover, hint, knownCompounds, loadProgress, normalizeDiscoveries, parseProgress, saveProgress } from '../src/services/lab.ts';
import { formCompound, parseFormula } from '../src/services/chemistry.ts';

test('every catalog compound is formable from its own formula', () => {
  for (const compound of knownCompounds) {
    const formed = formCompound(parseFormula(compound.formula));
    assert.equal(formed.ok, true, compound.slug);
    if (formed.ok) assert.equal(formed.compound.slug, compound.slug);
  }
  assert.equal(catalogSize, knownCompounds.length);
});

test('progress keeps real slugs and drops fiction', () => {
  assert.deepEqual(discover(['h2o'], 'h2o'), ['h2o']);
  assert.deepEqual(discover(['h2o'], 'fiction'), ['h2o']);
  assert.deepEqual(normalizeDiscoveries(['h2o', 'unknown', 'nacl']), ['h2o', 'nacl']);
});

test('progress survives reload and storage errors do not break play', () => {
  let raw = null;
  const storage = { getItem: () => raw, setItem: (_k, value) => { raw = value; } };
  assert.equal(saveProgress(storage, ['h2o', 'h2o']), true);
  assert.deepEqual(loadProgress(storage).discovered, ['h2o']);
  for (const value of ['{', 'null', '{"version":2,"discovered":["h2o"]}']) assert.deepEqual(parseProgress(value), []);
  const blocked = { getItem() { throw Error('blocked'); }, setItem() { throw Error('quota'); } };
  assert.equal(loadProgress(blocked).persistent, false);
  assert.equal(saveProgress(blocked, ['h2o']), false);
});

test('hint names an undiscovered catalog compound', () => {
  assert.equal(hint([])?.slug, 'h2o');
  assert.equal(hint(knownCompounds.map(c => c.slug)), undefined);
});
