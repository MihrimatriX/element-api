import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFileSync(join(root, path), "utf8");

/** Reference pages and the route each one declares to the Seo component. */
const REFERENCE_PAGES = {
  "src/pages/Compounds.tsx": "/compounds",
  "src/pages/Glossary.tsx": "/sozluk",
  "src/pages/Guide.tsx": "/nasil",
  "src/pages/DataCoverage.tsx": "/data",
};

/** Class names from the retired stylesheets; they render unstyled now. */
const LEGACY_CLASSES =
  /className="[^"]*\b(kicker|science-eyebrow|explorer-heading|explorer-toolbar|atlas-lenses|science-compounds|science-compound-card|guide-page|guide-steps|glossary-row|coverage-facts|void-page|def-card|code-window)\b/;

describe("reference page chrome", () => {
  for (const [file, path] of Object.entries(REFERENCE_PAGES)) {
    const source = read(file);

    it(`${file} uses the shared page frame`, () => {
      assert.match(source, /<main className="container-page pb-24 pt-10 lg:pt-14">/);
      assert.match(source, /<PageHeader\b/, "one h1, from PageHeader");
      assert.doesNotMatch(source, /<h1\b/);
      assert.match(source, new RegExp(`path="${path}"`), "Seo keeps the route path");
    });

    it(`${file} carries no retired class names`, () => {
      assert.doesNotMatch(source, LEGACY_CLASSES);
    });
  }
});

describe("KREDI simulation banner", () => {
  const layout = read("src/components/CommerceLayout.tsx");
  const app = read("src/App.tsx");

  it("says plainly that no real money is involved", () => {
    assert.match(layout, /gerçek para/);
    assert.match(layout, /role="note"/);
  });

  it("wraps every commerce route and the demo tour", () => {
    assert.match(layout, /export function DemoLayout[\s\S]*<DemoBanner \/>/);
    assert.match(layout, /export function CommerceLayout[\s\S]*<DemoBanner \/>/);
    assert.match(app, /<Route element={<DemoLayout \/>}>\s*<Route path="\/demo"/);
    const commerceRoutes = app.match(
      /<Route element={<CommerceLayout \/>}>([\s\S]*?)<\/Route>/,
    )?.[1];
    assert.ok(commerceRoutes, "App.tsx has a CommerceLayout route group");
    for (const path of ["/market", "/shop", "/account"])
      assert.ok(commerceRoutes.includes(`path="${path}"`), `${path} sits inside CommerceLayout`);
  });
});
