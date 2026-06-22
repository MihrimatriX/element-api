import { pool } from '../db/pool.js';
import * as orders from '../db/orders.js';
import { enqueueOutbox, tryMarkMessageProcessed } from '../db/outbox.js';
import { parseMessage } from '../messaging/massTransit.js';
import { exchangeName } from '../messaging/massTransit.js';
import { config } from '../config.js';
async function withOutboxTransition(ctx, status, outboxEntries, error) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await orders.transitionSaga(client, ctx, status, error);
        for (const entry of outboxEntries) {
            await enqueueOutbox(client, entry);
        }
        await client.query('COMMIT');
    }
    catch (err) {
        await client.query('ROLLBACK');
        throw err;
    }
    finally {
        client.release();
    }
}
export async function startSaga(ctx) {
    // ponytail: createOrderWithSaga in routes handles transactional start
    await orders.createOrderWithSaga({
        id: ctx.orderId,
        customerId: ctx.customerId,
        elementSymbol: ctx.elementSymbol,
        quantity: ctx.quantity,
        totalPrice: ctx.totalPrice,
    });
}
export async function handleSagaMessage(body) {
    let type;
    let messageId;
    try {
        const raw = JSON.parse(body.toString('utf8'));
        const mt = raw.messageType?.[0];
        if (mt)
            type = mt.split(':').pop();
        messageId = raw.messageId;
    }
    catch {
        return;
    }
    if (!type)
        return;
    const dedupeKey = messageId ?? `${type}:${parseMessage(body).orderId}`;
    const isNew = await tryMarkMessageProcessed(dedupeKey, type, parseMessage(body).orderId);
    if (!isNew) {
        console.info(`Skipping duplicate saga message ${type} (${dedupeKey})`);
        return;
    }
    switch (type) {
        case 'StockReservedEvent': {
            const msg = parseMessage(body);
            const saga = await loadSaga(msg.orderId);
            if (!saga || saga.current_state !== 'Submitted')
                return;
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
            const msg = parseMessage(body);
            const saga = await loadSaga(msg.orderId);
            if (!saga)
                return;
            await withOutboxTransition(saga.ctx, 'Failed', [], msg.reason);
            break;
        }
        case 'PaymentProcessedEvent': {
            const msg = parseMessage(body);
            const saga = await loadSaga(msg.orderId);
            if (!saga || saga.current_state !== 'StockReserved')
                return;
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
            const msg = parseMessage(body);
            const saga = await loadSaga(msg.orderId);
            if (!saga)
                return;
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
            const msg = parseMessage(body);
            const saga = await loadSaga(msg.orderId);
            if (!saga || saga.current_state !== 'Shipping')
                return;
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
            const msg = parseMessage(body);
            const saga = await loadSaga(msg.orderId);
            if (!saga || saga.current_state !== 'Shipping')
                return;
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
async function loadSaga(orderId) {
    const row = await orders.getOrderById(orderId);
    const state = await orders.getSagaState(orderId);
    if (!row || !state)
        return null;
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
