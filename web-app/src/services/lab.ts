import { STATIC_ELEMENTS } from './elementData.ts';
import {
  bagFormula,
  compoundBySlug,
  formCompound,
  formulaText as subFormula,
  geometryOf,
  knownCompounds,
  labElements as chemistryElements,
  writeFormula,
  type Geometry,
  type GeometryKind,
  type KnownCompound,
} from './chemistry.ts';

export type { KnownCompound, Geometry, GeometryKind };
export { formCompound, knownCompounds, compoundBySlug, bagFormula, geometryOf, writeFormula };
export const LAB_VERSION = 1;
export const LAB_STORAGE_KEY = 'elementapi:lab:v1';
export const catalogSize = knownCompounds.length;

export interface LabMaterial { id: string; name: string; formula: string; kind: 'element' | 'compound' }
const elementName = Object.fromEntries(STATIC_ELEMENTS.map(e => [e.symbol, e.name]));

export const materials: LabMaterial[] = [
  ...chemistryElements.map(id => ({ id, name: elementName[id] ?? id, formula: id, kind: 'element' as const })),
  ...knownCompounds.map(c => ({ id: c.slug, name: c.nameTr, formula: c.formula, kind: 'compound' as const })),
];
export const materialById = Object.fromEntries(materials.map(m => [m.id, m]));
export const elementMaterials = materials.filter(m => m.kind === 'element');

export function normalizeDiscoveries(input: unknown): string[] {
  return Array.isArray(input)
    ? [...new Set(input.filter((id): id is string => typeof id === 'string' && id in compoundBySlug))]
    : [];
}
export function availableMaterials(discovered: string[]): string[] {
  return [...chemistryElements, ...normalizeDiscoveries(discovered)];
}
export function discover(discovered: string[], result: string): string[] {
  return normalizeDiscoveries([...discovered, result]);
}
export function hint(discovered: string[]): KnownCompound | undefined {
  const known = new Set(normalizeDiscoveries(discovered));
  return knownCompounds.find(c => !known.has(c.slug));
}
export function parseProgress(raw: string | null): string[] {
  try {
    const data = JSON.parse(raw ?? 'null');
    return data?.version === LAB_VERSION ? normalizeDiscoveries(data.discovered) : [];
  } catch {
    return [];
  }
}
export function loadProgress(storage: Pick<Storage, 'getItem'>): { discovered: string[]; persistent: boolean } {
  try { return { discovered: parseProgress(storage.getItem(LAB_STORAGE_KEY)), persistent: true }; }
  catch { return { discovered: [], persistent: false }; }
}
export function saveProgress(storage: Pick<Storage, 'setItem'>, discovered: string[]): boolean {
  try {
    storage.setItem(LAB_STORAGE_KEY, JSON.stringify({ version: LAB_VERSION, discovered: normalizeDiscoveries(discovered) }));
    return true;
  } catch { return false; }
}
export const formulaText = (formula: string) => subFormula(formula);
