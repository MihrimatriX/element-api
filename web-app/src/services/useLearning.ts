import { track } from './diagnostics';
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { ACCOUNTS_ENABLED, API_BASE_URL } from '../config';
import { LAB_STORAGE_KEY, parseProgress } from './lab';
import { mergeLearning, normalizeLearning, type LearningProgress } from './lessons';
import { clearSession, readStorage, tokenUser } from './session';

const memory = new Map<string, string>();
const keyFor = (user: string | null) => `elementapi:learning:${user ?? 'guest'}:v1`;
const subscribe = (listener: () => void) => {
  window.addEventListener('storage', listener); window.addEventListener('element:learning', listener);
  return () => { window.removeEventListener('storage', listener); window.removeEventListener('element:learning', listener); };
};
function raw(user: string | null) {
  const key = keyFor(user);
  return memory.get(key) ?? readStorage(key) ?? (user ? '{}' : JSON.stringify({ discoveries: parseProgress(readStorage(LAB_STORAGE_KEY)) }));
}
function parse(value: string) { try { return normalizeLearning(JSON.parse(value)); } catch { return normalizeLearning(null); } }
function persist(user: string | null, progress: LearningProgress) {
  const key = keyFor(user), value = JSON.stringify(normalizeLearning(progress));
  let saved = true;
  try { localStorage.setItem(key, value); memory.delete(key); } catch { memory.set(key, value); saved = false; }
  window.dispatchEvent(new Event('element:learning'));
  return saved;
}
export function forgetLearning(user: string) {
  memory.delete(keyFor(user));
  try { localStorage.removeItem(keyFor(user)); } catch { /* Storage disabled. */ }
  window.dispatchEvent(new Event('element:learning'));
}
export function useLearning() {
  const user = ACCOUNTS_ENABLED ? tokenUser() : null;
  const snapshot = useSyncExternalStore(subscribe, () => raw(user));
  const progress = useMemo(() => parse(snapshot), [snapshot]);
  const [status, setStatus] = useState('Keşiflerin bu tarayıcıda saklanır.');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!user) return;
    let disposed = false;
    const controller = new AbortController();
    const token = readStorage('token');
    const timeout = setTimeout(() => controller.abort(), 12000);
    async function sync() {
      try {
        const response = await fetch(`${API_BASE_URL}/auth/learning`, {
          method: 'PUT', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(progress), signal: controller.signal,
        });
        if (response.status === 401 && token === readStorage('token')) clearSession();
        if (!response.ok) throw new Error('sync');
        const remote = normalizeLearning(await response.json());
        if (controller.signal.aborted || token !== readStorage('token')) return;
        const current = parse(raw(user)), merged = mergeLearning(current, remote);
        if (JSON.stringify(current) !== JSON.stringify(merged)) persist(user, merged);
        track('progress_saved');
        setStatus('İlerlemen hesabınla eşitlendi.');
      } catch {
        if (disposed || token !== readStorage('token')) return;
        if (!controller.signal.aborted) setStatus('Hesapla eşitlenemedi. İlerlemen bu cihazda korunuyor.');
        else if (token === readStorage('token')) setStatus('Bağlantı zaman aşımına uğradı. İlerlemen bu cihazda korunuyor.');
      } finally { clearTimeout(timeout); }
    }
    void sync();
    return () => { disposed = true; controller.abort(); clearTimeout(timeout); };
  }, [user, progress, attempt]);
  return {
    progress, user, status: user ? status : memory.has(keyFor(null)) ? 'Tarayıcı kaydı kapalı; ilerleme bu oturumda tutuluyor.' : 'Keşiflerin bu tarayıcıda saklanır.',
    save(next: LearningProgress) { if (!persist(user, next)) setStatus('Tarayıcı kaydı kapalı; ilerleme bu oturumda tutuluyor.'); },
    retry() { setAttempt(n => n + 1); },
    guest: parse(raw(null)),
    importGuest() { persist(user, mergeLearning(progress, parse(raw(null)))); },
  };
}
