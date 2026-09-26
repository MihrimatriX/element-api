import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const indexCss = readFileSync(join(root, "src/index.css"), "utf8");
const productCss = readFileSync(join(root, "src/product.css"), "utf8");

assert.match(indexCss, /scrollbar-color:/);
assert.match(indexCss, /::-webkit-scrollbar/);
assert.doesNotMatch(indexCss, /cursor:\s*url\(/);
assert.match(indexCss, /input[\s\S]*cursor:\s*text/);
assert.match(indexCss, /a,[\s\S]*cursor:\s*pointer/);
assert.match(productCss, /\.void-page/);
assert.match(productCss, /\.void-stagger/);
assert.match(productCss, /@media \(prefers-reduced-motion:\s*reduce\)/);
assert.match(productCss, /\.lab-page\.lab-sandbox \.lab-drop/);
assert.match(productCss, /\.atlas-visual\.is-structure \.atlas-image/);
assert.match(productCss, /\.collection-progress-ring/);

console.log("void-chrome-cursor.test: ok");
