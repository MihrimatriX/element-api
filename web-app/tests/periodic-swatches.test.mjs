import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = readFileSync(join(root, "src/services/elementData.ts"), "utf8");
const css = readFileSync(join(root, "src/design-system.css"), "utf8");
const science = readFileSync(join(root, "src/science.css"), "utf8");
const explorer = readFileSync(
  join(root, "src/components/PeriodicExplorer.tsx"),
  "utf8",
);
const html = readFileSync(join(root, "index.html"), "utf8");

const keys = [
  "alkali",
  "alkaline",
  "transition",
  "post",
  "metalloid",
  "nonmetal",
  "halogen",
  "noble",
  "lanthanide",
  "actinide",
];
const swatches = Object.fromEntries(
  keys.map((k) => {
    const m = src.match(new RegExp(`${k}:\\s*\"(#[0-9a-fA-F]{6})\"`));
    assert.ok(m, `missing swatch for ${k}`);
    return [k, m[1].toLowerCase()];
  }),
);

assert.equal(new Set(Object.values(swatches)).size, keys.length, "swatches must be unique");
assert.match(src, /export function tileInk/);
assert.match(src, /"#111111"\s*\|\s*"#ffffff"/);
assert.match(science, /\.museum-chart/);
assert.match(css, /\.museum-chart\.science-home/);
assert.match(css, /\.museum-plinth/);
assert.match(css, /\.museum-grid/);
assert.match(css, /--museum-stone:\s*#0c0f0e/i);
assert.match(css, /--museum-gutter:\s*#1a211f/i);
assert.match(css, /--brand:\s*#812f26/i);
assert.match(css, /museum-tile-band/);
assert.match(css, /data-lens="category".*museum-tile-band|museum-grid\[data-lens="category"\][\s\S]*museum-tile-band/s);
assert.match(css, /0 0 0 2px var\(--brand/);
assert.match(explorer, /museum-chart/);
assert.match(explorer, /data-light-lab="v2"/);
assert.match(explorer, /museum-aside/);
assert.match(explorer, /museum-plinth/);
assert.match(explorer, /museum-legend/);
assert.match(explorer, /museum-tile-band/);
assert.match(explorer, /museum-mast-meta/);
assert.match(science, /--museum-preview-band:\s*200px/);
assert.match(science, /\.museum-aside\s*\{[^}]*height:\s*var\(--museum-preview-band\)/s);
assert.match(science, /figcaption\s*\{\s*display:\s*none/);
assert.match(css, /--museum-preview-band:\s*200px/);
assert.match(css, /border-top:\s*6px\s+solid\s+var\(--brand/);
assert.match(css, /\.museum-mast-meta[\s\S]*?background:\s*var\(--brand/);
assert.match(science, /\.museum-aside[\s\S]*?\.atlas-preview-copy[\s\S]*?overflow:\s*hidden/s);
assert.match(explorer, /compact && \(\s*<div className="preview-atom">/s);
assert.match(explorer, /tableGridRow/);
assert.match(explorer, /row >= 8 \? row \+ 2 : row \+ 1/);
assert.match(explorer, /gridRow: 10/);
assert.match(explorer, /gridRow: 11/);
assert.match(css, /grid-template-rows:\s*20px repeat\(7, auto\) 14px repeat\(2, auto\)/);
assert.match(science, /grid-template-rows:\s*20px repeat\(7, auto\) 14px repeat\(2, auto\)/);
assert.doesNotMatch(css, /max-width:\s*1560px/);
assert.doesNotMatch(science, /max-width:\s*1560px/);
assert.match(html, /family=Bricolage\+Grotesque/);
assert.match(html, /family=Source\+Sans\+3/);
assert.match(html, /family=IBM\+Plex\+Mono/);
assert.doesNotMatch(html, /family=Syne/);
assert.doesNotMatch(html, /family=Outfit/);
assert.doesNotMatch(html, /Fraunces/);
assert.doesNotMatch(html, /family=IBM\+Plex\+Sans/);
assert.doesNotMatch(explorer, /chart-board/);
assert.doesNotMatch(explorer, /explorer-inset/);
assert.doesNotMatch(explorer, /explorer-play/);
assert.doesNotMatch(explorer, /home-empty|home-welcome|homeMode/);
assert.doesNotMatch(explorer, /data-night-atlas/);
assert.doesNotMatch(css, /filter:\s*saturate/);
assert.doesNotMatch(css, /scale\(1\.1\)/);
assert.doesNotMatch(css, /--museum-stone:\s*#0e1116/);
assert.doesNotMatch(science, /--museum-stone:\s*#0e1116/);
assert.doesNotMatch(css, /--museum-gutter:\s*#ffffff/);
assert.match(css, /\[data-lens="category"\][\s\S]*background:\s*var\(--museum-plinth\)/s);

console.log("periodic-swatches: ok specimen", swatches.alkali, "…", swatches.noble);
