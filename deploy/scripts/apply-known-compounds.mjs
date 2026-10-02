/**
 * Adds a compact scientific record for every compound in web-app/src/data/known-compounds.json
 * that the compound-service snapshot (scientific-compounds.json) does not have yet.
 * Existing records are never changed; refresh-scientific-catalog.mjs can later replace a compact
 * record with a full PubChem snapshot.
 *
 * Run: node deploy/scripts/apply-known-compounds.mjs
 */
import { readFile, writeFile } from 'node:fs/promises';

const root = new URL('../../', import.meta.url);
const knownCompounds = JSON.parse(await readFile(new URL('web-app/src/data/known-compounds.json', root), 'utf8'));
const snapshotPath = new URL('compound-service/Element.Services.Compound.Infrastructure/Data/scientific-compounds.json', root);
const snapshot = JSON.parse(await readFile(snapshotPath, 'utf8'));
const existingSlugs = new Set(snapshot.map((record) => record.slug));
const { composition } = await import('./refresh-atlas.mjs');

// ponytail: MASS copied from chemistry.ts (not exported; this .mjs can't import that TS module without a loader). Share a JSON table if the copy drifts.
/** Standard atomic masses (g/mol) for the elements that appear in known-compounds.json. */
const MASS = {
  H: 1.008, He: 4.003, Li: 6.94, Be: 9.012, B: 10.81, C: 12.011, N: 14.007, O: 15.999,
  F: 18.998, Na: 22.99, Mg: 24.305, Al: 26.982, Si: 28.085, P: 30.974, S: 32.06, Cl: 35.45,
  K: 39.098, Ca: 40.078, Ti: 47.867, V: 50.942, Cr: 51.996, Mn: 54.938, Fe: 55.845,
  Co: 58.933, Ni: 58.693, Cu: 63.546, Zn: 65.38, Ga: 69.723, Ge: 72.63, As: 74.922,
  Se: 78.971, Br: 79.904, Rb: 85.468, Sr: 87.62, Mo: 95.95, Pd: 106.42, Ag: 107.868,
  Cd: 112.414, In: 114.818, Sn: 118.71, Sb: 121.76, Te: 127.6, I: 126.904, Xe: 131.293,
  Cs: 132.905, Ba: 137.327, W: 183.84, Pt: 195.084, Au: 196.967, Hg: 200.592, Pb: 207.2,
  Bi: 208.98, U: 238.029,
};

/** Molecular weight in g/mol rounded to 3 decimals; throws with the symbol when a mass is missing. */
function molecularWeight(parts) {
  let total = 0;
  for (const part of parts) {
    const atomicMass = MASS[part.symbol];
    if (atomicMass === undefined || atomicMass === null) throw new Error(part.symbol);
    total += atomicMass * part.count;
  }
  return Math.round(total * 1000) / 1000;
}

/** Builds the schema-2.0 compact record: names, formula, weight and PubChem link; unknown values stay null. */
function compactRecord(compound) {
  const parts = composition(compound.formula);
  const cid = compound.cid;
  if (!cid) throw new Error(`Missing CID ${compound.slug}`);
  const pubchemUrl = `https://pubchem.ncbi.nlm.nih.gov/compound/${cid}`;
  const retrievedAt = new Date().toISOString().slice(0, 10);
  return {
    id: compound.slug,
    slug: compound.slug,
    names: { tr: compound.nameTr, en: compound.nameEn, iupac: compound.nameEn },
    identifiers: { pubchem_cid: cid, cas: [], inchi: '', inchi_key: '', smiles: '', connectivity_smiles: '' },
    molecular_properties: {
      molecular_formula: compound.formula,
      molecular_weight_g_mol: molecularWeight(parts),
      exact_mass_da: null,
      monoisotopic_mass_da: null,
      formal_charge: 0,
      xlogp: null,
      topological_polar_surface_area_a2: null,
      hydrogen_bond_donors: null,
      hydrogen_bond_acceptors: null,
      rotatable_bonds: null,
      complexity: null,
    },
    physical_properties: { melting_point: [], boiling_point: [], density: [], solubility: [], dissociation_constants: [] },
    safety: {
      ghs: {
        hazard_codes: [],
        precautionary_codes: [],
        signal_words: [],
        pictograms: [],
        sources: [],
        note: 'Compact educational record; consult a current SDS. Not a full PubChem snapshot.',
      },
      nfpa_704: { health: null, flammability: null, instability: null, special: null },
      toxicology: {
        ld50_oral_rat_mg_kg: null,
        ld50_oral_mouse_mg_kg: null,
        reported_values: [],
        occupational_exposure_limits: { osha_pel_mg_m3: null, acgih_tlv_mg_m3: null },
        sources: [],
      },
    },
    bioactivity_and_pharmacology: {
      target_proteins: null,
      mechanism_of_action: null,
      metabolism: null,
      elimination_half_life_hours: null,
      mechanism_sources: [],
      metabolism_sources: [],
      half_life_sources: [],
    },
    provenance: {
      schema_version: '2.0',
      retrieved_at: retrievedAt,
      null_meaning: 'Not ingested in this compact record; not zero.',
      sources: [
        {
          id: 'pubchem',
          name: 'PubChem / NCBI',
          url: pubchemUrl,
          retrieved_at: retrievedAt,
          fields: ['identifiers.pubchem_cid', 'molecular_properties.molecular_formula'],
        },
      ],
      editorial_fields: ['names.tr', 'slug', 'editorial', 'display_formula', 'composition'],
      measurement_policy: 'Educational compact record. Physical and safety snapshots are filled by refresh-scientific-catalog.mjs when ingested.',
    },
    editorial: { summary: compound.summary, uses: compound.uses, story: null, sources: [{ name: 'PubChem / NCBI', url: pubchemUrl }] },
    media: { photo: null, structure: null },
    external_links: { wikipedia: null, pubchem: pubchemUrl },
    display_formula: compound.formula,
    composition: parts,
  };
}

const addedSlugs = [];
for (const compound of knownCompounds) {
  if (existingSlugs.has(compound.slug)) continue;
  snapshot.push(compactRecord(compound));
  addedSlugs.push(compound.slug);
}
await writeFile(snapshotPath, JSON.stringify(snapshot, null, 2) + '\n');
console.log(`Scientific compounds: ${snapshot.length} (added ${addedSlugs.length})`);
