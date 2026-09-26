import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const ds = readFileSync(join(root, "src/design-system.css"), "utf8");
const product = readFileSync(join(root, "src/product.css"), "utf8");
const lab = readFileSync(join(root, "src/pages/Laboratory.tsx"), "utf8");

assert.match(ds, /\.lab-page\.lab-sandbox\s*\{[^}]*--void:\s*#0c0f0e/s);
assert.match(ds, /\.lab-page\.lab-sandbox \.lab-bench\s*\{[^}]*border-left:\s*3px solid var\(--brand/s);
assert.doesNotMatch(ds, /\.lab-page\.lab-sandbox \.lab-bench\s*\{[^}]*#fafbfc/s);
assert.doesNotMatch(
  ds,
  /@supports \(backdrop-filter: blur\(1px\)\)\s*\{[^}]*\.lab-inventory/s,
);

assert.match(product, /\.lab-page\.lab-sandbox \.lab-notebook\s*\{/);
assert.match(product, /\.lab-page\.lab-sandbox \.lab-layout\s*\{/);
assert.doesNotMatch(product, /cursor:\s*url\(/);

assert.doesNotMatch(lab, /from ["']@\/components\/ui\/card["']/);
assert.match(lab, /className="lab-inventory"/);
assert.match(lab, /className="lab-bench"/);
assert.match(lab, /data-lab-drop/);
assert.match(lab, /data-lab-drag/);

console.log("lab-void-chrome: ok");
