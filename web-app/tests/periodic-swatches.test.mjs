import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  STATIC_ELEMENTS,
  categoryLabels,
  categoryTokens,
  dbCategoryToStaticCategory,
  mergeElementData,
} from "../src/services/elementData.ts";
import {
  bestMatch,
  cardNeighbour,
  elementMatches,
  tableCell,
  tableNeighbour,
} from "../src/components/periodic/model.ts";
import { heatPaint, lensDomain, readLens } from "../src/components/periodic/lenses.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const bySymbol = (symbol) => STATIC_ELEMENTS.find((element) => element.symbol === symbol);

/** Minimal science record: only the fields the lenses read. */
function record({ mass = null, pauling = null, state = null } = {}) {
  return {
    atomic_properties: { atomic_mass: mass, electronegativity: { pauling } },
    thermodynamic_properties: { standard_state: state },
  };
}

describe("periodic seed (elementData)", () => {
  it("keeps the rawElements literal the sitemap and refresh scripts parse", () => {
    const source = readFileSync(join(root, "src/services/elementData.ts"), "utf8");
    const literal = source.match(/const rawElements\s*=\s*"([^"]+)"/);
    assert.ok(literal, "rawElements must stay a one-line string literal");
    assert.equal(literal[1].split("|").length, 118);
  });

  it("lists 118 elements in atomic-number order, each in its own table cell", () => {
    assert.deepEqual(
      STATIC_ELEMENTS.map((element) => element.atomicNumber),
      Array.from({ length: 118 }, (_, index) => index + 1),
    );
    assert.equal(new Set(STATIC_ELEMENTS.map((element) => element.symbol)).size, 118);
    const cells = STATIC_ELEMENTS.map((element) => `${element.row}:${element.col}`);
    assert.equal(new Set(cells).size, 118, "no two elements share a table cell");
  });

  it("detaches the f-block into rows 8–9 but keeps its real period and group", () => {
    for (const symbol of ["La", "Lu"]) {
      assert.equal(bySymbol(symbol).row, 8);
      assert.equal(bySymbol(symbol).period, 6);
      assert.equal(bySymbol(symbol).group, 3);
    }
    assert.equal(bySymbol("Ac").row, 9);
    assert.equal(bySymbol("Lr").period, 7);
    assert.equal(bySymbol("Fe").period, 4);
    assert.equal(bySymbol("Fe").group, 8);
  });

  it("colours every family with its design token, and every token exists", () => {
    const styles = readFileSync(join(root, "src/styles.css"), "utf8");
    for (const element of STATIC_ELEMENTS)
      assert.ok(element.category in categoryLabels, `${element.symbol}: unknown family`);
    for (const family of Object.keys(categoryLabels)) {
      assert.equal(categoryTokens[family], `var(--color-family-${family})`);
      assert.match(styles, new RegExp(`--color-family-${family}:`));
    }
  });

  it("maps gateway categories to family keys", () => {
    assert.equal(dbCategoryToStaticCategory("Alkali metal"), "alkali");
    assert.equal(dbCategoryToStaticCategory("Alkaline earth metal"), "alkaline");
    assert.equal(dbCategoryToStaticCategory("Post-transition metal"), "post");
    assert.equal(dbCategoryToStaticCategory("Transition metal"), "transition");
    assert.equal(dbCategoryToStaticCategory("Noble gas"), "noble");
  });

  it("overlays gateway rows on the seed without dropping elements", () => {
    const merged = mergeElementData(
      [{ symbol: "fe", atomicMass: 55.845, phase: "Solid", market: { pricePerGram: 3, availableStock: 9 } }],
      STATIC_ELEMENTS,
    );
    assert.equal(merged.length, 118);
    const iron = merged.find((element) => element.symbol === "Fe");
    assert.equal(iron.mass, "55.845");
    assert.equal(iron.phase, "katı");
    assert.equal(iron.pricePerGram, 3);
    assert.equal(iron.availableStock, 9);
    assert.equal(merged.find((element) => element.symbol === "Og").availableStock, 0);
  });
});

