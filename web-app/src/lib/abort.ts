/**
 * A signal that aborts after `ms` with a `TimeoutError` DOMException, or as soon as `signal`
 * aborts (with that signal's reason). Stands in for
 * `AbortSignal.any([signal, AbortSignal.timeout(ms)])`: `AbortSignal.any` is missing from the
 * build's browser targets (Chrome 111, Safari 16.4). Call `release` once the request has
 * settled so the timer and the listener do not linger.
 */
export function abortAfter(ms: number, signal?: AbortSignal) {
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(new DOMException("The request timed out.", "TimeoutError")),
    ms,
  );
  const forward = () => controller.abort(signal?.reason);
  if (signal?.aborted) forward();
  else signal?.addEventListener("abort", forward, { once: true });
  return {
    signal: controller.signal,
    release() {
      clearTimeout(timer);
      signal?.removeEventListener("abort", forward);
    },
  };
}
