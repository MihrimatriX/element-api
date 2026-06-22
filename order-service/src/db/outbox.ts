import { v4 as uuidv4 } from 'uuid';
import type pg from 'pg';
import { pool } from './pool.js';
import { MessageType } from '../messaging/massTransit.js';

export type OutboxRoute = 'exchange' | 'queue';

export interface OutboxRow {
  id: string;
  message_type: MessageType;
  payload: object;
  route: OutboxRoute;
  route_target: string;
}

export async function enqueueOutbox(
  client: pg.PoolClient,
  entry: {
    messageType: MessageType;
    payload: object;
    route: OutboxRoute;
    routeTarget: string;
    id?: string;
  }
): Promise<string> {
  const id = entry.id ?? uuidv4();
  await client.query(
    `INSERT INTO outbox_messages (id, message_type, payload, route, route_target)
     VALUES ($1, $2, $3, $4, $5)`,
    [id, entry.messageType, JSON.stringify(entry.payload), entry.route, entry.routeTarget]
  );
  return id;
}

export async function fetchPendingOutbox(limit = 50): Promise<OutboxRow[]> {
  const res = await pool.query(
    `SELECT id, message_type, payload, route, route_target
     FROM outbox_messages
     WHERE published_at IS NULL
     ORDER BY created_at
     LIMIT $1`,
    [limit]
  );
  return res.rows.map((row) => ({
    id: row.id,
    message_type: row.message_type as MessageType,
    payload: row.payload as object,
    route: row.route as OutboxRoute,
    route_target: row.route_target,
  }));
}

export async function markOutboxPublished(id: string): Promise<void> {
  await pool.query(`UPDATE outbox_messages SET published_at = NOW() WHERE id = $1`, [id]);
}

export async function tryMarkMessageProcessed(
  messageId: string,
  eventType: string,
  orderId?: string
): Promise<boolean> {
  const res = await pool.query(
    `INSERT INTO processed_messages (message_id, event_type, order_id)
     VALUES ($1, $2, $3)
     ON CONFLICT (message_id) DO NOTHING
     RETURNING message_id`,
    [messageId, eventType, orderId ?? null]
  );
  return res.rowCount !== null && res.rowCount > 0;
}
