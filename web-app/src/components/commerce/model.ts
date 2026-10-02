/**
 * Pure logic shared by the KREDI demo pages (/market, /shop, /account):
 * board sorting and filtering, change formatting, order stages, cart totals
 * and sale checks. No React here so the rules are easy to test.
 */
import type { BoardRow, CartItem, Holding } from "../../services/api.ts";
import { formatGrams, formatNumber } from "../../lib/format.ts";
import { matchesSearch } from "../../lib/text.ts";
import type { ElementItem } from "../../services/elementData.ts";

/** Element lookup by symbol, ignoring case ("AU" from the API finds "Au"). */
export function findElement(
  elements: readonly ElementItem[],
  symbol: string,
): ElementItem | undefined {
  const wanted = symbol.toUpperCase();
  return elements.find((element) => element.symbol.toUpperCase() === wanted);
}

/** Turkish element name for a symbol; the symbol itself when unknown. */
export function elementName(
  elements: readonly ElementItem[],
  symbol: string,
): string {
  return findElement(elements, symbol)?.name ?? symbol;
}

/* ---------- Quote board ---------- */

/** Board columns the quote table can sort by. */
export type SortKey = "symbol" | "last" | "ask" | "bid" | "change24hPct";

/** Active sort column and direction of the quote table. */
export interface BoardSort {
  key: SortKey;
  direction: "asc" | "desc";
}

/** Clicking the active column flips it; a new column starts A→Z for symbols and high→low for numbers. */
export function nextSort(current: BoardSort, key: SortKey): BoardSort {
  if (current.key === key)
    return { key, direction: current.direction === "asc" ? "desc" : "asc" };
  return { key, direction: key === "symbol" ? "asc" : "desc" };
}

/** Sorted copy of the board; a missing 24 h change sorts as the lowest value. */
export function sortBoard(
  rows: readonly BoardRow[],
  { key, direction }: BoardSort,
): BoardRow[] {
  const sign = direction === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    if (key === "symbol") return sign * a.symbol.localeCompare(b.symbol);
    const left = a[key] ?? -Infinity;
    const right = b[key] ?? -Infinity;
    if (left === right) return 0;
    return sign * (left < right ? -1 : 1);
  });
}

/** Board rows whose symbol or Turkish name matches the query ("altin" finds Altın). */
export function filterBoard(
  rows: readonly BoardRow[],
  query: string,
  elements: readonly ElementItem[],
): BoardRow[] {
  return rows.filter((row) =>
    matchesSearch(query, row.symbol, elementName(elements, row.symbol)),
  );
}

/** Direction of a price change. */
export type Trend = "up" | "down" | "flat";

/** Up, down or flat; an unknown change is flat. */
export function trendOf(percent: number | null | undefined): Trend {
  if (percent == null || Number.isNaN(percent) || percent === 0) return "flat";
  return percent > 0 ? "up" : "down";
}

/** Signed Turkish percentage ("+%1,23", "-%0,40"); `—` when unknown. */
export function formatChange(percent: number | null | undefined): string {
  if (percent == null || Number.isNaN(percent)) return "—";
  return formatNumber(percent / 100, {
    style: "percent",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    signDisplay: "exceptZero",
  });
}

/* ---------- Products, holdings and orders ---------- */

/** True for the plain-element product (no compound): `null`, "elemental" or "elemental-au". */
export function isElementalSlug(slug: string | null | undefined): boolean {
  return !slug || slug.startsWith("elemental");
}

/** What a holding or order row shows: formula, parent element and whether it is the pure element. */
export interface ProductInfo {
  symbol: string;
  formula: string;
  elementName: string;
  elemental: boolean;
}

/**
 * Display fields for a holding or order. The API sends upper-case symbols and labels like
 * "NaCl · NA", so the formula comes from `compoundFormula` or the label's first segment.
 */
export function describeProduct(
  elements: readonly ElementItem[],
  product: {
    symbol: string;
    compoundSlug?: string | null;
    compoundFormula?: string | null;
    productLabel?: string | null;
  },
): ProductInfo {
  const element = findElement(elements, product.symbol);
  const symbol = element?.symbol ?? product.symbol;
  const elemental =
    !product.compoundFormula && isElementalSlug(product.compoundSlug);
  const formula = elemental
    ? symbol
    : (product.compoundFormula ?? product.productLabel?.split(" · ")[0] ?? symbol);
  return { symbol, formula, elementName: element?.name ?? symbol, elemental };
}

