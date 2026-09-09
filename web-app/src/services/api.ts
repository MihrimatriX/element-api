import { API_BASE_URL } from '../config';

const DEFAULT_TIMEOUT_MS = 10_000;

export class ApiHttpError extends Error {
  status: number;
  data: unknown;
  constructor(status: number, data: unknown, message?: string) {
    super(message ?? `HTTP ${status}`);
    this.status = status;
    this.data = data;
  }
}

function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  const token = localStorage.getItem('token');
  const apiKey = localStorage.getItem('apiKey');
  if (token) headers.Authorization = `Bearer ${token}`;
  if (apiKey) headers['X-API-Key'] = apiKey;
  return headers;
}

function toQuery(params?: Record<string, unknown>): string {
  if (!params) return '';
  const q = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value == null || value === '') continue;
    q.set(key, String(value));
  }
  const s = q.toString();
  return s ? `?${s}` : '';
}

async function request<T>(
  method: string,
  path: string,
  opts?: {
    body?: unknown;
    params?: Record<string, unknown>;
    headers?: Record<string, string>;
    timeout?: number;
  }
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts?.timeout ?? DEFAULT_TIMEOUT_MS);
  try {
    const res = await fetch(`${API_BASE_URL}${path}${toQuery(opts?.params)}`, {
      method,
      headers: {
        ...authHeaders(),
        ...(opts?.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...opts?.headers,
      },
      body: opts?.body !== undefined ? JSON.stringify(opts.body) : undefined,
      signal: controller.signal,
    });
    const text = await res.text();
    let data: unknown = null;
    if (text) {
      try { data = JSON.parse(text); } catch { data = text; }
    }
    if (!res.ok) throw new ApiHttpError(res.status, data);
    return data as T;
  } finally {
    clearTimeout(timer);
  }
}

export function apiError(error: unknown, fallback: string): string {
  if (!(error instanceof ApiHttpError)) return fallback;
  const data = error.data;
  if (typeof data === 'string') return data;
  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    if (typeof obj.error === 'string') return obj.error;
    if (typeof obj.message === 'string') return obj.message;
    if (obj.errors && typeof obj.errors === 'object') return Object.values(obj.errors as object).flat().join(' ');
  }
  return fallback;
}

export const authService = {
  login: async (credentials: { email: string; password: string }) => {
    const data = await request<{ token?: string }>('POST', '/auth/login', { body: credentials });
    if (data.token) {
      localStorage.removeItem('apiKey');
      localStorage.setItem('token', data.token);
    }
    return data;
  },
  register: async (userData: object) => request('POST', '/auth/register', { body: userData }),
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('apiKey');
  }
};

export const apiKeyService = {
  generate: async (description: string, rateLimitTps: number = 5) =>
    request<{ apiKey: string }>('POST', '/api-keys/generate', { body: { description, rateLimitTps } }),
  list: async () =>
    request<{ id: string; description: string; maskedKey: string; isActive: boolean; rateLimitTps: number }[]>('GET', '/api-keys'),
  revoke: async (id: string) => { await request('DELETE', `/api-keys/${id}`); },
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
    const data = await request<CompoundList | CompoundSku[]>('GET', '/compounds', { params, timeout: 8000 });
    if (Array.isArray(data)) {
      return { info: { count: data.length, pages: 1, next: null, prev: null }, results: data } as CompoundList;
    }
    return {
      info: data.info ?? { count: data.results?.length ?? 0, pages: 1, next: null, prev: null },
      results: data.results ?? []
    } as CompoundList;
  },
  get: async (slug: string) =>
    request<CompoundSku>('GET', `/compounds/${encodeURIComponent(slug)}`, { timeout: 8000 })
};

export const elementService = {
  getElements: async (page = 1, pageSize = 100) =>
    request<any>('GET', '/elements', { params: { page, pageSize } }),
  query: async (params: ElementQuery) =>
    request('GET', '/elements', { params: params as Record<string, unknown> }),
  getAllElements: async () => {
    const first = await elementService.getElements(1, 100);
    const results = [...(first.results || first)];
    if (first.info?.pages > 1) {
      const second = await elementService.getElements(2, 100);
      results.push(...(second.results || []));
    }
    return results;
  },
  getBySymbol: async (symbol: string) =>
    request('GET', `/elements/${symbol.toLowerCase()}`),
  getTicker: async (symbol: string) =>
    request<Ticker>('GET', `/elements/${symbol.toLowerCase()}/ticker`),
  getHistory: async (symbol: string, limit = 24) =>
    request('GET', `/elements/${symbol.toLowerCase()}/history`, { params: { limit } }),
  getMovers: async (limit = 12) =>
    request<BoardRow[]>('GET', '/market/movers', { params: { limit } }),
  getBoard: async () =>
    request<BoardRow[]>('GET', '/market/board'),
  getStatistics: async () =>
    request('GET', '/statistics'),
  getCategoryStatistics: async (category: string) =>
    request('GET', `/statistics/category/${encodeURIComponent(category)}`),
  compare: async (symbols: string[]) =>
    request('GET', '/elements/compare', { params: { symbols: symbols.join(',') } }),
  getNeighbors: async (symbol: string) =>
    request('GET', `/elements/${symbol.toLowerCase()}/neighbors`),
  getRelated: async (symbol: string, limit = 6) =>
    request('GET', `/elements/${symbol.toLowerCase()}/related`, { params: { limit } }),
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
  get: async () =>
    request<{ balanceElx: number; currency: string }>('GET', '/me/wallet'),
  holdings: async () =>
    request<Holding[]>('GET', '/me/holdings'),
  sell: async (symbol: string, grams: number, compoundSlug?: string) =>
    request<{ proceedsElx: number }>('POST', '/desk/sell', { body: { symbol, grams, compoundSlug } })
};

export const webhookService = {
  list: async () =>
    request<{ id: string; url: string; events: string[] }[]>('GET', '/webhooks'),
  create: async (url: string, events: string[], secret: string) =>
    request('POST', '/webhooks', { body: { url, events, secret } }),
  remove: async (id: string) => { await request('DELETE', `/webhooks/${id}`); }
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

export interface OrderRow {
  id: string;
  elementSymbol: string;
  quantity: number;
  totalPrice: number;
  status: string;
  trackingNumber?: string | null;
  productLabel?: string | null;
  compoundFormula?: string | null;
}

export const orderService = {
  submitOrder: async (elementSymbol: string, quantity: number, compoundSlug?: string, requestId?: string) => {
    const body: { elementSymbol: string; quantity: number; compoundSlug?: string } = { elementSymbol, quantity };
    if (compoundSlug && compoundSlug !== 'elemental') body.compoundSlug = compoundSlug;
    return request<OrderRow>('POST', '/orders', {
      body,
      headers: requestId ? { 'Idempotency-Key': requestId } : undefined
    });
  },
  getOrder: async (id: string) => request<OrderRow>('GET', `/orders/${id}`),
  list: async () => request<OrderRow[]>('GET', '/orders'),
  getStats: async () => request('GET', '/orders/stats')
};

export const orderStatusLabel: Record<string, string> = {
  Submitted: 'Hazırlanıyor',
  StockReserved: 'Ödeme',
  Shipping: 'Kargoda',
  Completed: 'Teslim',
  Failed: 'İptal',
  Compensated: 'İptal'
};
