import { logger } from "../observability.js";

/**
 * Postgres SQLSTATEs and Node socket codes that mean "not reachable or not ready yet": booting (57P03),
 * connection failures (class 08), too many connections (53300), refused/reset/timeout, and the
 * container's DNS name not existing yet. A wrong password, missing database or SQL error is not here:
 * waiting will not fix those, so startup fails fast and the log shows the real cause.
 */
const TRANSIENT_CODES = new Set([
  "57P03", "53300",
  "ECONNREFUSED", "ECONNRESET", "ETIMEDOUT", "EAI_AGAIN", "ENOTFOUND", "EPIPE",
]);

export function isTransientDbError(err: unknown): boolean {
  const code = (err as { code?: unknown } | null)?.code;
  if (typeof code !== "string") return false;
  return TRANSIENT_CODES.has(code) || code.startsWith("08");
}

interface WaitOptions {
  attempts?: number;
  delayMs?: number;
  sleep?: (ms: number) => Promise<void>;
}

/**
 * Runs `probe` until it succeeds, waiting between transient failures. On a reboot Docker starts every
 * container at once, so Postgres may still be booting; waiting here (default ~60 s) turns that into one
 * slow start instead of a crash-restart loop. After the last attempt the error is rethrown and Docker's
 * restart policy takes over.
 */
export async function waitForDatabase(
  probe: () => Promise<unknown>,
  { attempts = 30, delayMs = 2_000, sleep = (ms) => new Promise((r) => setTimeout(r, ms)) }: WaitOptions = {},
): Promise<void> {
  for (let attempt = 1; ; attempt++) {
    try {
      await probe();
      return;
    } catch (err) {
      if (attempt >= attempts || !isTransientDbError(err)) throw err;
      logger.warn({ attempt, attempts, code: (err as { code?: string }).code }, "PostgreSQL not ready; waiting");
      await sleep(delayMs);
    }
  }
}
