import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const ds = readFileSync(join(root, "src/design-system.css"), "utf8");
const product = readFileSync(join(root, "src/product.css"), "utf8");
const science = readFileSync(join(root, "src/science.css"), "utf8");
const card = readFileSync(join(root, "src/components/CompoundCard.tsx"), "utf8");

assert.match(ds, /\.science-compounds\s*\{[^}]*auto-fill/s);
assert.match(ds, /\.science-compound-card\.atlas-compound\s*\{[^}]*grid-template-columns:\s*1fr/s);
assert.match(ds, /\.compound-card-mark,\s*\.compound-card-structure\s*\{[^}]*width:\s*100%/s);
assert.doesNotMatch(ds, /grid-template-columns:\s*108px/);
assert.match(product, /\.compounds-catalog \.science-compounds/);
assert.match(science, /auto-fill.*minmax\(220px/);
assert.match(card, /color-mix\(in srgb/);

console.log("compounds-grid.test: ok");
