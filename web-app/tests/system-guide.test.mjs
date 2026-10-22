import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildGuide,
  inlineText,
  parseGuidePage,
  parseInline,
  splitTableRow,
} from "../scripts/write-guide.mjs";
import {
  buildGuideSearchIndex,
  groupGuidePages,
  searchGuide,
  splitGuideTitle,
} from "../src/components/system-guide/guide-model.ts";

const SAMPLE = `# Örnek servis (sample-service)

> Örnek \`kod\` içeren özet.

| Özellik | Değer |
|---|---|
| Port | \`5003\` |

## Ne işe yarar?

İlk paragraf **kalın \`kod\`** ve [sipariş](order.md#kod-haritasi) ile [eksik](web-app.md).

1. Birinci adım
2. İkinci adım

- Dosya:
  - alt madde

## Uç noktalar

| Yöntem | Yol | Ne yapar |
|---|---|---|
| GET | \`/health\` | \`{ a \\| b }\` döner. |
| POST, PUT | \`/health\` | Yazar. |

## Kod haritası

### \`src/index.ts\`
Giriş noktası.

| Fonksiyon | Ne yapar |
|---|---|
| \`main()\` | Başlatır. |
| \`main()\` | Aynı adla ikinci satır. |

### \`src/meta.ts\`
Sabitler (fonksiyon yok).

Veri dosyaları bölüme aittir.

## Testler

\`\`\`bash
# bu bir yorum, başlık değil
npm test
\`\`\`
`;

const parse = () => parseGuidePage(SAMPLE, "sample.md", new Set(["sample.md", "order.md", "README.md"]));
const sectionOf = (page, heading) => page.sections.find((section) => section.heading === heading);

describe("system guide parser", () => {
  it("splits table rows on unescaped pipes only", () => {
    assert.deepEqual(splitTableRow("| a | `x \\| y` | c |"), ["a", "`x | y`", "c"]);
    assert.deepEqual(splitTableRow("| bir | iki |"), ["bir", "iki"]);
    assert.deepEqual(splitTableRow("| son \\|"), ["son |"]);
  });

  it("keeps inline code, nested bold and resolvable links", () => {
    const tokens = parseInline("a `b` **c `d`** [e](https://x.test)", () => null);
    assert.deepEqual(tokens, [
      { type: "text", text: "a " },
      { type: "code", text: "b" },
      { type: "text", text: " " },
      { type: "strong", content: [{ type: "text", text: "c " }, { type: "code", text: "d" }] },
      { type: "text", text: " e" },
    ]);
    assert.equal(inlineText(tokens), "a b c d e");
  });

  it("reads title, summary, facts and section anchors", () => {
    const page = parse();
    assert.equal(page.slug, "sample");
    assert.equal(page.path, "/kilavuz/sample");
    assert.equal(page.title, "Örnek servis (sample-service)");
    assert.equal(inlineText(page.summary), "Örnek kod içeren özet.");
    assert.deepEqual(page.facts, [{ key: "Port", value: [{ type: "code", text: "5003" }] }]);
    assert.deepEqual(
      page.sections.map((section) => section.anchor),
      ["ne-ise-yarar", "uc-noktalar", "kod-haritasi", "testler"],
    );
  });

  it("links to existing guide pages and drops links to missing ones", () => {
    const [paragraph] = sectionOf(parse(), "Ne işe yarar?").blocks;
    const links = paragraph.content.filter((token) => token.type === "link");
    assert.deepEqual(links, [{ type: "link", text: "sipariş", href: "/kilavuz/order#kod-haritasi" }]);
    assert.match(inlineText(paragraph.content), /ile eksik\.$/);
  });

  it("parses ordered and nested lists", () => {
    const [, steps, bullets] = sectionOf(parse(), "Ne işe yarar?").blocks;
    assert.equal(steps.ordered, true);
    assert.equal(steps.items.length, 2);
    assert.equal(bullets.ordered, false);
    assert.equal(inlineText(bullets.items[0].items[0].content), "alt madde");
  });

  it("parses tables with escaped pipes and labelled, unique row anchors", () => {
    const [table] = sectionOf(parse(), "Uç noktalar").blocks;
    assert.deepEqual(table.columns, ["Yöntem", "Yol", "Ne yapar"]);
    assert.deepEqual(table.rows[0].cells[2][0], { type: "code", text: "{ a | b }" });
    assert.equal(table.rows[0].label, "GET /health");
    assert.equal(table.rows[0].anchor, "uc-noktalar-get-health");
    assert.equal(table.rows[1].anchor, "uc-noktalar-post-put-health");
  });

  it("groups code-map files with their purpose and tables; other blocks go back to the section", () => {
    const blocks = sectionOf(parse(), "Kod haritası").blocks;
    assert.deepEqual(
      blocks.map((block) => block.type),
      ["file", "file", "paragraph"],
    );
    const [index, meta] = blocks;
    assert.equal(index.path, "src/index.ts");
    assert.equal(index.anchor, "src-index-ts");
    assert.equal(inlineText(index.summary), "Giriş noktası.");
    assert.deepEqual(
      index.tables[0].rows.map((row) => row.anchor),
      ["src-index-ts-main", "src-index-ts-main-2"],
    );
    assert.equal(meta.tables.length, 0);
  });

  it("keeps fenced code (including # lines) as code", () => {
    const [code] = sectionOf(parse(), "Testler").blocks;
    assert.deepEqual(code, { type: "code", language: "bash", code: "# bu bir yorum, başlık değil\nnpm test" });
  });

  it("rejects text before the first section with file and line", () => {
    assert.throws(
      () => parseGuidePage("# Başlık\n\n> Özet\n\nSerbest paragraf.\n", "bad.md"),
      /bad\.md:5:/,
    );
  });
});

