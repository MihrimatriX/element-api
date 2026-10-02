import { useLayoutEffect, useRef, type CSSProperties } from "react";
import { ElementTile } from "@/components/ui/element-tile";
import { cn } from "@/lib/utils";
import type { ElementItem } from "@/services/elementData";
import type { LensReading } from "./lenses";
import { familyOf } from "./model";

/*
 * On family and lens tints ElementTile's ink-3 atomic number falls below 4.5:1 at 10px, so
 * explorer tiles lift it to ink-2. The scroll margin keeps a focused tile clear of the sticky
 * site header (3.5rem) and, from `xl`, of the sticky explorer toolbar (bottom edge ≈ 12rem).
 */
const explorerTileClass = "[--color-ink-3:var(--color-ink-2)] scroll-mt-18 xl:scroll-mt-52";

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
  /** Name of the value under the current lens, read with the tile ("Atom kütlesi: 55,85"). */
  valueLabel: string;
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

/** One explorer cell: an ElementTile painted by the active lens; click or Space opens the preview. */
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
  const wrapperRef = useRef<HTMLDivElement>(null);
  const paint = reading.missing ? undefined : reading.paint;
  const filterNote = dimmed ? ", filtreye uymuyor" : "";

  // ElementTile takes no tabIndex, so the roving tab stop is set on the tile it renders.
  useLayoutEffect(() => {
    const tile = wrapperRef.current?.firstElementChild;
    if (tile instanceof HTMLElement) tile.tabIndex = tabStop ? 0 : -1;
  }, [tabStop]);

  return (
    <div
      ref={wrapperRef}
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
        label={`${element.name}, ${element.symbol}, atom numarası ${element.atomicNumber}, ${valueLabel}: ${reading.value}${filterNote}; önizle`}
        className={cn("w-full", explorerTileClass, paint && lensPaintClass, tileClassName)}
      />
    </div>
  );
}
