import axios from 'axios';
import { API_BASE_URL } from '../config';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

export function apiError(error: unknown, fallback: string): string {
  if (!axios.isAxiosError(error)) return fallback;
  const data = error.response?.data;
  if (typeof data === 'string') return data;
  if (data && typeof data === 'object') {
    if (typeof data.error === 'string') return data.error;
    if (typeof data.message === 'string') return data.message;
    if (data.errors && typeof data.errors === 'object') return Object.values(data.errors).flat().join(' ');
  }
  return fallback;
}

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  const apiKey = localStorage.getItem('apiKey');

  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  if (apiKey && !config.headers['X-API-Key']) {
    config.headers['X-API-Key'] = apiKey;
  }

  return config;
});

export const authService = {
  login: async (credentials: { email: string; password: string }) => {
    const response = await apiClient.post('/auth/login', credentials);
    if (response.data.token) {
      localStorage.removeItem('apiKey');
      localStorage.setItem('token', response.data.token);
    }
    return response.data;
  },
  register: async (userData: object) => {
    const response = await apiClient.post('/auth/register', userData);
    return response.data;
  },
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('apiKey');
  }
};

export const apiKeyService = {
  generate: async (description: string, rateLimitTps: number = 5) => {
    const response = await apiClient.post('/api-keys/generate', { description, rateLimitTps });
    return response.data;
  },
  list: async () => {
    const response = await apiClient.get('/api-keys');
    return response.data as { id: string; description: string; maskedKey: string; isActive: boolean; rateLimitTps: number }[];
  },
  revoke: async (id: string) => {
    await apiClient.delete(`/api-keys/${id}`);
  },
  ensureDashboardKey: async () => {
    if (localStorage.getItem('apiKey')) return localStorage.getItem('apiKey');
    try {
      const keys = await apiKeyService.list();
      const prev = (keys || []).filter((k) => k.description === 'Web Dashboard Key' && k.isActive);
      for (const k of prev) {
        await apiKeyService.revoke(k.id).catch(() => {});
      }
    } catch {
      /* list may 401 before token is wired */
    }
    const apiKeyRes = await apiKeyService.generate('Web Dashboard Key', 10);
    localStorage.setItem('apiKey', apiKeyRes.apiKey);
    return apiKeyRes.apiKey as string;
  }
};

