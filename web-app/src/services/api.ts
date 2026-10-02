import { API_BASE_URL } from "../config";
import {
  readJson,
  readStorage,
  removeStorage,
  writeJson,
  writeStorage,
} from "../lib/storage";
import type { ElementItem } from "./elementData";
import { clearSession } from "./session";

/**
 * Client for the account and commerce gateway (`/api/v1`). Requests carry the
 * stored JWT (`token`) and, for wallet and order endpoints, a dashboard API key
 * (`apiKey`) that the web app mints for itself on first use.
 */

const DEFAULT_TIMEOUT_MS = 10_000;
const CATALOG_TIMEOUT_MS = 8_000;
const PAGE_SIZE = 100;

/** Description of the key the web app mints for itself; also used to find old ones to retire. */
export const DASHBOARD_KEY_DESCRIPTION = "Web Dashboard Key";
const DASHBOARD_KEY_TPS = 10;

/** Wallet, holdings, desk and order endpoints need the dashboard API key besides the JWT. */
const DASHBOARD_PATH = /^\/(me|orders|desk)(\/|$)/;

// ---------------------------------------------------------------------------
// HTTP core
// ---------------------------------------------------------------------------

/** A non-2xx gateway response. `data` is the parsed JSON body, raw text, or `null`. */
export class ApiHttpError extends Error {
  status: number;
  data: unknown;
  constructor(status: number, data: unknown, message?: string) {
    super(message ?? `HTTP ${status}`);
    this.status = status;
    this.data = data;
  }
}

interface RequestOptions {
  body?: unknown;
  params?: Record<string, unknown>;
  headers?: Record<string, string>;
  timeout?: number;
  /** Set on the single retry after a stale dashboard key was replaced. */
  retried?: boolean;
}

interface RawResponse {
  ok: boolean;
  status: number;
  data: unknown;
}

function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  const token = readStorage("token");
  const apiKey = readStorage("apiKey");
  if (token) headers.Authorization = `Bearer ${token}`;
  if (apiKey) headers["X-API-Key"] = apiKey;
  return headers;
}

/** Builds `?a=1&b=2`, skipping `null`, `undefined` and empty-string values. */
function toQuery(params?: Record<string, unknown>): string {
  if (!params) return "";
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value == null || value === "") continue;
    query.set(key, String(value));
  }
  const text = query.toString();
  return text ? `?${text}` : "";
}

/** Parses a JSON body; falls back to the raw text, or `null` for an empty body. */
async function readBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/** One fetch with auth headers and a timeout that covers both the response and its body. */
async function send(
  method: string,
  path: string,
  options: RequestOptions,
): Promise<RawResponse> {
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    options.timeout ?? DEFAULT_TIMEOUT_MS,
  );
  const hasBody = options.body !== undefined;
  try {
    const response = await fetch(
      `${API_BASE_URL}${path}${toQuery(options.params)}`,
      {
        method,
        headers: {
          ...authHeaders(),
          ...(hasBody ? { "Content-Type": "application/json" } : {}),
          ...options.headers,
        },
        body: hasBody ? JSON.stringify(options.body) : undefined,
        signal: controller.signal,
      },
    );
    const data = await readBody(response);
    return { ok: response.ok, status: response.status, data };
  } finally {
    clearTimeout(timer);
  }
}

/** A 401 on account endpoints (other than sign-in itself) means the JWT is no longer valid. */
function invalidatesSession(path: string): boolean {
  if (path === "/auth/login" || path === "/auth/register") return false;
  return (
    path.startsWith("/auth/") ||
    path.startsWith("/api-keys") ||
    path.startsWith("/webhooks")
  );
}

async function request<T>(
  method: string,
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const needsDashboardKey = DASHBOARD_PATH.test(path);
  if (needsDashboardKey && readStorage("token") && !readStorage("apiKey"))
    await apiKeyService.ensureDashboardKey();
  const tokenSent = readStorage("token");
  const { ok, status, data } = await send(method, path, options);

  if (status === 401) {
    // Skip when another tab signed in meanwhile: that newer token is still good.
    if (tokenSent === readStorage("token") && invalidatesSession(path))
      clearSession();
    if (needsDashboardKey && !options.retried && readStorage("apiKey")) {
      // ponytail: a dashboard key revoked elsewhere (e.g. on another device) is replaced once; a second 401 reaches the caller.
      removeStorage("apiKey");
      await apiKeyService.ensureDashboardKey().catch(() => null);
      return request<T>(method, path, { ...options, retried: true });
    }
  }
  if (!ok) throw new ApiHttpError(status, data);
  return data as T;
}

/**
 * Turkish sentences for the ASP.NET Identity error codes registration can hit.
 * The user name is the e-mail, so a taken address reports both duplicate codes.
 */
