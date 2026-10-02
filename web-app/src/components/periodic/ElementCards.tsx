import type { ComponentProps } from "react";
import type { ElementItem } from "@/services/elementData";
import { ExplorerTile } from "./ExplorerTile";
import type { LensReading } from "./lenses";
import { tabStopSymbol } from "./model";

interface ElementCardsProps {
  /** Matching elements only, in atomic-number order. */
  elements: readonly ElementItem[];
  readingOf: (symbol: string) => LensReading;
  /** Name of the value under a value lens; absent under the family lens. */
  valueLabel?: string;
  selected: string;
  onOpen: (symbol: string) => void;
  /** Delegated focus, hover and keyboard handlers plus the grid ref (useTileNavigation). */
  gridProps: ComponentProps<"div">;
}

/**
 * Card view: matching elements as large tiles in a wrapping grid (four across on a phone),
 * big enough to show each name. The mobile default.
 */
export function ElementCards({
  elements,
  readingOf,
  valueLabel,
  selected,
  onOpen,
  gridProps,
}: ElementCardsProps) {
  const tabStop = tabStopSymbol(elements, selected);

  return (
    <div
      {...gridProps}
      role="group"
      aria-label="Element kartları"
      className="grid grid-cols-[repeat(auto-fill,minmax(5.25rem,1fr))] gap-1.5"
    >
      {elements.map((element) => (
        <ExplorerTile
          key={element.symbol}
          element={element}
          reading={readingOf(element.symbol)}
          valueLabel={valueLabel}
          selected={selected === element.symbol}
          tabStop={tabStop === element.symbol}
          onOpen={onOpen}
        />
      ))}
    </div>
  );
}
