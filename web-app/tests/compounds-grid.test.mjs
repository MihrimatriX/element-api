import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { filterCompounds } from "../src/components/reference/compound-filter.ts";
import {
  fitToPlate,
  inkBounds,
  PLATE_RATIO,
} from "../src/components/reference/structure-fit.ts";

/** Minimal catalogue rows: only the fields the filter reads. */
const compound = (slug, tr, en, formula, cid) => ({
  slug,
  names: { tr, en, iupac: null },
  display_formula: formula,
  molecular_properties: { molecular_formula: formula },
  identifiers: { pubchem_cid: cid },
});

const records = [
  compound("h2o", "Su", "Water", "H2O", 962),
  compound("h2so4", "Sülfürik asit", "Sulfuric acid", "H2SO4", 1118),
  compound("aspirin", "Aspirin", "Aspirin", "C9H8O4", 2244),
  compound("nacl", "Sodyum klorür", "Sodium chloride", "NaCl", 5234),
];

const groupsBySlug = new Map([
  ["h2o", ["gunluk"]],
  ["h2so4", ["asit"]],
  ["aspirin", ["organik", "gunluk"]],
  ["nacl", ["tuz", "gunluk"]],
]);

const slugs = (query, group = null) =>
  filterCompounds(records, query, group, groupsBySlug).map((row) => row.slug);

describe("compound catalogue filter", () => {
  it("returns everything for an empty query and no group", () => {
    assert.deepEqual(slugs(""), ["h2o", "h2so4", "aspirin", "nacl"]);
  });

  it("matches Turkish names without diacritics, English names and formulas", () => {
    assert.deepEqual(slugs("sulfurik"), ["h2so4"]);
    assert.deepEqual(slugs("chloride"), ["nacl"]);
    assert.deepEqual(slugs("h2o"), ["h2o"]);
  });

  it("finds a record by its PubChem CID", () => {
    assert.deepEqual(slugs("2244"), ["aspirin"]);
  });

  it("keeps catalogue order and lets one compound sit in several groups", () => {
    assert.deepEqual(slugs("", "gunluk"), ["h2o", "aspirin", "nacl"]);
    assert.deepEqual(slugs("", "organik"), ["aspirin"]);
  });

  it("combines the query with the group", () => {
    assert.deepEqual(slugs("asit", "gunluk"), []);
    assert.deepEqual(slugs("asit", "asit"), ["h2so4"]);
  });
});

/** Square RGBA buffer filled with white, with a black box from (x0, y0) to (x1, y1) inclusive. */
function canvasWithBox(size, [x0, y0, x1, y1]) {
  const pixels = new Uint8ClampedArray(size * size * 4).fill(255);
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) pixels.fill(0, (y * size + x) * 4, (y * size + x) * 4 + 3);
  return pixels;
}

describe("structure thumbnail fit", () => {
  it("finds the drawn molecule and ignores the background", () => {
    assert.deepEqual(inkBounds(canvasWithBox(10, [2, 4, 5, 6]), 10), {
      left: 0.2,
      top: 0.4,
      right: 0.6,
      bottom: 0.7,
    });
  });

  it("reports a blank image as having no ink", () => {
    assert.equal(inkBounds(new Uint8ClampedArray(4 * 4 * 4).fill(255), 4), null);
  });

  it("zooms a small centred molecule up, within the zoom limit", () => {
    const fit = fitToPlate({ left: 0.45, top: 0.45, right: 0.55, bottom: 0.55 });
    assert.equal(fit.scale, 3);
    assert.equal(Math.round(fit.x), 0);
    assert.equal(Math.round(fit.y), 0);
  });

  it("shrinks a tall molecule so it fits the 4:3 plate height", () => {
    const fit = fitToPlate({ left: 0.4, top: 0, right: 0.6, bottom: 1 });
    assert.ok(fit.scale * 1 <= PLATE_RATIO, "molecule height stays inside the plate");
  });

  it("shifts an off-centre molecule back to the middle", () => {
    const fit = fitToPlate({ left: 0, top: 0, right: 0.2, bottom: 0.2 });
    assert.ok(fit.x > 0 && fit.y > 0);
  });
});
