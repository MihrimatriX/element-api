import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const product = readFileSync(join(root, "src/product.css"), "utf8");
const about = readFileSync(join(root, "src/pages/About.tsx"), "utf8");
const guide = readFileSync(join(root, "src/pages/Guide.tsx"), "utf8");
const data = readFileSync(join(root, "src/pages/DataCoverage.tsx"), "utf8");
const lab = readFileSync(join(root, "src/pages/Laboratory.tsx"), "utf8");

assert.match(product, /\.science-meta\s*\{/);
assert.match(product, /\.lab-bench-label\s*\{/);
assert.match(product, /Shared product mast/);
assert.doesNotMatch(product, /text-transform:\s*uppercase/);
assert.doesNotMatch(about, /className="kicker"/);
assert.doesNotMatch(guide, /className="kicker"/);
assert.doesNotMatch(data, /science-eyebrow/);
assert.match(lab, /lab-bench-label/);
assert.doesNotMatch(lab, /science-eyebrow">Tezgâh/);

const app = readFileSync(join(root, "src/App.tsx"), "utf8");
assert.match(app, /simulation-banner/);
assert.match(app, /gerçek para/);
assert.match(app, /\/\(market\|shop\|account\|demo\)/);

console.log("product-chrome: ok");
