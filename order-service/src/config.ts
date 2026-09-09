export const config = {
  port: parseInt(process.env.PORT ?? '8080', 10),
  databaseUrl:
    process.env.DATABASE_URL ??
    'postgres://postgres:postgres@localhost:5432/element_order_db',
  rabbitHost: process.env.RABBITMQ_HOST ?? 'localhost',
  rabbitPort: parseInt(process.env.RABBITMQ_PORT ?? '5672', 10),
  rabbitUser: process.env.RABBITMQ_USERNAME ?? 'guest',
  rabbitPass: process.env.RABBITMQ_PASSWORD ?? 'guest',
  catalogServiceUrl: process.env.CATALOG_SERVICE_URL ?? 'http://localhost:5002',
  compoundServiceUrl: process.env.COMPOUND_SERVICE_URL ?? 'http://localhost:5007',
  internalApiKey: process.env.INTERNAL_API_KEY ?? 'element-internal-dev-key',
  defaultSpreadPct: parseFloat(process.env.MARKET_SPREAD_PCT ?? '0.008'),
  sagaQueue: 'order-service-saga',
  paymentQueue: 'payment-processing',
  outboxPollMs: parseInt(process.env.OUTBOX_POLL_MS ?? '500', 10),
  sagaSweepMs: parseInt(process.env.SAGA_SWEEP_MS ?? '5000', 10),
  sagaTimeoutSeconds: {
    Submitted: parseInt(process.env.SAGA_TIMEOUT_SUBMITTED_SEC ?? '120', 10),
    StockReserved: parseInt(process.env.SAGA_TIMEOUT_STOCK_RESERVED_SEC ?? '120', 10),
    Shipping: parseInt(process.env.SAGA_TIMEOUT_SHIPPING_SEC ?? '180', 10),
  } as Record<string, number>,
};
