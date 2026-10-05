import { randomUUID } from "node:crypto";
import type { Response } from "express";
import { config } from "../config.js";
import { compoundLineElx, ELEMENTAL_SLUG } from "../compoundPrice.js";
import * as orders from "../db/orders.js";
import {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  searchOrdersByCustomer,
} from "../db/orderSearch.js";
import { asyncRouter, fetchJson, isUuid, problem } from "../http.js";
import { requireUser } from "../httpAuth.js";
import { CREDIT_LIMIT } from "../saga/paymentDecision.js";
import { createOrderBodySchema, idempotencyKeySchema } from "../schemas.js";
import { resolveCompound, resolveTicker } from "../services/priceResolver.js";

/** Highest page number accepted by GET /search. */
const MAX_SEARCH_PAGE = 1_000_000;
/** Longest free-text term accepted by GET /search. */
const MAX_SEARCH_QUERY_LENGTH = 64;

/** Customer order endpoints, mounted at /api/v1/orders behind the gateway. */
export const ordersRouter = asyncRouter();

/** The facts of a POST /orders request that must match when an Idempotency-Key is reused. */
interface OrderRequest {
  customerId: string;
  elementSymbol: string;
  quantity: number;
  compoundSlug: string | null;
}

/**
 * Asks wallet-service for the customer's KREDI balance (legacy wire field `balanceElx`).
 * Returns null when wallet cannot answer; the order then goes ahead and the saga's payment step decides.
 */
async function fetchWalletBalance(customerId: string): Promise<number | null> {
  const wallet = await fetchJson(`${config.walletServiceUrl}/api/v1/me/wallet`, {
    INTERNAL_API_KEY: config.internalApiKey,
    "X-User-Id": customerId,
  });
  if (!wallet) return null;
  return Number(wallet.balanceElx);
}

/**
 * The requested compound slug, with the pure-element spellings ("elemental", "fe", "elemental-fe") mapped to null.
 * Same elemental aliases as resolveCompound, so a retried elemental order replays instead of 409.
 */
function requestedCompoundSlug(
  compoundSlug: string | null | undefined,
  elementSymbol: string,
): string | null {
  const lowerSymbol = elementSymbol.toLowerCase();
  const isPureElement =
    !compoundSlug ||
    compoundSlug === ELEMENTAL_SLUG ||
    compoundSlug === lowerSymbol ||
    compoundSlug === `elemental-${lowerSymbol}`;
  return isPureElement ? null : compoundSlug;
}

function isSameOrderRequest(
  existing: orders.OrderRow,
  request: OrderRequest,
): boolean {
  return (
    existing.customer_id === request.customerId &&
    existing.element_symbol === request.elementSymbol &&
    Number(existing.quantity) === request.quantity &&
    existing.compound_slug === request.compoundSlug
  );
}

/** Answers a reused Idempotency-Key: 200 with the original order, or 409 when the key belonged to a different order. */
function replayExistingOrder(
  res: Response,
  existing: orders.OrderRow,
  request: OrderRequest,
) {
  if (!isSameOrderRequest(existing, request)) {
    return problem(
      res,
      409,
      "Idempotency-Key was already used for a different order.",
    );
  }
  return res.status(200).json(mapOrder(existing));
}

/** True when an optional query value is absent, or an integer from 1 to `max`. */
function isOptionalIntInRange(value: unknown, max: number): boolean {
  if (value == null) return true;
  const number = Number(value);
  return Number.isSafeInteger(number) && number >= 1 && number <= max;
}

