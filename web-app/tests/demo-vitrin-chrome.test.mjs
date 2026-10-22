import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

// Source contracts for the KREDI demo pages: honest demo framing, the routes other
// pages and the sitemap rely on, and SEO/privacy props. Behaviour lives in commerce-model.test.mjs.
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFileSync(join(root, path), "utf8");
const pages = Object.fromEntries(
  ["Demo", "Market", "Shop", "Account"].map((name) => [name, read(`src/pages/${name}.tsx`)]),
);

describe("demo showcase page", () => {
  const demo = pages.Demo;

  it("says plainly that this is a virtual-credit showcase", () => {
    assert.match(demo, /eyebrow="Demo"/);
    assert.match(demo, /role="note"/);
    assert.match(demo, /Mağaza, sepet ve kasa buradaki DEMO parçalarıdır/);
    assert.match(demo, /Bu vitrin değişebilir\. Atlas ve laboratuvar buradan bağımsızdır\./);
    assert.match(demo, /ticaret servisleri kapalı/, "explains the accounts-disabled build");
  });

  it("links into the market, the shop, the simulation docs and back to the notebook", () => {
    for (const route of ["/market", "/shop", "/docs#simulation", "/collection"])
      assert.ok(demo.includes(`to="${route}"`), `missing link to ${route}`);
    assert.match(demo, /<SagaSteps \/>/, "shows the order saga diagram");
  });
});

describe("commerce pages", () => {
  it("render on the shared page shell with one PageHeader", () => {
    for (const [name, source] of Object.entries(pages)) {
      assert.match(source, /className="container-page pb-24 pt-10 lg:pt-14"/, name);
      assert.match(source, /<PageHeader/, name);
      assert.doesNotMatch(source, /<h1/, `${name}: the h1 comes from PageHeader`);
    }
  });

  it("keep their SEO paths, and the account page stays out of search", () => {
    assert.match(pages.Demo, /path="\/demo"/);
    assert.match(pages.Market, /path="\/market"/);
    assert.match(pages.Shop, /path="\/shop"/);
    assert.match(pages.Account, /path="\/account"\s+noIndex/);
  });

  it("use no legacy CSS classes or inline styles", () => {
    const legacy =
      /className="[^"]*\b(btn|panel-header|panel-body|desk-|quote-|tape|shop-|cart-row|status-badge|learning-card|void-|science-|demo-frame)/;
    for (const [name, source] of Object.entries(pages)) {
      assert.doesNotMatch(source, legacy, name);
      assert.doesNotMatch(source, /style=\{\{/, name);
    }
  });
});
