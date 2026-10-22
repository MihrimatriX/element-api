CREATE TABLE IF NOT EXISTS stock_items (
  symbol VARCHAR(10) PRIMARY KEY,
  stock_grams NUMERIC(18,4) NOT NULL,
  reserved_grams NUMERIC(18,4) NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS stock_reservations (
  order_id UUID PRIMARY KEY,
  element_symbol VARCHAR(10) NOT NULL,
  quantity NUMERIC(18,4) NOT NULL,
  status VARCHAR(16) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS processed_messages (
  message_id UUID PRIMARY KEY,
  event_type VARCHAR(64) NOT NULL,
  order_id UUID,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Transactional outbox: saga replies are inserted in the same transaction as the stock change that caused them;
-- OutboxRelay publishes them afterwards and stamps published_at.
CREATE TABLE IF NOT EXISTS outbox (
  id UUID PRIMARY KEY,
  event_type VARCHAR(64) NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS outbox_pending ON outbox (created_at) WHERE published_at IS NULL;

-- Invariants the database enforces even if application code is wrong. Re-created each boot to stay
-- idempotent; NOT VALID checks every new write but skips scanning old rows, so a legacy row can never
-- turn startup into a restart loop. 0 <= reserved <= stock also means stock is never negative.
ALTER TABLE stock_items DROP CONSTRAINT IF EXISTS stock_items_never_oversold;
ALTER TABLE stock_items ADD CONSTRAINT stock_items_never_oversold
  CHECK (reserved_grams >= 0 AND reserved_grams <= stock_grams) NOT VALID;
ALTER TABLE stock_reservations DROP CONSTRAINT IF EXISTS stock_reservations_valid;
ALTER TABLE stock_reservations ADD CONSTRAINT stock_reservations_valid
  CHECK (quantity >= 0 AND status IN ('Reserved', 'Released', 'Fulfilled', 'Sold')) NOT VALID;

-- Retention: published events and dedupe marks only matter while a redelivery is possible. Runs each boot.
DELETE FROM outbox WHERE published_at < NOW() - INTERVAL '7 days';
-- ponytail: per-boot only (every deploy restarts); add a @Scheduled job if uptime gets long.
DELETE FROM processed_messages WHERE processed_at < NOW() - INTERVAL '30 days';
