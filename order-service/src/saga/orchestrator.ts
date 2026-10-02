import type pg from "pg";
import { v5 as uuidv5 } from "uuid";
import { pool } from "../db/pool.js";
import * as orders from "../db/orders.js";
import { enqueueOutboxEvent, tryMarkMessageProcessed } from "../db/outbox.js";
import { parseEnvelope } from "../messaging/massTransit.js";
import { ELEMENTAL_SLUG } from "../compoundPrice.js";
import { isUuid } from "../http.js";
import { paymentDecision } from "./paymentDecision.js";

const CREDIT_LIMIT_REASON = "Credit limit exceeded (50000 KREDI limit).";
const PAYMENT_FAILED_REASON = "Payment failed";

/** A saga event after parsing, with a valid order id and a de-duplication id. */
interface SagaEvent {
  type: string;
  messageId: string;
  orderId: string;
  message: Record<string, unknown>;
}

/** Reads the order id from camelCase or PascalCase payloads; anything that is not a UUID is ignored. */
function orderIdOf(message: Record<string, unknown>): string | undefined {
  const orderId = (message.orderId ?? message.OrderId) as string | undefined;
  return isUuid(orderId) ? orderId : undefined;
}

function reasonOf(message: Record<string, unknown>): string | undefined {
  return (
    (message.reason as string | undefined) ??
    (message.Reason as string | undefined)
  );
}

function trackingNumberOf(
  message: Record<string, unknown>,
): string | undefined {
  const trackingNumber = message.trackingNumber || message.TrackingNumber;
  return trackingNumber as string | undefined;
}

/**
 * Turns a broker message into a SagaEvent, or null when it is unusable (invalid JSON, no type, no order id).
 * Unusable messages are acknowledged and dropped by the caller.
 */
function parseSagaEvent(body: Buffer): SagaEvent | null {
  try {
    const envelope = parseEnvelope(body);
    const message = envelope.message as Record<string, unknown>;
    const orderId = orderIdOf(message);
    if (!envelope.type || !orderId) return null;

    // Without a MassTransit messageId, derive a stable one so a redelivered event is still de-duplicated.
    const messageId = isUuid(envelope.messageId)
      ? envelope.messageId
      : uuidv5(`${envelope.type}:${orderId}`, uuidv5.URL);
    return { type: envelope.type, messageId, orderId, message };
  } catch {
    return null;
  }
}

function sagaContextOf(order: orders.OrderRow): orders.SagaContext {
  return {
    orderId: order.id,
    customerId: order.customer_id,
    elementSymbol: order.element_symbol,
    quantity: Number(order.quantity),
    totalPrice: Number(order.total_price),
  };
}

/** Loads the order and row-locks it until the transaction ends, so saga steps for one order never run in parallel. */
async function lockOrder(
  client: pg.PoolClient,
  orderId: string,
): Promise<orders.OrderRow | undefined> {
  const result = await client.query<orders.OrderRow>(
    `SELECT * FROM orders WHERE id = $1 FOR UPDATE`,
    [orderId],
  );
  return result.rows[0];
}

/**
 * Handles one saga event from RabbitMQ:
 * Submitted → StockReserved → Shipping → Completed, or → Failed with compensation.
 * Runs in one transaction that locks the order and records the message id, so a repeated delivery changes nothing.
 * Wallet owns the actual debit and holdings; this service only requests them.
 */
