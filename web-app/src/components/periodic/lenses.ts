import type { ScientificElement } from "@/services/science";
import { formatNumber } from "../../lib/format.ts";

/** Colour lens of the periodic table: family colours, two numeric heat maps or the standard state. */
export type Lens = "category" | "mass" | "electronegativity" | "phase";

/** Lens chips, in toolbar order. */
export const LENS_OPTIONS = [
  { value: "category", label: "Aileler" },
  { value: "mass", label: "Atom kütlesi" },
  { value: "electronegativity", label: "Elektronegatiflik" },
  { value: "phase", label: "Fiziksel hâl" },
] as const satisfies readonly { value: Lens; label: string }[];

/** Name of the value printed on each tile under a lens (the family lens prints atomic mass). */
export const LENS_VALUE_LABEL: Record<Lens, string> = {
  category: "Atom kütlesi",
  mass: "Atom kütlesi",
  electronegativity: "Elektronegatiflik",
  phase: "Fiziksel hâl",
};

/** Tile tint for a non-family lens: `edge` is the full colour (top band), `fill` the tile background. */
export interface LensPaint {
  edge: string;
  fill: string;
}

/** What one tile shows under a lens. */
export interface LensReading {
  /** Tile text: "55,85", "Katı" or "—". */
  value: string;
  /** Data is loaded but has no value for this element: the tile is hatched. */
  missing: boolean;
  /** Present for heat and phase lenses; absent keeps the family colour. */
  paint?: LensPaint;
}

/** Lowest and highest value of a numeric lens across the loaded records. */
export type LensDomain = readonly [min: number, max: number];

type NumericLens = "mass" | "electronegativity";

/** Unit and reader of each numeric lens. */
export const NUMERIC_LENSES: Record<
  NumericLens,
  { unit: string; read: (record: ScientificElement) => number | null }
> = {
  mass: { unit: "u", read: (record) => record.atomic_properties.atomic_mass },
  electronegativity: {
    unit: "Pauling",
    read: (record) => record.atomic_properties.electronegativity.pauling,
  },
};

/** Standard states the phase lens colours: solids stay neutral so liquids and gases stand out. */
export const PHASES: Record<string, { label: string; color: string }> = {
  solid: { label: "Katı", color: "var(--color-family-unknown)" },
  liquid: { label: "Sıvı", color: "var(--color-family-lanthanide)" },
  gas: { label: "Gaz", color: "var(--color-warning)" },
};

/** Turkish name of a standard state ("solid" → "Katı"); "Bilinmiyor" when unknown. */
export function phaseLabel(state: string | null | undefined): string {
  return PHASES[state ?? ""]?.label ?? "Bilinmiyor";
}

/** True for the lenses that colour tiles on a numeric scale. */
export function isNumericLens(lens: Lens): lens is NumericLens {
  return lens === "mass" || lens === "electronegativity";
}

/** Four significant digits, Turkish separators: 55,85 · 1,008 · 294. */
export function formatLensNumber(value: number): string {
  return formatNumber(value, { maximumSignificantDigits: 4 });
}

/**
 * Surface tint of `color` at `percent` strength. Mixed in oklab, unlike the oklch family tints:
 * oklch would turn amber and pink toward the green surface hue, and the tile would stop
 * matching its legend swatch.
 */
function tint(color: string, percent: number): string {
  return `color-mix(in oklab, ${color} ${percent}%, var(--color-surface))`;
}

/**
 * Sequential heat colour for a position from 0 (lowest) to 1 (highest): hue runs from cool
 * blue through green to amber while the tint gets stronger, so order reads by lightness too
 * (safe for common colour-vision deficiencies).
 */
export function heatPaint(position: number): LensPaint {
  const percent = Math.round(Math.min(1, Math.max(0, position)) * 100);
  const edge = `color-mix(in oklch, var(--color-warning) ${percent}%, var(--color-info))`;
  return { edge, fill: tint(edge, 14 + Math.round(percent * 0.36)) };
}

/** Domain of a numeric lens over the records, or `undefined` when none has a value yet. */
export function lensDomain(
  lens: Lens,
  records: readonly ScientificElement[],
): LensDomain | undefined {
  if (!isNumericLens(lens)) return undefined;
  const values = records
    .map(NUMERIC_LENSES[lens].read)
    .filter((value): value is number => value != null);
  if (values.length === 0) return undefined;
  return [Math.min(...values), Math.max(...values)];
}

/**
 * Reads one element under a lens. `record` is undefined while data loads (tile shows "—",
 * not hatched); a loaded record without a value is `missing` (hatched).
 */
export function readLens(
  lens: Lens,
  record: ScientificElement | undefined,
  domain: LensDomain | undefined,
): LensReading {
  if (lens === "phase") {
    const phase = PHASES[record?.thermodynamic_properties.standard_state ?? ""];
    if (!phase) return { value: "—", missing: record !== undefined };
    return {
      value: phase.label,
      missing: false,
      paint: { edge: phase.color, fill: tint(phase.color, 26) },
    };
  }

  const value = record ? NUMERIC_LENSES[lens === "category" ? "mass" : lens].read(record) : null;
  if (value == null)
    return { value: "—", missing: lens !== "category" && record !== undefined };
  if (lens === "category") return { value: formatLensNumber(value), missing: false };

  const [min, max] = domain ?? [value, value];
  const position = max > min ? (value - min) / (max - min) : 0;
  return { value: formatLensNumber(value), missing: false, paint: heatPaint(position) };
}
