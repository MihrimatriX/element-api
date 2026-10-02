import { useState } from "react";
import { API_BASE_URL } from "../../config";
import { readStorage } from "../../lib/storage";
import { ApiHttpError, apiError } from "../../services/api";
import { clearSession } from "../../services/session";

const DEFAULT_TIMEOUT_MS = 15_000;
const UNREACHABLE = "Servise ulaşılamadı. Biraz sonra yeniden deneyebilirsin.";

/** HTTP outcome of an account endpoint call; `message` is the server's own sentence when it sent one. */
export interface AccountResponse<T> {
  ok: boolean;
  status: number;
  data: T | null;
  message: string | null;
}

interface AccountRequestOptions {
  method?: "GET" | "POST";
  body?: unknown;
  /** Send the session token (default). Recovery links work without a session. */
  auth?: boolean;
  timeoutMs?: number;
  signal?: AbortSignal;
}

/**
 * A signal that aborts after `ms`, or as soon as `signal` aborts. Stands in for
 * `AbortSignal.any`, which the build's browser targets (Chrome 111, Safari 16.4)
 * lack. Call `release` when the request has settled.
 */
function abortAfter(ms: number, signal?: AbortSignal) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
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

/** The server's sentence: `message` on success, else what `apiError` finds in an error body. */
function messageOf(ok: boolean, status: number, data: unknown): string | null {
  if (!ok) return apiError(new ApiHttpError(status, data), "") || null;
  return data && typeof data === "object" && "message" in data
    ? String(data.message)
    : null;
}

/**
 * Calls an identity-service account endpoint (`/auth/profile`, `/auth/delete`, …).
 * HTTP errors resolve with `ok: false`; a 401 for the current token signs out.
 * Network failures, timeouts and aborts reject.
 */
export async function accountRequest<T = unknown>(
  path: string,
  {
    method = "GET",
    body,
    auth = true,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    signal,
  }: AccountRequestOptions = {},
): Promise<AccountResponse<T>> {
  const token = auth ? readStorage("token") : null;
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const abort = abortAfter(timeoutMs, signal);
  try {
    const response = await fetch(API_BASE_URL + path, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: abort.signal,
    });
    if (token && response.status === 401 && token === readStorage("token"))
      clearSession();

    const data = (await response.json().catch(() => null)) as T | null;
    const { ok, status } = response;
    return { ok, status, data, message: messageOf(ok, status, data) };
  } finally {
    abort.release();
  }
}

/** Outcome of an account action, shown next to the control that started it. */
export interface ActionResult {
  ok: boolean;
  message: string;
}

/**
 * State for one account form or button: `run` posts to an endpoint, tracks `busy`
 * and keeps the outcome in `result` for an inline Notice.
 */
export function useAccountAction() {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ActionResult | null>(null);

  async function run(
    path: string,
    body: unknown = {},
    { auth = true, fallback = "İşlem tamamlanamadı." } = {},
  ): Promise<AccountResponse<unknown> | null> {
    setBusy(true);
    setResult(null);
    try {
      const response = await accountRequest(path, {
        method: "POST",
        body,
        auth,
      });
      setResult({ ok: response.ok, message: response.message ?? fallback });
      return response;
    } catch {
      setResult({ ok: false, message: UNREACHABLE });
      return null;
    } finally {
      setBusy(false);
    }
  }

  return { busy, result, run, clear: () => setResult(null) };
}
