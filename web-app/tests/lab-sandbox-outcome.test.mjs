import assert from "node:assert/strict";
import {
  formCompound,
  mixOutcome,
  moveChip,
  syncChipOrder,
} from "../src/services/lab.ts";

const hit = formCompound({ H: 2, O: 1 });
assert.equal(mixOutcome(hit), "hit");

const almost = formCompound({ H: 1, O: 1 });
assert.equal(mixOutcome(almost), "almost");
assert.ok(!almost.ok && almost.code === "wrong_ratio");

const impossible = formCompound({ He: 1, O: 1 });
assert.equal(mixOutcome(impossible), "impossible");

const empty = formCompound({});
assert.equal(mixOutcome(empty), "empty");

assert.deepEqual(moveChip(["H", "O", "Na"], 0, 2), ["O", "Na", "H"]);
assert.deepEqual(moveChip(["H", "O"], 1, 1), ["H", "O"]);
assert.deepEqual(syncChipOrder(["Na", "H"], { H: 2, O: 1 }), ["H", "O"]);
assert.deepEqual(syncChipOrder(["H", "O"], { H: 1, O: 1 }), ["H", "O"]);

console.log("lab-sandbox-outcome: ok");
