import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { ACCOUNTS_ENABLED, API_BASE_URL } from "../config";
import { ApiHttpError, fetchJson, isTimeout } from "../lib/http";
import { readStorage, removeStorage, writeStorage } from "../lib/storage";
import { track } from "./diagnostics";
import { LAB_STORAGE_KEY, parseProgress } from "./lab";
import {
  mergeLearning,
  normalizeLearning,
  type LearningProgress,
} from "./lessons";
import { clearSession, tokenUser } from "./session";

const SYNC_TIMEOUT_MS = 12_000;
/** Fired on this window whenever stored progress changes, so every hook instance re-reads it. */
const CHANGE_EVENT = "element:learning";

/** Where the notebook's progress currently lives, with the sentence shown for each state. */
const STATUS_TEXT = {
  local: "Keşiflerin bu tarayıcıda saklanır.",
  memoryOnly: "Tarayıcı kaydı kapalı; ilerleme bu oturumda tutuluyor.",
  syncing: "Hesabınla eşitleniyor…",
  synced: "İlerlemen hesabınla eşitlendi.",
  failed: "Hesapla eşitlenemedi. İlerlemen bu cihazda korunuyor.",
  timedOut: "Bağlantı zaman aşımına uğradı. İlerlemen bu cihazda korunuyor.",
} as const;

/** Storage and sync state of the notebook. */
export type LearningSyncState = keyof typeof STATUS_TEXT;

/** Fallback when localStorage throws: progress survives until the tab closes. */
const memoryStore = new Map<string, string>();

function storageKey(user: string | null): string {
  return `elementapi:learning:${user ?? "guest"}:v1`;
}

function subscribe(listener: () => void): () => void {
  window.addEventListener("storage", listener);
  window.addEventListener(CHANGE_EVENT, listener);
  return () => {
    window.removeEventListener("storage", listener);
    window.removeEventListener(CHANGE_EVENT, listener);
  };
}

/** Stored progress as raw JSON. A guest without a notebook yet inherits the older lab-only record. */
function readRaw(user: string | null): string {
  const key = storageKey(user);
  return (
    memoryStore.get(key) ??
    readStorage(key) ??
    (user
      ? "{}"
      : JSON.stringify({
          discoveries: parseProgress(readStorage(LAB_STORAGE_KEY)),
        }))
  );
}

function parseRaw(value: string): LearningProgress {
  try {
    return normalizeLearning(JSON.parse(value));
  } catch {
    return normalizeLearning(null);
  }
}

/** Saves progress and notifies every hook instance. Returns `false` when only memory could hold it. */
function persist(user: string | null, progress: LearningProgress): boolean {
  const key = storageKey(user);
  const value = JSON.stringify(normalizeLearning(progress));
  const saved = writeStorage(key, value);
  if (saved) memoryStore.delete(key);
  else memoryStore.set(key, value);
  window.dispatchEvent(new Event(CHANGE_EVENT));
  return saved;
}

/** Removes a user's progress from this device (after the account is deleted). */
export function forgetLearning(user: string): void {
  memoryStore.delete(storageKey(user));
  removeStorage(storageKey(user));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/**
 * The learner's notebook. Progress belongs to the signed-in user (or the guest) and
 * lives in localStorage; when signed in, every change is sent to `PUT /auth/learning`
 * and the server's copy is merged back, so devices converge on the union.
 */
export function useLearning() {
  const user = ACCOUNTS_ENABLED ? tokenUser() : null;
  const snapshot = useSyncExternalStore(subscribe, () => readRaw(user));
  const progress = useMemo(() => parseRaw(snapshot), [snapshot]);
  const [accountState, setAccountState] =
    useState<LearningSyncState>("syncing");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!user) return;
    const token = readStorage("token");
    const controller = new AbortController();
    let disposed = false;
    const sessionChanged = () => token !== readStorage("token");

    async function sync() {
      try {
        const { ok, status, data } = await fetchJson(`${API_BASE_URL}/auth/learning`, {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}` },
          body: progress,
          timeoutMs: SYNC_TIMEOUT_MS,
          signal: controller.signal,
        });
        if (status === 401 && !sessionChanged()) clearSession();
        // A 200 without a JSON body is a failed sync as well.
        if (!ok || data === null) throw new ApiHttpError(status, data);
        if (disposed || sessionChanged()) return;
        const current = parseRaw(readRaw(user));
        const merged = mergeLearning(current, normalizeLearning(data));
        if (JSON.stringify(current) !== JSON.stringify(merged))
          persist(user, merged);
        track("progress_saved");
        setAccountState("synced");
      } catch (error) {
        if (disposed || sessionChanged()) return;
        setAccountState(isTimeout(error) ? "timedOut" : "failed");
      }
    }

    void sync();
    return () => {
      disposed = true;
      controller.abort();
    };
  }, [user, progress, attempt]);

  const guestState: LearningSyncState = memoryStore.has(storageKey(null))
    ? "memoryOnly"
    : "local";
  const syncState = user ? accountState : guestState;

  return {
    progress,
    /** Signed-in user id, or `null` for a guest (always `null` when accounts are off). */
    user,
    syncState,
    status: STATUS_TEXT[syncState],
    save(next: LearningProgress) {
      if (!persist(user, next)) setAccountState("memoryOnly");
    },
    /** Pushes the progress to the account again. */
    retry() {
      setAccountState("syncing");
      setAttempt((count) => count + 1);
    },
    /** Progress recorded on this device before signing in. */
    guest: parseRaw(readRaw(null)),
    /** Adds this device's guest progress to the signed-in account. */
    importGuest() {
      persist(user, mergeLearning(progress, parseRaw(readRaw(null))));
    },
  };
}

/** Everything `useLearning` returns. */
export type Learning = ReturnType<typeof useLearning>;
