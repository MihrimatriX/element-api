import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const about = readFileSync(join(root, "src/pages/About.tsx"), "utf8");
const product = readFileSync(join(root, "src/product.css"), "utf8");

assert.match(about, /about-page/);
assert.match(about, /about-sections void-stagger/);
assert.match(about, /about-card void-panel/);
assert.match(about, /to="\/nasil"/);
assert.match(about, /to="\/data"/);
assert.match(about, /to="\/developers"/);
assert.match(about, /to="\/docs"/);
assert.match(about, /to="\/sozluk"/);
assert.match(about, /to="\/demo"/);
assert.match(about, /to="\/lab\?lesson=everyday"/);
assert.doesNotMatch(about, /cursor:\s*url\(/);

assert.match(product, /\.about-page \.about-sections/);
assert.match(product, /\.about-page \.about-card/);
assert.match(product, /\.about-page \.about-links/);
assert.match(product, /@media \(prefers-reduced-motion:\s*reduce\)[\s\S]*\.about-page \.about-card:hover/);
assert.doesNotMatch(product, /cursor:\s*url\(/);

console.log("about-page.test: ok");
