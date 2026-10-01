import type pg from "pg";
import { pool } from "./pool.js";
import { enqueueOutboxEvent } from "./outbox.js";
import { config } from "../config.js";
import { roundToFourDecimals } from "../compoundPrice.js";

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

/** The order facts every saga step and compensation event needs. */
export interface SagaContext {
  orderId: string;
  customerId: string;
  elementSymbol: string;
  quantity: number;
  totalPrice: number;
}

/** A priced order that is about to be stored and handed to the saga. */
interface NewOrder {
  id: string;
  customerId: string;
  elementSymbol: string;
  quantity: number;
  totalPrice: number;
  compoundSlug?: string | null;
  compoundFormula?: string | null;
  productLabel?: string | null;
}

/** Order totals for one customer, grouped by status. */
export interface OrderStats {
  total: number;
  totalSpent: number;
  byStatus: Record<string, number>;
}

/** When a saga entering `state` should time out, or null for states without a timeout (Completed, Failed). */
function deadlineForState(state: string): Date | null {
  const timeoutSeconds = config.sagaTimeoutSeconds[state];
  if (!timeoutSeconds) return null;
  return new Date(Date.now() + timeoutSeconds * 1000);
}

/**
 * Stores a new order in status Submitted, creates its saga row and queues the
 * UpdateOrderStatusEvent + OrderSubmittedEvent, all in one transaction.
 * Returns false (and changes nothing) when an order with this id already exists.
 */
export async function createOrderWithSaga(order: NewOrder): Promise<boolean> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const inserted = await client.query(
      `INSERT INTO orders (id, customer_id, element_symbol, quantity, total_price, status, compound_slug, compound_formula, product_label)
       VALUES ($1, $2, $3, $4, $5, 'Submitted', $6, $7, $8)
       ON CONFLICT (id) DO NOTHING RETURNING id`,
      [
        order.id,
        order.customerId,
        order.elementSymbol,
        order.quantity,
        order.totalPrice,
        order.compoundSlug ?? null,
        order.compoundFormula ?? null,
        order.productLabel ?? null,
      ],
    );
    if (!inserted.rowCount) {
      await client.query("ROLLBACK");
      return false;
    }

    await client.query(
      `INSERT INTO saga_state (order_id, customer_id, element_symbol, quantity, total_price, current_state, deadline_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,'Submitted',$6,NOW())`,
      [
        order.id,
        order.customerId,
        order.elementSymbol,
        order.quantity,
        order.totalPrice,
        deadlineForState("Submitted"),
      ],
    );
    await enqueueOutboxEvent(client, "UpdateOrderStatusEvent", {
      orderId: order.id,
      customerId: order.customerId,
      status: "Submitted",
      errorMessage: null,
    });
    await enqueueOutboxEvent(client, "OrderSubmittedEvent", {
      orderId: order.id,
      customerId: order.customerId,
      elementSymbol: order.elementSymbol,
      quantity: order.quantity,
      totalPrice: order.totalPrice,
    });
    await client.query("COMMIT");
    return true;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

/** Stores the shipment tracking number on the order (inside the caller's transaction). */
export async function setTrackingNumber(
  client: pg.PoolClient,
  orderId: string,
  trackingNumber: string,
): Promise<void> {
  await client.query(`UPDATE orders SET tracking_number = $2 WHERE id = $1`, [
    orderId,
    trackingNumber,
  ]);
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

/**
 * Moves an order and its saga to `status` (inside the caller's transaction), resets the state
 * deadline and queues an UpdateOrderStatusEvent so notification-service can tell the customer.
 */
export async function transitionSaga(
  client: pg.PoolClient,
  saga: SagaContext,
  status: string,
  error?: string,
  trackingNumber?: string | null,
): Promise<void> {
  await client.query(`UPDATE orders SET status = $2 WHERE id = $1`, [
    saga.orderId,
    status,
  ]);
  await client.query(
    `UPDATE saga_state SET current_state = $2, error_message = $3, deadline_at = $4, updated_at = NOW()
     WHERE order_id = $1`,
    [saga.orderId, status, error ?? null, deadlineForState(status)],
  );
  await enqueueOutboxEvent(client, "UpdateOrderStatusEvent", {
    orderId: saga.orderId,
    customerId: saga.customerId,
    status,
    errorMessage: error ?? null,
    trackingNumber: trackingNumber ?? null,
  });
}

/** Compensation: queues an OrderStockReleaseEvent so inventory frees the order's reserved grams. */
export async function enqueueStockRelease(
  client: pg.PoolClient,
  saga: SagaContext,
): Promise<void> {
  await enqueueOutboxEvent(client, "OrderStockReleaseEvent", {
    orderId: saga.orderId,
    elementSymbol: saga.elementSymbol,
    quantity: saga.quantity,
  });
}

/** Compensation: queues a PaymentRefundRequestedEvent so wallet returns any credits charged for the order. */
export async function enqueuePaymentRefund(
  client: pg.PoolClient,
  saga: SagaContext,
): Promise<void> {
  await enqueueOutboxEvent(client, "PaymentRefundRequestedEvent", {
    orderId: saga.orderId,
    customerId: saga.customerId,
    elementSymbol: saga.elementSymbol,
    quantity: saga.quantity,
  });
}
