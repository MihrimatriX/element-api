/** Line amount in KREDI: parent ask × SKU priceMult × grams. (Name keeps Elx for callers.) */
export function compoundLineElx(ask: number, priceMult: number, grams: number): number {
  if (!(ask > 0) || !(priceMult > 0) || !(grams > 0)) return 0;
  return Math.round(ask * priceMult * grams * 10000) / 10000;
}
