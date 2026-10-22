/**
 * The HTTP core every client in the app goes through: `fetchJson` sends JSON, reads the
 * answer as JSON within a timeout, and leaves what a status means to the caller.
 */

/** A non-2xx answer. `data` is the parsed body: JSON, the raw text, or `null`. */
export class ApiHttpError extends Error {
  status: number;
  data: unknown;
  constructor(status: number, data: unknown, message?: string) {
    super(message ?? `HTTP ${status}`);
    this.status = status;
    this.data = data;
  }
}

/**
 * A signal that aborts after `ms` with a `TimeoutError` DOMException (never when `ms` is
 * omitted), or as soon as `signal` aborts (with that signal's reason). Stands in for
 * `AbortSignal.any([signal, AbortSignal.timeout(ms)])`: `AbortSignal.any` is missing from the
 * build's browser targets (Chrome 111, Safari 16.4). Call `release` once the request has
 * settled so the timer and the listener do not linger.
 */
export function abortAfter(ms?: number, signal?: AbortSignal) {
  const controller = new AbortController();
  const timer =
    ms === undefined
      ? undefined
      : setTimeout(
          () => controller.abort(new DOMException("The request timed out.", "TimeoutError")),
          ms,
        );
  const forward = () => controller.abort(signal?.reason);
  if (signal?.aborted) forward();
  else signal?.addEventListener("abort", forward, { once: true });
  return {
    signal: controller.signal,
    release() {
      clearTimeout(timer);
      signal?.removeEventListener("abort", forward);
    },
  };
}

/** True for the rejection `fetchJson` gives when its `timeoutMs` ran out. */
export function isTimeout(error: unknown): boolean {
  return error instanceof DOMException && error.name === "TimeoutError";
}

/** What `fetchJson` sends. */
export interface JsonRequest {
  method?: string;
  headers?: Record<string, string>;
  /** Sent as JSON, with `Content-Type: application/json`. */
  body?: unknown;
  /** Rejects with a `TimeoutError` when the answer, body included, takes longer. No limit when omitted. */
  timeoutMs?: number;
  /** The caller's own abort, e.g. on unmount or when a newer request replaces this one. */
  signal?: AbortSignal;
  cache?: RequestCache;
}

/** A finished exchange, whatever its status. */
export interface JsonResponse<T = unknown> {
  ok: boolean;
  status: number;
  headers: Headers;
  /** The body parsed as JSON; `null` when it is empty or not JSON. */
  data: T | null;
  /** The body as received, for servers that answer errors in plain text. */
  text: string;
}

/**
 * One request. Every HTTP status resolves, so the caller decides what an error status means
 * (most throw `ApiHttpError`); a network failure, the timeout and the caller's abort reject.
 */
export async function fetchJson<T = unknown>(
  url: string,
  { method = "GET", headers, body, timeoutMs, signal, cache }: JsonRequest = {},
): Promise<JsonResponse<T>> {
  const abort = abortAfter(timeoutMs, signal);
  const hasBody = body !== undefined;
  try {
    const response = await fetch(url, {
      method,
      headers: hasBody ? { "Content-Type": "application/json", ...headers } : headers,
      body: hasBody ? JSON.stringify(body) : undefined,
      cache,
      signal: abort.signal,
    });
    const text = await response.text();
    return {
      ok: response.ok,
      status: response.status,
      headers: response.headers,
      data: parseJson<T>(text),
      text,
    };
  } finally {
    abort.release();
  }
}

function parseJson<T>(text: string): T | null {
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}
