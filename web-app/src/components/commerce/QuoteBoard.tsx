import { useId, useMemo, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ChevronsUpDown, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Notice } from "@/components/ui/notice";
import { SearchField } from "@/components/ui/search-field";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { formatFixed } from "../../lib/format";
import type { BoardRow } from "../../services/api";
import type { ElementItem } from "../../services/elementData";
import { ChangeValue } from "./ChangeValue";
import { panelTableClass } from "./classes";
import {
  elementName,
  filterBoard,
  nextSort,
  sortBoard,
  type BoardSort,
  type SortKey,
} from "./model";

const SKELETON_ROWS = 10;
/** Bid/ask columns are hidden on phones; the ticket shows them for the selected element. */
const WIDE_ONLY = "hidden sm:table-cell";

interface QuoteBoardProps {
  rows: readonly BoardRow[];
  elements: readonly ElementItem[];
  /** True until the first board response. */
  loading: boolean;
  /** True when the last refresh failed (stale rows stay visible). */
  failed: boolean;
  selectedSymbol: string;
  onSelect: (symbol: string) => void;
  onRetry: () => void;
}

/**
 * Dense, sortable quote table for every element: symbol and name, last, ask, bid and
 * 24 h change. A search field filters by symbol or Turkish name; the whole row selects.
 */
export function QuoteBoard({
  rows,
  elements,
  loading,
  failed,
  selectedSymbol,
  onSelect,
  onRetry,
}: QuoteBoardProps) {
  const headingId = useId();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<BoardSort>({ key: "symbol", direction: "asc" });
  const visible = useMemo(
    () => sortBoard(filterBoard(rows, query, elements), sort),
    [rows, query, elements, sort],
  );
  const changeSort = (key: SortKey) => setSort((current) => nextSort(current, key));

  let body: ReactNode;
  if (loading) body = <BoardSkeleton />;
  else if (visible.length === 0)
    body = (
      <EmptyState
        icon={SearchX}
        title={query ? "Aramanıza uyan element yok" : "Fiyatlar bekleniyor"}
        className="m-4"
        actions={
          query && (
            <Button variant="outline" size="sm" onClick={() => setQuery("")}>
              Aramayı temizle
            </Button>
          )
        }
      >
        {query && "Sembolü ya da Türkçe adı deneyin: Fe, demir."}
      </EmptyState>
    );
  else
    body = (
      <QuoteTable
        rows={visible}
        elements={elements}
        sort={sort}
        onSort={changeSort}
        selectedSymbol={selectedSymbol}
        onSelect={onSelect}
      />
    );

  return (
    <section aria-labelledby={headingId} className="panel min-w-0 overflow-hidden">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3.5">
        <div>
          <h2 id={headingId} className="text-base font-semibold text-ink">
            Fiyatlar
          </h2>
          <p className="text-[13px] text-ink-3">
            Kredi / gram · 20 saniyede bir yenilenir
          </p>
        </div>
        <SearchField
          label="Tabloda ara"
          placeholder="Sembol veya ad"
          value={query}
          onValueChange={setQuery}
          resultCount={visible.length}
          formatCount={(count) => `${count} element`}
          className="sm:max-w-64"
        />
      </header>

      {failed && (
        <Notice
          tone="warning"
          className="m-4"
          action={
            <Button variant="outline" size="sm" onClick={onRetry}>
              Yeniden dene
            </Button>
          }
        >
          Fiyatlar güncellenemedi. Bağlantı tekrar deneniyor.
        </Notice>
      )}

      {body}
    </section>
  );
}

interface QuoteTableProps {
  rows: readonly BoardRow[];
  elements: readonly ElementItem[];
  sort: BoardSort;
  onSort: (column: SortKey) => void;
  selectedSymbol: string;
  onSelect: (symbol: string) => void;
}

/** Caps the table's own scroller so the header can stick while the rows scroll. */
const scrollFrameClass =
  "[&_[data-slot=table-container]]:max-h-[26rem] [&_[data-slot=table-container]]:overflow-y-auto lg:[&_[data-slot=table-container]]:max-h-[44rem]";

