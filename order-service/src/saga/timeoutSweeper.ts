import { pool } from '../db/pool.js';
import * as ledger from '../db/ledger.js';
import { enqueueOutbox } from '../db/outbox.js';
import { config } from '../config.js';
import { exchangeName } from '../messaging/massTransit.js';

const COMPENSATE_STATES = new Set(['Submitted', 'StockReserved', 'Shipping']);

export async function sweepExpiredSagas(): Promise<number> {
  const res = await pool.query(
    `SELECT order_id, customer_id, element_symbol, quantity, total_price, current_state
     FROM saga_state
     WHERE deadline_at IS NOT NULL
       AND deadline_at < NOW()
       AND current_state NOT IN ('Completed', 'Failed')`
  );

  for (const row of res.rows) {
    const ctx = {
      orderId: row.order_id as string,
      customerId: row.customer_id as string,
      elementSymbol: row.element_symbol as string,
      quantity: Number(row.quantity),
      totalPrice: Number(row.total_price),
    };
    const state = row.current_state as string;
    const reason = `Saga timed out in state ${state}`;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(`SELECT id FROM orders WHERE id = $1 FOR UPDATE`, [ctx.orderId]);
      const current = await client.query(`SELECT current_state FROM saga_state
        WHERE order_id = $1 AND deadline_at < NOW() AND current_state = $2 FOR UPDATE`, [ctx.orderId, state]);
      if (!current.rowCount) { await client.query('ROLLBACK'); continue; }
      await client.query(`UPDATE orders SET status = $2 WHERE id = $1`, [ctx.orderId, 'Failed']);
      await client.query(
        `UPDATE saga_state SET current_state = $2, error_message = $3, updated_at = NOW(), deadline_at = NULL
         WHERE order_id = $1`,
        [ctx.orderId, 'Failed', reason]
      );
      await enqueueOutbox(client, {
        messageType: 'UpdateOrderStatusEvent',
        payload: { orderId: ctx.orderId, customerId: ctx.customerId, status: 'Failed', errorMessage: reason },
        route: 'exchange',
        routeTarget: exchangeName('UpdateOrderStatusEvent'),
      });
      if (COMPENSATE_STATES.has(state)) {
        await enqueueOutbox(client, {
          messageType: 'OrderStockReleaseEvent',
          payload: {
            orderId: ctx.orderId,
            elementSymbol: ctx.elementSymbol,
            quantity: ctx.quantity,
          },
          route: 'exchange',
          routeTarget: exchangeName('OrderStockReleaseEvent'),
        });
        await ledger.refundIfDebited(client, {
          userId: ctx.customerId,
          orderId: ctx.orderId,
          amount: ctx.totalPrice,
          symbol: ctx.elementSymbol,
          grams: ctx.quantity,
        });
      }
      await client.query('COMMIT');
      console.warn(`Saga timeout: order ${ctx.orderId} failed from ${state}`);
    } catch (err) {
      await client.query('ROLLBACK');
      console.error(`Saga timeout sweep failed for ${ctx.orderId}`, err);
    } finally {
      client.release();
    }
  }

  return res.rowCount ?? 0;
}

export function startTimeoutSweeper(): NodeJS.Timeout {
  return setInterval(() => {
    sweepExpiredSagas().catch((err) => console.error('Saga timeout sweeper error', err));
  }, config.sagaSweepMs);
}
