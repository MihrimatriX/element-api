import { config } from '../config.js';
import { compoundLineElx } from '../compoundPrice.js';

export { compoundLineElx };

export interface TickerQuote {
  last: number;
  bid: number;
  ask: number;
  spreadPct: number;
  availableStock: number;
}

function quotesFromLast(last: number, spreadPct = config.defaultSpreadPct): TickerQuote {
  return {
    last,
    bid: Math.round(last * (1 - spreadPct) * 10000) / 10000,
    ask: Math.round(last * (1 + spreadPct) * 10000) / 10000,
    spreadPct,
    availableStock: 0,
  };
}

export async function resolveTicker(symbol: string): Promise<TickerQuote | null> {
  const url = `${config.catalogServiceUrl}/api/v1/elements/${encodeURIComponent(symbol)}/ticker`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (res.ok) {
      const data = (await res.json()) as Record<string, unknown>;
      const last = Number(data.last ?? data.Last ?? 0);
      const ask = Number(data.ask ?? data.Ask ?? 0);
      const bid = Number(data.bid ?? data.Bid ?? 0);
      if (last > 0 && ask > 0) {
        return {
          last,
          bid: bid || quotesFromLast(last).bid,
          ask,
          spreadPct: Number(data.spreadPct ?? data.SpreadPct ?? config.defaultSpreadPct),
          availableStock: Number(data.availableStock ?? data.AvailableStock ?? 0),
        };
      }
      if (last > 0) return quotesFromLast(last);
    }
  } catch {
    /* fallback */
  }

  // A stale last price is not an executable quote.
  return null;
}

export async function resolveAsk(symbol: string): Promise<number> {
  const ticker = await resolveTicker(symbol);
  return ticker?.ask ?? 0;
}

export interface CompoundQuote {
  slug: string;
  formula: string;
  label: string;
  priceMult: number;
}

/**
 * Resolve the product price multiplier; holdings retain the product's compound slug.
 * Missing slug → elemental (priceMult 1) so POST /orders without compoundSlug stays valid.
 */
export async function resolveCompound(symbol: string, slug?: string | null): Promise<CompoundQuote | null> {
  const sym = symbol.toUpperCase();
  if (!slug || slug === 'elemental' || slug.toLowerCase() === sym.toLowerCase() || slug === `elemental-${sym.toLowerCase()}`) {
    return { slug: 'elemental', formula: sym, label: sym, priceMult: 1 };
  }

  const url = `${config.compoundServiceUrl}/api/v1/compounds/${encodeURIComponent(slug)}`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const data = (await res.json()) as Record<string, unknown>;
    const parent = String(data.elementSymbol ?? data.ElementSymbol ?? '').toUpperCase();
    if (parent && parent !== sym) return null;
    const priceMult = Number(data.priceMult ?? data.PriceMult ?? 0);
    if (!Number.isFinite(priceMult) || !(priceMult > 0)) return null;
    const formula = String(data.formula ?? data.Formula ?? slug);
    const nameTr = String(data.nameTr ?? data.NameTr ?? '');
    const name = String(data.name ?? data.Name ?? formula);
    return {
      slug: String(data.slug ?? data.Slug ?? slug),
      formula,
      label: nameTr || name || formula,
      priceMult,
    };
  } catch {
    return null;
  }
}