describe("explorer model", () => {
  it("places tiles under the group row and leaves a gap row above the f-block", () => {
    assert.deepEqual(tableCell(bySymbol("H")), { row: 2, column: 2 });
    assert.deepEqual(tableCell(bySymbol("Og")), { row: 8, column: 19 });
    assert.deepEqual(tableCell(bySymbol("La")), { row: 10, column: 4 });
    assert.deepEqual(tableCell(bySymbol("Ac")), { row: 11, column: 4 });
  });

  it("searches symbol, Turkish name, atomic number and English name with Turkish folding", () => {
    const iron = bySymbol("Fe");
    assert.ok(elementMatches(bySymbol("Zn"), "cinko", []));
    assert.ok(elementMatches(iron, "DEMİR", []));
    assert.ok(elementMatches(iron, "26", []));
    assert.ok(elementMatches(iron, "iron", [], "Iron"));
    assert.ok(!elementMatches(iron, "iron", []));
    assert.ok(elementMatches(iron, "", ["transition"]));
    assert.ok(!elementMatches(iron, "", ["noble", "halogen"]));
  });

  it("opens the exact match on Enter before the first partial one", () => {
    const search = (query) =>
      STATIC_ELEMENTS.filter((element) => elementMatches(element, query, []));
    assert.equal(search("n")[0].symbol, "H", "Hidrojen comes first by atomic number…");
    assert.equal(bestMatch("n", search("n")).symbol, "N", "…but the symbol N wins");
    assert.equal(bestMatch("bakir", search("bakir")).symbol, "Cu");
    assert.equal(bestMatch("26", search("26")).symbol, "Fe");
    assert.equal(bestMatch("x", []), undefined);
  });

  it("moves through the table along rows and columns, skipping empty cells", () => {
    const iron = bySymbol("Fe");
    assert.equal(tableNeighbour(STATIC_ELEMENTS, iron, "ArrowLeft").symbol, "Mn");
    assert.equal(tableNeighbour(STATIC_ELEMENTS, iron, "ArrowDown").symbol, "Ru");
    assert.equal(tableNeighbour(STATIC_ELEMENTS, iron, "ArrowUp"), undefined);
    assert.equal(tableNeighbour(STATIC_ELEMENTS, bySymbol("Ba"), "ArrowRight").symbol, "Hf");
    const halogens = STATIC_ELEMENTS.filter((element) => element.category === "halogen");
    assert.equal(tableNeighbour(halogens, bySymbol("F"), "ArrowDown").symbol, "Cl");
  });

  it("moves through the card grid by one card or one row", () => {
    const sodium = bySymbol("Na");
    assert.equal(cardNeighbour(STATIC_ELEMENTS, sodium, "ArrowRight", 4).symbol, "Mg");
    assert.equal(cardNeighbour(STATIC_ELEMENTS, sodium, "ArrowDown", 4).symbol, "P");
    assert.equal(cardNeighbour(STATIC_ELEMENTS, bySymbol("H"), "ArrowUp", 4), undefined);
  });
});

describe("colour lenses", () => {
  it("shows a dash while records load and hatches only loaded records without a value", () => {
    assert.deepEqual(readLens("mass", undefined, undefined), { value: "—", missing: false });
    assert.equal(readLens("electronegativity", record(), [0.7, 3.98]).missing, true);
    assert.equal(readLens("category", record(), undefined).missing, false);
    assert.equal(readLens("phase", record(), undefined).missing, true);
  });

  it("prints Turkish numbers and keeps family colours under the family lens", () => {
    const reading = readLens("category", record({ mass: 55.845 }), undefined);
    assert.equal(reading.value, "55,85");
    assert.equal(reading.paint, undefined);
  });

  it("paints numeric lenses on a scale from the lowest to the highest value", () => {
    const domain = lensDomain("electronegativity", [
      record({ pauling: 0.7 }),
      record({ pauling: 3.98 }),
      record(),
    ]);
    assert.deepEqual(domain, [0.7, 3.98]);
    assert.deepEqual(readLens("electronegativity", record({ pauling: 0.7 }), domain).paint, heatPaint(0));
    assert.deepEqual(readLens("electronegativity", record({ pauling: 3.98 }), domain).paint, heatPaint(1));
    assert.equal(lensDomain("phase", [record({ mass: 1 })]), undefined);
    assert.equal(lensDomain("mass", [record()]), undefined);
  });

  it("names and colours standard states under the phase lens", () => {
    const gas = readLens("phase", record({ state: "gas" }), undefined);
    assert.equal(gas.value, "Gaz");
    assert.ok(gas.paint.edge.includes("--color-warning"));
    assert.equal(readLens("phase", record({ state: "liquid" }), undefined).value, "Sıvı");
  });

  it("uses tokens only and mixes tints in oklab so they match the legend", () => {
    const paint = heatPaint(0.5);
    assert.doesNotMatch(paint.edge + paint.fill, /#[0-9a-f]{3,6}|rgb\(/i);
    assert.match(paint.fill, /in oklab/);
    assert.equal(heatPaint(-1).edge, heatPaint(0).edge, "positions are clamped to 0…1");
  });
});
