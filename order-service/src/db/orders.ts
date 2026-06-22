import type pg from 'pg';
import { pool } from './pool.js';
import { enqueueOutbox } from './outbox.js';
import { config } from '../config.js';
import { exchangeName } from '../messaging/massTransit.js';

export interface OrderRow {
  id: string;
  customer_id: string;
  element_symbol: string;
  quantity: string;
  total_price: string;
  status: string;
  created_at: Date;
}

function deadlineForState(state: string): Date | null {
  const seconds = config.sagaTimeoutSeconds[state];
  if (!seconds) return null;
  return new Date(Date.now() + seconds * 1000);
}

export async function insertOrder(row: {
  id: string;
  customerId: string;
  elementSymbol: string;
  quantity: number;
  totalPrice: number;
  status: string;
}): Promise<void> {
  await pool.query(
    `INSERT INTO orders (id, customer_id, element_symbol, quantity, total_price, status)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [row.id, row.customerId, row.elementSymbol, row.quantity, row.totalPrice, row.status]
  );
}

export async function createOrderWithSaga(row: {
  id: string;
  customerId: string;
  elementSymbol: string;
  quantity: number;
  totalPrice: number;
}): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `INSERT INTO orders (id, customer_id, element_symbol, quantity, total_price, status)
       VALUES ($1, $2, $3, $4, $5, 'Submitted')`,
      [row.id, row.customerId, row.elementSymbol, row.quantity, row.totalPrice]
    );
    const deadline = deadlineForState('Submitted');
    await client.query(
      `INSERT INTO saga_state (order_id, customer_id, element_symbol, quantity, total_price, current_state, deadline_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,'Submitted',$6,NOW())`,
      [row.id, row.customerId, row.elementSymbol, row.quantity, row.totalPrice, deadline]
    );
    await enqueueOutbox(client, {
      messageType: 'UpdateOrderStatusEvent',
      payload: { orderId: row.id, status: 'Submitted', errorMessage: null },
      route: 'exchange',
      routeTarget: exchangeName('UpdateOrderStatusEvent'),
    });
    await enqueueOutbox(client, {
      messageType: 'OrderSubmittedEvent',
      payload: {
        orderId: row.id,
        customerId: row.customerId,
        elementSymbol: row.elementSymbol,
        quantity: row.quantity,
        totalPrice: row.totalPrice,
      },
      route: 'exchange',
      routeTarget: exchangeName('OrderSubmittedEvent'),
    });
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function updateOrderStatus(orderId: string, status: string): Promise<void> {
  await pool.query(`UPDATE orders SET status = $2 WHERE id = $1`, [orderId, status]);
}

export async function getOrderById(id: string): Promise<OrderRow | null> {
  const res = await pool.query(`SELECT * FROM orders WHERE id = $1`, [id]);
  return res.rows[0] ?? null;
}

export async function getOrdersByCustomer(customerId: string): Promise<OrderRow[]> {
  const res = await pool.query(
    `SELECT * FROM orders WHERE customer_id = $1 ORDER BY created_at DESC`,
    [customerId]
  );
  return res.rows;
}

export interface OrderStats {
  total: number;
  totalSpent: number;
  byStatus: Record<string, number>;
}

export async function getOrderStatsByCustomer(customerId: string): Promise<OrderStats> {
  const res = await pool.query(
    `SELECT status, COUNT(*)::int AS count, COALESCE(SUM(total_price), 0) AS spent
     FROM orders WHERE customer_id = $1 GROUP BY status`,
    [customerId]
  );
  const byStatus: Record<string, number> = {};
  let total = 0;
  let totalSpent = 0;
  for (const row of res.rows) {
    const count = Number(row.count);
    byStatus[row.status] = count;
    total += count;
    totalSpent += Number(row.spent);
  }
  return { total, totalSpent: Math.round(totalSpent * 10000) / 10000, byStatus };
}

export async function upsertSaga(row: {
  orderId: string;
  customerId: string;
  elementSymbol: string;
  quantity: number;
  totalPrice: number;
  currentState: string;
  errorMessage?: string;
}): Promise<void> {
  const deadline = deadlineForState(row.currentState);
  await pool.query(
    `INSERT INTO saga_state (order_id, customer_id, element_symbol, quantity, total_price, current_state, error_message, deadline_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW())
     ON CONFLICT (order_id) DO UPDATE SET
       current_state = EXCLUDED.current_state,
       error_message = EXCLUDED.error_message,
       deadline_at = EXCLUDED.deadline_at,
       updated_at = NOW()`,
    [
      row.orderId,
      row.customerId,
      row.elementSymbol,
      row.quantity,
      row.totalPrice,
      row.currentState,
      row.errorMessage ?? null,
      deadline,
    ]
  );
}

export async function transitionSaga(
  client: pg.PoolClient,
  ctx: {
    orderId: string;
    customerId: string;
    elementSymbol: string;
    quantity: number;
    totalPrice: number;
  },
  status: string,
  error?: string
): Promise<void> {
  const deadline = deadlineForState(status);
  await client.query(`UPDATE orders SET status = $2 WHERE id = $1`, [ctx.orderId, status]);
  await client.query(
    `UPDATE saga_state SET current_state = $2, error_message = $3, deadline_at = $4, updated_at = NOW()
     WHERE order_id = $1`,
    [ctx.orderId, status, error ?? null, deadline]
  );
  await enqueueOutbox(client, {
    messageType: 'UpdateOrderStatusEvent',
    payload: { orderId: ctx.orderId, status, errorMessage: error ?? null },
    route: 'exchange',
    routeTarget: exchangeName('UpdateOrderStatusEvent'),
  });
}

export async function getSagaState(orderId: string): Promise<{ current_state: string } | null> {
  const res = await pool.query(`SELECT current_state FROM saga_state WHERE order_id = $1`, [orderId]);
  return res.rows[0] ?? null;
}
