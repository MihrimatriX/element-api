/** Inclusive cap from the retired payment worker: 50_000 KREDI. */
export const CREDIT_LIMIT = 50_000;

export function paymentDecision(amount: number): "ok" | "limit" {
  return Number.isFinite(amount) && amount <= CREDIT_LIMIT ? "ok" : "limit";
}
