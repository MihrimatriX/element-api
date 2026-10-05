/** Compound slug meaning "the pure element, no compound". */
export const ELEMENTAL_SLUG = "elemental";

/** Credits and grams are stored as NUMERIC(18,4): four decimal places. */
const FOUR_DECIMALS = 10_000;

/** Rounds a credit or gram amount to the four decimal places the database stores. */
export function roundToFourDecimals(value: number): number {
  return Math.round(value * FOUR_DECIMALS) / FOUR_DECIMALS;
}

/**
 * Price of one order line in KREDI: parent element ask × compound priceMult × grams.
 * Returns 0 when any input is not positive, so the caller rejects the order. ("Elx" is a legacy name kept for callers.)
 */
export function compoundLineElx(
  ask: number,
  priceMult: number,
  grams: number,
): number {
  const allInputsPositive = ask > 0 && priceMult > 0 && grams > 0;
  if (!allInputsPositive) return 0;
  return roundToFourDecimals(ask * priceMult * grams);
}
