import { ElementTile } from "@/components/ui/element-tile";
import { cn } from "@/lib/utils";
import type { ElementItem } from "../../services/elementData";
import { familyOf, findElement } from "./model";

interface ElementPickerProps {
  /** Symbols offered as tiles. */
  symbols: readonly string[];
  elements: readonly ElementItem[];
  /** Upper-case symbol of the active filter, or `null` for all products. */
  value: string | null;
  onValueChange: (symbol: string | null) => void;
}

/** "Tümü" plus one element tile per symbol; each is a toggle (`aria-pressed`) that filters the catalogue. */
export function ElementPicker({ symbols, elements, value, onValueChange }: ElementPickerProps) {
  return (
    <div role="group" aria-label="Element" className="flex flex-wrap gap-2">
      <button
        type="button"
        aria-pressed={value === null}
        onClick={() => onValueChange(null)}
        className={cn(
          "focus-ring grid aspect-square w-14 place-items-center rounded-md border border-line bg-surface-2 text-[13px] font-medium text-ink-2 transition-[background-color,border-color,transform] duration-150 hover:border-line-strong hover:text-ink active:scale-[0.97]",
          value === null && "border-brand-ink bg-brand-soft text-ink shadow-glow",
        )}
      >
        Tümü
      </button>
      {symbols.map((symbol) => {
        const element = findElement(elements, symbol);
        if (!element) return null;
        return (
          <ElementTile
            key={element.symbol}
            symbol={element.symbol}
            atomicNumber={element.atomicNumber}
            name={element.name}
            family={familyOf(element.category)}
            label={element.name}
            selected={value === element.symbol.toUpperCase()}
            onClick={() => onValueChange(element.symbol)}
            className="w-14"
          />
        );
      })}
    </div>
  );
}
