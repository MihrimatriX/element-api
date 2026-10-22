import type { CompoundGroup } from "../../services/chemistry";
import type { ScientificCompound } from "../../services/science";
// Relative `.ts` path so node's test runner can import this module directly.
import { matchesSearch } from "../../lib/text.ts";

/** Catalogue groups of each compound, keyed by slug. */
export type GroupsBySlug = ReadonlyMap<string, readonly CompoundGroup[]>;

/**
 * Compounds that match the search query and, when `group` is set, belong to that group.
 * The query is Turkish-folded and every word must appear in a name, a formula or the
 * PubChem CID, so "sulfurik" finds "Sülfürik asit" and "2244" finds aspirin.
 */
export function filterCompounds(
  records: readonly ScientificCompound[],
  query: string,
  group: CompoundGroup | null,
  groupsBySlug: GroupsBySlug,
): ScientificCompound[] {
  return records.filter((record) => {
    if (group && !groupsBySlug.get(record.slug)?.includes(group)) return false;
    return matchesSearch(
      query,
      record.names.tr,
      record.names.en,
      record.names.iupac,
      record.molecular_properties.molecular_formula,
      record.display_formula,
      String(record.identifiers.pubchem_cid),
    );
  });
}
