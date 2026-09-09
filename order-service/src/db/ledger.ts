import { randomUUID } from 'node:crypto';
import type pg from 'pg';
import { pool } from './pool.js';

export function weightedAvgCost(
  oldGrams: number,
  oldAvg: number,
  addGrams: number,
  addCost: number
): number {
  const total = oldGrams + addGrams;
  if (total <= 0) return 0;
  return Math.round(((oldGrams * oldAvg + addGrams * addCost) / total) * 10000) / 10000;
}

export async function ensureWallet(userId: string, client?: pg.PoolClient): Promise<number> {
  const run = async (c: pg.PoolClient) => {
    const inserted = await c.query(
      `INSERT INTO wallets (user_id, balance_elx, updated_at)
       VALUES ($1, 10000, NOW())
       ON CONFLICT (user_id) DO NOTHING
       RETURNING balance_elx`,
      [userId]
    );
    if ((inserted.rowCount ?? 0) > 0) {
      await c.query(
        `INSERT INTO ledger (id, user_id, kind, elx, created_at)
         VALUES ($1, $2, 'grant', 10000, NOW())`,
        [randomUUID(), userId]
      );
    }
    const row = await c.query(`SELECT balance_elx FROM wallets WHERE user_id = $1`, [userId]);
    return Number(row.rows[0].balance_elx);
  };

  if (client) return run(client);

  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    const balance = await run(c);
    await c.query('COMMIT');
    return balance;
  } catch (err) {
    await c.query('ROLLBACK');
    throw err;
  } finally {
    c.release();
  }
}

export async function getWallet(userId: string): Promise<{ balanceElx: number; updatedAt: Date }> {
  const balance = await ensureWallet(userId);
  const res = await pool.query(`SELECT balance_elx, updated_at FROM wallets WHERE user_id = $1`, [userId]);
  return { balanceElx: Number(res.rows[0].balance_elx), updatedAt: res.rows[0].updated_at };
}

export async function getHoldings(userId: string): Promise<
  { symbol: string; grams: number; avgCostElx: number; compoundSlug: string; productLabel: string }[]
> {
  const res = await pool.query(
    `SELECT symbol, grams, avg_cost_elx, compound_slug, product_label FROM holdings WHERE user_id = $1 AND grams > 0 ORDER BY symbol, compound_slug`,
    [userId]
  );
  return res.rows.map((r) => ({
    symbol: r.symbol as string,
    grams: Number(r.grams),
    avgCostElx: Number(r.avg_cost_elx),
    compoundSlug: r.compound_slug as string,
    productLabel: (r.product_label || r.symbol) as string,
  }));
}

export type DebitResult = 'ok' | 'duplicate' | 'insufficient' | 'cancelled';

export async function debitForOrder(params: {
  userId: string;
  orderId: string;
  amount: number;
  symbol: string;
  grams: number;
}): Promise<DebitResult> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const order = await client.query(`SELECT status, customer_id FROM orders WHERE id = $1 FOR UPDATE`, [params.orderId]);
    if (!order.rows[0] || order.rows[0].customer_id !== params.userId || ['Failed', 'Compensated'].includes(order.rows[0].status)) {
      await client.query('ROLLBACK');
      return 'cancelled';
    }
    await ensureWallet(params.userId, client);
    await client.query(`SELECT balance_elx FROM wallets WHERE user_id = $1 FOR UPDATE`, [params.userId]);

    const existing = await client.query(
      `SELECT id FROM ledger WHERE order_id = $1 AND kind = 'buy'`,
      [params.orderId]
    );
    if ((existing.rowCount ?? 0) > 0) {
      await client.query('COMMIT');
      return 'duplicate';
    }
    if (order.rows[0].status !== 'StockReserved') {
      await client.query('ROLLBACK');
      return 'cancelled';
    }

    const bal = await client.query(`SELECT balance_elx FROM wallets WHERE user_id = $1`, [params.userId]);
    const balance = Number(bal.rows[0].balance_elx);
    if (balance < params.amount) {
      await client.query('ROLLBACK');
      return 'insufficient';
    }

    await client.query(
      `UPDATE wallets SET balance_elx = balance_elx - $2, updated_at = NOW() WHERE user_id = $1`,
      [params.userId, params.amount]
    );
    await client.query(
      `INSERT INTO ledger (id, user_id, kind, elx, symbol, grams, order_id, created_at)
       VALUES ($1, $2, 'buy', $3, $4, $5, $6, NOW())`,
      [randomUUID(), params.userId, params.amount, params.symbol, params.grams, params.orderId]
    );
    await client.query('COMMIT');
    return 'ok';
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function refundIfDebited(
  client: pg.PoolClient,
  params: { userId: string; orderId: string; amount: number; symbol?: string; grams?: number }
): Promise<'ok' | 'skipped' | 'duplicate'> {
  // Serialize refund and debit against the same order before inspecting the ledger.
  const order = await client.query(`SELECT customer_id FROM orders WHERE id = $1 FOR UPDATE`, [params.orderId]);
  if (!order.rows[0] || order.rows[0].customer_id !== params.userId) return 'skipped';
  await client.query(`SELECT balance_elx FROM wallets WHERE user_id = $1 FOR UPDATE`, [params.userId]);
  const buy = await client.query(
    `SELECT elx FROM ledger WHERE order_id = $1 AND kind = 'buy'`,
    [params.orderId]
  );
  if ((buy.rowCount ?? 0) === 0) return 'skipped';

  const refunded = await client.query(
    `SELECT id FROM ledger WHERE order_id = $1 AND kind = 'refund'`,
    [params.orderId]
  );
  if ((refunded.rowCount ?? 0) > 0) return 'duplicate';

  const amount = Number(buy.rows[0].elx);
  await client.query(`SELECT balance_elx FROM wallets WHERE user_id = $1 FOR UPDATE`, [params.userId]);
  await client.query(
    `UPDATE wallets SET balance_elx = balance_elx + $2, updated_at = NOW() WHERE user_id = $1`,
    [params.userId, amount]
  );
  await client.query(
    `INSERT INTO ledger (id, user_id, kind, elx, symbol, grams, order_id, created_at)
     VALUES ($1, $2, 'refund', $3, $4, $5, $6, NOW())`,
    [randomUUID(), params.userId, amount, params.symbol ?? null, params.grams ?? null, params.orderId]
  );
  return 'ok';
}

