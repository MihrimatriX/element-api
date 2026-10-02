/**
 * Safe localStorage access. Private windows, blocked site data and full quotas
 * make the Storage API throw; every helper here swallows that and reports it
 * through its return value so pages keep working without persistence.
 */

/** Reads a raw string, or `null` when missing or storage is unavailable. */
export function readStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** Writes a raw string. Returns `false` when storage is unavailable. */
export function writeStorage(key: string, value: string): boolean {
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

/** Removes a key. Returns `false` when storage is unavailable. */
export function removeStorage(key: string): boolean {
  try {
    window.localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

/** Reads and parses JSON, falling back when the key is missing or the value is corrupt. */
export function readJson<T>(key: string, fallback: T): T {
  const raw = readStorage(key);
  if (raw === null) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/** Serialises a value as JSON. Returns `false` when storage is unavailable. */
export function writeJson(key: string, value: unknown): boolean {
  return writeStorage(key, JSON.stringify(value));
}
