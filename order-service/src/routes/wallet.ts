import { asyncRouter, isQuantity, isSlug, isSymbol, isUuid } from '../http.js';
import { pool } from '../db/pool.js';
import * as ledger from '../db/ledger.js';
import * as orders from '../db/orders.js';
import { enqueueOutbox } from '../db/outbox.js';
import { exchangeName } from '../messaging/massTransit.js';
import { resolveCompound, resolveTicker } from '../services/priceResolver.js';
import { requireInternal, requireUser } from '../httpAuth.js';

export const meRouter = asyncRouter();
export const deskRouter = asyncRouter();
export const internalWalletRouter = asyncRouter();

meRouter.get('/wallet', async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  const wallet = await ledger.getWallet(userId);
  return res.json({ balanceElx: wallet.balanceElx, currency: 'KREDI', updatedAt: wallet.updatedAt });
});

meRouter.get('/holdings', async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  const holdings = await ledger.getHoldings(userId);
  return res.json(holdings);
});

deskRouter.post('/sell', async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;

  const { symbol, grams, compoundSlug } = (req.body ?? {}) as { symbol?: string; grams?: number; compoundSlug?: string };
  if (!isSymbol(symbol) || !isQuantity(grams) || (compoundSlug != null && !isSlug(compoundSlug))) {
    return res.status(400).json({ error: 'symbol and grams are required.' });
  }

  const sym = symbol.toUpperCase();
  const ticker = await resolveTicker(sym);
  if (!ticker || ticker.bid <= 0) {
    return res.status(400).json({ error: `Could not determine bid for '${sym}'.` });
  }
  const sku = await resolveCompound(sym, compoundSlug);
  if (!sku) return res.status(400).json({ error: 'Unknown product.' });
  const bid = Math.round(ticker.bid * sku.priceMult * 10000) / 10000;
  if (Math.round(bid * grams * 10000) <= 0) return res.status(400).json({ error: 'Sale amount is too small.' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await ledger.sellAtBid(client, {
      userId,
      symbol: sym,
      grams,
      bid,
      compoundSlug: sku.slug,
    });
    if (!result.ok) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: result.reason === 'no_holding' ? 'No holdings for this symbol.' : 'Insufficient holdings.',
        reason: result.reason,
      });
    }
    await enqueueOutbox(client, {
      messageType: 'ElementSoldEvent',
      payload: { elementSymbol: sym, grams, customerId: userId },
      route: 'exchange',
      routeTarget: exchangeName('ElementSoldEvent'),
    });
    await client.query('COMMIT');
    return res.json({
      symbol: result.symbol,
      grams: result.grams,
      bid: result.bid,
      proceedsElx: result.proceeds,
      balanceElx: result.balanceElx,
      currency: 'KREDI',
    });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
});

internalWalletRouter.post('/debit', async (req, res) => {
  if (!requireInternal(req, res)) return;
  const { orderId, customerId, amount } = (req.body ?? {}) as {
    orderId?: string;
    customerId?: string;
    amount?: number;
  };
  if (!isUuid(orderId) || !isUuid(customerId) || typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) {
    return res.status(400).json({ error: 'orderId, customerId and amount are required.' });
  }

  const order = await orders.getOrderById(orderId);
  if (!order || order.customer_id !== customerId) {
    return res.status(404).json({ error: 'Order not found' });
  }
  if (Math.abs(Number(order.total_price) - amount) > 0.00001) {
    return res.status(409).json({ error: 'Payment amount does not match order.' });
  }

  const result = await ledger.debitForOrder({
    userId: customerId,
    orderId,
    amount: Number(amount),
    symbol: order.element_symbol,
    grams: Number(order.quantity),
  });

  if (result === 'insufficient') {
    return res.status(402).json({ error: 'Insufficient credits', reason: 'INSUFFICIENT_ELX' });
  }
  if (result === 'cancelled') return res.status(409).json({ error: 'Order is no longer payable.' });
  return res.json({ ok: true, duplicate: result === 'duplicate' });
});

internalWalletRouter.post('/credit', async (req, res) => {
  if (!requireInternal(req, res)) return;
  const { orderId, customerId } = (req.body ?? {}) as { orderId?: string; customerId?: string };
  if (!isUuid(orderId) || !isUuid(customerId)) {
    return res.status(400).json({ error: 'orderId and customerId are required.' });
  }
  const result = await ledger.creditRefundHttp({ userId: customerId, orderId, amount: 0 });
  return res.json({ ok: true, result });
});

internalWalletRouter.post('/refund', async (req, res) => {
  if (!requireInternal(req, res)) return;
  const { orderId, customerId } = (req.body ?? {}) as { orderId?: string; customerId?: string };
  if (!isUuid(orderId) || !isUuid(customerId)) {
    return res.status(400).json({ error: 'orderId and customerId are required.' });
  }
  const result = await ledger.creditRefundHttp({ userId: customerId, orderId, amount: 0 });
  return res.json({ ok: true, result });
});