export interface ElementQuery {
  page?: number;
  pageSize?: number;
  category?: string;
  block?: string;
  phase?: string;
  group?: number;
  period?: number;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface Ticker {
  symbol: string;
  last: number;
  bid: number;
  ask: number;
  spreadPct: number;
  change24hPct: number | null;
  high24h: number;
  low24h: number;
  volume24hGrams: number;
  sparkline: { t: string; price: number }[];
  availableStock: number;
  currency: string;
}

export interface BoardRow {
  availableStock?: number;
  symbol: string;
  last: number;
  change24hPct: number | null;
  bid: number;
  ask: number;
}

export interface CompoundSku {
  properties?: { molecularFormula: string; molecularWeight: number; molecularWeightUnit: string; iupacName: string; inchiKey: string; pubChemId: number; sourceUrl: string; retrievedAt: string } | null;
  id?: string;
  elementSymbol: string;
  slug: string;
  formula: string;
  name: string;
  nameTr: string;
  kind: string;
  gramsPerUnit: number;
  priceMult: number;
  summary: string;
  imageUrl?: string | null;
  imageHint?: string | null;
}

export interface CompoundList {
  info: { count: number; pages: number; next: string | null; prev: string | null };
  results: CompoundSku[];
}

export const compoundService = {
  all: async (params?: { element?: string }) => {
    const first = await compoundService.list({ ...params, pageSize: 100 });
    const rest = await Promise.all(Array.from({ length: Math.max(0, first.info.pages - 1) }, (_, i) =>
      compoundService.list({ ...params, page: i + 2, pageSize: 100 })));
    return [...first.results, ...rest.flatMap((page) => page.results)];
  },
  list: async (params?: { element?: string; kind?: string; q?: string; page?: number; pageSize?: number }) => {
    const response = await apiClient.get('/compounds', { params, timeout: 8000 });
    const data = response.data as CompoundList | CompoundSku[];
    if (Array.isArray(data)) {
      return { info: { count: data.length, pages: 1, next: null, prev: null }, results: data } as CompoundList;
    }
    return {
      info: data.info ?? { count: data.results?.length ?? 0, pages: 1, next: null, prev: null },
      results: data.results ?? []
    } as CompoundList;
  },
  get: async (slug: string) => {
    const response = await apiClient.get(`/compounds/${encodeURIComponent(slug)}`, { timeout: 8000 });
    return response.data as CompoundSku;
  }
};

export const elementService = {
  getElements: async (page = 1, pageSize = 100) => {
    const response = await apiClient.get('/elements', { params: { page, pageSize } });
    return response.data;
  },
  query: async (params: ElementQuery) => {
    const response = await apiClient.get('/elements', { params });
    return response.data;
  },
  getAllElements: async () => {
    const first = await elementService.getElements(1, 100);
    const results = [...(first.results || first)];
    if (first.info?.pages > 1) {
      const second = await elementService.getElements(2, 100);
      results.push(...(second.results || []));
    }
    return results;
  },
  getBySymbol: async (symbol: string) => {
    const response = await apiClient.get(`/elements/${symbol.toLowerCase()}`);
    return response.data;
  },
  getTicker: async (symbol: string) => {
    const response = await apiClient.get(`/elements/${symbol.toLowerCase()}/ticker`);
    return response.data as Ticker;
  },
  getHistory: async (symbol: string, limit = 24) => {
    const response = await apiClient.get(`/elements/${symbol.toLowerCase()}/history`, { params: { limit } });
    return response.data;
  },
  getMovers: async (limit = 12) => {
    const response = await apiClient.get('/market/movers', { params: { limit } });
    return response.data as BoardRow[];
  },
  getBoard: async () => {
    const response = await apiClient.get('/market/board');
    return response.data as BoardRow[];
  },
  getStatistics: async () => {
    const response = await apiClient.get('/statistics');
    return response.data;
  },
  getCategoryStatistics: async (category: string) => {
    const response = await apiClient.get(`/statistics/category/${encodeURIComponent(category)}`);
    return response.data;
  },
  compare: async (symbols: string[]) => {
    const response = await apiClient.get('/elements/compare', { params: { symbols: symbols.join(',') } });
    return response.data;
  },
  getNeighbors: async (symbol: string) => {
    const response = await apiClient.get(`/elements/${symbol.toLowerCase()}/neighbors`);
    return response.data;
  },
  getRelated: async (symbol: string, limit = 6) => {
    const response = await apiClient.get(`/elements/${symbol.toLowerCase()}/related`, { params: { limit } });
    return response.data;
  },
  getCompounds: async (symbol: string) => {
    const data = await compoundService.list({ element: symbol, pageSize: 100 });
    return data.results;
  }
};

export interface Holding {
  symbol: string;
  grams: number;
  avgCostElx: number;
  compoundSlug: string;
  productLabel: string;
}

export const walletService = {
  get: async () => {
    const response = await apiClient.get('/me/wallet');
    return response.data as { balanceElx: number; currency: string };
  },
  holdings: async () => {
    const response = await apiClient.get('/me/holdings');
    return response.data as Holding[];
  },
  sell: async (symbol: string, grams: number, compoundSlug?: string) => {
    const response = await apiClient.post('/desk/sell', { symbol, grams, compoundSlug });
    return response.data;
  }
};

export const webhookService = {
  list: async () => {
    const response = await apiClient.get('/webhooks');
    return response.data as { id: string; url: string; events: string[] }[];
  },
  create: async (url: string, events: string[], secret: string) => {
    const response = await apiClient.post('/webhooks', { url, events, secret });
    return response.data;
  },
  remove: async (id: string) => {
    await apiClient.delete(`/webhooks/${id}`);
  }
};

export const CART_KEY = 'elementapi:elementalCart';

export interface CartItem {
  requestId?: string;
  symbol: string;
  slug: string;
  qty: number;
  formula: string;
  label: string;
  priceMult: number;
}

export function cartLineKey(symbol: string, slug?: string) {
  return `${symbol.toUpperCase()}:${(slug || 'elemental').toLowerCase()}`;
}

function normalizeCartItem(raw: Partial<CartItem> & { symbol?: string; qty?: number }): CartItem | null {
  if (!raw || typeof raw.symbol !== 'string' || typeof raw.qty !== 'number' || !Number.isFinite(raw.qty) || raw.qty <= 0) return null;
  const slug = (raw.slug || 'elemental').toLowerCase();
  const formula = raw.formula || raw.symbol;
  return {
    requestId: raw.requestId || crypto.randomUUID(),
    symbol: raw.symbol,
    slug,
    qty: raw.qty,
    formula,
    label: raw.label || (slug === 'elemental' ? raw.symbol : formula),
    priceMult: raw.priceMult && raw.priceMult > 0 ? raw.priceMult : 1
  };
}

export function readCart(): CartItem[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(CART_KEY) || '[]') as unknown[];
    return parsed
      .map((row) => normalizeCartItem(row as CartItem))
      .filter((row): row is CartItem => row != null);
  } catch {
    return [];
  }
}

