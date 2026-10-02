import assert from "node:assert/strict";
import test from "node:test";
import {
  buildDetective,
  formulaPool,
  gradeDetective,
  gradeFormula,
  normalizeGames,
  pickDetective,
  pickFormula,
} from "../src/services/games.ts";
import { findLabElement } from "../src/services/lab.ts";

test("pickFormula: 'Başka kayıt' moves on instead of returning the current compound", () => {
  const first = pickFormula([]);
  const second = pickFormula([], null, first.slug);
  const third = pickFormula([], null, second.slug);
  assert.notEqual(second.slug, first.slug);
  assert.notEqual(third.slug, second.slug);
  assert.notEqual(third.slug, first.slug, "skipping walks forward, it does not bounce back");
  assert.ok(formulaPool(1).some((c) => c.slug === second.slug), "stays inside the unlocked tier");
});

test("pickFormula: a skipped compound reached from the URL still moves on", () => {
  const fromUrl = pickFormula([], "nacl");
  assert.equal(fromUrl.slug, "nacl");
  assert.notEqual(pickFormula([], null, "nacl").slug, "nacl");
});

test("pickFormula: solved compounds are skipped, and a fully solved pool still offers another", () => {
  const first = pickFormula([]);
  assert.notEqual(pickFormula([first.slug]).slug, first.slug);
  const all = formulaPool(3).map((c) => c.slug);
  assert.notEqual(pickFormula(all, null, first.slug).slug, first.slug);
});

test("pickDetective: 'Pas geç' moves on instead of returning the current element", () => {
  const first = pickDetective([]);
  const second = pickDetective([], null, first.element.symbol);
  const third = pickDetective([], null, second.element.symbol);
  assert.notEqual(second.element.symbol, first.element.symbol);
  assert.notEqual(third.element.symbol, second.element.symbol);
  assert.notEqual(third.element.symbol, first.element.symbol);
});

test("pickDetective: ?element= resolves case-insensitively", () => {
  for (const value of ["fe", "FE", "Fe", " fe "]) {
    assert.equal(pickDetective([], value).element.symbol, "Fe", value);
  }
  assert.equal(buildDetective("cl", [])?.element.symbol, "Cl");
  assert.equal(pickDetective([], "xx").element.symbol, pickDetective([]).element.symbol);
});

test("buildDetective: four distinct candidates that include the answer", () => {
  const item = buildDetective("Fe", []);
  assert.ok(item);
  assert.equal(item.choices.length, 4);
  assert.equal(new Set(item.choices.map((e) => e.symbol)).size, 4);
  assert.ok(item.choices.some((e) => e.symbol === "Fe"));
  assert.ok(item.clues.every((clue) => !/demir|\bFe\b/i.test(clue)), "clues never name the answer");
  assert.equal(item.clues[0], "Periyodik tabloda bir geçiş metali.", "family reads mid-sentence in lower case");
});

test("gradeDetective accepts symbol or Turkish name in any case", () => {
  assert.ok(gradeDetective("Fe", "demir").ok);
  assert.ok(gradeDetective("Fe", "FE").ok);
  assert.ok(gradeDetective("Zn", "cinko").ok);
  assert.ok(!gradeDetective("Fe", "bakır").ok);
});

test("gradeFormula names the wrong element counts", () => {
  assert.ok(gradeFormula("h2o", { H: 2, O: 1 }).ok);
  const wrong = gradeFormula("h2o", { H: 1, O: 1 });
  assert.ok(!wrong.ok);
  assert.match(wrong.message, /hidrojen eksik \(sen 1, olmalı 2\)/);
});

test("lab URL symbols resolve case-insensitively", () => {
  assert.equal(findLabElement("fe"), "Fe");
  assert.equal(findLabElement("Fe"), "Fe");
  assert.equal(findLabElement("xx"), undefined);
  assert.equal(findLabElement(null), undefined);
});

test("normalizeGames drops unknown ids and duplicates", () => {
  assert.deepEqual(
    normalizeGames({ formula: ["h2o", "h2o", "nope"], detective: ["Fe", "fe", 3] }),
    { formula: ["h2o"], detective: ["Fe"] },
  );
});
