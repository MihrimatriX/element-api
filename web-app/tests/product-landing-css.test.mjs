import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const styles = readFileSync(join(root, "src/styles.css"), "utf8");
const product = readFileSync(join(root, "src/product.css"), "utf8");
const landing = readFileSync(join(root, "src/pages/Landing.tsx"), "utf8");

const ds = styles.indexOf('@import "./design-system.css"');
const prod = styles.indexOf('@import "./product.css" layer(components)');
assert.ok(ds >= 0, "design-system import missing");
assert.ok(prod > ds, "product.css must load after design-system in components layer");

assert.doesNotMatch(
  product,
  /color:\s*var\(--muted,\s*var\(--muted-foreground\)\)/,
  "text must not use --muted (surface) as foreground",
);
assert.match(product, /\.product-hero-copy h1[\s\S]*?color:\s*var\(--hero-ink\)/);
assert.match(product, /\.product-orbit-track/);
assert.match(product, /\.product-measure-inner/);
assert.match(product, /\.product-measure-giant/);
assert.match(product, /\.product-stage/);
assert.match(product, /\.product-signal-inner/);
assert.match(product, /\.product-api-sample/);
assert.match(product, /\.product-close-tag/);
assert.match(product, /product-landing--void/);
assert.match(product, /calc\(100dvh - var\(--shell-toolbar/);
assert.match(product, /\.route-stage-fallback-panel/);
assert.match(product, /\.product-orbit[\s\S]*?border-top:\s*8px\s+solid\s+var\(--brand\)/s);
assert.doesNotMatch(product, /product-journey-list/);
assert.doesNotMatch(product, /product-bridge/);
assert.doesNotMatch(product, /product-chapters/);
assert.doesNotMatch(product, /product-landing--wow/);
assert.doesNotMatch(landing, /—|–/);
assert.match(landing, /product-landing--void/);
assert.match(landing, /elementapi-hero-void-cuprite/);
assert.match(landing, /214/);
assert.doesNotMatch(landing, /\b167\b/);

/* Element detail void surface (readable type + dark mineral) */
assert.match(product, /atlas-detail--void/);
assert.match(product, /\.atlas-detail--void \.atlas-lead[\s\S]*?font-size:\s*18px/);
const detail = readFileSync(
  join(root, "src/components/ScientificDetail.tsx"),
  "utf8",
);
assert.match(detail, /atlas-detail--void/);

console.log("product-landing-css: ok");
