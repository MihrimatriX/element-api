import { config } from "../config.js";
import { fetchPendingOutbox, markOutboxPublished } from "../db/outbox.js";
import {
  exchangeName,
  wrapEnvelope,
  wrapHeaders,
  MessageType,
} from "./massTransit.js";
import { getChannel } from "./bus.js";

const BATCH = 50;
// Channel lives as long as the process (bus exits on close), so asserting once per exchange is enough.
const assertedExchanges = new Set<string>();

export async function dispatchOutboxBatch(): Promise<number> {
  const rows = await fetchPendingOutbox(BATCH);
  if (rows.length === 0) return 0;

  const channel = getChannel();
  for (const row of rows) {
    const type = row.message_type as MessageType;
    const body = wrapEnvelope(type, row.payload, row.id);
    const headers = wrapHeaders(type);

    if (row.route === "queue") {
      channel.sendToQueue(row.route_target, body, {
        headers,
        contentType: "application/vnd.masstransit+json",
        persistent: true,
      });
    } else {
      const ex = row.route_target || exchangeName(type);
      if (!assertedExchanges.has(ex)) {
        await channel.assertExchange(ex, "fanout", { durable: true });
        assertedExchanges.add(ex);
      }
      channel.publish(ex, "", body, {
        headers,
        contentType: "application/vnd.masstransit+json",
        persistent: true,
      });
    }
  }

  // One broker round trip per batch. Any nack throws before marking, so the whole batch is
  // re-sent; consumers dedup on messageId (= outbox id), keeping delivery at-least-once.
  await channel.waitForConfirms();
  await markOutboxPublished(rows.map((row) => row.id));
  return rows.length;
}

export function startOutboxDispatcher(): NodeJS.Timeout {
  let running = false;
  return setInterval(async () => {
    if (running) return;
    running = true;
    try {
      // A full batch means more is waiting: drain instead of idling a whole poll interval
      // (one batch per tick capped the platform at ~100 msgs/s ≈ 11 orders/s).
      while ((await dispatchOutboxBatch()) === BATCH);
    } catch (err) {
      console.error("Outbox dispatch error", err);
    } finally {
      running = false;
    }
  }, config.outboxPollMs);
}