/** Value at the bid (grams × bid × product multiplier); `null` when the bid or multiplier is unknown. */
export function holdingValue(
  holding: { grams: number; multiplier: number | null },
  bid: number | undefined,
): number | null {
  if (bid == null || holding.multiplier == null) return null;
  return holding.grams * bid * holding.multiplier;
}

/** Why a sale cannot go through, or `null` when it can. */
export function saleProblem(
  grams: number,
  holding: Pick<Holding, "grams"> | undefined,
): string | null {
  if (!holding) return "Bu ürün kasanda yok.";
  if (!Number.isFinite(grams) || grams <= 0) return "Gram girin.";
  if (grams > holding.grams)
    return `Kasanda en fazla ${formatGrams(holding.grams, 4)} var.`;
  return null;
}

/** Order statuses of the happy path, in saga order. */
export const ORDER_FLOW = [
  "Submitted",
  "StockReserved",
  "Shipping",
  "Completed",
] as const;

/** True when the saga stopped and rolled back (stock and credit returned). */
export function isOrderCancelled(status: string): boolean {
  return status === "Failed" || status === "Compensated";
}

/** How many saga steps are done: 1 just after submit … 4 when delivered, 0 when cancelled or unknown. */
export function orderProgress(status: string): number {
  return ORDER_FLOW.indexOf(status as (typeof ORDER_FLOW)[number]) + 1;
}

/** Badge tone of an order status. */
export function orderTone(status: string): "success" | "destructive" | "info" {
  if (status === "Completed") return "success";
  if (isOrderCancelled(status)) return "destructive";
  return "info";
}

/* ---------- Cart ---------- */

/** Live price and stock the shop knows for one element. */
export interface Quote {
  ask: number;
  stock: number;
}

/**
 * Ask and stock for a symbol from the board. Without a board row the element counts as
 * unpriced (ask 0, stock 0) so nothing can be added or checked out.
 */
export function quoteFor(
  board: readonly BoardRow[],
  elements: readonly ElementItem[],
  symbol: string,
): Quote {
  const row = board.find(
    (candidate) => candidate.symbol.toUpperCase() === symbol.toUpperCase(),
  );
  if (!row) return { ask: 0, stock: 0 };
  return {
    ask: row.ask,
    stock: row.availableStock ?? findElement(elements, symbol)?.availableStock ?? 0,
  };
}

/** One priced cart row. */
export interface CartLine {
  item: CartItem;
  element: ElementItem;
  unitAsk: number;
  lineTotal: number;
  stock: number;
}

/** Priced cart: lines for known elements, the subtotal and whether any element is over its stock. */
export interface CartSummary {
  lines: CartLine[];
  subtotal: number;
  overStock: boolean;
}

/** Prices every cart line at ask × product multiplier and checks summed grams per element against stock. */
export function summarizeCart(
  cart: readonly CartItem[],
  elements: readonly ElementItem[],
  quoteOf: (symbol: string) => Quote,
): CartSummary {
  const lines: CartLine[] = [];
  for (const item of cart) {
    const element = findElement(elements, item.symbol);
    if (!element) continue;
    const { ask, stock } = quoteOf(item.symbol);
    const unitAsk = ask * (item.priceMult || 1);
    lines.push({ item, element, unitAsk, lineTotal: unitAsk * item.qty, stock });
  }

  const gramsBySymbol = new Map<string, number>();
  for (const line of lines) {
    const symbol = line.item.symbol.toUpperCase();
    gramsBySymbol.set(symbol, (gramsBySymbol.get(symbol) ?? 0) + line.item.qty);
  }

  return {
    lines,
    subtotal: lines.reduce((sum, line) => sum + line.lineTotal, 0),
    overStock: lines.some(
      (line) => (gramsBySymbol.get(line.item.symbol.toUpperCase()) ?? 0) > line.stock,
    ),
  };
}

/* ---------- Account ---------- */

/** The server's masked form of an API key (`first 13 chars...last 4`), to match a stored key to its list row. */
export function maskApiKey(key: string): string {
  return `${key.slice(0, 13)}...${key.slice(-4)}`;
}

/** Why a webhook URL is rejected before sending, or `null` when it looks usable. */
export function webhookUrlProblem(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return "Adres girin.";
  try {
    if (new URL(trimmed).protocol !== "https:") return "Adres https:// ile başlamalı.";
  } catch {
    return "Geçerli bir adres girin: https://ornek.com/kanca";
  }
  return null;
}
