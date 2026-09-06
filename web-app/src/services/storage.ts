// Scientific pages and the lab remain usable when browser storage is disabled.
export function readLocal(key: string): string | null { try { return window.localStorage.getItem(key); } catch { return null; } }
export function writeLocal(key: string, value: string): boolean { try { window.localStorage.setItem(key,value);return true; } catch { return false; } }
export function removeLocal(key: string): void { try { window.localStorage.removeItem(key); } catch { /* nothing persisted */ } }