const IDENTITY_ERRORS: Record<string, string> = {
  DuplicateEmail: "Bu e-posta zaten kayıtlı.",
  DuplicateUserName: "Bu e-posta zaten kayıtlı.",
  InvalidEmail: "Geçerli bir e-posta adresi girin.",
  InvalidUserName: "Bu e-posta adresi kullanılamıyor.",
  PasswordTooShort: "Şifre en az 10 karakter olmalı.",
};

/**
 * Picks a user-facing message from a gateway error body, else returns `fallback`.
 * Reads `error`, `message` or `detail`, then message lists keyed by field or
 * error code: ASP.NET validation `errors`, or Identity's `BadRequest(ModelState)`
 * (`{"DuplicateEmail": ["…"]}`). Known Identity codes become Turkish sentences;
 * other lists pass the server's text through.
 */
export function apiError(error: unknown, fallback: string): string {
  if (!(error instanceof ApiHttpError)) return fallback;
  const data = error.data;
  if (typeof data === "string") return data;
  if (!data || typeof data !== "object") return fallback;
  const body = data as Record<string, unknown>;
  for (const key of ["error", "message", "detail"]) {
    const text = body[key];
    if (typeof text === "string") return text;
  }
  const lists = body.errors && typeof body.errors === "object" ? body.errors : body;
  const messages = Object.entries(lists).flatMap(([code, list]) =>
    Array.isArray(list) ? (IDENTITY_ERRORS[code] ?? list.map(String)) : [],
  );
  return [...new Set(messages)].join(" ") || fallback;
}

/**
 * Persists a credential. Throws when storage is blocked, so sign-in fails
 * visibly instead of leaving a session the browser cannot keep.
 */
function storeCredential(key: "token" | "apiKey", value: string) {
  if (!writeStorage(key, value))
    throw new Error("Tarayıcı depolaması kapalı; oturum kaydedilemedi.");
}

// ---------------------------------------------------------------------------
// Auth and API keys
// ---------------------------------------------------------------------------

/** Sign-in and registration. Signing out is `clearSession` in services/session. */
export const authService = {
  /** Signs in and stores the JWT; any previous user's dashboard key is dropped first. */
  login: async (credentials: {
    email: string;
    password: string;
    captchaToken?: string;
  }) => {
    const data = await request<{ token?: string }>("POST", "/auth/login", {
      body: credentials,
    });
    if (data.token) {
      removeStorage("apiKey");
      storeCredential("token", data.token);
    }
    return data;
  },
  register: async (userData: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    captchaToken?: string;
  }) => request("POST", "/auth/register", { body: userData }),
};

/** An API key as listed for its owner; the secret itself is only shown once at creation. */
export interface ApiKeyRow {
  id: string;
  description: string;
  maskedKey: string;
  isActive: boolean;
  rateLimitTps: number;
}

let pendingDashboardKey: { token: string; promise: Promise<string> } | null =
  null;

/** Mints a dashboard key for `token`, refusing it if the user changed meanwhile. */
async function mintDashboardKey(token: string): Promise<string> {
  const { apiKey } = await apiKeyService.generate(
    DASHBOARD_KEY_DESCRIPTION,
    DASHBOARD_KEY_TPS,
  );
  if (readStorage("token") !== token) throw new ApiHttpError(401, null);
  storeCredential("apiKey", apiKey);
  return apiKey;
}

/** When the 20-key quota is full (409), retires the oldest dashboard key and mints once more. */
async function mintFreeingQuota(token: string): Promise<string> {
  try {
    return await mintDashboardKey(token);
  } catch (error) {
    if (!(error instanceof ApiHttpError) || error.status !== 409) throw error;
    const keys = await apiKeyService.list().catch((): ApiKeyRow[] => []);
    const oldest = keys
      .filter(
        (key) => key.isActive && key.description === DASHBOARD_KEY_DESCRIPTION,
      )
      .pop();
    if (!oldest) throw error;
    await apiKeyService.revoke(oldest.id);
    return mintDashboardKey(token);
  }
}

