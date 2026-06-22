import { pool } from '../db/pool.js';
import * as orders from '../db/orders.js';
import { enqueueOutbox, tryMarkMessageProcessed } from '../db/outbox.js';
import { parseMessage, MessageType } from '../messaging/massTransit.js';
import { exchangeName } from '../messaging/massTransit.js';
import { config } from '../config.js';

interface SagaContext {
  orderId: string;
  customerId: string;
  elementSymbol: string;
  quantity: number;
  totalPrice: number;
}

async function withOutboxTransition(
  ctx: SagaContext,
  status: string,
  outboxEntries: Parameters<typeof enqueueOutbox>[1][],
  error?: string
): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await orders.transitionSaga(client, ctx, status, error);
    for (const entry of outboxEntries) {
      await enqueueOutbox(client, entry);
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function startSaga(ctx: SagaContext): Promise<void> {
  // ponytail: createOrderWithSaga in routes handles transactional start
  await orders.createOrderWithSaga({
    id: ctx.orderId,
    customerId: ctx.customerId,
    elementSymbol: ctx.elementSymbol,
    quantity: ctx.quantity,
    totalPrice: ctx.totalPrice,
  });
}

export async function handleSagaMessage(body: Buffer): Promise<void> {
  let type: string | undefined;
  let messageId: string | undefined;
  try {
    const raw = JSON.parse(body.toString('utf8'));
    const mt = raw.messageType?.[0] as string | undefined;
    if (mt) type = mt.split(':').pop();
    messageId = raw.messageId as string | undefined;
  } catch {
    return;
  }

  if (!type) return;

  const dedupeKey = messageId ?? `${type}:${parseMessage<{ orderId: string }>(body).orderId}`;
  const isNew = await tryMarkMessageProcessed(dedupeKey, type, parseMessage<{ orderId: string }>(body).orderId);
  if (!isNew) {
    console.info(`Skipping duplicate saga message ${type} (${dedupeKey})`);
    return;
  }

  switch (type as MessageType) {
    case 'StockReservedEvent': {
      const msg = parseMessage<{ orderId: string }>(body);
      const saga = await loadSaga(msg.orderId);
      if (!saga || saga.current_state !== 'Submitted') return;
      await withOutboxTransition(saga.ctx, 'StockReserved', [
        {
          messageType: 'ProcessPaymentCommand',
          payload: { orderId: msg.orderId, amount: saga.ctx.totalPrice },
          route: 'queue',
          routeTarget: config.paymentQueue,
        },
      ]);
      break;
    }
    case 'StockReservationFailedEvent': {
      const msg = parseMessage<{ orderId: string; reason: string }>(body);
      const saga = await loadSaga(msg.orderId);
      if (!saga) return;
      await withOutboxTransition(saga.ctx, 'Failed', [], msg.reason);
      break;
    }
    case 'PaymentProcessedEvent': {
      const msg = parseMessage<{ orderId: string }>(body);
      const saga = await loadSaga(msg.orderId);
      if (!saga || saga.current_state !== 'StockReserved') return;
      await withOutboxTransition(saga.ctx, 'Shipping', [
        {
          messageType: 'ShipmentRequestedEvent',
          payload: {
            orderId: msg.orderId,
            customerId: saga.ctx.customerId,
            elementSymbol: saga.ctx.elementSymbol,
            quantity: saga.ctx.quantity,
          },
          route: 'exchange',
          routeTarget: exchangeName('ShipmentRequestedEvent'),
        },
      ]);
      break;
    }
    case 'PaymentFailedEvent': {
      const msg = parseMessage<{ orderId: string; reason: string }>(body);
      const saga = await loadSaga(msg.orderId);
      if (!saga) return;
      await withOutboxTransition(saga.ctx, 'Failed', [
        {
          messageType: 'OrderStockReleaseEvent',
          payload: {
            orderId: msg.orderId,
            elementSymbol: saga.ctx.elementSymbol,
            quantity: saga.ctx.quantity,
          },
          route: 'exchange',
          routeTarget: exchangeName('OrderStockReleaseEvent'),
        },
      ], msg.reason);
      break;
    }
    case 'ShipmentDispatchedEvent': {
      const msg = parseMessage<{ orderId: string }>(body);
      const saga = await loadSaga(msg.orderId);
      if (!saga || saga.current_state !== 'Shipping') return;
      await withOutboxTransition(saga.ctx, 'Completed', [
        {
          messageType: 'OrderCompletedEvent',
          payload: {
            orderId: msg.orderId,
            elementSymbol: saga.ctx.elementSymbol,
            quantity: saga.ctx.quantity,
          },
          route: 'exchange',
          routeTarget: exchangeName('OrderCompletedEvent'),
        },
      ]);
      break;
    }
    case 'ShipmentFailedEvent': {
      const msg = parseMessage<{ orderId: string; reason: string }>(body);
      const saga = await loadSaga(msg.orderId);
      if (!saga || saga.current_state !== 'Shipping') return;
      await withOutboxTransition(saga.ctx, 'Failed', [
        {
          messageType: 'OrderStockReleaseEvent',
          payload: {
            orderId: msg.orderId,
            elementSymbol: saga.ctx.elementSymbol,
            quantity: saga.ctx.quantity,
          },
          route: 'exchange',
          routeTarget: exchangeName('OrderStockReleaseEvent'),
        },
      ], msg.reason);
      break;
    }
    default:
      break;
  }
}

async function loadSaga(orderId: string) {
  const row = await orders.getOrderById(orderId);
  const state = await orders.getSagaState(orderId);
  if (!row || !state) return null;
  return {
    current_state: state.current_state,
    ctx: {
      orderId: row.id,
      customerId: row.customer_id,
      elementSymbol: row.element_symbol,
      quantity: Number(row.quantity),
      totalPrice: Number(row.total_price),
    },
  };
}
