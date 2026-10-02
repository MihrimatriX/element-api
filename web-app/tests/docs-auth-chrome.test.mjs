import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import {
  API_KEY_ENV,
  playgroundView,
  postSnippet,
  requestSnippets,
  statusTone,
} from "../src/services/apiDocs.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFileSync(join(root, path), "utf8");

/** Loads lib/highlightJson.tsx (JSX) by transpiling it with TypeScript. */
async function loadHighlightJson() {
  const { outputText } = ts.transpileModule(read("src/lib/highlightJson.tsx"), {
    compilerOptions: {
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
  });
  const runtime = import.meta.resolve("react/jsx-runtime");
  const source = outputText.replace('"react/jsx-runtime"', JSON.stringify(runtime));
  return import(`data:text/javascript,${encodeURIComponent(source)}`);
}

describe("API docs logic", () => {
  it("shows a 304 as a note and passes other bodies through", () => {
    assert.deepEqual(playgroundView(304, 'W/"a"', null), {
      status: 304,
      etag: 'W/"a"',
      note: "Gövde yok. If-None-Match aynı kaydı gördü.",
    });
    const body = { symbol: "Fe" };
    assert.equal(playgroundView(200, null, body), body);
  });

  it("builds keyless snippets for the open API", () => {
    const url = "https://example.test/api/v2/elements/fe";
    const samples = requestSnippets(url);
    assert.deepEqual(
      samples.map((sample) => sample.label),
      ["curl", "JavaScript", "Python"],
    );
    for (const sample of samples) {
      assert.ok(sample.code.includes(url));
      assert.ok(!sample.code.includes("X-API-Key"));
    }
  });

  it("reads the v1 key from the environment instead of printing it", () => {
    const [curl, javascript, python] = requestSnippets(
      "https://example.test/api/v1/me/wallet",
      true,
    );
    assert.match(curl.code, new RegExp(`X-API-Key: \\$${API_KEY_ENV}`));
    assert.match(javascript.code, new RegExp(`process\\.env\\.${API_KEY_ENV}`));
    assert.match(python.code, new RegExp(`os\\.environ\\["${API_KEY_ENV}"\\]`));
    const post = postSnippet("https://example.test/api/v1/orders", {
      elementSymbol: "Au",
      quantity: 1,
    });
    assert.match(post, /-X POST/);
    assert.match(post, /'\{"elementSymbol":"Au","quantity":1\}'/);
    assert.match(post, new RegExp(`\\$${API_KEY_ENV}`));
  });

  it("maps HTTP statuses to badge tones", () => {
    assert.equal(statusTone(200), "success");
    assert.equal(statusTone(304), "info");
    assert.equal(statusTone(404), "warning");
    assert.equal(statusTone(500), "destructive");
  });
});

describe("JSON highlighting", () => {
  it("colours tokens with the syntax utilities and escapes markup", async () => {
    const { highlightJson } = await loadHighlightJson();
    const html = renderToStaticMarkup(
      createElement("code", null, highlightJson('{"a": "<b>x</b>", "n": 1.5, "t": null}')),
    );
    assert.match(html, /<span class="text-syntax-key">&quot;a&quot;<\/span>/);
    assert.match(html, /<span class="text-syntax-string">&quot;&lt;b&gt;x&lt;\/b&gt;&quot;<\/span>/);
    assert.match(html, /<span class="text-syntax-number">1.5<\/span>/);
    assert.match(html, /<span class="text-syntax-literal">null<\/span>/);
    assert.ok(!html.includes("<b>"));
  });
});

describe("API pages", () => {
  const docs = read("src/pages/ApiDocs.tsx");
  const developers = read("src/pages/Developers.tsx");
  const developerDir = "src/components/developer/";

  it("keep their SEO and use the shared page header", () => {
    assert.match(docs, /path="\/docs"/);
    assert.match(docs, /"@type": "WebAPI"/);
    assert.match(developers, /path="\/developers"/);
    for (const page of [docs, developers]) assert.match(page, /<PageHeader/);
  });

  it("render code through CodeBlock, not legacy code windows", () => {
    for (const file of ["LiveRequest.tsx", "ApiPlayground.tsx", "ResponsePanel.tsx"]) {
      assert.match(read(developerDir + file), /<CodeBlock/);
    }
    for (const page of [docs, developers]) {
      assert.doesNotMatch(page, /code-window|api-docs-page|api-live|jw-/);
    }
  });

  it("keep the anchors other pages link to", () => {
    assert.match(read(developerDir + "SimulationSection.tsx"), /id="simulation"/);
    assert.match(read(developerDir + "ReferenceSections.tsx"), /id="etag"/);
    assert.match(read(developerDir + "ReferenceSections.tsx"), /id="parameters"/);
    assert.match(docs, /setSimulationOpen\(true\)/);
  });

  it("count playground runs", () => {
    assert.match(read(developerDir + "ApiPlayground.tsx"), /track\("api_example_run"\)/);
    assert.match(read(developerDir + "LiveRequest.tsx"), /track\("api_example_run"\)/);
  });
});
