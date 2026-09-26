import { asyncRouter, isUuid, problem } from "../http.js";
import { randomUUID } from "node:crypto";
import * as orders from "../db/orders.js";
import { searchOrdersByCustomer } from "../db/orderSearch.js";
import {
  compoundLineElx,
  resolveCompound,
  resolveTicker,
} from "../services/priceResolver.js";
import { requireUser } from "../httpAuth.js";
import { config } from "../config.js";
import { createOrderBodySchema, idempotencyKeySchema } from "../schemas.js";

export const ordersRouter = asyncRouter();

async function walletBalance(customerId: string): Promise<number | null> {
  try {
    const res = await fetch(`${config.walletServiceUrl}/api/v1/me/wallet`, {
      headers: {
        INTERNAL_API_KEY: config.internalApiKey,
        "X-User-Id": customerId,
      },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { balanceElx?: number };
    return Number(data.balanceElx);
  } catch {
    return null;
  }
}

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

  const ticker = await resolveTicker(elementSymbol);
  if (!ticker || ticker.ask <= 0) {
    return problem(
      res,
      400,
      `Could not determine market price for '${elementSymbol}'.`,
    );
  }
  const requestKey = req.header("Idempotency-Key");
  if (requestKey) {
    const keyOk = idempotencyKeySchema.safeParse(requestKey);
    if (!keyOk.success)
      return problem(res, 400, "Idempotency-Key must be a UUID.");
  }
  const orderId = requestKey || randomUUID();
  const normalizedSlug =
    !compoundSlug ||
    compoundSlug === "elemental" ||
    compoundSlug === `elemental-${elementSymbol.toLowerCase()}`
      ? null
      : compoundSlug;
  const replay = (existing: orders.OrderRow) => {
    if (
      existing.customer_id !== customerId ||
      existing.element_symbol !== elementSymbol.toUpperCase() ||
      Number(existing.quantity) !== quantity ||
      existing.compound_slug !== normalizedSlug
    ) {
      return problem(
        res,
        409,
        "Idempotency-Key was already used for a different order.",
      );
    }
    return res.status(200).json(mapOrder(existing));
  };
  const existing = await orders.getOrderById(orderId);
  if (existing) return replay(existing);
  if (quantity > ticker.availableStock) {
    return res.status(409).json({
      type: "https://httpstatuses.com/409",
      title: "Conflict",
      status: 409,
      detail: "Insufficient stock.",
      availableStock: ticker.availableStock,
    });
  }

  const sku = await resolveCompound(elementSymbol, compoundSlug ?? undefined);
  if (!sku) {
    return problem(
      res,
      400,
      `Unknown compound '${compoundSlug}' for '${elementSymbol}'.`,
    );
  }

  const totalPrice = compoundLineElx(ticker.ask, sku.priceMult, quantity);
  if (!Number.isFinite(totalPrice) || totalPrice <= 0 || totalPrice > 50000) {
    return problem(
      res,
      400,
      "Order total must be between 0.0001 and 50000 credits.",
    );
  }
  const balance = await walletBalance(customerId);
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

  const symbol = elementSymbol.toUpperCase();
  const productLabel =
    sku.slug === "elemental" ? symbol : `${sku.formula} · ${symbol}`;
  const created = await orders.createOrderWithSaga({
    id: orderId,
    customerId,
    elementSymbol: symbol,
    quantity,
    totalPrice,
    compoundSlug: sku.slug === "elemental" ? null : sku.slug,
    compoundFormula: sku.slug === "elemental" ? null : sku.formula,
    productLabel,
  });
  if (!created) return replay((await orders.getOrderById(orderId))!);

  return res.status(202).json({
    id: orderId,
    customerId,
    elementSymbol: symbol,
    quantity,
    totalPrice,
    ask: ticker.ask,
    last: ticker.last,
    priceMult: sku.priceMult,
    compoundSlug: sku.slug === "elemental" ? null : sku.slug,
    compoundFormula: sku.slug === "elemental" ? null : sku.formula,
    productLabel,
    status: "Submitted",
    createdAt: new Date().toISOString(),
  });
});

ordersRouter.get("/search", async (req, res) => {
  const customerId = requireUser(req, res);
  if (!customerId) return;

  const { status, elementSymbol, q, page, pageSize } = req.query;
  if (
    (page != null &&
      (!Number.isSafeInteger(Number(page)) ||
        Number(page) < 1 ||
        Number(page) > 1000000)) ||
    (pageSize != null &&
      (!Number.isSafeInteger(Number(pageSize)) ||
        Number(pageSize) < 1 ||
        Number(pageSize) > 100))
  ) {
    return res
      .status(400)
      .json({
        error:
          "page and pageSize must be positive integers; pageSize is at most 100.",
      });
  }
  const result = await searchOrdersByCustomer({
    customerId,
    status: typeof status === "string" ? status : undefined,
    elementSymbol:
      typeof elementSymbol === "string" ? elementSymbol : undefined,
    q: typeof q === "string" ? q : undefined,
    page: page ? Number(page) : 1,
    pageSize: pageSize ? Number(pageSize) : 20,
  });

  return res.json({
    count: result.total,
    page: page ? Number(page) : 1,
    pageSize: pageSize ? Number(pageSize) : 20,
    results: result.rows.map(mapOrder),
  });
});

ordersRouter.get("/stats", async (req, res) => {
  const customerId = requireUser(req, res);
  if (!customerId) return;
  const stats = await orders.getOrderStatsByCustomer(customerId);
  return res.json(stats);
});

ordersRouter.get("/:id", async (req, res) => {
  const customerId = requireUser(req, res);
  if (!customerId) return;
  if (!isUuid(req.params.id))
    return res.status(404).json({ error: "Order not found" });
  const order = await orders.getOrderById(req.params.id);
  if (!order || order.customer_id !== customerId) {
    return res.status(404).json({ error: "Order not found" });
  }
  return res.json(mapOrder(order));
});

ordersRouter.get("/", async (req, res) => {
  const customerId = requireUser(req, res);
  if (!customerId) return;
  const list = await orders.getOrdersByCustomer(customerId);
  return res.json(list.map(mapOrder));
});

function mapOrder(row: orders.OrderRow) {
  const formula = row.compound_formula ?? null;
  const slug = row.compound_slug ?? null;
  const productLabel =
    row.product_label ||
    (formula
      ? `${formula} · ${Number(row.quantity)} g`
      : `${row.element_symbol} · ${Number(row.quantity)} g`);
  return {
    id: row.id,
    customerId: row.customer_id,
    elementSymbol: row.element_symbol,
    quantity: Number(row.quantity),
    totalPrice: Number(row.total_price),
    status: row.status,
    trackingNumber: row.tracking_number ?? null,
    compoundSlug: slug,
    compoundFormula: formula,
    productLabel,
    createdAt: row.created_at,
  };
}
