import pg from 'pg';
import { config } from '../config.js';

export const pool = new pg.Pool({ connectionString: config.databaseUrl });

export async function initDb(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id UUID PRIMARY KEY,
      customer_id UUID NOT NULL,
      element_symbol VARCHAR(10) NOT NULL,
      quantity NUMERIC(18,4) NOT NULL,
      total_price NUMERIC(18,4) NOT NULL,
      status VARCHAR(32) NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS saga_state (
      order_id UUID PRIMARY KEY,
      customer_id UUID NOT NULL,
      element_symbol VARCHAR(10) NOT NULL,
      quantity NUMERIC(18,4) NOT NULL,
      total_price NUMERIC(18,4) NOT NULL,
      current_state VARCHAR(32) NOT NULL,
      error_message TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS outbox_messages (
      id UUID PRIMARY KEY,
      message_type VARCHAR(64) NOT NULL,
      payload JSONB NOT NULL,
      route VARCHAR(16) NOT NULL,
      route_target VARCHAR(128) NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      published_at TIMESTAMPTZ
    );

    CREATE TABLE IF NOT EXISTS processed_messages (
      message_id UUID PRIMARY KEY,
      event_type VARCHAR(64) NOT NULL,
      order_id UUID,
      processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    ALTER TABLE saga_state ADD COLUMN IF NOT EXISTS deadline_at TIMESTAMPTZ;
    ALTER TABLE saga_state ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_outbox_unpublished ON outbox_messages (created_at)
      WHERE published_at IS NULL;

    CREATE INDEX IF NOT EXISTS idx_saga_deadline ON saga_state (deadline_at)
      WHERE deadline_at IS NOT NULL;
  `);
}
