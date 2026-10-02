import { config } from "../config.js";
import { ELEMENTAL_SLUG, roundToFourDecimals } from "../compoundPrice.js";
import { fetchJson } from "../http.js";

/** Market quote for one element in KREDI per gram, plus the grams available to sell. */
export interface TickerQuote {
  last: number;
  bid: number;
  ask: number;
  spreadPct: number;
  availableStock: number;
}

/** The product an order buys: a compound of the element (or the pure element) and its price multiplier. */
export interface CompoundQuote {
  slug: string;
  formula: string;
  priceMult: number;
}

/** Builds bid/ask around a last price with the default spread; availableStock 0 means "unknown, do not sell". */
function quotesFromLast(last: number): TickerQuote {
  const spreadPct = config.defaultSpreadPct;
  return {
    last,
    bid: roundToFourDecimals(last * (1 - spreadPct)),
    ask: roundToFourDecimals(last * (1 + spreadPct)),
    spreadPct,
    availableStock: 0,
  };
}

/**
 * Fetches the live quote for an element from catalog-service and the sellable grams from inventory-service.
 * Returns null when catalog has no positive last price, so the order is refused instead of priced from stale data.
 */
export async function resolveTicker(
  symbol: string,
): Promise<TickerQuote | null> {
  const encodedSymbol = encodeURIComponent(symbol);
  const ticker = await fetchJson(
    `${config.catalogServiceUrl}/api/v1/elements/${encodedSymbol}/ticker`,
  );
  if (!ticker) return null;

  // Field names are accepted in camelCase and PascalCase.
  const last = Number(ticker.last ?? ticker.Last ?? 0);
  const ask = Number(ticker.ask ?? ticker.Ask ?? 0);
  const bid = Number(ticker.bid ?? ticker.Bid ?? 0);
  if (!(last > 0)) return null;
  if (!(ask > 0)) return quotesFromLast(last);

  const inventoryStock = await resolveAvailableStock(symbol);
  const catalogStock = Number(
    ticker.availableStock ?? ticker.AvailableStock ?? 0,
  );
  return {
    last,
    bid: bid || quotesFromLast(last).bid,
    ask,
    spreadPct: Number(
      ticker.spreadPct ?? ticker.SpreadPct ?? config.defaultSpreadPct,
    ),
    availableStock: inventoryStock ?? catalogStock,
  };
}

/** Sellable grams from inventory-service, or null when it cannot answer (the catalog figure is used instead). */
async function resolveAvailableStock(symbol: string): Promise<number | null> {
  const stock = await fetchJson(
    `${config.inventoryServiceUrl}/api/v1/stock/${encodeURIComponent(symbol)}`,
  );
  if (!stock) return null;
  const availableGrams = Number(stock.availableGrams);
  return Number.isFinite(availableGrams) ? availableGrams : null;
}

/** True when a slug names the pure element: "elemental", the bare symbol ("fe") or "elemental-fe". */
function isPureElementSlug(slug: string, upperSymbol: string): boolean {
  const lowerSymbol = upperSymbol.toLowerCase();
  return (
    slug === ELEMENTAL_SLUG ||
    slug.toLowerCase() === lowerSymbol ||
    slug === `elemental-${lowerSymbol}`
  );
}

/**
 * Resolves the product an order buys and its price multiplier. A missing or pure-element slug means
 * the element itself (priceMult 1), so POST /orders without compoundSlug stays valid.
 * Returns null when compound-service does not know the slug, the compound names no parent element or another one,
 * or its multiplier is invalid.
 */
export async function resolveCompound(
  symbol: string,
  slug?: string | null,
): Promise<CompoundQuote | null> {
  const upperSymbol = symbol.toUpperCase();
  if (!slug || isPureElementSlug(slug, upperSymbol)) {
    return { slug: ELEMENTAL_SLUG, formula: upperSymbol, priceMult: 1 };
  }

  const compound = await fetchJson(
    `${config.compoundServiceUrl}/api/v1/compounds/${encodeURIComponent(slug)}`,
  );
  if (!compound) return null;

  const parentSymbol = String(
    compound.elementSymbol ?? compound.ElementSymbol ?? "",
  ).toUpperCase();
  // priceMult is relative to the parent's ask: a missing parent must not let a pricey
  // compound be bought at a cheap element's price.
  if (parentSymbol !== upperSymbol) return null;

  const priceMult = Number(compound.priceMult ?? compound.PriceMult ?? 0);
  if (!Number.isFinite(priceMult) || !(priceMult > 0)) return null;

  return {
    slug: String(compound.slug ?? compound.Slug ?? slug),
    formula: String(compound.formula ?? compound.Formula ?? slug),
    priceMult,
  };
}
