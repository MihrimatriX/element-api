import { Redis } from 'ioredis';
import { config } from '../config.js';

const redis = new Redis(config.redisUrl);

function readPricePerGram(doc: Record<string, unknown>): number {
  const root = doc.pricePerGram ?? doc.PricePerGram;
  if (root != null) return Number(root);

  const market = (doc.market ?? doc.Market) as Record<string, unknown> | undefined;
  if (market) {
    const nested = market.pricePerGram ?? market.PricePerGram;
    if (nested != null) return Number(nested);
  }
  return 0;
}

export async function resolvePricePerGram(symbol: string): Promise<number> {
  const cacheKey = `element:${symbol.toLowerCase()}`;
  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      const doc = JSON.parse(cached) as Record<string, unknown>;
      const price = readPricePerGram(doc);
      if (price) return price;
    }
  } catch {
    /* fallback to HTTP */
  }

  const url = `${config.catalogServiceUrl}/api/v1/elements/${encodeURIComponent(symbol)}`;
  const res = await fetch(url);
  if (!res.ok) return 0;
  const data = (await res.json()) as Record<string, unknown>;
  return readPricePerGram(data);
}