export async function handleSagaMessage(body: Buffer): Promise<void> {
  const event = parseSagaEvent(body);
  if (!event) return;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const order = await lockOrder(client, event.orderId);
    if (!order) {
      await client.query("ROLLBACK");
      return;
    }
    const isFirstDelivery = await tryMarkMessageProcessed(
      client,
      event.messageId,
      event.type,
      order.id,
    );
    if (!isFirstDelivery) {
      await client.query("COMMIT");
      return;
    }

    await applySagaEvent(client, order, event);
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Applies an event to the order's current status. An event that does not fit the current status
 * (late, duplicate or out of order) is ignored. sagaTransitions.ts holds the same matrix as pure functions.
 */
async function applySagaEvent(
  client: pg.PoolClient,
  order: orders.OrderRow,
  event: SagaEvent,
): Promise<void> {
  const saga = sagaContextOf(order);
  const status = order.status;

  switch (event.type) {
    case "StockReservedEvent":
      if (status === "Submitted") {
        await requestPayment(client, saga);
      } else if (status === "Failed") {
        // The order already failed (e.g. timed out) before inventory answered: give the stock back.
        await orders.enqueueStockRelease(client, saga);
      }
      break;
    case "StockReservationFailedEvent":
      if (status === "Submitted") {
        await failOrder(client, saga, reasonOf(event.message));
      }
      break;
    case "PaymentProcessedEvent":
      if (status === "StockReserved") {
        await requestShipment(client, saga);
      } else if (status === "Failed") {
        // Debit landed after the order failed (e.g. timeout); the earlier refund may have been a
        // no-op. Wallet refundIfDebited is idempotent per order, so asking again is safe.
        await orders.enqueuePaymentRefund(client, saga);
      }
      break;
    case "PaymentFailedEvent":
      if (status === "StockReserved") {
        const reason = reasonOf(event.message) ?? PAYMENT_FAILED_REASON;
        await failOrder(client, saga, reason);
      }
      break;
    case "ShipmentFailedEvent":
      if (status === "Shipping") {
        await failOrder(client, saga, reasonOf(event.message));
      }
      break;
    case "ShipmentDispatchedEvent":
      if (status === "Shipping") {
        const trackingNumber = trackingNumberOf(event.message);
        await completeOrder(client, order, saga, trackingNumber);
      }
      break;
  }
}

/** Stock is held: move to StockReserved and ask wallet to charge the customer, or fail when over the credit limit. */
async function requestPayment(
  client: pg.PoolClient,
  saga: orders.SagaContext,
): Promise<void> {
  await orders.transitionSaga(client, saga, "StockReserved");
  if (paymentDecision(saga.totalPrice) === "limit") {
    await failOrder(client, saga, CREDIT_LIMIT_REASON);
    return;
  }
  await enqueueOutboxEvent(client, "PaymentRequestedEvent", {
    orderId: saga.orderId,
    customerId: saga.customerId,
    amount: saga.totalPrice,
    elementSymbol: saga.elementSymbol,
    quantity: saga.quantity,
  });
}

/** Payment succeeded: move to Shipping and ask shipment-service to dispatch. */
async function requestShipment(
  client: pg.PoolClient,
  saga: orders.SagaContext,
): Promise<void> {
  await orders.transitionSaga(client, saga, "Shipping");
  await enqueueOutboxEvent(client, "ShipmentRequestedEvent", {
    orderId: saga.orderId,
    customerId: saga.customerId,
    elementSymbol: saga.elementSymbol,
    quantity: saga.quantity,
  });
}

/** Shipment dispatched: store tracking, complete the order and tell wallet and inventory to finalise it. */
async function completeOrder(
  client: pg.PoolClient,
  order: orders.OrderRow,
  saga: orders.SagaContext,
  trackingNumber: string | undefined,
): Promise<void> {
  if (trackingNumber) {
    await orders.setTrackingNumber(client, saga.orderId, trackingNumber);
  }
  await orders.transitionSaga(
    client,
    saga,
    "Completed",
    undefined,
    trackingNumber,
  );
  await enqueueOutboxEvent(client, "AssetsCreditedEvent", {
    orderId: saga.orderId,
    customerId: saga.customerId,
    elementSymbol: saga.elementSymbol,
    quantity: saga.quantity,
    totalPrice: saga.totalPrice,
    compoundSlug: order.compound_slug ?? ELEMENTAL_SLUG,
    productLabel: order.product_label,
  });
  await enqueueOutboxEvent(client, "OrderCompletedEvent", {
    orderId: saga.orderId,
    elementSymbol: saga.elementSymbol,
    quantity: saga.quantity,
  });
}

/** Marks the order Failed and queues compensation: release the reserved stock and refund any payment. */
async function failOrder(
  client: pg.PoolClient,
  saga: orders.SagaContext,
  reason: string | undefined,
): Promise<void> {
  await orders.transitionSaga(client, saga, "Failed", reason);
  await orders.enqueueStockRelease(client, saga);
  await orders.enqueuePaymentRefund(client, saga);
}
