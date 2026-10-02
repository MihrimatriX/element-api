import type { ElementFamily } from "@/components/ui/element-tile";
import { STATIC_ELEMENTS } from "@/services/elementData";

const FAMILIES: readonly ElementFamily[] = [
  "alkali",
  "alkaline",
  "transition",
  "post",
  "metalloid",
  "nonmetal",
  "halogen",
  "noble",
  "lanthanide",
  "actinide",
];

const bySymbol = new Map(STATIC_ELEMENTS.map((e) => [e.symbol, e]));

/** Name, atomic number and family of an element, for tiles and chips. */
export interface ElementInfo {
  name: string;
  atomicNumber: number;
  family: ElementFamily;
}

/** Display facts for a symbol; unknown symbols fall back to the "unknown" family. */
export function elementInfo(symbol: string): ElementInfo {
  const element = bySymbol.get(symbol);
  const family = FAMILIES.find((f) => f === element?.category) ?? "unknown";
  return {
    name: element?.name ?? symbol,
    atomicNumber: element?.atomicNumber ?? 0,
    family,
  };
}

/** CSS colour of a family token, for the `--family` custom property. */
export function familyColor(family: ElementFamily): string {
  return `var(--color-family-${family})`;
}
