import { cn } from "@/lib/utils";
import type { ElementItem } from "@/services/elementData";

interface ElementSpecimenProps {
  element: ElementItem;
  /** Formatted atomic mass; omitted while loading. */
  mass?: string;
  className?: string;
}

/**
 * Large decorative cell for the selected element (number, symbol, mass) tinted with the
 * `--family` colour set by its parent. Hidden from assistive tech: the same facts are text beside it.
 */
export function ElementSpecimen({ element, mass, className }: ElementSpecimenProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "relative flex aspect-square flex-col justify-between overflow-hidden rounded-lg border border-line bg-[color-mix(in_oklch,var(--family)_18%,var(--color-surface))] p-3 text-ink shadow-xs before:absolute before:inset-x-0 before:top-0 before:h-1 before:bg-(--family)",
        className,
      )}
    >
      <span className="font-mono text-xs leading-none text-ink-2 tabular">
        {element.atomicNumber}
      </span>
      <span className="font-mono text-5xl leading-none font-semibold tracking-tight">
        {element.symbol}
      </span>
      <span className="truncate font-mono text-xs leading-none text-ink-2 tabular">
        {mass ?? "—"}
      </span>
    </div>
  );
}
