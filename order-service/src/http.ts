import {
  Router,
  type ErrorRequestHandler,
  type RequestHandler,
  type Response,
} from "express";

/** Express 4 does not forward rejected async handlers to error middleware. */
export function asyncRouter(): Router {
  const router = Router();
  for (const method of ["get", "post", "delete", "put", "patch"] as const) {
    const register = router[method].bind(router);
    router[method] = ((path: string, ...handlers: RequestHandler[]) =>
      register(
        path,
        ...handlers.map(
          (handler): RequestHandler =>
            (req, res, next) => {
              Promise.resolve()
                .then(() => handler(req, res, next))
                .catch(next);
            },
        ),
      )) as (typeof router)[typeof method];
  }
  return router;
}

export const isUuid = (value: unknown): value is string =>
  typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
export const isSymbol = (value: unknown): value is string =>
  typeof value === "string" && /^[a-z]{1,3}$/i.test(value);
export const isSlug = (value: unknown): value is string =>
  typeof value === "string" && /^[a-z0-9-]{1,64}$/.test(value);
export const isQuantity = (value: unknown): value is number =>
  typeof value === "number" &&
  Number.isFinite(value) &&
  value >= 0.0001 &&
  value <= 1_000_000 &&
  Math.abs(value * 10000 - Math.round(value * 10000)) < 0.000001;

const titles: Record<number, string> = {
  400: "Bad Request",
  401: "Unauthorized",
  402: "Payment Required",
  404: "Not Found",
  409: "Conflict",
  413: "Payload Too Large",
  503: "Service Unavailable",
};

/** RFC 7807-ish problem+json; keeps legacy `error` for existing clients. */
export function problem(
  res: Response,
  status: number,
  detail: string,
  extra?: Record<string, unknown>,
) {
  return res.status(status).type("application/problem+json").json({
    type: `https://httpstatuses.com/${status}`,
    title: titles[status] ?? "Error",
    status,
    detail,
    error: detail,
    ...extra,
  });
}

export const httpErrorHandler: ErrorRequestHandler = (err, _req, res, next) => {
  if (res.headersSent) return next(err);
  const status =
    err?.type === "entity.too.large"
      ? 413
      : err?.type === "entity.parse.failed"
        ? 400
        : 503;
  const detail =
    status === 400
      ? "Invalid JSON body."
      : status === 413
        ? "Request body too large."
        : "Service temporarily unavailable. Please retry.";
  problem(res, status, detail);
};
