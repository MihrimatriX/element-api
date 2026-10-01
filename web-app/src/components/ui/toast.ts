import type { Tone } from "./classes";

/** A queued toast. */
export interface ToastItem {
  id: number;
  message: string;
  description?: string;
  tone: Tone;
}

interface ToastOptions {
  tone?: Tone;
  description?: string;
  /** Milliseconds before it hides itself. Default 3200. */
  duration?: number;
}

const MAX_VISIBLE = 3;
const listeners = new Set<() => void>();
let toasts: ToastItem[] = [];
let nextId = 1;

function publish(next: ToastItem[]) {
  toasts = next;
  listeners.forEach((listener) => listener());
}

/**
 * Shows a short, self-dismissing message in the global `<Toaster/>`
 * (e.g. `toast("Kopyalandı", { tone: "success" })`). Returns the toast id.
 */
export function toast(message: string, options: ToastOptions = {}): number {
  const id = nextId++;
  const { tone = "neutral", description, duration = 3200 } = options;
  publish([...toasts, { id, message, description, tone }].slice(-MAX_VISIBLE));
  window.setTimeout(() => dismissToast(id), duration);
  return id;
}

/** Hides a toast before its timer runs out. */
export function dismissToast(id: number): void {
  if (toasts.some((item) => item.id === id))
    publish(toasts.filter((item) => item.id !== id));
}

/** `useSyncExternalStore` subscription for the Toaster. */
export function subscribeToToasts(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Current toasts (stable reference between changes). */
export function getToasts(): ToastItem[] {
  return toasts;
}
