import { useCallback, useEffect, useRef, useState } from "react";
import { publicApiUrl } from "@/config";
import { playgroundView } from "@/services/apiDocs";

/** A finished HTTP exchange, as the playground shows it. */
export interface ApiResponse {
  path: string;
  status: number;
  etag: string | null;
  /** Parsed JSON body; a 304 becomes a short explanatory object. */
  body: unknown;
  durationMs: number;
}

type Outcome =
  | { kind: "response"; response: ApiResponse }
  | { kind: "error"; message: string };

const TIMEOUT_MS = 10_000;

async function requestApi(
  path: string,
  headers: Record<string, string>,
  signal: AbortSignal,
): Promise<Outcome | null> {
  const started = performance.now();
  try {
    const response = await fetch(publicApiUrl(path), {
      headers,
      cache: "no-store",
      signal: AbortSignal.any([signal, AbortSignal.timeout(TIMEOUT_MS)]),
    });
    const etag = response.headers.get("ETag");
    const data: unknown = await response.json().catch(() => null);
    return {
      kind: "response",
      response: {
        path,
        status: response.status,
        etag,
        body: playgroundView(response.status, etag, data),
        durationMs: Math.round(performance.now() - started),
      },
    };
  } catch (error) {
    if (signal.aborted) return null;
    const timedOut = error instanceof DOMException && error.name === "TimeoutError";
    return {
      kind: "error",
      message: timedOut
        ? "10 saniye içinde yanıt gelmedi."
        : "Sunucuya ulaşılamadı.",
    };
  }
}

/**
 * Sends GET requests to the API for the playgrounds. Loads `initialPath` on
 * mount; `send` replaces any request still in flight. The last response stays
 * visible while a new one is pending.
 */
export function useApiRequest(initialPath: string) {
  const [response, setResponse] = useState<ApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(true);
  const inFlight = useRef<AbortController | null>(null);

  const start = useCallback(
    (path: string, headers: Record<string, string> = {}) => {
      inFlight.current?.abort();
      const controller = new AbortController();
      inFlight.current = controller;
      void requestApi(path, headers, controller.signal).then((outcome) => {
        if (!outcome || inFlight.current !== controller) return;
        setPending(false);
        if (outcome.kind === "response") {
          setResponse(outcome.response);
          setError(null);
        } else {
          setError(outcome.message);
        }
      });
    },
    [],
  );

  useEffect(() => {
    start(initialPath);
    // Abort whatever is in flight on unmount, including requests sent later.
    return () => inFlight.current?.abort();
  }, [initialPath, start]);

  const send = useCallback(
    (path: string, headers?: Record<string, string>) => {
      setPending(true);
      start(path, headers);
    },
    [start],
  );

  return { response, error, pending, send };
}
