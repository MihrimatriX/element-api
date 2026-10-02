import type { ComponentProps } from "react";
import { Badge } from "@/components/ui/badge";
import { LinkCard } from "@/components/ui/link-card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  inlineText,
  type GuideInline,
  type GuideTable as GuideTableData,
  type GuideTableRow,
} from "./guide-model";
import { InlineContent } from "./InlineContent";
import { useActiveAnchor, useMediaQuery } from "./hooks";

type BadgeVariant = ComponentProps<typeof Badge>["variant"];

/** Columns whose cells are kinds (HTTP method, message direction) shown as badges. */
const KIND_COLUMNS = new Set(["Yöntem", "Yön"]);

const KIND_TONES: Record<string, BadgeVariant> = {
  GET: "success",
  POST: "info",
  PUT: "warning",
  PATCH: "warning",
  DELETE: "destructive",
  Yayınlar: "default",
  Dinler: "info",
};

/** "GET, OPTIONS" → one badge per kind; unknown kinds ("Tümü", "Tanımlar") stay neutral. */
function KindBadges({ cell }: { cell: GuideInline[] }) {
  return (
    <span className="flex flex-wrap gap-1">
      {inlineText(cell)
        .split(/\s*,\s*/)
        .map((kind) => (
          <Badge key={kind} variant={KIND_TONES[kind] ?? "secondary"} className="font-mono">
            {kind}
          </Badge>
        ))}
    </span>
  );
}

/** Deep-link target props for a row: id, programmatic focus, highlight when it is the URL hash. */
function rowTarget(row: GuideTableRow, activeAnchor: string) {
  return {
    id: row.anchor,
    tabIndex: -1,
    "data-state": row.anchor === activeAnchor ? "selected" : undefined,
  };
}

const rowClass =
  "scroll-mt-24 outline-none data-[state=selected]:bg-brand-soft data-[state=selected]:shadow-[inset_2px_0_0_var(--color-brand-ink)]";

/** Bleeds rows 12px into the gutter so a highlighted row has room around its text. */
const bleedListClass = "-mx-3 border-t border-line [&>*]:px-3";

interface LayoutProps {
  table: GuideTableData;
  activeAnchor: string;
}

/**
 * Two-column tables (function → what it does) as a definition list: name
 * above its description on phones, side by side from `sm`.
 */
function DefinitionRows({ table, activeAnchor }: LayoutProps) {
  return (
    <dl className={bleedListClass}>
      {table.rows.map((row) => (
        <div
          key={row.anchor}
          {...rowTarget(row, activeAnchor)}
          className={cn(
            rowClass,
            "grid gap-1 border-b border-line py-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] sm:gap-6",
          )}
        >
          <dt className="min-w-0 text-[14px] leading-6 text-ink">
            <InlineContent tokens={row.cells[0]} code="plain" />
          </dt>
          <dd className="min-w-0 text-[14px] leading-6 text-ink-2">
            <InlineContent tokens={row.cells[1] ?? []} />
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** A table of guide pages (the overview's "Bölümler"): first cells are page links. */
function isPageIndex(table: GuideTableData): boolean {
  return (
    table.columns.length === 2 &&
    table.rows.some((row) => row.cells[0].length === 1 && row.cells[0][0].type === "link")
  );
}

/** Page index as link cards; a row whose page is not written yet stays a quiet, unlinked card. */
function PageIndex({ table }: { table: GuideTableData }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {table.rows.map((row) => {
        const [link] = row.cells[0];
        const description = inlineText(row.cells[1] ?? []);
        return (
          <li key={row.anchor} id={row.anchor} tabIndex={-1} className="scroll-mt-24 outline-none">
            {link?.type === "link" ? (
              <LinkCard to={link.href} title={link.text} description={description} />
            ) : (
              <div className="h-full rounded-xl border border-dashed border-line-strong p-5">
                <p className="text-base font-semibold text-ink-2">{row.label}</p>
                <p className="mt-1 text-sm leading-6 text-ink-3">{description}</p>
                <p className="mt-3 font-mono text-xs text-ink-3">Sayfa henüz yazılmadı</p>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/** Which leading columns name the row: the kind badge column (if any) and the name after it. */
function nameColumns(table: GuideTableData): { hasKind: boolean; nameCount: number } {
  const hasKind = KIND_COLUMNS.has(table.columns[0]);
  return { hasKind, nameCount: hasKind ? 2 : 1 };
}

/**
 * Wide tables on phones: one block per row with the badge and name on top and
 * the remaining columns as small label/value pairs, so nothing scrolls sideways.
 */
function StackedRows({ table, activeAnchor }: LayoutProps) {
  const { hasKind, nameCount } = nameColumns(table);
  return (
    <ul className={bleedListClass}>
      {table.rows.map((row) => (
        <li key={row.anchor} {...rowTarget(row, activeAnchor)} className={cn(rowClass, "border-b border-line py-3.5")}>
          <div className="flex flex-wrap items-center gap-2 text-[14px] leading-6 text-ink">
            {hasKind && <KindBadges cell={row.cells[0]} />}
            <InlineContent tokens={row.cells[nameCount - 1] ?? []} code="plain" />
          </div>
          <dl className="mt-2 grid grid-cols-[5.5rem_minmax(0,1fr)] gap-x-3 gap-y-1.5 text-[14px] leading-6">
            {table.columns.slice(nameCount).map((column, index) => (
              <div key={column} className="contents">
                <dt className="text-[13px] text-ink-3">{column}</dt>
                <dd className="min-w-0 text-ink-2">
                  <InlineContent tokens={row.cells[nameCount + index] ?? []} />
                </dd>
              </div>
            ))}
          </dl>
        </li>
      ))}
    </ul>
  );
}

/** Wide tables from `md`: the Table frame with badge and name columns. */
function WideTable({ table, activeAnchor }: LayoutProps) {
  const { hasKind, nameCount } = nameColumns(table);
  return (
    <Table className={table.columns.length >= 4 ? "min-w-[42rem]" : "min-w-[32rem]"}>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          {table.columns.map((column) => (
            <TableHead key={column}>{column}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {table.rows.map((row) => (
          <TableRow key={row.anchor} {...rowTarget(row, activeAnchor)} className={rowClass}>
            {row.cells.map((cell, column) => (
              <TableCell
                key={column}
                className={cn(
                  "align-top leading-6 whitespace-normal",
                  column < nameCount && "text-ink",
                  hasKind && column === 0 && "w-px pt-3",
                )}
              >
                {hasKind && column === 0 ? (
                  <KindBadges cell={cell} />
                ) : (
                  <InlineContent tokens={cell} code={column < nameCount ? "plain" : "chip"} />
                )}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

/**
 * A guide table, laid out by shape: a page index becomes link cards, two
 * columns read as a definition list, wider tables are a Table from `md` and
 * stacked blocks on phones. Every row is a deep-link target.
 */
export function GuideTable({ table }: { table: GuideTableData }) {
  const activeAnchor = useActiveAnchor();
  const isWideScreen = useMediaQuery("(min-width: 768px)");
  if (isPageIndex(table)) return <PageIndex table={table} />;
  if (table.columns.length <= 2) return <DefinitionRows table={table} activeAnchor={activeAnchor} />;
  if (!isWideScreen) return <StackedRows table={table} activeAnchor={activeAnchor} />;
  return <WideTable table={table} activeAnchor={activeAnchor} />;
}
