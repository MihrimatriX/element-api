import { config } from '../config.js';
import { fetchPendingOutbox, markOutboxPublished } from '../db/outbox.js';
import { exchangeName, wrapEnvelope, wrapHeaders, MessageType } from './massTransit.js';
import { getChannel } from './bus.js';

export async function dispatchOutboxBatch(): Promise<number> {
  const rows = await fetchPendingOutbox(50);
  if (rows.length === 0) return 0;

  const channel = getChannel();
  for (const row of rows) {
    const type = row.message_type as MessageType;
    const body = wrapEnvelope(type, row.payload, row.id);
    const headers = wrapHeaders(type);

    if (row.route === 'queue') {
      channel.sendToQueue(row.route_target, body, {
        headers,
        contentType: 'application/vnd.masstransit+json',
        persistent: true,
      });
    } else {
      const ex = row.route_target || exchangeName(type);
      await channel.assertExchange(ex, 'fanout', { durable: true });
      channel.publish(ex, '', body, {
        headers,
        contentType: 'application/vnd.masstransit+json',
        persistent: true,
      });
    }

    await channel.waitForConfirms();
    await markOutboxPublished(row.id);
  }

  return rows.length;
}

export function startOutboxDispatcher(): NodeJS.Timeout {
  let running = false;
  return setInterval(() => {
    if (running) return;
    running = true;
    dispatchOutboxBatch().catch((err) => console.error('Outbox dispatch error', err)).finally(() => { running = false; });
  }, config.outboxPollMs);
}
