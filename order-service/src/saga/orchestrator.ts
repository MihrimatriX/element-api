import { v5 as uuidv5 } from "uuid";
import { pool } from "../db/pool.js";
import * as orders from "../db/orders.js";
import { enqueueOutbox } from "../db/outbox.js";
import {
  parseMessage,
  exchangeName,
  type MessageType,
} from "../messaging/massTransit.js";
import { isUuid } from "../http.js";
import { paymentDecision } from "./paymentDecision.js";

interface SagaContext {
  orderId: string;
  customerId: string;
  elementSymbol: string;
  quantity: number;
  totalPrice: number;
}

export async function startSaga(ctx: SagaContext): Promise<void> {
  await orders.createOrderWithSaga({ id: ctx.orderId, ...ctx });
}

function orderIdOf(msg: Record<string, unknown>): string | undefined {
  const id = (msg.orderId ?? msg.OrderId) as string | undefined;
  return isUuid(id) ? id : undefined;
}

/** Order saga: stock → payment request → ship. Wallet owns debit/holdings. */
export async function handleSagaMessage(body: Buffer): Promise<void> {
  let type: MessageType;
  let messageId: string;
  let msg: Record<string, unknown>;
  try {
    const raw = JSON.parse(body.toString("utf8"));
    type = raw.messageType?.[0]?.split(":").pop();
    msg = parseMessage(body) as Record<string, unknown>;
    const oid = orderIdOf(msg);
    if (!type || !oid) return;
    messageId = isUuid(raw.messageId)
      ? raw.messageId
      : uuidv5(`${type}:${oid}`, uuidv5.URL);
    msg.orderId = oid;
  } catch {
    return;
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query<orders.OrderRow>(
      `SELECT * FROM orders WHERE id = $1 FOR UPDATE`,
      [msg.orderId],
    );
    const row = result.rows[0];
    if (!row) {
      await client.query("ROLLBACK");
      return;
    }
    const inserted = await client.query(
      `INSERT INTO processed_messages (message_id, event_type, order_id) VALUES ($1,$2,$3)
       ON CONFLICT DO NOTHING RETURNING message_id`,
      [messageId, type, row.id],
    );
    if (!inserted.rowCount) {
      await client.query("COMMIT");
      return;
    }

    const ctx: SagaContext = {
      orderId: row.id,
      customerId: row.customer_id,
      elementSymbol: row.element_symbol,
      quantity: Number(row.quantity),
      totalPrice: Number(row.total_price),
    };
    const emit = (messageType: MessageType, payload: object, queue?: string) =>
      enqueueOutbox(client, {
        messageType,
        payload,
        route: queue ? "queue" : "exchange",
        routeTarget: queue ?? exchangeName(messageType),
      });
    const release = () =>
      emit("OrderStockReleaseEvent", {
        orderId: row.id,
        elementSymbol: row.element_symbol,
        quantity: ctx.quantity,
      });
    const requestRefund = () =>
      emit("PaymentRefundRequestedEvent", {
        orderId: row.id,
        customerId: row.customer_id,
        elementSymbol: row.element_symbol,
        quantity: ctx.quantity,
      });
    const fail = async () => {
      await orders.transitionSaga(
        client,
        ctx,
        "Failed",
        (msg.reason as string | undefined) ??
          (msg.Reason as string | undefined),
      );
      await release();
      await requestRefund();
    };
    switch (type) {
      case "StockReservedEvent":
        if (row.status === "Submitted") {
          await orders.transitionSaga(client, ctx, "StockReserved");
          if (paymentDecision(ctx.totalPrice) === "limit") {
            msg.reason = "Credit limit exceeded (50000 KREDI limit).";
            await fail();
            break;
          }
          await emit("PaymentRequestedEvent", {
            orderId: row.id,
            customerId: row.customer_id,
            amount: ctx.totalPrice,
            elementSymbol: row.element_symbol,
            quantity: ctx.quantity,
          });
        } else if (row.status === "Failed") await release();
        break;
      case "StockReservationFailedEvent":
        if (row.status === "Submitted") await fail();
        break;
      case "PaymentProcessedEvent":
        if (row.status === "StockReserved") {
          await orders.transitionSaga(client, ctx, "Shipping");
          await emit("ShipmentRequestedEvent", {
            orderId: row.id,
            customerId: row.customer_id,
            elementSymbol: row.element_symbol,
            quantity: ctx.quantity,
          });
        }
        break;
      case "PaymentFailedEvent":
        if (row.status === "StockReserved") {
          msg.reason =
            (msg.reason as string | undefined) ??
            (msg.Reason as string | undefined) ??
            "Payment failed";
          await fail();
        }
        break;
      case "ShipmentFailedEvent":
        if (row.status === "Shipping") await fail();
        break;
      case "ShipmentDispatchedEvent":
        if (row.status === "Shipping") {
          const tracking = (msg.trackingNumber ||
            msg.TrackingNumber) as string | undefined;
          if (tracking)
            await orders.setTrackingNumber(client, row.id, tracking);
          await orders.transitionSaga(
            client,
            ctx,
            "Completed",
            undefined,
            tracking,
          );
          await emit("AssetsCreditedEvent", {
            orderId: row.id,
            customerId: row.customer_id,
            elementSymbol: row.element_symbol,
            quantity: ctx.quantity,
            totalPrice: ctx.totalPrice,
            compoundSlug: row.compound_slug ?? "elemental",
            productLabel: row.product_label,
          });
          await emit("OrderCompletedEvent", {
            orderId: row.id,
            elementSymbol: row.element_symbol,
            quantity: ctx.quantity,
          });
        }
        break;
    }
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
