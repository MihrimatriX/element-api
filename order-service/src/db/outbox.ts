import { randomUUID } from "node:crypto";
import type pg from "pg";
import { pool } from "./pool.js";
import { exchangeName, type MessageType } from "../messaging/massTransit.js";

/** How the dispatcher delivers a row: publish to a fanout exchange, or send straight to a queue. */
export type OutboxRoute = "exchange" | "queue";

/** One unpublished outbox row, as read by the outbox dispatcher. */
export interface OutboxRow {
  id: string;
  message_type: MessageType;
  payload: object;
  route: OutboxRoute;
  route_target: string;
}

/**
 * Stores an integration event in the outbox inside the caller's transaction.
 * The dispatcher publishes it to the event's fanout exchange later, so the event goes out only if the transaction commits.
 */
export async function enqueueOutboxEvent(
  client: pg.PoolClient,
  messageType: MessageType,
  payload: object,
): Promise<void> {
  await client.query(
    `INSERT INTO outbox_messages (id, message_type, payload, route, route_target)
     VALUES ($1, $2, $3, $4, $5)`,
    [
      randomUUID(),
      messageType,
      JSON.stringify(payload),
      "exchange",
      exchangeName(messageType),
    ],
  );
}

/** Returns up to `limit` unpublished outbox rows, oldest first. */
export async function fetchPendingOutbox(limit: number): Promise<OutboxRow[]> {
  const result = await pool.query<OutboxRow>(
    `SELECT id, message_type, payload, route, route_target
     FROM outbox_messages
     WHERE published_at IS NULL
     ORDER BY created_at
     LIMIT $1`,
    [limit],
  );
  return result.rows;
}

/** Marks a batch of outbox rows as published after RabbitMQ confirmed them (one UPDATE per batch). */
export async function markOutboxPublished(ids: string[]): Promise<void> {
  await pool.query(
    `UPDATE outbox_messages SET published_at = NOW() WHERE id = ANY($1::uuid[])`,
    [ids],
  );
}

/**
 * Records a consumed broker message inside the caller's transaction.
 * Returns false when the message id is already recorded, i.e. the message is a redelivery and must be skipped.
 */
export async function tryMarkMessageProcessed(
  client: pg.PoolClient,
  messageId: string,
  eventType: string,
  orderId: string,
): Promise<boolean> {
  const result = await client.query(
    `INSERT INTO processed_messages (message_id, event_type, order_id) VALUES ($1,$2,$3)
     ON CONFLICT DO NOTHING RETURNING message_id`,
    [messageId, eventType, orderId],
  );
  return Boolean(result.rowCount);
}