/** API key management for the signed-in user. */
export const apiKeyService = {
  generate: async (description: string, rateLimitTps: number = 5) =>
    request<{ apiKey: string }>("POST", "/api-keys/generate", {
      body: { description, rateLimitTps },
    }),
  list: async () => request<ApiKeyRow[]>("GET", "/api-keys"),
  revoke: async (id: string) => {
    await request("DELETE", `/api-keys/${id}`);
  },
  /** Makes `apiKey` this browser's dashboard key when it has none yet. Returns whether it did. */
  adoptDashboardKey: (apiKey: string) =>
    !readStorage("apiKey") && writeStorage("apiKey", apiKey),
  /** Forgets the stored dashboard key when `matches` accepts it (e.g. it was just revoked). Returns whether it did. */
  forgetDashboardKey: (matches: (apiKey: string) => boolean) => {
    const stored = readStorage("apiKey");
    return stored !== null && matches(stored) && removeStorage("apiKey");
  },
  /**
   * Returns the stored dashboard key, minting one if needed. Parallel callers
   * for the same token share one issuance.
   */
  ensureDashboardKey: async () => {
    const existing = readStorage("apiKey");
    if (existing) return existing;
    const token = readStorage("token");
    if (!token) throw new ApiHttpError(401, null);
    if (pendingDashboardKey?.token === token)
      return pendingDashboardKey.promise;
    const promise = mintFreeingQuota(token);
    pendingDashboardKey = { token, promise };
    try {
      return await promise;
    } finally {
      if (pendingDashboardKey?.promise === promise) pendingDashboardKey = null;
    }
  },
};

// ---------------------------------------------------------------------------
// Catalogue and market
// ---------------------------------------------------------------------------

/** Page numbers 2..total, for fetching the remaining pages in parallel. */
function pagesAfterFirst(total: number): number[] {
  return Array.from({ length: Math.max(0, total - 1) }, (_, i) => i + 2);
}

/** Live quote for one element. */
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

/** One row of the market board or movers list. */
export interface BoardRow {
  availableStock?: number;
  symbol: string;
  last: number;
  change24hPct: number | null;
  bid: number;
  ask: number;
}

