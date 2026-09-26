import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = readFileSync(join(root, "src/lib/highlightJson.tsx"), "utf8");
const css = readFileSync(join(root, "src/index.css"), "utf8");
const product = readFileSync(join(root, "src/product.css"), "utf8");
const ds = readFileSync(join(root, "src/design-system.css"), "utf8");
const login = readFileSync(join(root, "src/pages/Login.tsx"), "utf8");
const register = readFileSync(join(root, "src/pages/Register.tsx"), "utf8");
const detail = readFileSync(
  join(root, "src/components/ScientificDetail.tsx"),
  "utf8",
);

assert.match(src, /export function highlightJson/);
assert.match(src, /jw-key/);
assert.match(src, /jw-str/);
assert.match(css, /\.jw-key/);
assert.match(css, /\.code-window::before/);
assert.match(product, /\.api-docs-page \.docs-status/);
assert.match(product, /\.api-live[\s\S]*?border-radius:\s*var\(--radius-soft\)/s);
assert.match(ds, /\.auth-sheet[\s\S]*?border-left:\s*4px\s+solid\s+var\(--brand\)/s);
assert.match(ds, /\.auth-container[\s\S]*?justify-content:\s*center/s);
assert.match(ds, /\.auth-error[\s\S]*?#f0c4bf/s);
assert.match(login, /Giriş yap/);
assert.doesNotMatch(login, /10\.000 sanal kredi/);
assert.match(register, /auth-perks/);
assert.match(register, /name="firstName"/);
assert.match(login, /name="email"/);
assert.match(detail, /highlightJson\(jsonSource\(data\)\)/);
assert.match(detail, /code-window science-json-panel/);
assert.doesNotMatch(css, /cursor\s*:\s*url\(/);

console.log("docs-auth-chrome: ok");
