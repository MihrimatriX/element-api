export function readStorage(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}
export function tokenUser(token = readStorage('token')): string | null {
  try {
    if (!token) return null;
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return typeof payload.sub === 'string' && payload.exp * 1000 > Date.now() ? payload.sub : null;
  } catch { return null; }
}
export function clearSession() {
  try { localStorage.removeItem('token'); localStorage.removeItem('apiKey'); } catch { /* Storage disabled. */ }
  window.dispatchEvent(new Event('element:session'));
}
export function safeReturnTo(value: string | null, fallback = '/collection'): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return fallback;
  return value;
}