function stringOrUndefined(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

/** Converts a database row into the public order JSON (camelCase, numbers instead of NUMERIC strings). */
function mapOrder(row: orders.OrderRow) {
  const formula = row.compound_formula ?? null;
  const grams = Number(row.quantity);
  // Rows created before product_label existed get a label built from formula or symbol.
  const fallbackLabel = `${formula || row.element_symbol} · ${grams} g`;
  return {
    id: row.id,
    customerId: row.customer_id,
    elementSymbol: row.element_symbol,
    quantity: grams,
    totalPrice: Number(row.total_price),
    status: row.status,
    trackingNumber: row.tracking_number ?? null,
    compoundSlug: row.compound_slug ?? null,
    compoundFormula: formula,
    productLabel: row.product_label || fallbackLabel,
    createdAt: row.created_at,
  };
}

/**
 * POST / — validates and prices a buy order, checks stock and balance, then stores it and starts the saga.
 * 202 means accepted: reservation, payment and shipment continue asynchronously.
 */
ordersRouter.post("/", async (req, res) => {
  const customerId = requireUser(req, res);
  if (!customerId) return;

  const parsed = createOrderBodySchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return problem(
      res,
      400,
      "Valid elementSymbol and numeric quantity (0.0001–1000000 g, at most 4 decimals) are required.",
    );
  }
  const { elementSymbol, quantity, compoundSlug } = parsed.data;
  const symbol = elementSymbol.toUpperCase();

  const idempotencyKey = req.header("Idempotency-Key")?.toLowerCase();
  const isKeyValid =
    !idempotencyKey || idempotencyKeySchema.safeParse(idempotencyKey).success;
  if (!isKeyValid) {
    return problem(res, 400, "Idempotency-Key must be a UUID.");
  }
  // The idempotency key doubles as the order id, so a retried request finds its own order.
  const orderId = idempotencyKey || randomUUID();
  const request: OrderRequest = {
    customerId,
    elementSymbol: symbol,
    quantity,
    compoundSlug: requestedCompoundSlug(compoundSlug, elementSymbol),
  };

  // Replay before any upstream call: a retry must not depend on catalog/inventory being up.
  const existing = idempotencyKey ? await orders.getOrderById(orderId) : null;
  if (existing) {
    return replayExistingOrder(res, existing, request);
  }

  const ticker = await resolveTicker(elementSymbol);
  if (!ticker || ticker.ask <= 0) {
    return problem(
      res,
      400,
      `Could not determine market price for '${elementSymbol}'.`,
    );
  }
  if (quantity > ticker.availableStock) {
    return res.status(409).json({
      type: "https://httpstatuses.com/409",
      title: "Conflict",
      status: 409,
      detail: "Insufficient stock.",
      availableStock: ticker.availableStock,
    });
  }

  const sku = await resolveCompound(elementSymbol, compoundSlug);
  if (!sku) {
    return problem(
      res,
      400,
      `Unknown compound '${compoundSlug}' for '${elementSymbol}'.`,
    );
  }

  const totalPrice = compoundLineElx(ticker.ask, sku.priceMult, quantity);
  const isTotalInRange =
    Number.isFinite(totalPrice) && totalPrice > 0 && totalPrice <= CREDIT_LIMIT;
  if (!isTotalInRange) {
    return problem(
      res,
      400,
      "Order total must be between 0.0001 and 50000 credits.",
    );
  }

  const balance = await fetchWalletBalance(customerId);
  if (balance != null && balance < totalPrice) {
    return res.status(402).json({
      type: "https://httpstatuses.com/402",
      title: "Payment Required",
      status: 402,
      detail: "Insufficient credits",
      reason: "INSUFFICIENT_ELX",
      balanceElx: balance,
      requiredElx: totalPrice,
    });
  }

  const isElemental = sku.slug === ELEMENTAL_SLUG;
  const storedCompoundSlug = isElemental ? null : sku.slug;
  const storedCompoundFormula = isElemental ? null : sku.formula;
  const productLabel = isElemental ? symbol : `${sku.formula} · ${symbol}`;

  const created = await orders.createOrderWithSaga({
    id: orderId,
    customerId,
    elementSymbol: symbol,
    quantity,
    totalPrice,
    compoundSlug: storedCompoundSlug,
    compoundFormula: storedCompoundFormula,
    productLabel,
  });
  if (!created) {
    // A concurrent request with the same Idempotency-Key stored the order first: answer like a replay.
    const winner = await orders.getOrderById(orderId);
    return replayExistingOrder(res, winner!, request);
  }

  return res.status(202).json({
    id: orderId,
    customerId,
    elementSymbol: symbol,
    quantity,
    totalPrice,
    ask: ticker.ask,
    last: ticker.last,
    priceMult: sku.priceMult,
    compoundSlug: storedCompoundSlug,
    compoundFormula: storedCompoundFormula,
    productLabel,
    status: "Submitted",
    createdAt: new Date().toISOString(),
  });
});

/** GET /search — filters and pages the caller's orders (status, elementSymbol, free text q of at most 64 characters). */
ordersRouter.get("/search", async (req, res) => {
  const customerId = requireUser(req, res);
  if (!customerId) return;

  const { status, elementSymbol, q, page, pageSize } = req.query;
  if (typeof q === "string" && q.length > MAX_SEARCH_QUERY_LENGTH) {
    return problem(res, 400, "q must be at most 64 characters.");
  }
  const isPagingValid =
    isOptionalIntInRange(page, MAX_SEARCH_PAGE) &&
    isOptionalIntInRange(pageSize, MAX_PAGE_SIZE);
  if (!isPagingValid) {
    return res.status(400).json({
      error:
        "page and pageSize must be positive integers; pageSize is at most 100.",
    });
  }

  const pageNumber = page ? Number(page) : 1;
  const pageSizeNumber = pageSize ? Number(pageSize) : DEFAULT_PAGE_SIZE;
  const result = await searchOrdersByCustomer({
    customerId,
    status: stringOrUndefined(status),
    elementSymbol: stringOrUndefined(elementSymbol),
    q: stringOrUndefined(q),
    page: pageNumber,
    pageSize: pageSizeNumber,
  });

  return res.json({
    count: result.total,
    page: pageNumber,
    pageSize: pageSizeNumber,
    results: result.rows.map(mapOrder),
  });
});

/** GET /stats — the caller's order counts per status and total spent. */
ordersRouter.get("/stats", async (req, res) => {
  const customerId = requireUser(req, res);
  if (!customerId) return;
  const stats = await orders.getOrderStatsByCustomer(customerId);
  return res.json(stats);
});

/** GET /:id — one of the caller's orders; other customers' orders are reported as not found. */
ordersRouter.get("/:id", async (req, res) => {
  const customerId = requireUser(req, res);
  if (!customerId) return;

  const orderId = req.params.id;
  const order = isUuid(orderId) ? await orders.getOrderById(orderId) : null;
  if (!order || order.customer_id !== customerId) {
    return res.status(404).json({ error: "Order not found" });
  }
  return res.json(mapOrder(order));
});

/** GET / — the caller's 100 most recent orders, newest first (older ones via /search). */
ordersRouter.get("/", async (req, res) => {
  const customerId = requireUser(req, res);
  if (!customerId) return;
  const customerOrders = await orders.getOrdersByCustomer(customerId);
  return res.json(customerOrders.map(mapOrder));
});
