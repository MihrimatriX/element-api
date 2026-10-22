import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  backupData,
  parseBackup,
} from "../src/components/notebook/backup.ts";
import { mergeLearning, normalizeLearning } from "../src/services/lessons.ts";

const everyday = ["h2o", "co2", "nh3"];

describe("notebook progress", () => {
  it("drops unknown compounds and routes whose compounds are not all found", () => {
    assert.deepEqual(
      normalizeLearning({
        discoveries: [...everyday, "not-a-compound", "nacl"],
        lessons: ["everyday", "salts", "nope"],
      }),
      { discoveries: [...everyday, "nacl"], lessons: ["everyday"] },
    );
    assert.deepEqual(normalizeLearning("garbage"), {
      discoveries: [],
      lessons: [],
    });
  });

  it("merges two devices into their union", () => {
    const merged = mergeLearning(
      { discoveries: ["h2o", "co2"], lessons: [] },
      { discoveries: ["co2", "nh3"], lessons: ["everyday"] },
    );
    assert.deepEqual(new Set(merged.discoveries), new Set(everyday));
    assert.deepEqual(merged.lessons, ["everyday"]);
  });
});

describe("notebook backup file", () => {
  it("round-trips through the version 1 format", () => {
    const progress = { discoveries: everyday, lessons: ["everyday"] };
    const text = JSON.stringify(backupData(progress));
    assert.equal(JSON.parse(text).version, 1);
    assert.deepEqual(parseBackup(text), progress);
  });

  it("rejects anything that is not a version 1 notebook backup", () => {
    for (const text of [
      "not json",
      "null",
      "[]",
      JSON.stringify({ version: 2, discoveries: [], lessons: [] }),
      JSON.stringify({ version: 1, discoveries: "h2o", lessons: [] }),
      JSON.stringify({ version: 1, discoveries: [] }),
    ])
      assert.equal(parseBackup(text), null, text);
  });
});
