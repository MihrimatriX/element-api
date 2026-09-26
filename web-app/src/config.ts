const rawBase =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5000/api/v1";

export const API_BASE_URL = rawBase.replace(/\/$/, "");
export const API_ORIGIN = API_BASE_URL.replace(/\/api\/v1$/i, "");

/** Public web origin for canonical / OG URLs. Build-time env, else the browser origin. */
export function getPublicSiteUrl(): string {
  const env = import.meta.env.VITE_PUBLIC_SITE_URL?.trim();
  if (env) return env.replace(/\/$/, "");
  if (typeof window !== "undefined" && window.location?.origin)
    return window.location.origin;
  return "http://localhost:3000";
}

export function pagePath(pathname: string, symbol?: string): string {
  const base = pathname.startsWith("/") ? pathname : `/${pathname}`;
  if (!symbol) return base;
  return `${base}?symbol=${encodeURIComponent(symbol)}`;
}

export const ACCOUNTS_ENABLED =
  import.meta.env.VITE_ACCOUNTS_ENABLED !== "false";
export const SCIENCE_BASE_URL = (
  import.meta.env.VITE_SCIENCE_API_BASE_URL ??
  (import.meta.env.DEV ? "/api/v2" : `${API_ORIGIN}/api/v2`)
).replace(/\/$/, "");

/** Copy-paste host. Relative `/api/v2` (Vite proxy / atlas SPA) uses the page origin. */
export function publicApiUrl(path: string): string {
  const raw = path.startsWith("/api/v2")
    ? SCIENCE_BASE_URL + path.slice(7)
    : `${API_ORIGIN}${path}`;
  if (/^https?:\/\//i.test(raw)) return raw;
  const origin =
    typeof window !== "undefined" ? window.location.origin : getPublicSiteUrl();
  return `${origin}${raw.startsWith("/") ? raw : `/${raw}`}`;
}
