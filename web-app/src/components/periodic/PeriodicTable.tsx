import type { ComponentProps, ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import type { ElementItem } from "@/services/elementData";
import { ExplorerTile } from "./ExplorerTile";
import type { LensReading } from "./lenses";
import { tableCell, tabStopSymbol } from "./model";

const GROUPS = Array.from({ length: 18 }, (_, index) => index + 1);
const PERIODS = Array.from({ length: 7 }, (_, index) => index + 1);

/** f-block rows: the marker cell left in period 6/7 and the label of the detached row below. */
const SERIES = [
  { family: "lanthanide", label: "Lantanitler", range: "57–71", markerRow: 7, row: 10 },
  { family: "actinide", label: "Aktinitler", range: "89–103", markerRow: 8, row: 11 },
] as const;

interface PeriodicTableProps {
  elements: readonly ElementItem[];
  matchingSymbols: ReadonlySet<string>;
  readingOf: (symbol: string) => LensReading;
  valueLabel: string;
  selected: string;
  onOpen: (symbol: string) => void;
  /** Delegated focus, hover and keyboard handlers plus the grid ref (useTileNavigation). */
  gridProps: ComponentProps<"div">;
  /** Selected-element panel, placed in the empty block above the transition metals. */
  panel: ReactNode;
  /** Lens key, placed in the empty cells of period 1. */
  legend: ReactNode;
}

/**
 * The 18-column periodic table with group and period axes and the f-block rows detached below.
 * Non-matching elements stay in place, dimmed, but are skipped by the arrow keys and the Tab stop.
 * Below 59rem it scrolls sideways inside its own frame.
 */
export function PeriodicTable({
  elements,
  matchingSymbols,
  readingOf,
  valueLabel,
  selected,
  onOpen,
  gridProps,
  panel,
  legend,
}: PeriodicTableProps) {
  const tabStop = tabStopSymbol(
    elements.filter((element) => matchingSymbols.has(element.symbol)),
    selected,
  );

  return (
    <div
      role="region"
      tabIndex={0}
      aria-label="Periyodik tablo; dar ekranlarda yatay kaydırın"
      className="focus-ring -mx-4 overflow-x-auto px-4 pt-1 pb-3 sm:mx-0 sm:px-1"
    >
      <div
        {...gridProps}
        className="grid min-w-[59rem] grid-cols-[1.25rem_repeat(18,minmax(0,1fr))] grid-rows-[auto_repeat(7,auto)_1rem_repeat(2,auto)] gap-1"
      >
        {GROUPS.map((group) => (
          <span
            key={`group-${group}`}
            aria-hidden="true"
            style={{ "--column": group + 1 }}
            className="col-start-(--column) row-start-1 pb-1 text-center font-mono text-[11px] text-ink-3 tabular"
          >
            {group}
          </span>
        ))}
        {PERIODS.map((period) => (
          <span
            key={`period-${period}`}
            aria-hidden="true"
            style={{ "--row": period + 1 }}
            className="col-start-1 row-start-(--row) self-center font-mono text-[11px] text-ink-3 tabular"
          >
            {period}
          </span>
        ))}

        {SERIES.map((series) => (
          <SeriesMarker key={series.family} {...series} />
        ))}

        <div className="col-[4/14] row-[2/5] min-w-0">{panel}</div>
        <div className="col-[14/19] row-[2/3] min-w-0 px-1">{legend}</div>

        {elements.map((element) => {
          const cell = tableCell(element);
          return (
            <ExplorerTile
              key={element.symbol}
              element={element}
              reading={readingOf(element.symbol)}
              valueLabel={valueLabel}
              selected={selected === element.symbol}
              tabStop={tabStop === element.symbol}
              dimmed={!matchingSymbols.has(element.symbol)}
              onOpen={onOpen}
              style={{ "--row": cell.row, "--column": cell.column }}
              className="col-start-(--column) row-start-(--row)"
              tileClassName="aspect-square"
            />
          );
        })}
      </div>
    </div>
  );
}

/** Placeholder cell in period 6/7 pointing to its detached row, and that row's label. */
function SeriesMarker({
  family,
  label,
  range,
  markerRow,
  row,
}: (typeof SERIES)[number]) {
  return (
    <>
      <span
        aria-hidden="true"
        style={{ "--row": markerRow, "--family": `var(--color-family-${family})` }}
        className="col-start-4 row-start-(--row) grid place-content-center rounded-md border border-dashed border-[color-mix(in_oklch,var(--family)_45%,transparent)] text-center font-mono text-[11px] leading-4 text-ink-3"
      >
        {range}
      </span>
      <span
        style={{ "--row": row }}
        className="col-[1/4] row-start-(--row) flex items-center justify-end gap-1.5 pr-2 text-[12px] font-medium text-ink-3"
      >
        {label}
        <ArrowRight aria-hidden="true" className="size-3.5" strokeWidth={1.75} />
      </span>
    </>
  );
}
