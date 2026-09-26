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
