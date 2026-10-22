import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

// The feedback page stores consent and events in localStorage; a Map stands in for it.
const store = new Map();
globalThis.window = globalThis;
globalThis.localStorage = {
  getItem: (key) => (store.has(key) ? store.get(key) : null),
  setItem: (key, value) => store.set(key, String(value)),
  removeItem: (key) => store.delete(key),
};
const { DIAGNOSTICS_CONSENT, diagnosticEvents, setDiagnostics, track } =
  await import("../src/services/diagnostics.ts");

describe("feedback diagnostics", () => {
  it("records nothing until the visitor opts in", () => {
    store.clear();
    track("lesson_completed", "salts");
    assert.deepEqual(diagnosticEvents(), []);
  });

  it("records events after consent and deletes them when consent is withdrawn", () => {
    store.clear();
    assert.equal(setDiagnostics(true), true);
    assert.equal(store.get(DIAGNOSTICS_CONSENT), "true");
    track("discovery_completed", "h2o");
    track("lesson_completed", "salts");
    assert.deepEqual(
      diagnosticEvents().map((entry) => entry.event),
      ["discovery_completed", "lesson_completed"],
    );
    assert.equal(setDiagnostics(false), true);
    assert.deepEqual(diagnosticEvents(), []);
  });

  it("never stores free text such as an e-mail address as the item", () => {
    store.clear();
    setDiagnostics(true);
    track("record_opened", "someone@example.com");
    assert.equal(diagnosticEvents()[0].item, undefined);
  });
});

describe("feedback page contract", () => {
  const page = readFileSync(join(root, "src/pages/Feedback.tsx"), "utf8");

  it("is a private page built on the design system", () => {
    assert.match(page, /path="\/feedback"/);
    assert.match(page, /noIndex/);
    assert.match(page, /<PageHeader/);
  });

  it("keeps notes local: no network call, only a JSON download", () => {
    assert.doesNotMatch(page, /fetch\(|accountRequest|authService/);
    assert.match(page, /downloadJson\(EXPORT_FILE_NAME/);
    assert.match(page, /"elementapi-deneyim-notlari\.json"/);
    assert.match(page, /setDiagnostics/);
  });
});
