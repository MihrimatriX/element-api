import type { ElementFamily } from "@/components/ui/element-tile";
import { familyOf, STATIC_ELEMENTS } from "@/services/elementData";

const elementBySymbol = new Map(STATIC_ELEMENTS.map((element) => [element.symbol, element]));

/** Name, atomic number and family of an element, for tiles and chips. */
export interface ElementInfo {
  name: string;
  atomicNumber: number;
  family: ElementFamily;
}

/** Display facts for a symbol; unknown symbols fall back to the "unknown" family. */
export function elementInfo(symbol: string): ElementInfo {
  const element = elementBySymbol.get(symbol);
  return {
    name: element?.name ?? symbol,
    atomicNumber: element?.atomicNumber ?? 0,
    family: familyOf(element?.category),
  };
}
