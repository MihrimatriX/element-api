/**
 * Turns every docs/kilavuz/*.md page into src/data/guide.json for the in-app
 * system guide (/kilavuz). All pages share one template, so a small
 * hand-written parser covers them; there is no markdown dependency.
 *
 * Supported markdown:
 * - `# Title` (once), then `> summary` and a facts table before the first `##`
 * - `## Section`; inside a section `### \`path\`` starts a code-map file that
 *   takes its first paragraph (the one-line purpose) and the tables after it;
 *   any other block closes the file and belongs to the section
 * - paragraphs, `-` / `1.` lists (one nested level), GFM tables (`\|` is a
 *   literal pipe), fenced code (mermaid stays code)
 * - inline: `code`, **bold** (may hold code), [label](page.md#anchor) and
 *   [label](https://…). Links to pages that do not exist (yet) become text.
 *
 * Anything that breaks the template throws with file:line, so the build fails
 * loudly instead of shipping a half-rendered page.
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const docsDirectory = fileURLToPath(new URL("../../docs/kilavuz/", import.meta.url));
const outputFile = fileURLToPath(new URL("../src/data/guide.json", import.meta.url));

/** README.md is the overview and lives at the guide root. */
const OVERVIEW_FILE = "README.md";
const GUIDE_ROOT = "/kilavuz";

/** Columns whose first cell is a kind (GET, Yayınlar), so the row label also needs the next cell. */
const KIND_COLUMNS = new Set(["Yöntem", "Yön"]);

const FENCE = /^```\s*([\w-]*)\s*$/;
const HEADING = /^(#{1,6})\s+(.*)$/;
const LIST_ITEM = /^(\s*)([-*]|\d+\.)\s+(.*)$/;
const TABLE_SEPARATOR = /^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?\s*$/;
const INLINE = /`([^`]+)`|\*\*(.+?)\*\*|\[([^\]]+)\]\(([^)\s]+)\)/g;

/** URL-safe, Turkish-folded anchor: "Kod haritası" → "kod-haritasi", "src/db/pool.ts" → "src-db-pool-ts". */
function slugify(text) {
  return text
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Route of a guide page: the overview is the guide root, every other page is /kilavuz/<slug>. */
function pagePath(file) {
  return file === OVERVIEW_FILE ? GUIDE_ROOT : `${GUIDE_ROOT}/${slugOf(file)}`;
}

function slugOf(file) {
  return file.replace(/\.md$/, "").toLowerCase();
}

/**
 * Splits a GFM table row on unescaped pipes. `\|` becomes a literal pipe in the
 * cell (GFM applies this inside code spans too), and the outer pipes are dropped.
 */
export function splitTableRow(line) {
  const cells = [];
  let current = "";
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === "\\" && line[index + 1] === "|") {
      current += "|";
      index += 1;
    } else if (char === "|") {
      cells.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current);
  if (line.trimStart().startsWith("|")) cells.shift();
  if (/(^|[^\\])\|\s*$/.test(line)) cells.pop();
  return cells.map((cell) => cell.trim());
}

/**
 * Parses inline markdown into tokens: text, code, strong (with nested code) and
 * link. `resolveLink` maps an href to an app href, or null to keep only the label.
 */
export function parseInline(text, resolveLink = () => null) {
  const tokens = [];
  const pushText = (value) => {
    if (!value) return;
    const last = tokens.at(-1);
    if (last?.type === "text") last.text += value;
    else tokens.push({ type: "text", text: value });
  };

  let cursor = 0;
  for (const match of text.matchAll(INLINE)) {
    pushText(text.slice(cursor, match.index));
    const [, code, strong, label, href] = match;
    if (code !== undefined) {
      tokens.push({ type: "code", text: code });
    } else if (strong !== undefined) {
      tokens.push({ type: "strong", content: parseInline(strong, resolveLink) });
    } else {
      const target = resolveLink(href);
      if (target) tokens.push({ type: "link", text: label, href: target });
      else pushText(label);
    }
    cursor = match.index + match[0].length;
  }
  pushText(text.slice(cursor));
  return tokens;
}

