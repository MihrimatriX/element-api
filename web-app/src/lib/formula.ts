/** One display run of a chemical formula. */
export interface FormulaPart {
  text: string;
  kind: "base" | "sub" | "sup";
}

/**
 * Splits a formula such as "Ca(OH)2", "CuSO4·5H2O" or "SO4^2-" into display runs.
 * Digits right after an element symbol, ")" or "]" are atom counts (subscript);
 * other digits, like the 5 in "·5H2O", are coefficients and stay inline.
 * Text after "^" is the ionic charge (superscript).
 */
export function formulaParts(formula: string): FormulaPart[] {
  const [body, charge] = formula.split("^");
  const parts: FormulaPart[] = [];
  let previous = "";
  for (const [run] of body.matchAll(/\d+|\D+/g)) {
    const isAtomCount = /^\d/.test(run) && /[A-Za-z)\]]$/.test(previous);
    parts.push({ text: run, kind: isAtomCount ? "sub" : "base" });
    previous = run;
  }
  if (charge) parts.push({ text: charge, kind: "sup" });
  return parts;
}
