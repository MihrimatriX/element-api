import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { drawingFocus } from "../src/components/detail/drawingFocus.ts";
import {
  formatPropertyNumber,
  isPopulated,
  propertyLabel,
  propertySections,
  sectionCount,
  sectionMatches,
} from "../src/components/detail/properties.ts";

const source = (path) => readFileSync(new URL(`../src/${path}`, import.meta.url), "utf8");

describe("scientific record properties", () => {
  const record = {
    id: "fe",
    atomic_properties: { atomic_mass: 55.845, electronegativity: { pauling: 1.83, allen: null } },
    isotopes: [{ mass_number: 54 }, { mass_number: 56 }, null],
    abundance: { crust_mg_kg: null, ocean_mg_l: "" },
    unlabelled_key: { value: 1 },
  };

  it("treats null, empty strings and empty children as missing, never zero", () => {
    assert.equal(isPopulated(null), false);
    assert.equal(isPopulated(""), false);
    assert.equal(isPopulated({ a: null, b: [] }), false);
    assert.equal(isPopulated(0), true);
    assert.equal(isPopulated(false), true);
  });

  it("lists only labelled, populated top-level sections unless missing ones are asked for", () => {
    assert.deepEqual(
      propertySections(record, false).map((section) => section.key),
      ["atomic_properties", "isotopes"],
    );
    assert.deepEqual(
      propertySections(record, true).map((section) => section.label),
      ["Atomik özellikler", "İzotoplar", "Doğada bulunma"],
    );
  });

  it("counts records in lists and populated values in objects for the section badge", () => {
    assert.equal(sectionCount(record.isotopes), "2 kayıt");
    assert.equal(sectionCount(record.atomic_properties), "2 değer");
    assert.equal(sectionCount(record.abundance), null);
  });

  it("filters sections by title or nested field label, Turkish-folded", () => {
    const [atomic, isotopes] = propertySections(record, false);
    assert.ok(sectionMatches(atomic, "elektronegatif"));
    assert.ok(sectionMatches(isotopes, "kutle numarasi"));
    assert.ok(!sectionMatches(isotopes, "pauling"));
  });

  it("keeps lattice c apart from Celsius and falls back to readable keys", () => {
    assert.equal(propertyLabel("c"), "Santigrat (°C)");
    assert.equal(propertyLabel("c", "lattice_parameters_pm"), "c");
    assert.equal(propertyLabel("some_new_field"), "some new field");
  });

  it("formats numbers the Turkish way but leaves years and identifiers ungrouped", () => {
    assert.equal(formatPropertyNumber(1234.5), "1.234,5");
    assert.equal(formatPropertyNumber(1735, "discovered_year"), "1735");
    assert.equal(formatPropertyNumber(2244, "pubchem_cid"), "2244");
  });
});

describe("structure depiction focus", () => {
  // 10×10 white canvas with a 2×2 ink square at x 6–7, y 2–3.
  const pixels = new Uint8ClampedArray(10 * 10 * 4).fill(245);
  for (const [x, y] of [[6, 2], [7, 2], [6, 3], [7, 3]]) pixels.set([20, 20, 20, 255], (y * 10 + x) * 4);

  it("zooms a small drawing up to the cap and centres it", () => {
    const focus = drawingFocus(pixels, 10, 10);
    assert.equal(focus.zoom, 3);
    assert.equal(Math.round(focus.shiftX), -20, "moves left toward the drawing");
    assert.equal(Math.round(focus.shiftY), 20, "moves down toward the drawing");
  });

  it("never shrinks a drawing that already fills the canvas", () => {
    const full = new Uint8ClampedArray(4 * 4 * 4).fill(20);
    assert.deepEqual(drawingFocus(full, 4, 4), { zoom: 1, shiftX: 0, shiftY: 0 });
  });

  it("returns null for a blank image", () => {
    assert.equal(drawingFocus(new Uint8ClampedArray(4 * 4 * 4).fill(255), 4, 4), null);
  });
});

describe("record page contracts", () => {
  it("shows the record JSON through CodeBlock with JSON highlighting from jsonSource", () => {
    const panel = source("components/detail/DeveloperPanel.tsx");
    assert.match(panel, /jsonSource\(record\)/);
    assert.match(panel, /<CodeBlock[^>]*language="json"/);
  });

  it("keeps the #geometry anchor the glossary links to", () => {
    assert.match(source("components/detail/CompoundStructure.tsx"), /id="geometry"/);
  });

  it("marks the not-found and error views noindex", () => {
    const states = source("components/detail/RecordStates.tsx");
    assert.equal(states.match(/\bnoIndex\b/g)?.length, 2);
  });
});
