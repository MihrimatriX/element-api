import localElements from "../../../catalog-service/Element.Services.Element.Infrastructure/Data/scientific-elements.json" with { type: "json" };
import scientificCompounds from "../../../compound-service/Element.Services.Compound.Infrastructure/Data/scientific-compounds.json" with { type: "json" };
import { asScienceCompound, knownCompounds } from "./chemistry.ts";

/**
 * Offline snapshot behind `science.ts` (loaded lazily as its own ~1.4 MB
 * chunk). Elements are the full catalogue records; compounds are built from
 * the lab catalogue plus the structure drawings of the compound service.
 */

// ponytail: local JSON is only the fallback when /api/v2 is down. STATIC_ELEMENTS stays the periodic layout seed; do not add a fourth copy.

type ScienceKind = "elements" | "compounds";

const structureBySlug = new Map(
  (
    scientificCompounds as {
      slug: string;
      media?: { structure?: { url: string } | null };
    }[]
  ).map((compound) => [compound.slug, compound.media?.structure]),
);

const localCompounds = knownCompounds.map((compound) => {
  const record = asScienceCompound(compound);
  const structure = structureBySlug.get(compound.slug);
  return structure?.url
    ? { ...record, media: { photo: null, structure } }
    : record;
});

const elementsBySymbol = new Map(
  localElements.map((element) => [element.symbol.toLowerCase(), element]),
);
const compoundsBySlug = new Map(
  localCompounds.map((compound) => [compound.slug, compound]),
);

/** One local record by id (element symbol or compound slug, any case), or the whole list. */
export function localScience(kind: ScienceKind, id?: string) {
  if (kind === "elements")
    return id ? elementsBySymbol.get(id.toLowerCase()) : localElements;
  return id ? compoundsBySlug.get(id.toLowerCase()) : localCompounds;
}

/** Record id used to match API rows with local ones; `undefined` rows are ignored. */
function recordId(kind: ScienceKind, row: unknown): string | undefined {
  if (kind === "elements")
    return (row as { symbol?: string }).symbol?.toLowerCase();
  return (row as { slug?: string }).slug;
}

/**
 * Local records with API rows laid over them: an API row replaces the local
 * record with the same id whole, and records only the API knows are appended.
 */
export function mergeRemote<T>(kind: ScienceKind, remote: T[]): T[] {
  const merged = new Map<string, T>();
  for (const row of [...(localScience(kind) as T[]), ...remote]) {
    const id = recordId(kind, row);
    if (id) merged.set(id, row);
  }
  return [...merged.values()];
}
