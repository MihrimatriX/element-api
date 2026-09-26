import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const guide = readFileSync(join(root, "src/pages/Guide.tsx"), "utf8");
const product = readFileSync(join(root, "src/product.css"), "utf8");

assert.match(guide, /guide-page/);
assert.match(guide, /guide-steps/);
assert.match(guide, /guide-faq/);
assert.match(guide, /guide-api/);
assert.match(guide, /\/lab\?lesson=everyday/);
assert.match(guide, /\/collection/);
assert.match(guide, /\/lab\/formula\?compound=nacl/);
assert.match(guide, /\/lab\/detective/);
assert.match(product, /\.guide-page \.process\.guide-steps\s*\{[^}]*auto-fill/s);
assert.match(product, /\.guide-page \.guide-faq\s*\{[^}]*auto-fill/s);
assert.match(product, /guide-step-card:hover[\s\S]*translateY\(-2px\)/);
assert.match(product, /prefers-reduced-motion: reduce[\s\S]*guide-step-card/);
assert.doesNotMatch(product, /cursor:\s*url\(/);

console.log("guide-cards.test: ok");
