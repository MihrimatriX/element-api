import type { ElementFamily } from "@/components/ui/element-tile";
import { foldTurkish, matchesSearch } from "../../lib/text.ts";
import { categoryLabels, type ElementItem } from "../../services/elementData.ts";

/** The two explorer layouts: the 18-column table or a wrapping grid of cards. */
export type ExplorerView = "table" | "cards";

/** Family filter keys in legend order. */
export const FAMILIES = Object.keys(categoryLabels) as ElementFamily[];

/**
 * Explorer filter: the element is in one of the selected families (none selected = all) and
 * every search word appears in its symbol, Turkish name, atomic number or English name.
 */
export function elementMatches(
  element: ElementItem,
  query: string,
  families: readonly string[],
  englishName?: string,
): boolean {
  if (families.length > 0 && !families.includes(element.category)) return false;
  return matchesSearch(
    query,
    element.symbol,
    element.name,
    String(element.atomicNumber),
    englishName,
  );
}

/**
 * Element that Enter in the search box opens: an exact symbol, Turkish name or atomic
 * number wins ("c" → carbon, not calcium); otherwise the first match.
 */
export function bestMatch(
  query: string,
  matches: readonly ElementItem[],
): ElementItem | undefined {
  const folded = foldTurkish(query);
  const exact = matches.find(
    (element) =>
      foldTurkish(element.symbol) === folded ||
      foldTurkish(element.name) === folded ||
      String(element.atomicNumber) === folded,
  );
  return exact ?? matches[0];
}

/**
 * CSS grid cell of an element in the explorer table. Grid row 1 holds group numbers and grid
 * column 1 period numbers, so everything shifts by one; grid row 9 is the gap above the f-block.
 */
export function tableCell(element: ElementItem): { row: number; column: number } {
  return {
    row: element.row >= 8 ? element.row + 2 : element.row + 1,
    column: element.col + 1,
  };
}

/**
 * The one tile of a grid that Tab lands on (roving tab stop), so the whole grid is a single
 * Tab stop and arrow keys move inside it: the selected element when it passes the filter,
 * otherwise the first match.
 */
export function tabStopSymbol(
  matches: readonly ElementItem[],
  selected: string,
): string | undefined {
  return matches.some((element) => element.symbol === selected) ? selected : matches[0]?.symbol;
}

const ARROW_KEYS = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"];

/** True for the four arrow keys the tile grids handle. */
export function isArrowKey(key: string): boolean {
  return ARROW_KEYS.includes(key);
}

/**
 * Nearest element in the table from `from` in the arrow's direction: same row for left/right,
 * same column for up/down. Only `candidates` (the current matches) are reachable.
 */
export function tableNeighbour(
  candidates: readonly ElementItem[],
  from: ElementItem,
  key: string,
): ElementItem | undefined {
  const horizontal = key === "ArrowLeft" || key === "ArrowRight";
  const direction = key === "ArrowLeft" || key === "ArrowUp" ? -1 : 1;
  const offset = (element: ElementItem) =>
    horizontal ? element.col - from.col : element.row - from.row;
  const inLine = (element: ElementItem) =>
    horizontal ? element.row === from.row : element.col === from.col;

  return candidates
    .filter((element) => inLine(element) && offset(element) * direction > 0)
    .sort((a, b) => Math.abs(offset(a)) - Math.abs(offset(b)))[0];
}

/**
 * Neighbour in the card grid (atomic-number order, `columns` cards per row): left/right step
 * one card, up/down one row. Stays put at the edges.
 */
export function cardNeighbour(
  cards: readonly ElementItem[],
  from: ElementItem,
  key: string,
  columns: number,
): ElementItem | undefined {
  const index = cards.indexOf(from);
  const steps: Record<string, number> = {
    ArrowLeft: -1,
    ArrowRight: 1,
    ArrowUp: -columns,
    ArrowDown: columns,
  };
  return cards[index + (steps[key] ?? 0)];
}
