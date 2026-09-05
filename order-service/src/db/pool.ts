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

    CREATE TABLE IF NOT EXISTS wallets (
      user_id UUID PRIMARY KEY,
      balance_elx NUMERIC(18,4) NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS holdings (
      user_id UUID NOT NULL,
      symbol VARCHAR(10) NOT NULL,
      grams NUMERIC(18,4) NOT NULL,
      avg_cost_elx NUMERIC(18,4) NOT NULL,
      PRIMARY KEY (user_id, symbol)
    );

    CREATE TABLE IF NOT EXISTS ledger (
      id UUID PRIMARY KEY,
      user_id UUID NOT NULL,
      kind VARCHAR(16) NOT NULL,
      elx NUMERIC(18,4) NOT NULL,
      symbol VARCHAR(10),
      grams NUMERIC(18,4),
      order_id UUID,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    ALTER TABLE saga_state ADD COLUMN IF NOT EXISTS deadline_at TIMESTAMPTZ;
    ALTER TABLE saga_state ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_number VARCHAR(64);
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS compound_slug VARCHAR(64);
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS compound_formula VARCHAR(32);
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS product_label VARCHAR(160);
    ALTER TABLE holdings ADD COLUMN IF NOT EXISTS compound_slug VARCHAR(64) NOT NULL DEFAULT 'elemental';
    ALTER TABLE holdings ADD COLUMN IF NOT EXISTS product_label VARCHAR(160);
    ALTER TABLE ledger ADD COLUMN IF NOT EXISTS compound_slug VARCHAR(64) NOT NULL DEFAULT 'elemental';
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'holdings'::regclass AND conname = 'holdings_product_pkey') THEN
        ALTER TABLE holdings DROP CONSTRAINT IF EXISTS holdings_pkey;
        ALTER TABLE holdings ADD CONSTRAINT holdings_product_pkey PRIMARY KEY (user_id, symbol, compound_slug);
      END IF;
    END $$;
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_outbox_unpublished ON outbox_messages (created_at)
      WHERE published_at IS NULL;

    CREATE INDEX IF NOT EXISTS idx_saga_deadline ON saga_state (deadline_at)
      WHERE deadline_at IS NOT NULL;

    CREATE INDEX IF NOT EXISTS idx_ledger_user ON ledger (user_id, created_at DESC);

    CREATE UNIQUE INDEX IF NOT EXISTS ledger_buy_order
      ON ledger (order_id) WHERE kind = 'buy' AND order_id IS NOT NULL;

    CREATE UNIQUE INDEX IF NOT EXISTS ledger_refund_order
      ON ledger (order_id) WHERE kind = 'refund' AND order_id IS NOT NULL;
  `);
}
