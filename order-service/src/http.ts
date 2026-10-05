import {
  Router,
  type ErrorRequestHandler,
  type RequestHandler,
  type Response,
} from "express";

const ROUTE_METHODS = ["get", "post", "delete", "put", "patch"] as const;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ELEMENT_SYMBOL_PATTERN = /^[a-z]{1,3}$/i;
const SLUG_PATTERN = /^[a-z0-9-]{1,64}$/;

const MIN_QUANTITY_GRAMS = 0.0001;
const MAX_QUANTITY_GRAMS = 1_000_000;
/** Quantities are stored as NUMERIC(18,4): at most four decimal places. */
const QUANTITY_SCALE = 10_000;
/** Absorbs binary floating-point noise, e.g. 0.0003 * 10000 = 2.9999999999999996. */
const FLOAT_TOLERANCE = 0.000001;

/** Upper bound for every call to a sibling service, so a slow dependency cannot hang a request. */
const UPSTREAM_TIMEOUT_MS = 5000;

const PROBLEM_TITLES: Record<number, string> = {
  400: "Bad Request",
  401: "Unauthorized",
  402: "Payment Required",
  404: "Not Found",
  409: "Conflict",
  413: "Payload Too Large",
  503: "Service Unavailable",
};

/** Wraps a handler so a thrown error or rejected promise reaches the error middleware. */
function forwardErrors(handler: RequestHandler): RequestHandler {
  return (req, res, next) => {
    Promise.resolve()
      .then(() => handler(req, res, next))
      .catch(next);
  };
}

/**
 * Creates an Express Router whose route handlers may be async.
 * Express 4 does not forward rejected async handlers to error middleware, so every handler is wrapped.
 */
export function asyncRouter(): Router {
  const router = Router();
  for (const method of ROUTE_METHODS) {
    const register = router[method].bind(router);
    const registerWrapped = (path: string, ...handlers: RequestHandler[]) =>
      register(path, ...handlers.map(forwardErrors));
    router[method] = registerWrapped as (typeof router)[typeof method];
  }
  return router;
}

/** True for a UUID string (any version); used for user ids, order ids and idempotency keys. */
export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

/** True for a 1–3 letter chemical element symbol such as "Fe" or "AU". */
export function isSymbol(value: unknown): value is string {
  return typeof value === "string" && ELEMENT_SYMBOL_PATTERN.test(value);
}

/** True for a lowercase compound slug such as "nacl" or "elemental-fe". */
export function isSlug(value: unknown): value is string {
  return typeof value === "string" && SLUG_PATTERN.test(value);
}

/** True for an orderable gram amount: 0.0001–1,000,000 with at most four decimal places. */
export function isQuantity(value: unknown): value is number {
  if (typeof value !== "number" || !Number.isFinite(value)) return false;
  if (value < MIN_QUANTITY_GRAMS || value > MAX_QUANTITY_GRAMS) return false;
  const scaled = value * QUANTITY_SCALE;
  return Math.abs(scaled - Math.round(scaled)) < FLOAT_TOLERANCE;
}

/**
 * Sends an RFC 7807 style application/problem+json error.
 * The duplicate `error` field keeps older clients that only read `error` working.
 */
export function problem(
  res: Response,
  status: number,
  detail: string,
  extra?: Record<string, unknown>,
) {
  return res
    .status(status)
    .type("application/problem+json")
    .json({
      type: `https://httpstatuses.com/${status}`,
      title: PROBLEM_TITLES[status] ?? "Error",
      status,
      detail,
      error: detail,
      ...extra,
    });
}

/**
 * Last-resort error middleware: maps body-parser failures to 400/413 and every other error to a generic 503,
 * so internal details (SQL, stack traces) never reach the client.
 */
export const httpErrorHandler: ErrorRequestHandler = (err, _req, res, next) => {
  if (res.headersSent) return next(err);
  if (err?.type === "entity.too.large") {
    return problem(res, 413, "Request body too large.");
  }
  if (err?.type === "entity.parse.failed") {
    return problem(res, 400, "Invalid JSON body.");
  }
  // pino-http logs res.err (with stack) server-side; the client only sees the generic detail.
  res.err = err;
  problem(res, 503, "Service temporarily unavailable. Please retry.");
};

/**
 * GETs a JSON document from a sibling service.
 * Returns null on network errors, timeouts, non-2xx answers and invalid JSON, so callers handle "unknown" in one place.
 */
export async function fetchJson(
  url: string,
  headers?: Record<string, string>,
): Promise<Record<string, unknown> | null> {
  try {
    const response = await fetch(url, {
      headers,
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
    if (!response.ok) return null;
    return (await response.json()) as Record<string, unknown> | null;
  } catch {
    return null;
  }
}
