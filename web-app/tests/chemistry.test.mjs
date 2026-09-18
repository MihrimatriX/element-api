import test from 'node:test';
import assert from 'node:assert/strict';
import { bagFormula, formCompound, geometryOf, knownCompounds, lookup, parseFormula, writeFormula } from '../src/services/chemistry.ts';

test('catalog formulas parse and compositions are unique', () => {
  const keys = new Map();
  for (const compound of knownCompounds) {
    const key = Object.entries(parseFormula(compound.formula)).map(([s, n]) => `${s}:${n}`).join('|');
    assert.equal(keys.get(key), undefined, `${compound.slug} duplicates ${keys.get(key)}`);
    keys.set(key, compound.slug);
  }
  assert.ok(knownCompounds.length >= 140);
});

test('known molecules form; HO, Na2Cl and CH5 are rejected', () => {
  const water = formCompound({ H: 2, O: 1 });
  assert.equal(water.ok, true);
  if (water.ok) assert.equal(water.compound.slug, 'h2o');
  const salt = formCompound({ Na: 1, Cl: 1 });
  assert.equal(salt.ok, true);
  if (salt.ok) assert.equal(salt.compound.slug, 'nacl');
  const methane = formCompound({ C: 1, H: 4 });
  assert.equal(methane.ok, true);
  if (methane.ok) assert.equal(methane.compound.slug, 'ch4');
  const ho = formCompound({ H: 1, O: 1 });
  assert.equal(ho.ok, false);
  if (!ho.ok) assert.equal(ho.code, 'wrong_ratio');
  const na2cl = formCompound({ Na: 2, Cl: 1 });
  assert.equal(na2cl.ok, false);
  if (!na2cl.ok) assert.equal(na2cl.code, 'wrong_ratio');
  const ch5 = formCompound({ C: 1, H: 5 });
  assert.equal(ch5.ok, false);
  if (!ch5.ok) assert.equal(ch5.code, 'wrong_ratio');
  const beh5 = formCompound({ Be: 1, H: 5 });
  assert.equal(beh5.ok, false);
  if (!beh5.ok) assert.equal(beh5.code, 'unstable');
  const helium = formCompound({ He: 1, O: 1 });
  assert.equal(helium.ok, false);
  if (!helium.ok) assert.equal(helium.code, 'noble');
});

test('conventional formulas not alphabetical bag order', () => {
  assert.equal(bagFormula({ O: 2, Si: 1 }), 'SiO2');
  assert.equal(bagFormula({ Cl: 1, Na: 1 }), 'NaCl');
  assert.equal(bagFormula({ H: 3, N: 1 }), 'NH3');
  assert.equal(bagFormula({ H: 2, O: 1 }), 'H2O');
  assert.equal(writeFormula({ O: 1, Si: 1 }), 'SiO');
  assert.equal(writeFormula({ Cl: 1, Na: 1 }), 'NaCl');
  assert.equal(writeFormula({ C: 1, H: 4 }), 'CH4');
});

test('geometries cover the catalog and mark network vs molecule', () => {
  for (const compound of knownCompounds) {
    const geometry = geometryOf(compound);
    assert.ok(geometry.nameTr, compound.slug);
    assert.ok(geometry.note, compound.slug);
  }
  assert.equal(geometryOf(knownCompounds.find(c => c.slug === 'h2o')).id, 'bent');
  assert.equal(geometryOf(knownCompounds.find(c => c.slug === 'co2')).id, 'linear');
  assert.equal(geometryOf(knownCompounds.find(c => c.slug === 'ch4')).id, 'tetrahedral');
  assert.equal(geometryOf(knownCompounds.find(c => c.slug === 'nh3')).id, 'trigonal_pyramidal');
  assert.equal(geometryOf(knownCompounds.find(c => c.slug === 'nacl')).id, 'ionic_lattice');
  assert.equal(geometryOf(knownCompounds.find(c => c.slug === 'sio2')).id, 'network');
  assert.equal(geometryOf(knownCompounds.find(c => c.slug === 'sf6')).id, 'octahedral');
  assert.equal(geometryOf(knownCompounds.find(c => c.slug === 'pcl5')).id, 'trigonal_bipyramidal');
  assert.match(geometryOf(knownCompounds.find(c => c.slug === 'sio2')).note, /molekül değil/);
});

test('parentheses, magnetite mixed iron, and aspirin counts', () => {
  assert.deepEqual(parseFormula('Ca(OH)2'), { Ca: 1, H: 2, O: 2 });
  assert.deepEqual(parseFormula('(NH4)2SO4'), { H: 8, N: 2, O: 4, S: 1 });
  assert.deepEqual(parseFormula('CH3OH'), { C: 1, H: 4, O: 1 });
  assert.deepEqual(parseFormula('CH3COOH'), { C: 2, H: 4, O: 2 });
  const lime = formCompound(parseFormula('Ca(OH)2'));
  assert.equal(lime.ok, true);
  if (lime.ok) assert.equal(lime.compound.slug, 'caoh2');
  const magnetite = formCompound({ Fe: 3, O: 4 });
  assert.equal(magnetite.ok, true);
  if (magnetite.ok) assert.equal(magnetite.compound.slug, 'fe3o4');
  const aspirin = formCompound({ C: 9, H: 8, O: 4 });
  assert.equal(aspirin.ok, true);
  if (aspirin.ok) assert.equal(aspirin.compound.slug, 'aspirin');
  assert.equal(lookup({ H: 2, O: 2 })?.slug, 'h2o2');
  assert.equal(lookup({ C: 1, H: 4, O: 1 })?.slug, 'ch3oh');
});
