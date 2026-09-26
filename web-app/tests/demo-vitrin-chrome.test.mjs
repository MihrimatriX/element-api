import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const demo = readFileSync(join(root, "src/pages/Demo.tsx"), "utf8");
const product = readFileSync(join(root, "src/product.css"), "utf8");

assert.match(demo, /void-kicker["']?>DEMO</);
assert.match(demo, /demo-frame/);
assert.match(
  demo,
  /Mağaza, sepet ve kasa buradaki DEMO parçalarıdır/,
);
assert.match(
  demo,
  /fırsat buldukça geliştirmeye devam\s+edeceğiz/,
);
assert.match(demo, /to="\/market"/);
assert.match(demo, /to="\/shop"/);
assert.match(demo, /to="\/docs#simulation"/);
assert.doesNotMatch(demo, /cursor:\s*url\(/);

assert.match(product, /\.demo-page \.demo-frame\s*\{/);
assert.match(product, /\.demo-page \.demo-frame-evolve\s*\{/);
assert.match(
  product,
  /prefers-reduced-motion:\s*reduce[\s\S]*?\.demo-page \.demo-frame/,
);
assert.doesNotMatch(product, /cursor:\s*url\(/);

console.log("demo-vitrin-chrome: ok");
