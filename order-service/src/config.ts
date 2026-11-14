/** Development fallback for the shared service-to-service key; refused in production. */
const DEV_INTERNAL_API_KEY = "element-internal-dev-key";

/** Shortest internal API key accepted when NODE_ENV is production. */
const MIN_PRODUCTION_KEY_LENGTH = 32;

/**
 * Reads a non-negative integer environment variable; unset or empty uses the fallback.
 * A typo stops startup: NaN would silently disable a saga timeout or turn a poll interval into 1 ms.
 */
export function intFromEnv(name: string, fallback: number): number {
  const value = Number(process.env[name] || fallback);
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${name} must be a non-negative integer.`);
  }
  return value;
}

/** Runtime settings for order-service, read once from environment variables at startup. */
export const config = {
  port: intFromEnv("PORT", 8080),
  databaseUrl:
    process.env.DATABASE_URL ??
    "postgres://postgres:postgres@localhost:5432/element_order_db",
  rabbitHost: process.env.RABBITMQ_HOST ?? "localhost",
  rabbitPort: intFromEnv("RABBITMQ_PORT", 5672),
  rabbitUser: process.env.RABBITMQ_USERNAME ?? "guest",
  rabbitPass: process.env.RABBITMQ_PASSWORD ?? "guest",
  catalogServiceUrl: process.env.CATALOG_SERVICE_URL ?? "http://localhost:5002",
  compoundServiceUrl:
    process.env.COMPOUND_SERVICE_URL ?? "http://localhost:5007",
  walletServiceUrl: process.env.WALLET_SERVICE_URL ?? "http://localhost:5005",
  inventoryServiceUrl:
    process.env.INVENTORY_SERVICE_URL ?? "http://localhost:5008",
  internalApiKey: process.env.INTERNAL_API_KEY ?? DEV_INTERNAL_API_KEY,
  defaultSpreadPct: parseFloat(process.env.MARKET_SPREAD_PCT ?? "0.008"),
  sagaQueue: "order-service-saga",
  outboxPollMs: intFromEnv("OUTBOX_POLL_MS", 500),
  sagaSweepMs: intFromEnv("SAGA_SWEEP_MS", 5000),
  /** Seconds a saga may stay in each state before the timeout sweeper fails it. */
  sagaTimeoutSeconds: {
    Submitted: intFromEnv("SAGA_TIMEOUT_SUBMITTED_SEC", 120),
    StockReserved: intFromEnv("SAGA_TIMEOUT_STOCK_RESERVED_SEC", 120),
    Shipping: intFromEnv("SAGA_TIMEOUT_SHIPPING_SEC", 180),
  } as Record<string, number>,
};

const isProduction = process.env.NODE_ENV === "production";
const hasWeakInternalKey =
  config.internalApiKey.length < MIN_PRODUCTION_KEY_LENGTH ||
  config.internalApiKey === DEV_INTERNAL_API_KEY ||
  // Prefix of the secrets in docker/.env.public.*.example; they are long enough to pass the length check.
  config.internalApiKey.includes("replace-with");

if (isProduction && hasWeakInternalKey) {
  throw new Error(
    "Configure a unique production INTERNAL_API_KEY of at least 32 characters.",
  );
}
