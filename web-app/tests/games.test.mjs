import test from 'node:test';
import assert from 'node:assert/strict';
import { compoundGroups } from '../src/services/chemistry.ts';
import { compoundBySlug } from '../src/services/lab.ts';
import {
  buildDetective,
  detectiveClues,
  formulaTier,
  gradeDetective,
  gradeFormula,
  normalizeGames,
  pickDetective,
  pickFormula,
  unlockedFormulaTier,
} from '../src/services/games.ts';
import { lessons } from '../src/services/lessons.ts';

test('formula grading names the wrong atom count and keeps ionic units distinct', () => {
  const water = gradeFormula('h2o', { H: 2, O: 1 });
  assert.equal(water.ok, true);
  const short = gradeFormula('h2o', { H: 1, O: 1 });
  assert.equal(short.ok, false);
  assert.match(short.message, /hidrojen/i);
  const salt = gradeFormula('nacl', { Na: 2, Cl: 1 });
  assert.equal(salt.ok, false);
  assert.match(salt.message, /formül birimi/);
  assert.equal(formulaTier(compoundBySlug.h2o), 1);
  assert.equal(unlockedFormulaTier(0), 1);
  assert.equal(unlockedFormulaTier(3), 2);
  assert.equal(pickFormula([], 'h2o').slug, 'h2o');
});

test('detective clues do not leak the element name and accept Turkish answers', () => {
  const iron = detectiveClues(buildDetective('Fe', []).element);
  assert.ok(iron.length >= 3);
  assert.equal(iron.some(clue => /demir/i.test(clue)), false);
  assert.equal(iron.some(clue => /\bFe\b/.test(clue)), false);
  assert.equal(gradeDetective('H', 'Hidrojen').ok, true);
  assert.equal(gradeDetective('H', 'He').ok, false);
  assert.equal(pickDetective([], 'H').element.symbol, 'H');
  const games = normalizeGames({ formula: ['h2o', 'fiction'], detective: ['H', 'Xx'] });
  assert.deepEqual(games.formula, ['h2o']);
  assert.deepEqual(games.detective, ['H']);
});

test('compound groups and six lesson ids stay aligned with the catalog', () => {
  assert.ok(compoundGroups(compoundBySlug.h2o).includes('gunluk'));
  assert.ok(compoundGroups(compoundBySlug.nacl).includes('tuz'));
  assert.ok(compoundGroups(compoundBySlug.fe2o3).includes('oksit'));
  assert.ok(compoundGroups(compoundBySlug.h2so4).includes('asit'));
  assert.equal(compoundGroups(compoundBySlug.h2o).includes('asit'), false);
  assert.ok(compoundGroups(compoundBySlug.ch4).includes('organik'));
  assert.ok(compoundGroups(compoundBySlug.so2).includes('cevre'));
  assert.equal(lessons.length, 6);
  assert.deepEqual(lessons[0].discoveries, ['h2o', 'co2', 'nh3']);
  assert.ok(lessons.every(l => l.questions.length >= 1));
});
