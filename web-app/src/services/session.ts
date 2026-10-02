import { readStorage, removeStorage } from "../lib/storage.ts";

export { readStorage };

/** Event fired on `window` whenever the stored session is cleared. */
const SESSION_EVENT = "element:session";

/** Decodes the payload segment of a JWT (base64url JSON). Throws on malformed input. */
function decodeJwtPayload(token: string): { sub?: unknown; exp?: unknown } {
  const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
  return JSON.parse(atob(base64));
}

/**
 * Returns the user id (`sub`) of the stored JWT while it is still valid,
 * or `null` for a missing, malformed or expired token.
 */
export function tokenUser(token = readStorage("token")): string | null {
  if (!token) return null;
  try {
    const { sub, exp } = decodeJwtPayload(token);
    const expiresAtMs = Number(exp) * 1000;
    return typeof sub === "string" && expiresAtMs > Date.now() ? sub : null;
  } catch {
    return null;
  }
}

/** Signs the browser out: drops the token and dashboard key, then notifies listeners. */
export function clearSession() {
  removeStorage("token");
  removeStorage("apiKey");
  window.dispatchEvent(new Event(SESSION_EVENT));
}

/**
 * Turns a `returnTo` query value into a same-origin path, or `fallback`.
 * Parses like the browser does, so "/\t/evil.com" (which strips to
 * "//evil.com") is rejected.
 */
export function safeReturnTo(
  value: string | null,
  fallback = "/collection",
): string {
  if (!value?.startsWith("/")) return fallback;
  try {
    const url = new URL(value, window.location.origin);
    return url.origin === window.location.origin
      ? url.pathname + url.search + url.hash
      : fallback;
  } catch {
    return fallback;
  }
}
