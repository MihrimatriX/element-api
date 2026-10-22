/** Turkish number formatting shared by stats, tables and the KREDI demo. */

const LOCALE = "tr-TR";

/** Formats a number with Turkish separators (`1.234,5`). Options pass straight to `Intl.NumberFormat`. */
export function formatNumber(
  value: number,
  options?: Intl.NumberFormatOptions,
): string {
  return new Intl.NumberFormat(LOCALE, options).format(value);
}

/** Formats a fixed number of decimals, e.g. `formatFixed(2.5, 2)` → `2,50`. */
export function formatFixed(value: number, digits: number): string {
  return formatNumber(value, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

/** Virtual KREDI amount (`1.234,50 kredi`); `—` when the value is unknown. */
export function formatKredi(
  value: number | null | undefined,
  digits = 2,
): string {
  if (value == null || Number.isNaN(value)) return "—";
  return `${formatFixed(value, digits)} kredi`;
}

/** Mass in grams (`12,5 g`) with at most `digits` decimals. */
export function formatGrams(value: number, digits = 0): string {
  return `${formatNumber(value, { maximumFractionDigits: digits })} g`;
}
