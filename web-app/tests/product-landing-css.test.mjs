// Landing page contract (/). The file name predates the redesign; it no longer checks CSS.
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  API_SAMPLE_FIELDS,
  API_SAMPLE_PATH,
  API_SAMPLE_RESPONSE,
} from "../src/components/landing/apiSample.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFileSync(join(root, path), "utf8");

const landing = read("src/pages/Landing.tsx");
const landingDir = "src/components/landing";
const sources = [
  landing,
  ...readdirSync(join(root, landingDir)).map((file) => read(`${landingDir}/${file}`)),
].join("\n");

/** Keeps only the dot-path `fields` of `record`, like the v2 `fields` query. */
function project(record, fields) {
  const result = {};
  for (const field of fields) {
    const keys = field.split(".");
    let source = record;
    let target = result;
    keys.forEach((key, index) => {
      assert.ok(source && key in source, `unknown field ${field}`);
      source = source[key];
      if (index === keys.length - 1) target[key] = source;
      else target = target[key] ??= {};
    });
  }
  return result;
}

describe("Landing page", () => {
  it("keeps the slogan, the hero crystal and the WebSite JSON-LD", () => {
    assert.match(sources, /Atomdan bileşiğe\./);
    assert.doesNotMatch(sources, /Hücreden moleküle/);
    assert.match(sources, /elementapi-hero-void-cuprite/);
    assert.match(landing, /"@type": "WebSite"/);
    assert.match(landing, /<main className="container-page/);
  });

  it("reads coverage counts from data instead of hard-coding them", () => {
    assert.match(sources, /data\/coverage\.json/);
    assert.doesNotMatch(sources, /\b(118|167|214)\b/);
  });

  it("uses tokens and building blocks, not legacy classes or dashes", () => {
    assert.doesNotMatch(sources, /product-(landing|hero|orbit|measure|stage|signal|close)/);
    assert.doesNotMatch(sources, /—|–/);
    assert.doesNotMatch(sources, /#[0-9a-f]{3,8}\b|rgba?\(/i);
    assert.match(sources, /<ElementTile/);
    assert.match(sources, /to=\{`\/element\/\$\{/);
  });

  it("shows an API sample that matches the shipped Fe record", () => {
    const snapshot = JSON.parse(
      read("../catalog-service/Element.Services.Element.Infrastructure/Data/scientific-elements.json"),
    );
    const iron = snapshot.find((element) => element.symbol === "Fe");
    assert.equal(API_SAMPLE_PATH, `/api/v2/elements/fe?fields=${API_SAMPLE_FIELDS.join(",")}`);
    assert.deepEqual(project(iron, API_SAMPLE_FIELDS), API_SAMPLE_RESPONSE);
  });
});
