// Source contracts for the lab pages on the Mineral design system.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFileSync(join(root, path), "utf8");

const lab = read("src/pages/Laboratory.tsx");
const formula = read("src/pages/LabFormula.tsx");
const detective = read("src/pages/LabDetective.tsx");
const palette = read("src/components/lab/ElementPalette.tsx");
const bench = read("src/components/lab/BenchDropZone.tsx");
const drag = read("src/components/lab/useLabDrag.ts");

test("lab pages use PageHeader, the mode switcher and their SEO paths", () => {
  for (const [source, path] of [
    [lab, "/lab"],
    [formula, "/lab/formula"],
    [detective, "/lab/detective"],
  ]) {
    assert.match(source, /<PageHeader/);
    assert.match(source, /<LabModes \/>/);
    assert.match(source, new RegExp(`path="${path}"`));
    assert.doesNotMatch(source, /noIndex/, "public lab pages stay indexable");
  }
});

test("no legacy lab or science class names survive", () => {
  for (const source of [lab, formula, detective, palette, bench]) {
    assert.doesNotMatch(source, /className="(lab|science|void|lesson)-/);
  }
});

test("analytics events are kept", () => {
  assert.match(lab, /track\("lab_started"\)/);
  assert.match(lab, /track\("discovery_completed", slug\)/);
});

test("drop targets rendered by the bench are the ones the drag hook hit-tests", () => {
  assert.match(drag, /closest\("\[data-lab-drop\]"\)/);
  assert.match(drag, /closest<HTMLElement>\("\[data-lab-chip\]"\)/);
  assert.match(bench, /data-lab-drop\b/);
  assert.match(bench, /data-lab-chip=\{index\}/);
});

test("palette scrolls on touch: only the drag handle disables touch panning", () => {
  assert.equal(palette.match(/touch-none/g)?.length, 1);
  const handle = palette.slice(palette.lastIndexOf("<span", palette.indexOf("touch-none")));
  assert.match(handle, /onDragStart\(event, material\.id, true\)/);
  const addButton = palette.slice(palette.indexOf("<button"), palette.indexOf("/>", palette.indexOf("<button")));
  assert.doesNotMatch(addButton, /touch-none/);
  assert.match(addButton, /onClick=\{\(\) => onAdd\(material\.id\)\}/, "click, Enter and Space add an atom");
});

test("skip buttons pass the current puzzle so the picker moves on", () => {
  assert.match(formula, /pickFormula\(solved, null, target\.slug\)/);
  assert.match(detective, /pickDetective\(solved, null, element\.symbol\)/);
  assert.doesNotMatch(detective, /toUpperCase/, "?element= is resolved case-insensitively by the service");
});
