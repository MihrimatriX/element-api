import type pg from "pg";
import { inTransaction, pool } from "./pool.js";
import { enqueueOutboxEvent } from "./outbox.js";
import { config } from "../config.js";
import { roundToFourDecimals } from "../compoundPrice.js";
import { Order } from "../domain/order.js";

/** One row of the `orders` table as returned by `SELECT *` (NUMERIC columns arrive as strings). */
export interface OrderRow {
  id: string;
  customer_id: string;
  element_symbol: string;
  quantity: string;
  total_price: string;
  status: string;
  tracking_number: string | null;
  compound_slug: string | null;
  compound_formula: string | null;
  product_label: string | null;
  created_at: Date;
}

/** Order totals for one customer, grouped by status. */
export interface OrderStats {
  total: number;
  totalSpent: number;
  byStatus: Record<string, number>;
}

/** A saga past its state deadline, as found by the timeout sweeper. */
export interface ExpiredSaga {
  orderId: string;
  state: string;
}

/** When a saga entering `state` should time out, or null for states without a timeout (Completed, Failed). */
function deadlineForState(state: string): Date | null {
  const timeoutSeconds = config.sagaTimeoutSeconds[state];
  if (!timeoutSeconds) return null;
  return new Date(Date.now() + timeoutSeconds * 1000);
}

/**
 * Rebuilds the Order aggregate from its row. NUMERIC(18,4) strings become numbers: orders are capped
 * at 1,000,000 g and 50,000 KREDI, so at most 11 significant digits, which a double holds exactly.
 */
function orderFromRow(row: OrderRow): Order {
  return Order.restore(
    {
      id: row.id,
      customerId: row.customer_id,
      elementSymbol: row.element_symbol,
      quantity: Number(row.quantity),
      totalPrice: Number(row.total_price),
      compoundSlug: row.compound_slug,
      compoundFormula: row.compound_formula,
      productLabel: row.product_label,
    },
    row.status,
    row.tracking_number,
  );
}

/**
 * Stores a newly placed order, its saga row and its events (UpdateOrderStatusEvent + OrderSubmittedEvent)
 * in one transaction. Returns false (and changes nothing) when an order with this id already exists.
 */
export async function createOrderWithSaga(order: Order): Promise<boolean> {
  const { facts } = order;
  return inTransaction(async (client) => {
    const inserted = await client.query(
      `INSERT INTO orders (id, customer_id, element_symbol, quantity, total_price, status, compound_slug, compound_formula, product_label)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (id) DO NOTHING RETURNING id`,
      [
        facts.id,
        facts.customerId,
        facts.elementSymbol,
        facts.quantity,
        facts.totalPrice,
        order.status,
        facts.compoundSlug,
        facts.compoundFormula,
        facts.productLabel,
      ],
    );
    if (!inserted.rowCount) return false;

    await client.query(
      `INSERT INTO saga_state (order_id, customer_id, element_symbol, quantity, total_price, current_state, deadline_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())`,
      [
        facts.id,
        facts.customerId,
        facts.elementSymbol,
        facts.quantity,
        facts.totalPrice,
        order.status,
        deadlineForState(order.status),
      ],
    );
    await saveOrder(client, order);
    return true;
  });
}

/** Loads the order and row-locks it until the transaction ends, so decisions for one order never run in parallel. */
export async function lockOrder(
  client: pg.PoolClient,
  orderId: string,
): Promise<Order | undefined> {
  const result = await client.query<OrderRow>(
    `SELECT * FROM orders WHERE id = $1 FOR UPDATE`,
    [orderId],
  );
  return result.rows[0] && orderFromRow(result.rows[0]);
}

/**
 * Writes what the order decided, inside the caller's transaction: on a status change the order status,
 * tracking number and saga row (with the new state's deadline), then every recorded event to the outbox.
 */
export async function saveOrder(
  client: pg.PoolClient,
  order: Order,
): Promise<void> {
  const { id } = order.facts;
  if (order.statusChanged) {
    await client.query(
      `UPDATE orders SET status = $2, tracking_number = $3 WHERE id = $1`,
      [id, order.status, order.trackingNumber],
    );
    await client.query(
      `UPDATE saga_state SET current_state = $2, error_message = $3, deadline_at = $4, updated_at = NOW()
       WHERE order_id = $1`,
      [id, order.status, order.failureReason, deadlineForState(order.status)],
    );
  }
  for (const event of order.events) {
    await enqueueOutboxEvent(client, event.type, event.payload);
  }
}

/** Sagas whose state deadline has passed and that are not finished yet. */
export async function findExpiredSagas(): Promise<ExpiredSaga[]> {
  const result = await pool.query(
    `SELECT order_id, current_state FROM saga_state
     WHERE deadline_at IS NOT NULL
       AND deadline_at < NOW()
       AND current_state NOT IN ('Completed', 'Failed')`,
  );
  return result.rows.map((row) => ({
    orderId: row.order_id as string,
    state: row.current_state as string,
  }));
}

/**
 * Re-checks inside the caller's transaction (and locks the saga row) that the saga is still in `state`
 * past its deadline. False when a saga event moved the order on since the sweep read it.
 */
export async function isSagaStillExpired(
  client: pg.PoolClient,
  orderId: string,
  state: string,
): Promise<boolean> {
  const result = await client.query(
    `SELECT current_state FROM saga_state
      WHERE order_id = $1 AND deadline_at < NOW() AND current_state = $2 FOR UPDATE`,
    [orderId, state],
  );
  return Boolean(result.rowCount);
}

/** Loads one order by id, or null when it does not exist. */
export async function getOrderById(id: string): Promise<OrderRow | null> {
  const result = await pool.query(`SELECT * FROM orders WHERE id = $1`, [id]);
  return result.rows[0] ?? null;
}

/**
 * Lists one customer's orders, newest first. Most recent 100 only (bounded response);
 * older history pages via /orders/search.
 */
export async function getOrdersByCustomer(
  customerId: string,
): Promise<OrderRow[]> {
  const result = await pool.query(
    `SELECT * FROM orders WHERE customer_id = $1 ORDER BY created_at DESC LIMIT 100`,
    [customerId],
  );
  return result.rows;
}

/** Counts one customer's orders per status and sums what they spent (all statuses included). */
export async function getOrderStatsByCustomer(
  customerId: string,
): Promise<OrderStats> {
  const result = await pool.query(
    `SELECT status, COUNT(*)::int AS count, COALESCE(SUM(total_price), 0) AS spent
     FROM orders WHERE customer_id = $1 GROUP BY status`,
    [customerId],
  );
  const byStatus: Record<string, number> = {};
  let total = 0;
  let totalSpent = 0;
  for (const statusRow of result.rows) {
    const count = Number(statusRow.count);
    byStatus[statusRow.status] = count;
    total += count;
    totalSpent += Number(statusRow.spent);
  }
  return {
    total,
    totalSpent: roundToFourDecimals(totalSpent),
    byStatus,
  };
}
