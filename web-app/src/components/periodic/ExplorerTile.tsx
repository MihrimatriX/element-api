import type { CSSProperties } from "react";
import { ElementTile } from "@/components/ui/element-tile";
import { cn } from "@/lib/utils";
import type { ElementItem } from "@/services/elementData";
import type { LensReading } from "./lenses";
import { familyOf } from "./model";

/*
 * ElementTile tints itself from an inline `--family` colour. A heat or phase lens repaints the
 * tile through `--lens-edge` / `--lens-fill`, set on the wrapper; `!` (important) is the only
 * way to beat the inline custom property.
 */
const lensPaintClass = "[--family:var(--lens-edge)]! bg-(--lens-fill)!";

interface ExplorerTileProps {
  element: ElementItem;
  reading: LensReading;
  /** Name of the value under the current lens, read with the tile ("Atom kütlesi: 55,85"). */
  valueLabel: string;
  selected: boolean;
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
  dimmed = false,
  onOpen,
  className,
  style,
  tileClassName,
}: ExplorerTileProps) {
  const paint = reading.missing ? undefined : reading.paint;
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
        label={`${element.name}, ${element.symbol}, atom numarası ${element.atomicNumber}, ${valueLabel}: ${reading.value}; önizle`}
        className={cn("w-full", paint && lensPaintClass, tileClassName)}
      />
    </div>
  );
}
