import test from 'node:test';
import assert from 'node:assert/strict';
import { localScience } from '../src/services/scienceCatalog.ts';

test('local catalog serves element and compound details without the API', () => {
  const elements = localScience('elements');
  assert.equal(Array.isArray(elements), true);
  assert.equal(elements.length, 118);
  const fe = localScience('elements', 'fe');
  assert.equal(fe?.names.tr, 'Demir');
  assert.equal(typeof fe?.atomic_properties.atomic_mass, 'number');
  assert.ok(fe?.editorial?.summary);
  const water = localScience('compounds', 'h2o');
  assert.equal(water?.names.tr, 'Su');
  assert.equal(water?.molecular_properties.molecular_formula, 'H2O');
  const aspirin = localScience('compounds', 'aspirin');
  assert.ok(aspirin?.names.tr);
  assert.equal(localScience('elements', 'nope'), undefined);
});
