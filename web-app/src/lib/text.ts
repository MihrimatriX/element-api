/**
 * Folds Turkish text for search: Turkish lower-casing, dotless ı → i and all
 * diacritics stripped, so "su" matches "Su", "demir" matches "DEMİR" and
 * "cozelti" matches "çözelti".
 */
export function foldTurkish(value: string): string {
  return value
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim();
}

/** True when every word of `query` appears in any of `fields` (Turkish-folded). Empty query matches all. */
export function matchesSearch(
  query: string,
  ...fields: Array<string | null | undefined>
): boolean {
  const words = foldTurkish(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const haystack = foldTurkish(fields.filter(Boolean).join(" "));
  return words.every((word) => haystack.includes(word));
}
