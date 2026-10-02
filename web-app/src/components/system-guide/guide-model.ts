import { foldTurkish } from "../../lib/text.ts";

/**
 * Shapes of `src/data/guide.json`, written by `scripts/write-guide.mjs` from
 * `docs/kilavuz/*.md`, plus the pure helpers the /kilavuz page needs
 * (sidebar grouping, title split, cross-page search). No React here, so the
 * node tests can import it directly.
 */

/** Inline markdown token: plain text, `code`, **bold** (may hold code) or a link. */
export type GuideInline =
  | { type: "text"; text: string }
  | { type: "code"; text: string }
  | { type: "strong"; content: GuideInline[] }
  | { type: "link"; text: string; href: string };

/** One table row; `anchor` is its deep-link id, `label` its plain-text name (search, links). */
export interface GuideTableRow {
  anchor: string;
  label: string;
  cells: GuideInline[][];
}

/** A markdown table: header cells and the rows below them. */
export interface GuideTable {
  type: "table";
  columns: string[];
  rows: GuideTableRow[];
}

/** One bullet or numbered item, with its nested list if it has one. */
export interface GuideListItem {
  content: GuideInline[];
  items?: GuideListItem[];
}

/** A code-map file: `### \`path\``, its one-line purpose and its function tables. */
export interface GuideFile {
  type: "file";
  path: string;
  anchor: string;
  summary: GuideInline[];
  tables: GuideTable[];
}

/** One block of a section, in document order. */
export type GuideBlock =
  | { type: "paragraph"; content: GuideInline[] }
  | { type: "list"; ordered: boolean; items: GuideListItem[] }
  | { type: "code"; language: string; code: string }
  | GuideTable
  | GuideFile;

/** A `##` section of a page; `anchor` is its deep-link id. */
export interface GuideSection {
  heading: string;
  anchor: string;
  blocks: GuideBlock[];
}

/** One `docs/kilavuz/*.md` page. `path` is its route (`/kilavuz` for the overview). */
export interface GuidePage {
  slug: string;
  path: string;
  file: string;
  title: string;
  summary: GuideInline[];
  facts: { key: string; value: GuideInline[] }[];
  sections: GuideSection[];
}

/** Route of the overview page (docs/kilavuz/README.md). */
export const GUIDE_ROOT = "/kilavuz";

/** Sidebar groups in reading order; slugs without a page (e.g. web-app not written yet) are skipped. */
export const GUIDE_GROUPS: readonly { label: string; slugs: readonly string[] }[] = [
  { label: "Kapı ve ortak", slugs: ["gateway", "shared-lib"] },
  { label: "Bilim", slugs: ["science", "catalog", "compound"] },
  { label: "Hesap", slugs: ["identity"] },
  { label: "Ticaret demosu", slugs: ["order", "wallet", "inventory", "shipment", "notification"] },
  { label: "Altyapı", slugs: ["altyapi"] },
  { label: "Arayüz", slugs: ["web-app"] },
];

/** A sidebar group with its pages resolved. */
export interface GuideNavGroup {
  label: string;
  pages: GuidePage[];
}

/** Overview page plus the sidebar groups; pages missing from GUIDE_GROUPS land in "Diğer". */
export function groupGuidePages(pages: readonly GuidePage[]): {
  overview: GuidePage | undefined;
  groups: GuideNavGroup[];
} {
  const bySlug = new Map(pages.map((page) => [page.slug, page]));
  const overview = pages.find((page) => page.path === GUIDE_ROOT);
  const groups = GUIDE_GROUPS.map((group) => ({
    label: group.label,
    pages: group.slugs.flatMap((slug) => bySlug.get(slug) ?? []),
  }));
  const grouped = new Set(GUIDE_GROUPS.flatMap((group) => group.slugs));
  const others = pages.filter((page) => page !== overview && !grouped.has(page.slug));
  groups.push({ label: "Diğer", pages: others });
  return { overview, groups: groups.filter((group) => group.pages.length > 0) };
}

/** "Sipariş servisi (order-service)" → name "Sipariş servisi", tag "order-service". */
export function splitGuideTitle(title: string): { name: string; tag?: string } {
  const match = title.match(/^(.*?)\s*\(([^)]+)\)$/);
  return match ? { name: match[1], tag: match[2] } : { name: title };
}

/** Plain text of inline tokens. */
export function inlineText(tokens: readonly GuideInline[]): string {
  return tokens
    .map((token) => (token.type === "strong" ? inlineText(token.content) : token.text))
    .join("");
}

/** One searchable thing: a code-map file or a table row (function, endpoint, message, setting). */
export interface GuideSearchEntry {
  /** Deep link: `/kilavuz/order#src-routes-orders-ts-post`. */
  href: string;
  name: string;
  description: string;
  /** "Sipariş servisi · src/routes/orders.ts" */
  location: string;
  nameKey: string;
  textKey: string;
}

function rowEntry(page: GuidePage, row: GuideTableRow, where: string): GuideSearchEntry {
  const cells = row.cells.map(inlineText);
  return {
    href: `${page.path}#${row.anchor}`,
    name: row.label,
    description: cells.at(-1) ?? "",
    location: `${splitGuideTitle(page.title).name} · ${where}`,
    nameKey: foldTurkish(row.label),
    textKey: foldTurkish(`${cells.join(" ")} ${where}`),
  };
}

/** Flattens every page into search entries: code-map files, their rows and every section table row. */
export function buildGuideSearchIndex(pages: readonly GuidePage[]): GuideSearchEntry[] {
  return pages.flatMap((page) =>
    page.sections.flatMap((section) =>
      section.blocks.flatMap((block): GuideSearchEntry[] => {
        if (block.type === "table") return block.rows.map((row) => rowEntry(page, row, section.heading));
        if (block.type !== "file") return [];
        const summary = inlineText(block.summary);
        const fileEntry: GuideSearchEntry = {
          href: `${page.path}#${block.anchor}`,
          name: block.path,
          description: summary,
          location: `${splitGuideTitle(page.title).name} · ${section.heading}`,
          nameKey: foldTurkish(block.path),
          textKey: foldTurkish(`${block.path} ${summary}`),
        };
        const rows = block.tables.flatMap((table) =>
          table.rows.map((row) => rowEntry(page, row, block.path)),
        );
        return [fileEntry, ...rows];
      }),
    ),
  );
}

/**
 * Entries whose text holds every query word (Turkish-folded), best first:
 * the whole query inside the name, then every word in the name, then the rest.
 * Order within a rank follows the guide.
 */
export function searchGuide(
  index: readonly GuideSearchEntry[],
  query: string,
  limit = 60,
): { total: number; results: GuideSearchEntry[] } {
  const folded = foldTurkish(query);
  const words = folded.split(/\s+/).filter(Boolean);
  if (words.length === 0) return { total: 0, results: [] };

  const rank = (entry: GuideSearchEntry) => {
    if (entry.nameKey.includes(folded)) return 0;
    return words.every((word) => entry.nameKey.includes(word)) ? 1 : 2;
  };
  const matches = index
    .filter((entry) => words.every((word) => entry.textKey.includes(word)))
    .map((entry) => ({ entry, rank: rank(entry) }))
    .sort((left, right) => left.rank - right.rank);
  return { total: matches.length, results: matches.slice(0, limit).map((match) => match.entry) };
}
