import { readFile, writeFile } from 'node:fs/promises';

const root = new URL('../../', import.meta.url);
const known = JSON.parse(await readFile(new URL('web-app/src/data/known-compounds.json', root), 'utf8'));
const target = new URL('compound-service/Element.Services.Compound.Infrastructure/Data/scientific-compounds.json', root);
const existing = JSON.parse(await readFile(target, 'utf8'));
const have = new Set(existing.map(r => r.slug));
const { composition } = await import('./refresh-atlas.mjs');

// ponytail: MASS copied from chemistry.ts (not exported; this .mjs can't import that TS module without a loader). Share a JSON table if the copy drifts.
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

function weight(parts) {
  return Math.round(parts.reduce((sum, p) => sum + (MASS[p.symbol] ?? (() => { throw new Error(p.symbol); })()) * p.count, 0) * 1000) / 1000;
}

function compact(c) {
  const parts = composition(c.formula);
  const cid = c.cid;
  if (!cid) throw new Error(`Missing CID ${c.slug}`);
  const pubchem = `https://pubchem.ncbi.nlm.nih.gov/compound/${cid}`;
  return {
    id: c.slug,
    slug: c.slug,
    names: { tr: c.nameTr, en: c.nameEn, iupac: c.nameEn },
    identifiers: { pubchem_cid: cid, cas: [], inchi: '', inchi_key: '', smiles: '', connectivity_smiles: '' },
    molecular_properties: {
      molecular_formula: c.formula,
      molecular_weight_g_mol: weight(parts),
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
      ghs: { hazard_codes: [], precautionary_codes: [], signal_words: [], pictograms: [], sources: [], note: 'Compact educational record; consult a current SDS. Not a full PubChem snapshot.' },
      nfpa_704: { health: null, flammability: null, instability: null, special: null },
      toxicology: { ld50_oral_rat_mg_kg: null, ld50_oral_mouse_mg_kg: null, reported_values: [], occupational_exposure_limits: { osha_pel_mg_m3: null, acgih_tlv_mg_m3: null }, sources: [] },
    },
    bioactivity_and_pharmacology: { target_proteins: null, mechanism_of_action: null, metabolism: null, elimination_half_life_hours: null, mechanism_sources: [], metabolism_sources: [], half_life_sources: [] },
    provenance: {
      schema_version: '2.0',
      retrieved_at: new Date().toISOString().slice(0, 10),
      null_meaning: 'Not ingested in this compact record; not zero.',
      sources: [{ id: 'pubchem', name: 'PubChem / NCBI', url: pubchem, retrieved_at: new Date().toISOString().slice(0, 10), fields: ['identifiers.pubchem_cid', 'molecular_properties.molecular_formula'] }],
      editorial_fields: ['names.tr', 'slug', 'editorial', 'display_formula', 'composition'],
      measurement_policy: 'Educational compact record. Physical and safety snapshots are filled by refresh-scientific-catalog.mjs when ingested.',
    },
    editorial: { summary: c.summary, uses: c.uses, story: null, sources: [{ name: 'PubChem / NCBI', url: pubchem }] },
    media: { photo: null, structure: null },
    external_links: { wikipedia: null, pubchem },
    display_formula: c.formula,
    composition: parts,
  };
}

const added = [];
for (const c of known) {
  if (have.has(c.slug)) continue;
  existing.push(compact(c));
  added.push(c.slug);
}
await writeFile(target, JSON.stringify(existing, null, 2) + '\n');
console.log(`Scientific compounds: ${existing.length} (added ${added.length})`);
