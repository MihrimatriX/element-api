import { useState } from "react";
import { API_BASE_URL } from "../../config";
import { ApiHttpError, fetchJson, isTimeout } from "../../lib/http";
import { readStorage } from "../../lib/storage";
import { apiError } from "../../services/api";
import { clearSession } from "../../services/session";

const DEFAULT_TIMEOUT_MS = 15_000;
const UNREACHABLE = "Servise ulaşılamadı. Biraz sonra yeniden deneyebilirsin.";

/**
 * Turkish text for a failed sign-in. Only a server answer is about the
 * credentials (401 and 429 arrive in English). A failed request means the
 * service is unreachable; any other Error is the client's own sentence, such
 * as blocked browser storage after the server accepted the password.
 */
export function loginError(error: unknown): string {
  if (error instanceof ApiHttpError) {
    if (error.status === 401) return "E-posta veya şifre yanlış.";
    if (error.status === 429)
      return "Çok fazla hatalı deneme. Yaklaşık 15 dakika sonra yeniden dene.";
    return apiError(error, "Giriş bilgileri geçersiz.");
  }
  // fetch rejects with a TypeError when offline; fetchJson with a TimeoutError on timeout.
  const unreachable = error instanceof TypeError || isTimeout(error);
  if (unreachable || !(error instanceof Error)) return UNREACHABLE;
  return error.message;
}

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
  const { ok, status, data } = await fetchJson<T>(API_BASE_URL + path, {
    method,
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body,
    timeoutMs,
    signal,
  });
  if (token && status === 401 && token === readStorage("token")) clearSession();
  return { ok, status, data, message: messageOf(ok, status, data) };
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
