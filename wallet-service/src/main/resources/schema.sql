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
  compound_slug VARCHAR(64) NOT NULL DEFAULT 'elemental',
  product_label VARCHAR(160),
  PRIMARY KEY (user_id, symbol, compound_slug)
);

CREATE TABLE IF NOT EXISTS ledger (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  kind VARCHAR(16) NOT NULL,
  elx NUMERIC(18,4) NOT NULL,
  symbol VARCHAR(10),
  grams NUMERIC(18,4),
  order_id UUID,
  compound_slug VARCHAR(64) NOT NULL DEFAULT 'elemental',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS processed_messages (
  message_id UUID PRIMARY KEY,
  event_type VARCHAR(64) NOT NULL,
  order_id UUID,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS ledger_buy_order
  ON ledger (order_id) WHERE kind = 'buy' AND order_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS ledger_refund_order
  ON ledger (order_id) WHERE kind = 'refund' AND order_id IS NOT NULL;

-- Transactional outbox: events are inserted in the same transaction as the ledger change that caused them;
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
-- turn startup into a restart loop.
ALTER TABLE wallets DROP CONSTRAINT IF EXISTS wallets_balance_non_negative;
ALTER TABLE wallets ADD CONSTRAINT wallets_balance_non_negative CHECK (balance_elx >= 0) NOT VALID;
ALTER TABLE holdings DROP CONSTRAINT IF EXISTS holdings_amounts_non_negative;
ALTER TABLE holdings ADD CONSTRAINT holdings_amounts_non_negative CHECK (grams >= 0 AND avg_cost_elx >= 0) NOT VALID;
ALTER TABLE ledger DROP CONSTRAINT IF EXISTS ledger_entry_valid;
ALTER TABLE ledger ADD CONSTRAINT ledger_entry_valid
  CHECK (elx >= 0 AND kind IN ('grant', 'buy', 'refund', 'sell')) NOT VALID;

-- Retention: published events and dedupe marks only matter while a redelivery is possible. Runs each boot.
DELETE FROM outbox WHERE published_at < NOW() - INTERVAL '7 days';
-- ponytail: per-boot only (every deploy restarts); add a @Scheduled job if uptime gets long.
DELETE FROM processed_messages WHERE processed_at < NOW() - INTERVAL '30 days';
