import {
  readJson,
  readStorage,
  removeStorage,
  writeJson,
  writeStorage,
} from "../lib/storage.ts";

/**
 * Opt-in, local-only product diagnostics. Events stay in this browser's
 * localStorage until the visitor exports them from the feedback page; nothing
 * is sent anywhere.
 */

const EVENTS_KEY = "elementapi:diagnostics:v1";
/** localStorage key holding the visitor's opt-in ("true" / "false"). */
export const DIAGNOSTICS_CONSENT = "elementapi:diagnostics:enabled";

const MAX_EVENTS = 200;
/** The same event for the same item within this window counts once (double clicks, re-renders). */
const DUPLICATE_WINDOW_MS = 1000;
/** Only short record or lesson ids are kept: never URLs, e-mail addresses, tokens or error text. */
const SAFE_ITEM = /^[a-z0-9_-]{1,64}$/i;

/** Every event name the app is allowed to record. */
export type ProductEvent =
  | "lab_started"
  | "discovery_completed"
  | "lesson_completed"
  | "record_opened"
  | "progress_saved"
  | "api_example_run"
  | "client_error";

interface LocalEvent {
  event: ProductEvent;
  at: string;
  item?: string;
}

function isLocalEvent(value: unknown): value is LocalEvent {
  const candidate = value as Partial<LocalEvent> | null;
  return (
    !!candidate &&
    typeof candidate.event === "string" &&
    typeof candidate.at === "string"
  );
}

/** Returns the stored events (newest last, at most 200), skipping corrupt entries. */
export function diagnosticEvents(): LocalEvent[] {
  const stored = readJson<unknown>(EVENTS_KEY, []);
  return Array.isArray(stored)
    ? stored.filter(isLocalEvent).slice(-MAX_EVENTS)
    : [];
}

function isRecentDuplicate(
  last: LocalEvent | undefined,
  event: ProductEvent,
  item: string | undefined,
): boolean {
  return (
    last?.event === event &&
    last.item === item &&
    Date.now() - Date.parse(last.at) < DUPLICATE_WINDOW_MS
  );
}

/**
 * Records an event when the visitor has opted in. `item` is dropped unless it
 * is a short identifier. Storage failures are ignored: diagnostics never block
 * discovery.
 */
export function track(event: ProductEvent, item?: string) {
  if (readStorage(DIAGNOSTICS_CONSENT) !== "true") return;
  const safeItem = item && SAFE_ITEM.test(item) ? item : undefined;
  const events = diagnosticEvents();
  if (isRecentDuplicate(events.at(-1), event, safeItem)) return;
  events.push({
    event,
    at: new Date().toISOString(),
    ...(safeItem ? { item: safeItem } : {}),
  });
  writeJson(EVENTS_KEY, events.slice(-MAX_EVENTS));
}

/**
 * Saves the opt-in choice; opting out also deletes the stored events.
 * Returns `false` when storage is unavailable.
 */
export function setDiagnostics(enabled: boolean): boolean {
  if (!writeStorage(DIAGNOSTICS_CONSENT, String(enabled))) return false;
  return enabled || removeStorage(EVENTS_KEY);
}
