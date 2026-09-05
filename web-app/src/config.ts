const rawBase = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000/api/v1';

export const API_BASE_URL = rawBase.replace(/\/$/, '');
export const API_ORIGIN = API_BASE_URL.replace(/\/api\/v1$/i, '');
export const HUB_URL = `${API_ORIGIN}/hub/notifications`;

/** Public web origin for canonical / OG URLs. Build-time env, else the browser origin. */
export function getPublicSiteUrl(): string {
  const env = import.meta.env.VITE_PUBLIC_SITE_URL?.trim();
  if (env) return env.replace(/\/$/, '');
  if (typeof window !== 'undefined' && window.location?.origin) return window.location.origin;
  return 'http://localhost:3000';
}

export function pagePath(pathname: string, symbol?: string): string {
  const base = pathname.startsWith('/') ? pathname : `/${pathname}`;
  if (!symbol) return base;
  return `${base}?symbol=${encodeURIComponent(symbol)}`;
}