/** Plain text of inline tokens (search labels, anchors, SEO descriptions). */
export function inlineText(tokens) {
  return tokens
    .map((token) => (token.type === "strong" ? inlineText(token.content) : token.text))
    .join("");
}

/**
 * Link resolver for one guide: other guide pages become app routes (keeping
 * their #anchor), http(s) URLs stay, anything else (repo-relative files,
 * pages not written yet) is dropped to plain text.
 */
function linkResolver(knownFiles) {
  return (href) => {
    if (/^https?:\/\//.test(href)) return href;
    const page = href.match(/^(?:\.\/)?([\w-]+\.md)(#[\w-]+)?$/);
    if (!page || !knownFiles.has(page[1])) return null;
    return pagePath(page[1]) + (page[2] ?? "");
  };
}

function isTableStart(lines, index) {
  return lines[index].trimStart().startsWith("|") && TABLE_SEPARATOR.test(lines[index + 1] ?? "");
}

function isBlockStart(lines, index) {
  const line = lines[index];
  return (
    HEADING.test(line) ||
    FENCE.test(line) ||
    line.startsWith(">") ||
    LIST_ITEM.test(line) ||
    isTableStart(lines, index)
  );
}

/**
 * Parses one guide page. `knownFiles` lists the guide's .md files so links to
 * missing pages degrade to text. Returns
 * `{ slug, path, file, title, summary, facts, sections }`.
 */
export function parseGuidePage(markdown, file, knownFiles = new Set([file])) {
  const lines = markdown.replace(/\r\n?/g, "\n").split("\n");
  const inline = (text) => parseInline(text, linkResolver(knownFiles));
  const usedAnchors = new Set();
  const page = {
    slug: slugOf(file),
    path: pagePath(file),
    file,
    title: "",
    summary: [],
    facts: [],
    sections: [],
  };
  let section = null;
  let codeFile = null;
  let index = 0;
  // First line of the block being read, so errors point at where it starts.
  let blockStart = 0;

  const fail = (message) => {
    throw new Error(`${file}:${blockStart + 1}: ${message}`);
  };

  /** Unique within the page: a repeated anchor gets -2, -3, … */
  const uniqueAnchor = (text) => {
    const base = slugify(text) || "bolum";
    let anchor = base;
    for (let count = 2; usedAnchors.has(anchor); count += 1) anchor = `${base}-${count}`;
    usedAnchors.add(anchor);
    return anchor;
  };

  /**
   * Adds a block to the open section. A code-map file takes its first paragraph
   * (the purpose) and its tables; any other block closes the file and belongs
   * to the section again (e.g. a "Veri dosyaları: …" note after the last file).
   */
  const pushBlock = (block) => {
    if (!section) fail("metin ilk ## başlığından önce; yalnız > özet ve özellik tablosu olabilir");
    if (codeFile) {
      if (block.type === "paragraph" && codeFile.summary.length === 0 && codeFile.tables.length === 0) {
        codeFile.summary = block.content;
        return;
      }
      if (block.type === "table") {
        codeFile.tables.push(block);
        return;
      }
      codeFile = null;
    }
    section.blocks.push(block);
  };

  const readTable = () => {
    const columns = splitTableRow(lines[index]);
    index += 2;
    const rows = [];
    while (index < lines.length && lines[index].trimStart().startsWith("|")) {
      rows.push(splitTableRow(lines[index]));
      index += 1;
    }
    return { columns, rows };
  };

  const readList = () => {
    const ordered = /\d/.test(lines[index].match(LIST_ITEM)[2]);
    const items = [];
    while (index < lines.length && lines[index].trim()) {
      const item = lines[index].match(LIST_ITEM);
      const parent = items.at(-1);
      if (item && item[1].length >= 2 && parent) {
        parent.children.push(item[3]);
      } else if (item) {
        items.push({ text: item[3], children: [] });
      } else if (parent && /^\s+/.test(lines[index])) {
        // An indented line continues the previous item (or its last child).
        if (parent.children.length > 0) parent.children.push(`${parent.children.pop()} ${lines[index].trim()}`);
        else parent.text += ` ${lines[index].trim()}`;
      } else {
        break;
      }
      index += 1;
    }
    return {
      type: "list",
      ordered,
      items: items.map((item) => ({
        content: inline(item.text),
        ...(item.children.length > 0 && {
          items: item.children.map((child) => ({ content: inline(child) })),
        }),
      })),
    };
  };

  while (index < lines.length) {
    const line = lines[index];

    if (!line.trim() || /^\s*-{3,}\s*$/.test(line)) {
      index += 1;
      continue;
    }
    blockStart = index;

    const fence = line.match(FENCE);
    if (fence) {
      const code = [];
      index += 1;
      while (index < lines.length && !/^```\s*$/.test(lines[index])) code.push(lines[index++]);
      if (index >= lines.length) fail("kapanmamış kod bloğu");
      index += 1;
      pushBlock({ type: "code", language: fence[1] || "text", code: code.join("\n") });
      continue;
    }

    const heading = line.match(HEADING);
    if (heading) {
      const [, hashes, text] = heading;
      if (hashes.length === 1) {
        if (page.title) fail("ikinci # başlık");
        page.title = text.trim();
      } else if (hashes.length === 2) {
        const title = text.trim();
        section = { heading: title, anchor: uniqueAnchor(title), blocks: [] };
        page.sections.push(section);
        codeFile = null;
      } else if (hashes.length === 3) {
        if (!section) fail("### başlık bir ## bölümün içinde olmalı");
        const path = text.replace(/`/g, "").trim();
        codeFile = { type: "file", path, anchor: uniqueAnchor(path), summary: [], tables: [] };
        section.blocks.push(codeFile);
      } else {
        fail("#### ve daha küçük başlıklar desteklenmiyor");
      }
      index += 1;
      continue;
    }

    if (line.startsWith(">")) {
      const quote = [];
      while (index < lines.length && lines[index].startsWith(">")) {
        quote.push(lines[index++].replace(/^>\s?/, ""));
      }
      const content = inline(quote.join(" ").trim());
      if (!section && page.summary.length === 0) page.summary = content;
      else pushBlock({ type: "paragraph", content });
      continue;
    }

    if (isTableStart(lines, index)) {
      const { columns, rows } = readTable();
      if (!section && page.facts.length === 0) {
        page.facts = rows.map(([key, value = ""]) => ({ key, value: inline(value) }));
        continue;
      }
      const parentAnchor = codeFile?.anchor ?? section?.anchor ?? "";
      pushBlock({
        type: "table",
        columns,
        rows: rows.map((cells) => {
          const label = inlineText(
            inline(KIND_COLUMNS.has(columns[0]) ? `${cells[0]} ${cells[1] ?? ""}` : cells[0]),
          );
          return { anchor: uniqueAnchor(`${parentAnchor} ${label}`), label, cells: cells.map(inline) };
        }),
      });
      continue;
    }

    if (LIST_ITEM.test(line)) {
      pushBlock(readList());
      continue;
    }

    const paragraph = [];
    while (index < lines.length && lines[index].trim() && (paragraph.length === 0 || !isBlockStart(lines, index))) {
      paragraph.push(lines[index++].trim());
    }
    pushBlock({ type: "paragraph", content: inline(paragraph.join(" ")) });
  }

  if (!page.title) throw new Error(`${file}: # başlık yok`);
  return page;
}

/** Parses every .md file in `directory`: the overview first, then the rest by file name. */
export function buildGuide(directory = docsDirectory) {
  const files = readdirSync(directory)
    .filter((name) => name.endsWith(".md"))
    .sort((left, right) => {
      if (left === OVERVIEW_FILE) return -1;
      if (right === OVERVIEW_FILE) return 1;
      return left.localeCompare(right);
    });
  const knownFiles = new Set(files);
  return files.map((file) =>
    parseGuidePage(readFileSync(join(directory, file), "utf8"), file, knownFiles),
  );
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  if (!existsSync(docsDirectory)) throw new Error(`Kılavuz klasörü yok: ${docsDirectory}`);
  // Compact on purpose: the page fetches this file as a static asset.
  writeFileSync(outputFile, `${JSON.stringify(buildGuide())}\n`);
}
