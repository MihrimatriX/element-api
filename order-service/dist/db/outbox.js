import { v4 as uuidv4 } from 'uuid';
import { pool } from './pool.js';
export async function enqueueOutbox(client, entry) {
    const id = entry.id ?? uuidv4();
    await client.query(`INSERT INTO outbox_messages (id, message_type, payload, route, route_target)
     VALUES ($1, $2, $3, $4, $5)`, [id, entry.messageType, JSON.stringify(entry.payload), entry.route, entry.routeTarget]);
    return id;
}
export async function fetchPendingOutbox(limit = 50) {
    const res = await pool.query(`SELECT id, message_type, payload, route, route_target
     FROM outbox_messages
     WHERE published_at IS NULL
     ORDER BY created_at
     LIMIT $1`, [limit]);
    return res.rows.map((row) => ({
        id: row.id,
        message_type: row.message_type,
        payload: row.payload,
        route: row.route,
        route_target: row.route_target,
    }));
}
export async function markOutboxPublished(id) {
    await pool.query(`UPDATE outbox_messages SET published_at = NOW() WHERE id = $1`, [id]);
}
export async function tryMarkMessageProcessed(messageId, eventType, orderId) {
    const res = await pool.query(`INSERT INTO processed_messages (message_id, event_type, order_id)
     VALUES ($1, $2, $3)
     ON CONFLICT (message_id) DO NOTHING
     RETURNING message_id`, [messageId, eventType, orderId ?? null]);
    return res.rowCount !== null && res.rowCount > 0;
}
