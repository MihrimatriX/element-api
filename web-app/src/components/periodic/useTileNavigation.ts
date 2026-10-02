import { useRef, type FocusEvent, type KeyboardEvent, type PointerEvent } from "react";
import { useNavigate } from "react-router-dom";
import { STATIC_ELEMENTS, type ElementItem } from "@/services/elementData";
import { cardNeighbour, isArrowKey, tableNeighbour, type ExplorerView } from "./model";

interface TileNavigationOptions {
  view: ExplorerView;
  /** Elements that pass the current filter, in atomic-number order. */
  matches: readonly ElementItem[];
  /** Called when a tile gets focus or the mouse moves onto it. */
  onSelect: (symbol: string) => void;
}

function tileSymbol(target: EventTarget): string | undefined {
  return target instanceof Element
    ? target.closest<HTMLElement>("[data-symbol]")?.dataset.symbol
    : undefined;
}

/**
 * Keyboard and pointer behaviour shared by the table and card views, delegated from the
 * grid container so ElementTile stays a plain building block:
 * focus or mouse hover selects a tile, arrow keys move between matching tiles and
 * Enter opens the full record through the router (Space and click open the preview).
 */
export function useTileNavigation({ view, matches, onSelect }: TileNavigationOptions) {
  const navigate = useNavigate();
  const gridRef = useRef<HTMLDivElement>(null);

  function focusTile(symbol: string) {
    gridRef.current
      ?.querySelector<HTMLElement>(`[data-symbol="${symbol}"]`)
      ?.focus();
  }

  function cardColumns(): number {
    const grid = gridRef.current;
    if (!grid) return 1;
    return getComputedStyle(grid).gridTemplateColumns.split(" ").length;
  }

  const gridProps = {
    ref: gridRef,
    onFocus(event: FocusEvent<HTMLDivElement>) {
      const symbol = tileSymbol(event.target);
      if (symbol) onSelect(symbol);
    },
    onPointerOver(event: PointerEvent<HTMLDivElement>) {
      if (event.pointerType !== "mouse") return;
      const symbol = tileSymbol(event.target);
      if (symbol) onSelect(symbol);
    },
    onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
      const symbol = tileSymbol(event.target);
      if (!symbol) return;

      if (event.key === "Enter") {
        event.preventDefault();
        navigate(`/element/${symbol.toLowerCase()}`);
        return;
      }
      const from = STATIC_ELEMENTS.find((element) => element.symbol === symbol);
      if (!from || !isArrowKey(event.key)) return;

      event.preventDefault();
      const next =
        view === "table"
          ? tableNeighbour(matches, from, event.key)
          : cardNeighbour(matches, from, event.key, cardColumns());
      if (next) focusTile(next.symbol);
    },
  };

  return { gridProps, focusTile };
}
