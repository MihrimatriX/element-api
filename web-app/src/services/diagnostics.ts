import { readStorage } from './session.ts';

const KEY = 'elementapi:diagnostics:v1';
export const DIAGNOSTICS_CONSENT = 'elementapi:diagnostics:enabled';
export type ProductEvent = 'lab_started' | 'discovery_completed' | 'lesson_completed' | 'record_opened' | 'progress_saved' | 'api_example_run' | 'client_error';
interface LocalEvent { event: ProductEvent; at: string; item?: string }
export function diagnosticEvents(): LocalEvent[] {
  try {
    const value: unknown = JSON.parse(readStorage(KEY) ?? '[]');
    return Array.isArray(value) ? value.filter((v): v is LocalEvent => !!v && typeof v.event === 'string' && typeof v.at === 'string').slice(-200) : [];
  } catch { return []; }
}
export function track(event: ProductEvent, item?: string) {
  if (readStorage(DIAGNOSTICS_CONSENT) !== 'true') return;
  // Only predefined events and short record/lesson identifiers, never URLs, email, tokens or error text.
  const safeItem = item && /^[a-z0-9_-]{1,64}$/i.test(item) ? item : undefined;
  const events = diagnosticEvents(), last = events.at(-1);
  if (last?.event === event && last.item === safeItem && Date.now() - Date.parse(last.at) < 1000) return;
  events.push({ event, at: new Date().toISOString(), ...(safeItem ? { item: safeItem } : {}) });
  try { localStorage.setItem(KEY, JSON.stringify(events.slice(-200))); } catch { /* Diagnostics never block discovery. */ }
}
export function setDiagnostics(enabled: boolean) {
  try { localStorage.setItem(DIAGNOSTICS_CONSENT, String(enabled)); if (!enabled) localStorage.removeItem(KEY); return true; }
  catch { return false; }
}
