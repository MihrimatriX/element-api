import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatFixed, formatGrams, formatKredi } from "../src/lib/format.ts";
import { formulaParts } from "../src/lib/formula.ts";
import { foldTurkish, matchesSearch } from "../src/lib/text.ts";
import { isNavActive, siteMap } from "../src/productNav.ts";

describe("design-system helpers", () => {
  it("folds Turkish text for search", () => {
    assert.equal(foldTurkish("DEMİR"), "demir");
    assert.equal(foldTurkish("Çözelti ışık"), "cozelti isik");
    assert.ok(matchesSearch("su", "Su"));
    assert.ok(matchesSearch("cinko", "Çinko", "Zn"));
    assert.ok(matchesSearch("", "anything"));
    assert.ok(!matchesSearch("demir bakır", "Demir"));
  });

  it("splits formulas into counts, coefficients and charges", () => {
    const render = (formula) =>
      formulaParts(formula)
        .map(({ text, kind }) => (kind === "base" ? text : `${kind}(${text})`))
        .join("");
    assert.equal(render("H2O"), "Hsub(2)O");
    assert.equal(render("Ca(OH)2"), "Ca(OH)sub(2)");
    assert.equal(render("CuSO4·5H2O"), "CuSOsub(4)·5Hsub(2)O");
    assert.equal(render("SO4^2-"), "SOsub(4)sup(2-)");
  });

  it("formats Turkish numbers", () => {
    assert.equal(formatFixed(1234.5, 2), "1.234,50");
    assert.equal(formatKredi(1234.5), "1.234,50 kredi");
    assert.equal(formatKredi(null), "—");
    assert.equal(formatGrams(12.5, 1), "12,5 g");
  });

  it("marks nav items active on their detail routes", () => {
    assert.ok(isNavActive("/periodic", "/element/fe"));
    assert.ok(isNavActive("/compounds", "/compound/aspirin"));
    assert.ok(isNavActive("/lab", "/lab/formula?compound=nacl"));
    assert.ok(isNavActive("/developers", "/docs"));
    assert.ok(!isNavActive("/lab", "/collection"));
    assert.deepEqual(
      siteMap.map((group) => group.routes.length),
      [5, 4, 4],
    );
  });
});
