import { timingSafeEqual } from "node:crypto";
import type { Request, Response } from "express";
import { config } from "./config.js";
import { isUuid } from "./http.js";

/** Returns the caller's user id (lowercased) from the gateway-set X-User-Id header, or undefined when it is missing or not a UUID. */
export function readUserId(req: Request): string | undefined {
  const userId = req.header("X-User-Id")?.trim();
  // Lowercase = Postgres uuid text form, so JS ownership compares (customer_id !== userId) stay exact.
  return isUuid(userId) ? userId.toLowerCase() : undefined;
}

/**
 * Guards customer endpoints: the request must carry the internal service key (added by the gateway)
 * and a valid X-User-Id. Sends 401 and returns null otherwise.
 */
export function requireUser(req: Request, res: Response): string | null {
  if (!requireInternal(req, res)) return null;
  const userId = readUserId(req);
  if (!userId) {
    res.status(401).json({ error: "X-User-Id header required" });
    return null;
  }
  return userId;
}

/** Constant-time key comparison; empty or different-length keys fail without an early string compare. */
export function keysMatch(
  provided: string | undefined,
  expected: string,
): boolean {
  if (!provided || !expected) return false;
  const providedBytes = Buffer.from(provided);
  const expectedBytes = Buffer.from(expected);
  if (providedBytes.length !== expectedBytes.length) return false;
  return timingSafeEqual(providedBytes, expectedBytes);
}

/** Sends 401 and returns false unless the request carries the shared INTERNAL_API_KEY header. */
export function requireInternal(req: Request, res: Response): boolean {
  const providedKey = req.header("INTERNAL_API_KEY");
  if (!keysMatch(providedKey, config.internalApiKey)) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  return true;
}