/** A sellable product: an element in elemental form or as a compound. */
export interface CompoundSku {
  properties?: {
    molecularFormula: string;
    molecularWeight: number;
    molecularWeightUnit: string;
    iupacName: string;
    inchiKey: string;
    pubChemId: number;
    sourceUrl: string;
    retrievedAt: string;
  } | null;
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

/** A page of compound SKUs. */
export interface CompoundList {
  info: {
    count: number;
    pages: number;
    next: string | null;
    prev: string | null;
  };
  results: CompoundSku[];
}

/** Older gateways answer with a bare array; newer ones with a (possibly partial) page envelope. */
function toCompoundList(
  data: Partial<CompoundList> | CompoundSku[],
): CompoundList {
  const singlePage = (count: number) => ({
    count,
    pages: 1,
    next: null,
    prev: null,
  });
  if (Array.isArray(data)) return { info: singlePage(data.length), results: data };
  const results = data.results ?? [];
  return {
    info: data.info ?? singlePage(data.results?.length ?? 0),
    results,
  };
}

/** Compound SKUs from the commerce catalogue. */
export const compoundService = {
  /** Every SKU, optionally for one element, fetching all pages. */
  all: async (params?: { element?: string }) => {
    const first = await compoundService.list({ ...params, pageSize: PAGE_SIZE });
    const later = await Promise.all(
      pagesAfterFirst(first.info.pages).map((page) =>
        compoundService.list({ ...params, page, pageSize: PAGE_SIZE }),
      ),
    );
    return [first, ...later].flatMap((list) => list.results);
  },
  list: async (params?: {
    element?: string;
    kind?: string;
    q?: string;
    page?: number;
    pageSize?: number;
  }) =>
    toCompoundList(
      await request<Partial<CompoundList> | CompoundSku[]>(
        "GET",
        "/compounds",
        { params, timeout: CATALOG_TIMEOUT_MS },
      ),
    ),
  get: async (slug: string) =>
    request<CompoundSku>("GET", `/compounds/${encodeURIComponent(slug)}`, {
      timeout: CATALOG_TIMEOUT_MS,
    }),
};

type ElementPage = { results: ElementItem[]; info: { pages: number } };

/** Commerce element catalogue and market data. */
export const elementService = {
  getElements: async (page = 1, pageSize = PAGE_SIZE) =>
    request<ElementPage>("GET", "/elements", { params: { page, pageSize } }),
  /** All 118 elements (two pages of 100). */
  getAllElements: async () => {
    const first: ElementPage | ElementItem[] =
      await elementService.getElements(1, PAGE_SIZE);
    // Older gateways answer with a bare array instead of a page envelope.
    if (Array.isArray(first)) return [...first];
    const later = await Promise.all(
      pagesAfterFirst(first.info?.pages ?? 1).map((page) =>
        elementService.getElements(page, PAGE_SIZE),
      ),
    );
    return [first, ...later].flatMap((elementPage) => elementPage.results || []);
  },
  getTicker: async (symbol: string) =>
    request<Ticker>("GET", `/elements/${symbol.toLowerCase()}/ticker`),
  getMovers: async (limit = 12) =>
    request<BoardRow[]>("GET", "/market/movers", { params: { limit } }),
  getBoard: async () => request<BoardRow[]>("GET", "/market/board"),
};

// ---------------------------------------------------------------------------
// Wallet and webhooks
// ---------------------------------------------------------------------------

/** Grams of one product the user owns, with the average purchase price. */
export interface Holding {
  symbol: string;
  grams: number;
  avgCostElx: number;
  compoundSlug: string;
  productLabel: string;
}

/** The signed-in user's KREDI wallet and holdings. */
export const walletService = {
  get: async () =>
    request<{ balanceElx: number; currency: string }>("GET", "/me/wallet"),
  holdings: async () => request<Holding[]>("GET", "/me/holdings"),
  sell: async (symbol: string, grams: number, compoundSlug?: string) =>
    request<{ proceedsElx: number }>("POST", "/desk/sell", {
      body: { symbol, grams, compoundSlug },
    }),
};

/** A registered webhook endpoint. */
export interface WebhookRow {
  id: string;
  url: string;
  events: string[];
}

/** Webhook registrations for the signed-in user. */
export const webhookService = {
  list: async () => request<WebhookRow[]>("GET", "/webhooks"),
  create: async (url: string, events: string[], secret: string) =>
    request("POST", "/webhooks", { body: { url, events, secret } }),
  remove: async (id: string) => {
    await request("DELETE", `/webhooks/${id}`);
  },
};

// ---------------------------------------------------------------------------
// Cart (browser-local)
// ---------------------------------------------------------------------------

/** localStorage key of the shop cart. */
const CART_KEY = "elementapi:elementalCart";
const ELEMENTAL_SLUG = "elemental";

/** One cart line. `requestId` doubles as the order's idempotency key. */
export interface CartItem {
  requestId?: string;
  symbol: string;
  slug: string;
  qty: number;
  formula: string;
  label: string;
  priceMult: number;
}

/** Identity of a cart line: element symbol plus product slug ("elemental" for the pure element). */
export function cartLineKey(symbol: string, slug?: string) {
  return `${symbol.toUpperCase()}:${(slug || ELEMENTAL_SLUG).toLowerCase()}`;
}

/** Repairs a stored line (missing fields get defaults); drops lines without a symbol or a positive quantity. */
function normalizeCartItem(raw: unknown): CartItem | null {
  const row = raw as Partial<CartItem> | null;
  if (
    !row ||
    typeof row.symbol !== "string" ||
    typeof row.qty !== "number" ||
    !Number.isFinite(row.qty) ||
    row.qty <= 0
  )
    return null;
  const slug = (row.slug || ELEMENTAL_SLUG).toLowerCase();
  const formula = row.formula || row.symbol;
  return {
    requestId: row.requestId || crypto.randomUUID(),
    symbol: row.symbol,
    slug,
    qty: row.qty,
    formula,
    label: row.label || (slug === ELEMENTAL_SLUG ? row.symbol : formula),
    priceMult: row.priceMult && row.priceMult > 0 ? row.priceMult : 1,
  };
}

/** Reads the stored cart; corrupt data reads as an empty cart. */
export function readCart(): CartItem[] {
  const stored = readJson<unknown>(CART_KEY, []);
  if (!Array.isArray(stored)) return [];
  return stored
    .map((row) => normalizeCartItem(row))
    .filter((row): row is CartItem => row != null);
}

/** Stores the cart. Without storage the cart simply lives for this page only. */
export function writeCart(items: CartItem[]) {
  writeJson(CART_KEY, items);
}

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------

/** An order as listed for its owner. */
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

/** Order placement and history. */
export const orderService = {
  /** Places an order; `requestId` is sent as `Idempotency-Key` so a retried submit is not charged twice. */
  submitOrder: async (
    elementSymbol: string,
    quantity: number,
    compoundSlug?: string,
    requestId?: string,
  ) => {
    const body: {
      elementSymbol: string;
      quantity: number;
      compoundSlug?: string;
    } = { elementSymbol, quantity };
    if (compoundSlug && compoundSlug !== ELEMENTAL_SLUG)
      body.compoundSlug = compoundSlug;
    return request<OrderRow>("POST", "/orders", {
      body,
      headers: requestId ? { "Idempotency-Key": requestId } : undefined,
    });
  },
  list: async () => request<OrderRow[]>("GET", "/orders"),
};

/** Turkish labels for the order saga states. */
export const orderStatusLabel: Record<string, string> = {
  Submitted: "Hazırlanıyor",
  StockReserved: "Ödeme",
  Shipping: "Kargoda",
  Completed: "Teslim",
  Failed: "İptal",
  Compensated: "İptal",
};
