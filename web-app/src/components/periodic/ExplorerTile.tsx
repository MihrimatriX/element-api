import type { CSSProperties } from "react";
import { ElementTile } from "@/components/ui/element-tile";
import { cn } from "@/lib/utils";
import { familyOf, type ElementItem } from "@/services/elementData";
import type { LensReading } from "./lenses";

/*
 * From `xl` the explorer toolbar sticks below the header (bottom edge ≈ 12rem). The page's
 * scroll padding already keeps 4.5rem clear for the header; this margin adds the rest, so a
 * focused tile stops below the toolbar.
 */
const scrollMarginClass = "xl:scroll-mt-34";

/*
 * ElementTile tints itself from an inline `--family` colour. A heat or phase lens repaints the
 * tile through `--lens-edge` / `--lens-fill`, set on the wrapper; `!` (important) is the only
 * way to beat the inline custom property. The fill stays a light tint for legible text, so the
 * full-strength lens colour is carried by a thicker top edge.
 */
const lensPaintClass =
  "[--family:var(--lens-edge)]! bg-(--lens-fill)! before:h-1 before:opacity-100";

interface ExplorerTileProps {
  element: ElementItem;
  reading: LensReading;
  /** Name of the value a value lens prints, read with the tile ("Atom kütlesi: 55,85"). */
  valueLabel?: string;
  selected: boolean;
  /** The grid's single Tab stop (roving tabindex); arrow keys reach the other tiles. */
  tabStop: boolean;
  /** Filtered out but kept in place: faded, and its name says so. */
  dimmed?: boolean;
  onOpen: (symbol: string) => void;
  /** Wrapper placement (grid cell in the table). */
  className?: string;
  /** Wrapper custom properties (grid row/column in the table). */
  style?: CSSProperties;
  /** Extra classes for the tile itself (e.g. square in the dense table). */
  tileClassName?: string;
}

/**
 * One explorer cell: an ElementTile painted by the active lens. Click or Space opens the preview;
 * Enter opens the full record (handled by the grid), and the tile's name says both.
 */
export function ExplorerTile({
  element,
  reading,
  valueLabel,
  selected,
  tabStop,
  dimmed = false,
  onOpen,
  className,
  style,
  tileClassName,
}: ExplorerTileProps) {
  const paint = reading.missing ? undefined : reading.paint;
  const valueNote = valueLabel ? `, ${valueLabel}: ${reading.value}` : "";
  const filterNote = dimmed ? ", filtreye uymuyor" : "";

  return (
    <div
      className={cn("min-w-0", className)}
      style={{ ...style, "--lens-edge": paint?.edge, "--lens-fill": paint?.fill }}
    >
      <ElementTile
        symbol={element.symbol}
        atomicNumber={element.atomicNumber}
        name={element.name}
        family={familyOf(element.category)}
        value={reading.value}
        selected={selected}
        dimmed={dimmed}
        missing={reading.missing}
        onClick={() => onOpen(element.symbol)}
        tabIndex={tabStop ? 0 : -1}
        label={`${element.name}, ${element.symbol}, atom numarası ${element.atomicNumber}${valueNote}${filterNote}; önizle, Enter ile kaydı aç`}
        className={cn(
          "w-full",
          scrollMarginClass,
          paint && lensPaintClass,
          tileClassName,
        )}
      />
    </div>
  );
}
