import { asyncRouter, isQuantity, isSlug, isSymbol, isUuid } from '../http.js';
import { v4 as uuidv4 } from 'uuid';
import * as orders from '../db/orders.js';
import * as ledger from '../db/ledger.js';
import { searchOrdersByCustomer } from '../db/orderSearch.js';
import { compoundLineElx, resolveCompound, resolveTicker } from '../services/priceResolver.js';
import { requireUser } from '../httpAuth.js';

export const ordersRouter = asyncRouter();

ordersRouter.post('/', async (req, res) => {
  const customerId = requireUser(req, res);
  if (!customerId) return;

  const { elementSymbol, quantity, compoundSlug } = (req.body ?? {}) as {
    elementSymbol?: string;
    quantity?: number;
    compoundSlug?: string;
  };

  if (!isSymbol(elementSymbol) || !isQuantity(quantity) || (compoundSlug != null && !isSlug(compoundSlug))) {
    return res.status(400).json({ error: 'Valid elementSymbol and numeric quantity (0.0001–1000000 g, at most 4 decimals) are required.' });
  }

  const ticker = await resolveTicker(elementSymbol);
  if (!ticker || ticker.ask <= 0) {
    return res.status(400).json({ error: `Could not determine market price for '${elementSymbol}'.` });
  }
  const requestKey = req.header('Idempotency-Key');
  if (requestKey && !isUuid(requestKey)) return res.status(400).json({ error: 'Idempotency-Key must be a UUID.' });
  const orderId = requestKey || uuidv4();
  const normalizedSlug = !compoundSlug || compoundSlug === 'elemental' || compoundSlug === `elemental-${elementSymbol.toLowerCase()}`
    ? null : compoundSlug;
  const replay = (existing: orders.OrderRow) => {
    if (existing.customer_id !== customerId || existing.element_symbol !== elementSymbol.toUpperCase()
        || Number(existing.quantity) !== quantity || existing.compound_slug !== normalizedSlug) {
      return res.status(409).json({ error: 'Idempotency-Key was already used for a different order.' });
    }
    return res.status(200).json(mapOrder(existing));
  };
  const existing = await orders.getOrderById(orderId);
  if (existing) return replay(existing);
  if (quantity > ticker.availableStock) {
    return res.status(409).json({ error: 'Insufficient stock.', availableStock: ticker.availableStock });
  }

  const sku = await resolveCompound(elementSymbol, compoundSlug);
  if (!sku) {
    return res.status(400).json({ error: `Unknown compound '${compoundSlug}' for '${elementSymbol}'.` });
  }

  const totalPrice = compoundLineElx(ticker.ask, sku.priceMult, quantity);
  if (!Number.isFinite(totalPrice) || totalPrice <= 0 || totalPrice > 50000) {
    return res.status(400).json({ error: 'Order total must be between 0.0001 and 50000 credits.' });
  }
  const balance = await ledger.ensureWallet(customerId);
  if (balance < totalPrice) {
    return res.status(402).json({
      error: 'Insufficient credits',
      reason: 'INSUFFICIENT_ELX',
      balanceElx: balance,
      requiredElx: totalPrice,
    });
  }

  const symbol = elementSymbol.toUpperCase();
  const productLabel = sku.slug === 'elemental' ? symbol : `${sku.formula} · ${symbol}`;
  const created = await orders.createOrderWithSaga({
    id: orderId,
    customerId,
    elementSymbol: symbol,
    quantity,
    totalPrice,
    compoundSlug: sku.slug === 'elemental' ? null : sku.slug,
    compoundFormula: sku.slug === 'elemental' ? null : sku.formula,
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
    compoundSlug: sku.slug === 'elemental' ? null : sku.slug,
    compoundFormula: sku.slug === 'elemental' ? null : sku.formula,
    productLabel,
    status: 'Submitted',
    createdAt: new Date().toISOString(),
  });
});

ordersRouter.get('/search', async (req, res) => {
  const customerId = requireUser(req, res);
  if (!customerId) return;

  const { status, elementSymbol, q, page, pageSize } = req.query;
  if ((page != null && (!Number.isSafeInteger(Number(page)) || Number(page) < 1 || Number(page) > 1000000))
      || (pageSize != null && (!Number.isSafeInteger(Number(pageSize)) || Number(pageSize) < 1 || Number(pageSize) > 100))) {
    return res.status(400).json({ error: 'page and pageSize must be positive integers; pageSize is at most 100.' });
  }
  const result = await searchOrdersByCustomer({
    customerId,
    status: typeof status === 'string' ? status : undefined,
    elementSymbol: typeof elementSymbol === 'string' ? elementSymbol : undefined,
    q: typeof q === 'string' ? q : undefined,
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

ordersRouter.get('/stats', async (req, res) => {
  const customerId = requireUser(req, res);
  if (!customerId) return;
  const stats = await orders.getOrderStatsByCustomer(customerId);
  return res.json(stats);
});

ordersRouter.get('/:id', async (req, res) => {
  const customerId = requireUser(req, res);
  if (!customerId) return;
  if (!isUuid(req.params.id)) return res.status(404).json({ error: 'Order not found' });
  const order = await orders.getOrderById(req.params.id);
  if (!order || order.customer_id !== customerId) {
    return res.status(404).json({ error: 'Order not found' });
  }
  return res.json(mapOrder(order));
});

ordersRouter.get('/', async (req, res) => {
  const customerId = requireUser(req, res);
  if (!customerId) return;
  const list = await orders.getOrdersByCustomer(customerId);
  return res.json(list.map(mapOrder));
});

function mapOrder(row: orders.OrderRow) {
  const formula = row.compound_formula ?? null;
  const slug = row.compound_slug ?? null;
  const productLabel = row.product_label
    || (formula ? `${formula} · ${Number(row.quantity)} g` : `${row.element_symbol} · ${Number(row.quantity)} g`);
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
