import { pool } from "../db/pool.js";
import { enqueueOutboxEvent } from "../db/outbox.js";
import {
  enqueuePaymentRefund,
  enqueueStockRelease,
  type SagaContext,
} from "../db/orders.js";
import { config } from "../config.js";

/** States in which a timed-out saga may hold stock or credits, so compensation is queued. */
const COMPENSATE_STATES = new Set(["Submitted", "StockReserved", "Shipping"]);

/**
 * Fails every saga whose state deadline has passed and queues stock release + refund.
 * Returns how many expired sagas were found (not how many were actually failed).
 */
export async function sweepExpiredSagas(): Promise<number> {
  const expired = await pool.query(
    `SELECT order_id, customer_id, element_symbol, quantity, total_price, current_state
     FROM saga_state
     WHERE deadline_at IS NOT NULL
       AND deadline_at < NOW()
       AND current_state NOT IN ('Completed', 'Failed')`,
  );

  for (const row of expired.rows) {
    const saga: SagaContext = {
      orderId: row.order_id as string,
      customerId: row.customer_id as string,
      elementSymbol: row.element_symbol as string,
      quantity: Number(row.quantity),
      totalPrice: Number(row.total_price),
    };
    await failExpiredSaga(saga, row.current_state as string);
  }

  return expired.rowCount ?? 0;
}

/**
 * Fails one expired saga in its own transaction. The order is locked and the saga re-checked first,
 * so a saga event that moved the order on in the meantime wins and nothing happens here.
 * Errors are logged, not thrown, so one broken order does not stop the sweep.
 */
async function failExpiredSaga(
  saga: SagaContext,
  state: string,
): Promise<void> {
  const reason = `Saga timed out in state ${state}`;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(`SELECT id FROM orders WHERE id = $1 FOR UPDATE`, [
      saga.orderId,
    ]);
    const stillExpired = await client.query(
      `SELECT current_state FROM saga_state
        WHERE order_id = $1 AND deadline_at < NOW() AND current_state = $2 FOR UPDATE`,
      [saga.orderId, state],
    );
    if (!stillExpired.rowCount) {
      await client.query("ROLLBACK");
      return;
    }

    // Like transitionSaga(..., "Failed"), but this status event has never carried a trackingNumber field.
    await client.query(`UPDATE orders SET status = $2 WHERE id = $1`, [
      saga.orderId,
      "Failed",
    ]);
    await client.query(
      `UPDATE saga_state SET current_state = $2, error_message = $3, updated_at = NOW(), deadline_at = NULL
         WHERE order_id = $1`,
      [saga.orderId, "Failed", reason],
    );
    await enqueueOutboxEvent(client, "UpdateOrderStatusEvent", {
      orderId: saga.orderId,
      customerId: saga.customerId,
      status: "Failed",
      errorMessage: reason,
    });
    if (COMPENSATE_STATES.has(state)) {
      await enqueueStockRelease(client, saga);
      await enqueuePaymentRefund(client, saga);
    }
    await client.query("COMMIT");
    console.warn(`Saga timeout: order ${saga.orderId} failed from ${state}`);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(`Saga timeout sweep failed for ${saga.orderId}`, err);
  } finally {
    client.release();
  }
}

/** Runs the timeout sweep every SAGA_SWEEP_MS. */
export function startTimeoutSweeper(): NodeJS.Timeout {
  return setInterval(() => {
    sweepExpiredSagas().catch((err) =>
      console.error("Saga timeout sweeper error", err),
    );
  }, config.sagaSweepMs);
}
