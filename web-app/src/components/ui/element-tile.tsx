import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

/** Periodic-table family; matches the `--color-family-*` tokens and `ElementItem.category`. */
export type ElementFamily =
  | "alkali"
  | "alkaline"
  | "transition"
  | "post"
  | "metalloid"
  | "nonmetal"
  | "halogen"
  | "noble"
  | "lanthanide"
  | "actinide"
  | "unknown";

interface ElementTileProps {
  symbol: string;
  atomicNumber: number;
  name: string;
  family: ElementFamily;
  /** Extra line (atomic mass, lens value); the tile becomes 4:5 instead of square to fit it. */
  value?: ReactNode;
  /**
   * Highlighted with the cuprite ring (current element, focused pick, toggled on). Visual only,
   * except on a link, where it sets `aria-current`.
   */
  selected?: boolean;
  /**
   * Toggle state of a button tile (`aria-pressed`). Set it only when a click switches the tile on
   * or off; a highlight that just follows focus or hover is not a toggle and leaves it out.
   */
  pressed?: boolean;
  /** Faded out (filtered away but kept in place). */
  dimmed?: boolean;
  /** Hatched: the active lens has no value for this element. */
  missing?: boolean;
  /** Renders a router link. */
  to?: string;
  /** Renders a button, a toggle when `pressed` is set. Ignored when `to` is set. */
  onClick?: () => void;
  /** Accessible name override; by default number, symbol, name and value are read. */
  label?: string;
  className?: string;
}

const tileClass =
  "@container group relative flex min-w-0 overflow-hidden rounded-md border border-line bg-[color-mix(in_oklch,var(--family)_14%,var(--color-surface))] text-ink transition-[background-color,border-color,box-shadow,opacity,transform] duration-150 before:absolute before:inset-x-0 before:top-0 before:h-0.5 before:bg-(--family) before:opacity-80";

const interactiveClass =
  "focus-ring hover:border-line-strong hover:bg-[color-mix(in_oklch,var(--family)_22%,var(--color-surface))] active:scale-[0.97]";

/**
 * Periodic-table cell: atomic number, symbol, name and an optional value, tinted
 * with its family colour. Text scales with the tile (container query units) and
 * the name hides visually on very small tiles. Carries `data-symbol` for tests.
 */
export function ElementTile({
  symbol,
  atomicNumber,
  name,
  family,
  value,
  selected = false,
  pressed,
  dimmed = false,
  missing = false,
  to,
  onClick,
  label,
  className,
}: ElementTileProps) {
  const interactive = Boolean(to || onClick);
  const shared = {
    "data-symbol": symbol,
    "data-family": family,
    "aria-label": label,
    style: { "--family": `var(--color-family-${family})` },
    className: cn(
      tileClass,
      value === undefined ? "aspect-square" : "aspect-[4/5]",
      interactive && interactiveClass,
      selected && "z-10 border-brand-ink shadow-glow",
      dimmed && "opacity-35 hover:opacity-80",
      missing &&
        "bg-[repeating-linear-gradient(135deg,var(--color-surface)_0_5px,var(--color-surface-2)_5px_6px)] before:opacity-30",
      className,
    ),
  };

  const content = (
    <span className="flex w-full flex-col justify-between gap-[3cqi] p-[9cqi] text-left">
      <span className="font-mono text-[max(10px,14cqi)] leading-none text-ink-3 tabular">
        {atomicNumber}
      </span>
      <span className="font-mono text-[max(15px,32cqi)] leading-none font-semibold tracking-tight">
        {symbol}
      </span>
      <span className="sr-only truncate text-[max(10px,12.5cqi)] leading-[1.15] text-ink-2 @[4.5rem]:not-sr-only">
        {name}
      </span>
      {value !== undefined && (
        <span className="truncate font-mono text-[max(10px,11.5cqi)] leading-[1.15] text-ink-2 tabular">
          {value}
        </span>
      )}
    </span>
  );

  if (to)
    return (
      <Link
        to={to}
        aria-current={selected ? "true" : undefined}
        {...shared}
      >
        {content}
      </Link>
    );
  if (onClick)
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={pressed}
        {...shared}
      >
        {content}
      </button>
    );
  return <div {...shared}>{content}</div>;
}
