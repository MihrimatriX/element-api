import assert from "node:assert/strict";
import {
  formCompound,
  missTone,
  moveChip,
  syncChipOrder,
} from "../src/services/lab.ts";

assert.ok(formCompound({ H: 2, O: 1 }).ok, "water is a catalogue hit");

const almost = formCompound({ H: 1, O: 1 });
assert.ok(!almost.ok && almost.code === "wrong_ratio");
assert.equal(missTone(almost), "almost");

assert.equal(missTone(formCompound({ He: 1, O: 1 })), "impossible");
assert.equal(missTone(formCompound({})), "empty");

assert.deepEqual(moveChip(["H", "O", "Na"], 0, 2), ["O", "Na", "H"]);
assert.deepEqual(moveChip(["H", "O"], 1, 1), ["H", "O"]);
assert.deepEqual(syncChipOrder(["Na", "H"], { H: 2, O: 1 }), ["H", "O"]);
assert.deepEqual(syncChipOrder(["H", "O"], { H: 1, O: 1 }), ["H", "O"]);

console.log("lab-sandbox-outcome: ok");