export function writeCart(items: CartItem[]) {
  localStorage.setItem(CART_KEY, JSON.stringify(items));
}

export function addToCart(
  symbol: string,
  grams: number,
  maxGrams?: number,
  sku?: { slug?: string; formula?: string; label?: string; priceMult?: number }
) {
  const cart = readCart();
  const slug = (sku?.slug || 'elemental').toLowerCase();
  const key = cartLineKey(symbol, slug);
  const existing = cart.find((i) => cartLineKey(i.symbol, i.slug) === key);
  const nextQty = Math.max(0, (existing?.qty ?? 0) + grams);
  const capped = maxGrams != null ? Math.min(nextQty, maxGrams) : nextQty;
  const line: CartItem = {
    requestId: crypto.randomUUID(),
    symbol,
    slug,
    qty: capped,
    formula: sku?.formula || existing?.formula || symbol,
    label: sku?.label || existing?.label || (slug === 'elemental' ? symbol : sku?.formula || symbol),
    priceMult: sku?.priceMult && sku.priceMult > 0 ? sku.priceMult : existing?.priceMult ?? 1
  };
  const next = existing
    ? cart.map((i) => (cartLineKey(i.symbol, i.slug) === key ? line : i))
    : [line, ...cart].slice(0, 12);
  writeCart(next.filter((i) => i.qty > 0));
  return next;
}

export const orderService = {
  submitOrder: async (elementSymbol: string, quantity: number, compoundSlug?: string, requestId?: string) => {
    const body: { elementSymbol: string; quantity: number; compoundSlug?: string } = { elementSymbol, quantity };
    if (compoundSlug && compoundSlug !== 'elemental') body.compoundSlug = compoundSlug;
    const response = await apiClient.post('/orders', body, { headers: requestId ? { 'Idempotency-Key': requestId } : undefined });
    return response.data;
  },
  getOrder: async (id: string) => {
    const response = await apiClient.get(`/orders/${id}`);
    return response.data;
  },
  list: async () => {
    const response = await apiClient.get('/orders');
    return response.data;
  },
  getStats: async () => {
    const response = await apiClient.get('/orders/stats');
    return response.data;
  }
};

export const orderStatusLabel: Record<string, string> = {
  Submitted: 'Hazırlanıyor',
  StockReserved: 'Ödeme',
  Shipping: 'Kargoda',
  Completed: 'Teslim',
  Failed: 'İptal',
  Compensated: 'İptal'
};
