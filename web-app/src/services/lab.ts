import { STATIC_ELEMENTS } from "./elementData.ts";
import {
  bagFormula,
  compoundBySlug,
  formCompound,
  formulaText,
  geometryOf,
  knownCompounds,
  labElements,
  type FormResult,
  type Geometry,
  type GeometryKind,
  type KnownCompound,
} from "./chemistry.ts";

export type { FormResult, Geometry, GeometryKind, KnownCompound };
export {
  bagFormula,
  compoundBySlug,
  formCompound,
  formulaText,
  geometryOf,
  knownCompounds,
};

/** Feedback for a failed mix: wrong ratio, chemically impossible, not in the catalogue, or nothing on the bench. */
export type MissTone = "almost" | "impossible" | "unknown" | "empty";

/** Maps a failed formCompound result to its miss tone. */
export function missTone(result: Extract<FormResult, { ok: false }>): MissTone {
  if (result.code === "wrong_ratio") return "almost";
  if (result.code === "empty") return "empty";
  if (result.code === "noble" || result.code === "unstable") return "impossible";
  return "unknown";
}

/** Moves the chip at `from` to `to`; out-of-range or equal indexes return the order unchanged. */
export function moveChip(order: string[], from: number, to: number): string[] {
  const outOfRange = (index: number) => index < 0 || index >= order.length;
  if (from === to || outOfRange(from) || outOfRange(to)) return order;
  const next = [...order];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

/** Keeps the display order of bench chips in step with the counts: drops removed ids, appends new ones. */
export function syncChipOrder(
  order: string[],
  counts: Record<string, number>,
): string[] {
  const kept = order.filter((id) => Object.hasOwn(counts, id));
  const added = Object.keys(counts).filter((id) => !kept.includes(id));
  return [...kept, ...added];
}

/** Version stamp inside the pre-notebook discovery store. */
const LAB_VERSION = 1;
/** Storage key of the pre-notebook discovery store; useLearning still reads it once for guests. */
export const LAB_STORAGE_KEY = "elementapi:lab:v1";

/** Number of compounds the lab can discover. */
export const catalogSize = knownCompounds.length;

/** A palette element or a catalogue compound, addressable by one id (symbol or slug). */
export interface LabMaterial {
  id: string;
  name: string;
  formula: string;
  kind: "element" | "compound";
}

const elementBySymbol = new Map(STATIC_ELEMENTS.map((element) => [element.symbol, element]));
const atomicNumber = (symbol: string) =>
  elementBySymbol.get(symbol)?.atomicNumber ?? Number.MAX_SAFE_INTEGER;

const materials: LabMaterial[] = [
  ...[...labElements]
    .sort((a, b) => atomicNumber(a) - atomicNumber(b))
    .map((id) => ({
      id,
      name: elementBySymbol.get(id)?.name ?? id,
      formula: id,
      kind: "element" as const,
    })),
  ...knownCompounds.map((compound) => ({
    id: compound.slug,
    name: compound.nameTr,
    formula: compound.formula,
    kind: "compound" as const,
  })),
];

/** Every material by id: element symbols and compound slugs. */
export const materialById: Record<string, LabMaterial> = Object.fromEntries(
  materials.map((material) => [material.id, material]),
);

/** Palette elements (every element used in the catalogue plus He, Ne, Ar) in atomic-number order. */
export const elementMaterials = materials.filter((material) => material.kind === "element");

/** Palette symbol for a URL value such as "fe" or "Fe"; undefined when the lab has no such element. */
export function findLabElement(value: string | null): string | undefined {
  const wanted = value?.trim().toLowerCase();
  return elementMaterials.find((material) => material.id.toLowerCase() === wanted)?.id;
}

/** Unique, known compound slugs; anything else is dropped. */
export function normalizeDiscoveries(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return [
    ...new Set(
      input.filter(
        (id): id is string => typeof id === "string" && id in compoundBySlug,
      ),
    ),
  ];
}

/** Discoveries with `slug` added. */
export function discover(discovered: string[], slug: string): string[] {
  return normalizeDiscoveries([...discovered, slug]);
}

/** First catalogue compound not discovered yet. */
export function hint(discovered: string[]): KnownCompound | undefined {
  const known = new Set(normalizeDiscoveries(discovered));
  return knownCompounds.find((compound) => !known.has(compound.slug));
}

/** Reads the legacy `elementapi:lab:v1` value; anything unreadable gives no discoveries. */
export function parseProgress(raw: string | null): string[] {
  try {
    const data = JSON.parse(raw ?? "null");
    return data?.version === LAB_VERSION
      ? normalizeDiscoveries(data.discovered)
      : [];
  } catch {
    return [];
  }
}
