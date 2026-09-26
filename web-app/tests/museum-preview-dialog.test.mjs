import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const ds = readFileSync(join(root, "src/design-system.css"), "utf8");
const explorer = readFileSync(
  join(root, "src/components/PeriodicExplorer.tsx"),
  "utf8",
);

assert.match(explorer, /museum-preview-dialog/);
assert.match(explorer, /sm:max-w-3xl/);
assert.match(ds, /\.museum-preview-dialog\[data-slot="dialog-content"\]/);
assert.match(ds, /max-height:\s*min\(85dvh/);
assert.match(ds, /\.museum-preview-dialog-body[\s\S]*?overflow-y:\s*auto/s);
assert.match(ds, /font-size:\s*15\.5px/);
assert.doesNotMatch(
  ds,
  /museum-preview-dialog[\s\S]{0,200}height:\s*min\(440px/,
  "dialog must not lock to 440px height",
);
assert.doesNotMatch(
  ds,
  /museum-preview-dialog[\s\S]{0,800}-webkit-line-clamp:\s*5/,
  "dialog body must not clamp summary to 5 lines",
);
console.log("museum-preview-dialog ok");
