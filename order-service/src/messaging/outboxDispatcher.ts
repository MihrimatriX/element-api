import type { ConfirmChannel } from "amqplib";
import { config } from "../config.js";
import {
  fetchPendingOutbox,
  markOutboxPublished,
  type OutboxRow,
} from "../db/outbox.js";
import {
  exchangeName,
  MASSTRANSIT_CONTENT_TYPE,
  wrapEnvelope,
  wrapHeaders,
} from "./massTransit.js";
import { getChannel } from "./bus.js";

/** Most outbox rows published per batch; a full batch means more rows are waiting. */
const OUTBOX_BATCH_SIZE = 50;
// Channel lives as long as the process (bus exits on close), so asserting once per exchange is enough.
const assertedExchanges = new Set<string>();

/**
 * Publishes one batch of pending outbox rows, oldest first, waits for RabbitMQ to confirm the whole batch,
 * then marks every row published. Returns how many rows were sent.
 */
export async function dispatchOutboxBatch(): Promise<number> {
  const rows = await fetchPendingOutbox(OUTBOX_BATCH_SIZE);
  if (rows.length === 0) return 0;

  const channel = getChannel();
  for (const row of rows) {
    await publishOutboxRow(channel, row);
  }

  // One broker round trip per batch. Any nack throws before marking, so the whole batch is
  // re-sent; consumers dedup on messageId (= outbox id), keeping delivery at-least-once.
  await channel.waitForConfirms();
  await markOutboxPublished(rows.map((row) => row.id));
  return rows.length;
}

/** Sends one outbox row as a MassTransit envelope, straight to a queue or to its fanout exchange. */
async function publishOutboxRow(
  channel: ConfirmChannel,
  row: OutboxRow,
): Promise<void> {
  const body = wrapEnvelope(row.message_type, row.payload, row.id);
  const options = {
    headers: wrapHeaders(row.message_type),
    contentType: MASSTRANSIT_CONTENT_TYPE,
    persistent: true,
  };

  if (row.route === "queue") {
    channel.sendToQueue(row.route_target, body, options);
    return;
  }

  const exchange = row.route_target || exchangeName(row.message_type);
  if (!assertedExchanges.has(exchange)) {
    await channel.assertExchange(exchange, "fanout", { durable: true });
    assertedExchanges.add(exchange);
  }
  channel.publish(exchange, "", body, options);
}

/** Polls the outbox every OUTBOX_POLL_MS; a tick is skipped while the previous drain is still running. */
export function startOutboxDispatcher(): NodeJS.Timeout {
  let isDispatching = false;
  return setInterval(async () => {
    if (isDispatching) return;
    isDispatching = true;
    try {
      // A full batch means more is waiting: drain instead of idling a whole poll interval
      // (one batch per tick capped the platform at ~100 msgs/s ≈ 11 orders/s).
      while ((await dispatchOutboxBatch()) === OUTBOX_BATCH_SIZE);
    } catch (err) {
      console.error("Outbox dispatch error", err);
    } finally {
      isDispatching = false;
    }
  }, config.outboxPollMs);
}
