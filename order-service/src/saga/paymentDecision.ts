/** Largest order total in KREDI (inclusive), inherited from the retired payment worker. */
export const CREDIT_LIMIT = 50_000;

/** Decides whether the saga may request payment for an amount: "ok" up to the credit limit, otherwise "limit". */
export function paymentDecision(amount: number): "ok" | "limit" {
  const isWithinLimit = Number.isFinite(amount) && amount <= CREDIT_LIMIT;
  return isWithinLimit ? "ok" : "limit";
}