/** The quote rows in a height-capped scroller with a sticky, sortable header. */
function QuoteTable({
  rows,
  elements,
  sort,
  onSort,
  selectedSymbol,
  onSelect,
}: QuoteTableProps) {
  const head = { sort, onSort };
  return (
    <div className={cn(scrollFrameClass, panelTableClass)}>
      <Table>
        <TableHeader className="sticky top-0 z-10 bg-surface shadow-[inset_0_-1px_0_var(--color-line-strong)] [&_tr]:border-0">
          <TableRow className="hover:bg-transparent">
            <SortableHead column="symbol" {...head}>
              Element
            </SortableHead>
            <SortableHead column="last" {...head} numeric>
              Son fiyat
            </SortableHead>
            <SortableHead column="ask" {...head} numeric className={WIDE_ONLY}>
              Alış
            </SortableHead>
            <SortableHead column="bid" {...head} numeric className={WIDE_ONLY}>
              Satış
            </SortableHead>
            <SortableHead column="change24hPct" {...head} numeric>
              24 sa
            </SortableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const selected = row.symbol.toUpperCase() === selectedSymbol;
            return (
              <TableRow
                key={row.symbol}
                data-state={selected ? "selected" : undefined}
                className="relative"
              >
                <TableCell>
                  {/* The ::after layer stretches the button over the row, so a click anywhere selects it. */}
                  <button
                    type="button"
                    aria-pressed={selected}
                    onClick={() => onSelect(row.symbol)}
                    className="focus-ring flex min-w-0 items-center gap-3 rounded-sm text-left after:absolute after:inset-0"
                  >
                    <span className="w-7 font-mono font-semibold text-ink">
                      {row.symbol}
                    </span>
                    <span className="truncate text-ink-2">
                      {elementName(elements, row.symbol)}
                    </span>
                  </button>
                </TableCell>
                <TableCell className="text-right font-mono text-ink tabular">
                  {formatFixed(row.last, 4)}
                </TableCell>
                <TableCell className={cn(WIDE_ONLY, "text-right font-mono tabular")}>
                  {formatFixed(row.ask, 4)}
                </TableCell>
                <TableCell className={cn(WIDE_ONLY, "text-right font-mono tabular")}>
                  {formatFixed(row.bid, 4)}
                </TableCell>
                <TableCell className="text-right">
                  <ChangeValue value={row.change24hPct} />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

const SORT_ICON = { asc: ArrowUp, desc: ArrowDown, none: ChevronsUpDown } as const;
const ARIA_SORT = { asc: "ascending", desc: "descending", none: "none" } as const;

interface SortableHeadProps {
  column: SortKey;
  sort: BoardSort;
  onSort: (column: SortKey) => void;
  numeric?: boolean;
  className?: string;
  children: string;
}

/** Column header that sorts the board; `aria-sort` tells screen readers the current order. */
function SortableHead({
  column,
  sort,
  onSort,
  numeric = false,
  className,
  children,
}: SortableHeadProps) {
  const state = sort.key === column ? sort.direction : "none";
  const Icon = SORT_ICON[state];
  return (
    <TableHead
      aria-sort={ARIA_SORT[state]}
      className={cn(numeric && "text-right", className)}
    >
      <button
        type="button"
        onClick={() => onSort(column)}
        className={cn(
          "focus-ring -mx-1 inline-flex items-center gap-1 rounded-sm px-1 py-0.5 transition-colors hover:text-ink",
          state !== "none" && "text-ink",
        )}
      >
        {children}
        <Icon
          aria-hidden="true"
          strokeWidth={1.75}
          className={cn("size-3.5", state === "none" && "text-ink-4")}
        />
      </button>
    </TableHead>
  );
}

/** Placeholder rows shaped like the quote table. */
function BoardSkeleton() {
  return (
    <div className="divide-y divide-line px-4">
      {Array.from({ length: SKELETON_ROWS }, (_, index) => (
        <div key={index} className="flex items-center gap-4 py-3">
          <Skeleton className="h-4 w-7" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="ml-auto h-4 w-16" />
          <Skeleton className="hidden h-4 w-16 sm:block" />
          <Skeleton className="hidden h-4 w-16 sm:block" />
          <Skeleton className="h-4 w-14" />
        </div>
      ))}
    </div>
  );
}
