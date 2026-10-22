import { useId } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatFixed } from "../../lib/format";
import type { BoardRow } from "../../services/api";
import { ChangeValue } from "./ChangeValue";

const PLACEHOLDER_CHIPS = 8;

interface MoversStripProps {
  rows: readonly BoardRow[];
  selectedSymbol: string;
  onSelect: (symbol: string) => void;
}

/** Horizontally scrolling strip of the biggest 24 h movers; each chip selects its element on the board. */
export function MoversStrip({ rows, selectedSymbol, onSelect }: MoversStripProps) {
  const labelId = useId();
  return (
    <div className="min-w-0">
      <p id={labelId} className="eyebrow mb-3">
        24 saatte en çok hareket edenler
      </p>
      <div
        role="group"
        aria-labelledby={labelId}
        className="-mx-1 flex gap-2 overflow-x-auto pt-0.5 pr-12 pb-2 pl-1 [mask-image:linear-gradient(to_right,black_calc(100%-3rem),transparent)]"
      >
        {rows.length === 0
          ? Array.from({ length: PLACEHOLDER_CHIPS }, (_, index) => (
              <Skeleton key={index} className="h-9 w-36 shrink-0" />
            ))
          : rows.map((row) => (
              <button
                key={row.symbol}
                type="button"
                aria-pressed={row.symbol.toUpperCase() === selectedSymbol}
                onClick={() => onSelect(row.symbol)}
                className="focus-ring inline-flex h-9 shrink-0 items-center gap-2.5 rounded-md border border-line bg-surface px-3 text-[13px] transition-[background-color,border-color,transform] duration-150 hover:border-line-strong hover:bg-surface-2 active:scale-[0.98] aria-pressed:border-brand-line aria-pressed:bg-brand-soft"
              >
                <span className="font-mono font-semibold text-ink">{row.symbol}</span>
                <span className="font-mono text-ink-2 tabular">
                  {formatFixed(row.last, 2)}
                </span>
                <ChangeValue value={row.change24hPct} />
              </button>
            ))}
      </div>
    </div>
  );
}