describe("docs/kilavuz", () => {
  const pages = buildGuide();

  it("parses every page, overview first at the guide root", () => {
    assert.ok(pages.length >= 13, `${pages.length} sayfa`);
    assert.equal(pages[0].file, "README.md");
    assert.equal(pages[0].path, "/kilavuz");
    for (const page of pages) assert.ok(page.title, `${page.file} başlıksız`);
  });

  it("gives every service page a summary, facts and a code map whose files explain themselves", () => {
    for (const page of pages.slice(1)) {
      assert.ok(inlineText(page.summary).length > 20, `${page.file}: özet yok`);
      assert.ok(page.facts.length >= 4, `${page.file}: özellik tablosu eksik`);
      const codeMap = page.sections.find((section) => section.anchor === "kod-haritasi");
      const files = codeMap?.blocks.filter((block) => block.type === "file") ?? [];
      assert.ok(files.length > 0, `${page.file}: kod haritası yok`);
      for (const file of files) assert.ok(file.summary.length > 0, `${page.file}: ${file.path} amaçsız`);
    }
  });

  it("uses unique anchors on every page", () => {
    for (const page of pages) {
      const anchors = page.sections.flatMap((section) => [
        section.anchor,
        ...section.blocks.flatMap((block) => {
          if (block.type === "table") return block.rows.map((row) => row.anchor);
          if (block.type !== "file") return [];
          return [block.anchor, ...block.tables.flatMap((table) => table.rows.map((row) => row.anchor))];
        }),
      ]);
      assert.equal(new Set(anchors).size, anchors.length, `${page.file}: tekrarlanan bağlantı`);
    }
  });

  it("groups pages for the sidebar and finds functions across pages", () => {
    const { overview, groups } = groupGuidePages(pages);
    assert.equal(overview, pages[0]);
    const grouped = groups.flatMap((group) => group.pages);
    assert.equal(grouped.length, pages.length - 1, "her sayfa bir grupta");
    assert.deepEqual(splitGuideTitle("Sipariş servisi (order-service)"), {
      name: "Sipariş servisi",
      tag: "order-service",
    });

    const { results } = searchGuide(buildGuideSearchIndex(pages), "createOrderWithSaga");
    assert.equal(results[0].name, "createOrderWithSaga(order)");
    assert.equal(results[0].href, "/kilavuz/order#src-db-orders-ts-createorderwithsaga-order");
    assert.equal(searchGuide(buildGuideSearchIndex(pages), "   ").total, 0);
  });
});