export async function creditRefundHttp(params: {
  userId: string;
  orderId: string;
  amount: number;
}): Promise<'ok' | 'skipped' | 'duplicate'> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await refundIfDebited(client, params);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function addHolding(
  client: pg.PoolClient,
  userId: string,
  symbol: string,
  grams: number,
  unitCost: number,
  compoundSlug = 'elemental',
  productLabel: string | null = null
): Promise<void> {
  await ensureWallet(userId, client);
  await client.query(`SELECT user_id FROM wallets WHERE user_id = $1 FOR UPDATE`, [userId]);
  await client.query(
    `INSERT INTO holdings (user_id, symbol, grams, avg_cost_elx, compound_slug, product_label)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (user_id, symbol, compound_slug) DO UPDATE SET
       avg_cost_elx = ROUND((holdings.grams * holdings.avg_cost_elx + EXCLUDED.grams * EXCLUDED.avg_cost_elx)
         / (holdings.grams + EXCLUDED.grams), 4),
       grams = holdings.grams + EXCLUDED.grams,
       product_label = EXCLUDED.product_label`,
    [userId, symbol, grams, unitCost, compoundSlug, productLabel]
  );
}

export type SellResult =
  | { ok: true; proceeds: number; bid: number; grams: number; symbol: string; balanceElx: number }
  | { ok: false; reason: 'over_holding' | 'no_holding' };

export async function sellAtBid(
  client: pg.PoolClient,
  params: { userId: string; symbol: string; grams: number; bid: number; compoundSlug?: string }
): Promise<SellResult> {
  await ensureWallet(params.userId, client);
  await client.query(`SELECT user_id FROM wallets WHERE user_id = $1 FOR UPDATE`, [params.userId]);
  const slug = params.compoundSlug ?? 'elemental';
  const hold = await client.query(
    `SELECT grams, avg_cost_elx FROM holdings WHERE user_id = $1 AND symbol = $2 AND compound_slug = $3 FOR UPDATE`,
    [params.userId, params.symbol, slug]
  );
  if ((hold.rowCount ?? 0) === 0) return { ok: false, reason: 'no_holding' };
  const have = Number(hold.rows[0].grams);
  if (have < params.grams) return { ok: false, reason: 'over_holding' };

  const remaining = Math.round((have - params.grams) * 10000) / 10000;
  if (remaining <= 0) {
    await client.query(`DELETE FROM holdings WHERE user_id = $1 AND symbol = $2 AND compound_slug = $3`, [
      params.userId,
      params.symbol,
      slug,
    ]);
  } else {
    await client.query(`UPDATE holdings SET grams = $3 WHERE user_id = $1 AND symbol = $2 AND compound_slug = $4`, [
      params.userId,
      params.symbol,
      remaining,
      slug,
    ]);
  }

  const proceeds = Math.round(params.bid * params.grams * 10000) / 10000;
  await client.query(`SELECT balance_elx FROM wallets WHERE user_id = $1 FOR UPDATE`, [params.userId]);
  await client.query(
    `UPDATE wallets SET balance_elx = balance_elx + $2, updated_at = NOW() WHERE user_id = $1`,
    [params.userId, proceeds]
  );
  await client.query(
    `INSERT INTO ledger (id, user_id, kind, elx, symbol, grams, compound_slug, created_at)
     VALUES ($1, $2, 'sell', $3, $4, $5, $6, NOW())`,
    [randomUUID(), params.userId, proceeds, params.symbol, params.grams, slug]
  );
  const bal = await client.query(`SELECT balance_elx FROM wallets WHERE user_id = $1`, [params.userId]);
  return {
    ok: true,
    proceeds,
    bid: params.bid,
    grams: params.grams,
    symbol: params.symbol,
    balanceElx: Number(bal.rows[0].balance_elx),
  };
}
