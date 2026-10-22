import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const about = readFileSync(join(root, "src/pages/About.tsx"), "utf8");

describe("About page (/hakkinda)", () => {
  it("is built on the design system and keeps its SEO path", () => {
    assert.match(about, /<PageHeader/);
    assert.match(about, /<Section/);
    assert.match(about, /path="\/hakkinda"/);
    assert.doesNotMatch(about, /about-card|void-panel|explainer|className="kicker"/);
  });

  it("links every place the page explains", () => {
    for (const route of [
      "/nasil",
      "/data",
      "/developers",
      "/docs",
      "/sozluk",
      "/demo",
      "/kilavuz",
      "/lab?lesson=everyday",
    ]) {
      assert.ok(about.includes(`"${route}"`), `About must link ${route}`);
    }
  });

  it("states the honest limits and reads counts from coverage.json", () => {
    assert.match(about, /simülasyon/);
    assert.match(about, /gerçek para değil/);
    assert.match(about, /data\/coverage\.json/);
    assert.doesNotMatch(about, /github\.com/i);
  });
});
