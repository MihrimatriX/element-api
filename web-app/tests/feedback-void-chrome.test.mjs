import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const page = readFileSync(join(root, "src/pages/Feedback.tsx"), "utf8");
const product = readFileSync(join(root, "src/product.css"), "utf8");

assert.match(page, /feedback-page/);
assert.match(page, /feedback-grid/);
assert.match(page, /feedback-consent/);
assert.match(page, /feedback-stats/);
assert.match(page, /feedback-field/);
assert.match(page, /download/);
assert.match(page, /setDiagnostics/);
assert.doesNotMatch(page, /from ["']@\/components\/ui\/card["']/);
assert.doesNotMatch(page, /cursor:\s*url\(/);

assert.match(product, /\.feedback-page \.feedback-grid\s*\{/);
assert.match(product, /\.feedback-page \.feedback-consent\s*\{/);
assert.match(product, /\.feedback-page \.feedback-stats\s*\{/);
assert.match(page, /feedback-notes/);
assert.match(page, /dark:bg-\[var\(--void-lift\)\]/);
assert.match(
  product,
  /\.feedback-page \.feedback-panel \.feedback-field \[data-slot="textarea"\]/,
);
assert.match(product, /accent-color:\s*var\(--brand\)/);
assert.doesNotMatch(product, /\.feedback-page[^{]*\{[^}]*cursor:\s*url\(/s);

console.log("feedback-void-chrome: ok");
