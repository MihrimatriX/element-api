import pg from "pg";
import { config } from "../config.js";
import { logger } from "../observability.js";

/** Shared PostgreSQL connection pool for element_order_db. */
export const pool = new pg.Pool({ connectionString: config.databaseUrl });
// Idle clients die when Postgres restarts. Exit so Docker restarts us: saga messages then
// wait in RabbitMQ instead of burning their retries into the _failed queue while the DB is down.
pool.on("error", (err) => {
  logger.fatal({ err }, "PostgreSQL connection lost; exiting for restart");
  process.exit(1);
});

/**
 * Creates or upgrades the service's tables and indexes at startup.
 * Every statement is idempotent (IF NOT EXISTS), so it is safe to run on each boot.
 */
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

  // Columns added after the first release; existing databases are upgraded in place.
  await pool.query(`
    ALTER TABLE saga_state ADD COLUMN IF NOT EXISTS deadline_at TIMESTAMPTZ;
    ALTER TABLE saga_state ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_number VARCHAR(64);
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS compound_slug VARCHAR(64);
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS compound_formula VARCHAR(32);
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS product_label VARCHAR(160);
  `);

  // Partial indexes for the two background workers (outbox dispatcher, timeout sweeper) and the customer-read index.
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_outbox_unpublished ON outbox_messages (created_at)
      WHERE published_at IS NULL;

    CREATE INDEX IF NOT EXISTS idx_saga_deadline ON saga_state (deadline_at)
      WHERE deadline_at IS NOT NULL;

    -- Every customer read (list, search, stats) filters on customer_id; without this each is a full scan.
    CREATE INDEX IF NOT EXISTS idx_orders_customer_created ON orders (customer_id, created_at DESC);
  `);

  // Retention: dedupe marks only matter while a redelivery is possible; published outbox rows are history.
  // ponytail: runs per boot only (every deploy restarts). Move to the sweeper if uptime gets long.
  await pool.query(`
    DELETE FROM processed_messages WHERE processed_at < NOW() - INTERVAL '30 days';
    DELETE FROM outbox_messages WHERE published_at < NOW() - INTERVAL '7 days';
  `);
}
