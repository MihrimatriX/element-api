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
  /**
   * Milliseconds before it hides itself; `Infinity` keeps it until it is closed.
   * The default depends on the tone (see `DEFAULT_DURATION`).
   */
  duration?: number;
}

/**
 * An error toast is often the only report of a failed action, so it waits to be
 * closed; a warning gets time to read twice; confirmations go quickly.
 */
const DEFAULT_DURATION: Record<Tone, number> = {
  neutral: 3200,
  info: 3200,
  success: 3200,
  warning: 8000,
  danger: Infinity,
};

/** After a hold ends the toast stays at least this long, so it does not vanish as the pointer leaves. */
const MIN_AFTER_HOLD = 1500;

const MAX_VISIBLE = 3;

/** Time left on a toast's timer; `timer` is unset while the toast is held. */
interface Countdown {
  remaining: number;
  startedAt: number;
  timer?: number;
}

const listeners = new Set<() => void>();
const countdowns = new Map<number, Countdown>();
let toasts: ToastItem[] = [];
let nextId = 1;

function publish(next: ToastItem[]) {
  toasts = next;
  // Toasts that were closed or pushed out by MAX_VISIBLE drop their timers.
  for (const [id, countdown] of countdowns) {
    if (next.some((item) => item.id === id)) continue;
    window.clearTimeout(countdown.timer);
    countdowns.delete(id);
  }
  listeners.forEach((listener) => listener());
}

function runCountdown(id: number, countdown: Countdown) {
  countdown.startedAt = Date.now();
  countdown.timer = window.setTimeout(() => dismissToast(id), countdown.remaining);
}

/**
 * Shows a short message in the global `<Toaster/>`
 * (e.g. `toast("Kopyalandı", { tone: "success" })`). Returns the toast id.
 */
export function toast(message: string, options: ToastOptions = {}): number {
  const id = nextId++;
  const { tone = "neutral", description, duration = DEFAULT_DURATION[tone] } = options;
  if (Number.isFinite(duration)) {
    const countdown: Countdown = { remaining: duration, startedAt: 0 };
    countdowns.set(id, countdown);
    runCountdown(id, countdown);
  }
  publish([...toasts, { id, message, description, tone }].slice(-MAX_VISIBLE));
  return id;
}

/** Hides a toast before its timer runs out. */
export function dismissToast(id: number): void {
  if (toasts.some((item) => item.id === id))
    publish(toasts.filter((item) => item.id !== id));
}

/**
 * Stops (`held`) or restarts a toast's timer. The Toaster holds a toast while it
 * is hovered or focused, so it never disappears while someone is reading it or
 * tabbing to its close button.
 */
export function holdToast(id: number, held: boolean): void {
  const countdown = countdowns.get(id);
  if (!countdown || held === (countdown.timer === undefined)) return;
  if (held) {
    window.clearTimeout(countdown.timer);
    countdown.timer = undefined;
    countdown.remaining -= Date.now() - countdown.startedAt;
  } else {
    countdown.remaining = Math.max(countdown.remaining, MIN_AFTER_HOLD);
    runCountdown(id, countdown);
  }
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
