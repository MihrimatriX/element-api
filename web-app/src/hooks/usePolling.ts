import { useEffect, useEffectEvent } from "react";

interface PollingOptions {
  /** Polling runs only while true. Default `true`. */
  enabled?: boolean;
}

/**
 * Calls `callback` now and then every `intervalMs` while the tab is visible.
 * Hidden tabs pause the timer; when the tab comes back the callback runs at once
 * so the data catches up. The latest callback is always used without restarting the timer.
 */
export function usePolling(
  callback: () => void,
  intervalMs: number,
  { enabled = true }: PollingOptions = {},
): void {
  const tick = useEffectEvent(callback);

  useEffect(() => {
    if (!enabled) return;
    let timer: number | undefined;
    const start = () => {
      tick();
      timer = window.setInterval(() => tick(), intervalMs);
    };
    const stop = () => window.clearInterval(timer);
    const onVisibilityChange = () => {
      stop();
      if (!document.hidden) start();
    };

    if (!document.hidden) start();
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [enabled, intervalMs]);
}
