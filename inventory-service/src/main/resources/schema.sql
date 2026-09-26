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
