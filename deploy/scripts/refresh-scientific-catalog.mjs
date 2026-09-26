// Versioned public scientific snapshots. No external requests occur on the API read path.
import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';

const root = new URL('../../', import.meta.url);
const cache = new URL('artifacts/science-cache/', root);
await mkdir(cache, { recursive: true });
const retrieved = new Date().toISOString().slice(0, 10);
const acquisitionDates = new Map();
async function download(url, name, json = true) {
  const path = new URL(name, cache);
  if (!process.argv.includes('--force')) {
    try { const text = await readFile(path, 'utf8'); acquisitionDates.set(url, (await stat(path)).mtime.toISOString().slice(0, 10)); return json ? JSON.parse(text) : text; } catch { /* fetch */ }
  }
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(25000) });
      if (!response.ok) throw new Error(`${response.status} ${url}`);
      const text = await response.text();
      const result = json ? JSON.parse(text) : text;
      await writeFile(path, text);
      acquisitionDates.set(url, retrieved);
      await new Promise(resolve => setTimeout(resolve, 250));
      return result;
    } catch (error) { if (attempt === 2) throw error; }
  }
}
const number = value => value != null && String(value).trim() !== '' && Number.isFinite(Number(value)) ? Number(value) : null;
const rounded = n => Number(n.toPrecision(10));
const evToKj = value => number(value) == null ? null : rounded(number(value) * 96.4853321233);
const temperature = value => ({ k: number(value), c: number(value) == null ? null : rounded(number(value) - 273.15) });
const clean = s => s.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&minus;|&#8722;/g, '-').replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&[^;]+;/g, ' ').replace(/\s+/g, ' ').trim();
const source = (id, name, url, fields) => {
  const acquisitionUrl = url.includes('periodic-table/') && id === 'pubchem' ? 'https://pubchem.ncbi.nlm.nih.gov/rest/pug/periodictable/JSON'
    : id === 'nist' ? 'https://physics.nist.gov/cgi-bin/Compositions/stand_alone.pl?ele=&all=all&ascii=ascii2'
    : id === 'pubchem' ? url.replace('/compound/', '/rest/pug_view/data/compound/') + '/JSON'
    : id === 'uniprot' ? `https://rest.uniprot.org/uniprotkb/${url.split('/')[4]}.json` : url;
  return { id, name, url, retrieved_at: acquisitionDates.get(acquisitionUrl) ?? retrieved, fields };
};

const { Table: table } = await download('https://pubchem.ncbi.nlm.nih.gov/rest/pug/periodictable/JSON', 'periodic.json');
const rows = table.Row.map(row => Object.fromEntries(table.Columns.Column.map((key, i) => [key, row.Cell[i]])));
if (rows.length !== 118) throw new Error('Expected 118 PubChem elements.');
const frontend = await readFile(new URL('web-app/src/services/elementData.ts', root), 'utf8');
const localized = new Map(frontend.match(/const rawElements = "([^"]+)"/)[1].split('|').map(row => { const [z, symbol, tr, category, rowIndex, col] = row.split(','); return [symbol, { z: +z, tr, category, row: +rowIndex, col: +col }]; }));
const nistUrl = 'https://physics.nist.gov/cgi-bin/Compositions/stand_alone.pl?ele=&all=all&ascii=ascii2';
const nist = await download(nistUrl, 'isotopes.html', false);
const isotopeRecords = [...nist.matchAll(/Atomic Number = (\d+)\r?\nAtomic Symbol = (\w+)\r?\nMass Number = (\d+)\r?\nRelative Atomic Mass = ([^\r\n]*)\r?\nIsotopic Composition = ([^\r\n]*)\r?\nStandard Atomic Weight = ([^\r\n]*)/g)];
if (isotopeRecords.length < 300) throw new Error('NIST isotope format changed.');
function expandConfiguration(config, seen = new Set()) {
  return config.replace(/\[([A-Za-z]+)\]/g, (_, symbol) => {
    if (seen.has(symbol)) throw new Error('Cyclic electron configuration');
    const inner = rows.find(r => r.Symbol === symbol)?.ElectronConfiguration;
    if (!inner) throw new Error(`Unknown electron core ${symbol}`);
    return expandConfiguration(inner, new Set([...seen, symbol])) + ' ';
  });
}
const elements = [];
for (const row of rows) {
  const loc = localized.get(row.Symbol);
  if (!loc || loc.z !== +row.AtomicNumber) throw new Error(`Missing layout for ${row.Symbol}`);
  const rscName = ({ Cs: 'caesium', Al: 'aluminium' })[row.Symbol] ?? row.Name.toLowerCase();
  const rscUrl = `https://periodic-table.rsc.org/element/${row.AtomicNumber}/${rscName}`;
  const html = await download(rscUrl, `rsc-${row.Symbol}.html`, false);
  const cells = [...html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].flatMap(tr => [...tr[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(x => clean(x[1])));
  const fact = label => { const i = cells.findIndex(c => c.startsWith(label)); return i < 0 ? null : cells[i + 1]; };
  const strictFact = label => number(fact(label));
  const energy = [...(fact('Ionisation energies') ?? '').matchAll(/\d+\s*(?:st|nd|rd|th)\s+([\d.]+)/g)].map(m => +m[1]);
  const isotopes = isotopeRecords.filter(m => +m[1] === +row.AtomicNumber).map(m => ({
    mass_number: +m[3], exact_mass_da: number(m[4].replace(/\(.*$/, '')), exact_mass_reported: m[4].trim(),
    abundance_percent: number(m[5].replace(/\(.*$/, '')) == null ? null : rounded(number(m[5].replace(/\(.*$/, '')) * 100),
    abundance_fraction_reported: m[5].trim() || null, half_life: null, spin_parity: null, decay_mode: null
  }));
  const block = loc.row > 7 ? 'f' : loc.col <= 2 || row.Symbol === 'He' ? 's' : loc.col >= 13 ? 'p' : 'd';
  const weight = isotopeRecords.find(m => +m[1] === +row.AtomicNumber)?.[6]?.trim() ?? null;
  const preciseMass = weight && /^\d+(\.\d+)?\(\d+\)$/.test(weight) ? number(weight.replace(/\(.*/, '')) : null;
  const uncertainty = preciseMass == null ? null : rounded(Number(weight.match(/\((\d+)\)/)[1]) * 10 ** -(weight.split('.')[1]?.split('(')[0].length ?? 0));
  const fullConfiguration = expandConfiguration(row.ElectronConfiguration ?? '').match(/\d[spdf]\d+/g) ?? [];
  const shells = Array.from({ length: loc.row > 7 ? loc.row - 2 : loc.row }, (_, i) => fullConfiguration.filter(c => +c[0] === i + 1).reduce((sum, c) => sum + +c.slice(2), 0));
  const validConfiguration = shells.reduce((sum, n) => sum + n, 0) === +row.AtomicNumber;
  elements.push({
    id: `${row.Symbol.toLowerCase()}-${row.AtomicNumber}`, atomic_number: +row.AtomicNumber, symbol: row.Symbol,
    names: { tr: loc.tr, en: row.Name, la: row.Symbol === 'Fe' ? 'Ferrum' : null, de: row.Symbol === 'Fe' ? 'Eisen' : null },
    classification: { period: loc.row > 7 ? loc.row - 2 : loc.row, group: loc.row > 7 ? null : loc.col, block, series: row.GroupBlock, category: loc.category, cas_number: /^\d+-\d+-\d$/.test(fact('CAS number')) ? fact('CAS number') : null, appearance: null },
    layout: { row: loc.row, column: loc.col },
    atomic_properties: {
      atomic_mass: preciseMass ?? number(row.AtomicMass), standard_atomic_weight_reported: weight,
      standard_atomic_weight_uncertainty: uncertainty,
      electron_configuration: { short: row.ElectronConfiguration || null, full: validConfiguration ? fullConfiguration.join(' ') : null }, term_symbol: null, electrons_per_shell: validConfiguration ? shells : null, valence_electrons: null,
      oxidation_states: { common: row.OxidationStates ? row.OxidationStates.split(',').map(s => number(s.trim())) : null, rare: null },
      electronegativity: { pauling: number(row.Electronegativity), allen: null, allred_rochow: null, mulliken: null },
      ionization_energies_kj_mol: energy.length ? energy : number(row.IonizationEnergy) == null ? null : [evToKj(row.IonizationEnergy)],
      electron_affinity_kj_mol: evToKj(row.ElectronAffinity),
      radii_pm: { atomic_empirical: null, atomic_calculated: null, covalent_single_bond: strictFact('Covalent radius') == null ? null : rounded(strictFact('Covalent radius') * 100), covalent_double_bond: null, covalent_triple_bond: null, van_der_waals: number(row.AtomicRadius) }
    },
    thermodynamic_properties: {
      standard_state: row.StandardState?.toLowerCase() || null, melting_point: temperature(row.MeltingPoint), boiling_point: temperature(row.BoilingPoint),
      triple_point: { temperature_k: null, pressure_kpa: null }, critical_point: { temperature_k: null, pressure_mpa: null },
      density_g_cm3: { reported: number(row.Density), conditions: 'PubChem periodic-table reference conditions; not asserted to be STP.', stp: null, liquid_at_mp: null },
      enthalpy_of_fusion_kj_mol: null, enthalpy_of_vaporization_kj_mol: null,
      specific_heat_capacity_j_g_k: strictFact('Specific heat capacity') == null ? null : rounded(strictFact('Specific heat capacity') / 1000), molar_heat_capacity_j_mol_k: null
    },
    mechanical_properties: { mohs_hardness: null, vickers_hardness_mpa: null, brinell_hardness_mpa: null, youngs_modulus_gpa: strictFact("Young's modulus"), youngs_modulus_reported: fact("Young's modulus"), shear_modulus_gpa: strictFact('Shear modulus'), shear_modulus_reported: fact('Shear modulus'), bulk_modulus_gpa: strictFact('Bulk modulus'), poissons_ratio: null, speed_of_sound_m_s: null },
    electromagnetic_and_optical: { electrical_resistivity_ohm_m: null, electrical_conductivity_s_m: null, thermal_conductivity_w_m_k: null, thermal_expansion_coefficient_um_m_k: null, magnetic_ordering: null, curie_temperature_k: null, refractive_index: null },
    crystallography: { structure_name: null, space_group_number: null, space_group_symbol: null, lattice_parameters_pm: { a: null, b: null, c: null, alpha: null, beta: null, gamma: null } },
    abundance: { universe_mass_percent: null, solar_system_mass_percent: null, crust_mg_kg: null, ocean_mg_l: null, human_body_mass_percent: null },
    history: { discovered_year: /^\d+$/.test(row.YearDiscovered) ? +row.YearDiscovered : null, discovery_reported: row.YearDiscovered || null, discoverers: null, etymology: null }, isotopes,
    provenance: { schema_version: '2.0', retrieved_at: retrieved, null_meaning: 'Not available in this snapshot; not zero or evidence of absence.', isotope_scope: 'NIST reference isotope compositions; not an exhaustive radioactive isotope catalogue. Stability is not inferred from natural abundance.', sources: [source('pubchem', 'PubChem / NCBI', 'https://pubchem.ncbi.nlm.nih.gov/periodic-table/', ['names.en', ...(preciseMass == null ? ['atomic_properties.atomic_mass'] : []), 'atomic_properties.electron_configuration.short', 'atomic_properties.electronegativity.pauling', 'atomic_properties.oxidation_states.common', 'atomic_properties.electron_affinity_kj_mol', 'atomic_properties.radii_pm.van_der_waals', 'thermodynamic_properties', 'history']), source('rsc', 'Royal Society of Chemistry', rscUrl, ['classification.cas_number', 'atomic_properties.radii_pm.covalent_single_bond', ...(energy.length ? ['atomic_properties.ionization_energies_kj_mol'] : []), 'thermodynamic_properties.specific_heat_capacity_j_g_k', 'mechanical_properties']), source('nist', 'NIST — isotope compositions', `https://physics.nist.gov/cgi-bin/Compositions/stand_alone.pl?ele=${row.Symbol}`, ['isotopes', 'atomic_properties.standard_atomic_weight_reported', ...(preciseMass == null ? [] : ['atomic_properties.atomic_mass', 'atomic_properties.standard_atomic_weight_uncertainty'])])], conversions: ['eV per particle × 96.4853321233 = kJ/mol', '°C = K − 273.15', 'Å × 100 = pm', 'J/(kg K) ÷ 1000 = J/(g K)', 'Full electron configuration and shell populations: expanded PubChem noble-gas core; total electrons validated against atomic number'], editorial_fields: ['names.tr', 'names.la', 'names.de', 'classification.category', 'layout'] }
  });
  if (elements.length % 20 === 0) console.log(`Elements: ${elements.length}/118`);
}
const elementTarget = new URL('catalog-service/Element.Services.Element.Infrastructure/Data/scientific-elements.json', root);
for (const element of elements) element.provenance.retrieved_at = element.provenance.sources.map(s => s.retrieved_at).sort().at(-1);
await writeFile(elementTarget, JSON.stringify(elements, null, 2) + '\n');
console.log(`Saved ${elements.length} elements, ${elements.reduce((n,e)=>n+e.isotopes.length,0)} isotope records.`);

const sku = JSON.parse(await readFile(new URL('compound-service/Element.Services.Compound.Infrastructure/Data/compounds.json', root), 'utf8'));
const existing = JSON.parse(await readFile(new URL('compound-service/Element.Services.Compound.Infrastructure/Data/compound-properties.json', root), 'utf8'));
const compounds = sku.filter(x => x.kind === 'compound').map(x => ({ slug: x.slug, names: { tr: x.nameTr, en: x.name }, cid: existing[x.slug]?.pubChemId }));
if (!compounds.some(c => c.cid === 2244)) compounds.push({ slug: 'aspirin', names: { tr: 'Aspirin', en: 'Aspirin' }, cid: 2244 });
if (compounds.some(c => !c.cid)) throw new Error('Missing explicit compound CID mapping.');
const props = 'MolecularFormula,MolecularWeight,IUPACName,InChI,InChIKey,CanonicalSMILES,IsomericSMILES,XLogP,ExactMass,MonoisotopicMass,TPSA,Complexity,Charge,HBondDonorCount,HBondAcceptorCount,RotatableBondCount';
const payload = await download(`https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${compounds.map(c => c.cid).join(',')}/property/${props}/JSON`, 'compound-descriptors.json');
const records = [];
for (const compound of compounds) {
  const p = payload.PropertyTable.Properties.find(p => p.CID === compound.cid);
  if (!p) throw new Error(`No descriptor response for ${compound.cid}`);
  const url = `https://pubchem.ncbi.nlm.nih.gov/compound/${compound.cid}`;
  const { Record: record } = await download(`https://pubchem.ncbi.nlm.nih.gov/rest/pug_view/data/compound/${compound.cid}/JSON`, `compound-${compound.cid}.json`);
  const sections = [];
  function walk(items) { for (const item of items ?? []) { sections.push(item); walk(item.Section); } }
  walk(record.Section);
  const info = heading => sections.filter(s => s.TOCHeading === heading).flatMap(s => s.Information ?? []);
  const strings = value => value?.StringWithMarkup?.map(s => s.String).filter(Boolean) ?? [];
  const evidence = heading => info(heading).flatMap(i => {
    const ref = record.Reference?.find(r => r.ReferenceNumber === i.ReferenceNumber);
    return strings(i.Value).filter(t => t.length < 600).slice(0, 2).map(value => ({ value, source: ref?.SourceName ?? 'PubChem', source_url: i.URL ?? ref?.URL ?? `${url}#section=${encodeURIComponent(heading)}` }));
  }).slice(0, 4);
  const links = heading => [...new Map(info(heading).map(i => { const r = record.Reference?.find(r => r.ReferenceNumber === i.ReferenceNumber); return [r?.URL ?? url, { source: r?.SourceName ?? 'PubChem', source_url: r?.URL ?? `${url}#section=${encodeURIComponent(heading)}` }]; })).values()].slice(0, 4);
  const ghs = info('GHS Classification');
  const codes = [...new Set(ghs.flatMap(i => strings(i.Value)).flatMap(s => s.match(/\bH\d{3}[a-z]?\b/g) ?? []))];
  const ghsIcons = [...new Set(ghs.flatMap(i => i.Value?.StringWithMarkup ?? []).flatMap(v => v.Markup ?? []).map(m => m.URL?.match(/GHS\d{2}/)?.[0]).filter(Boolean))];
  records.push({ id: compound.slug, slug: compound.slug, names: { ...compound.names, iupac: p.IUPACName }, identifiers: { pubchem_cid: p.CID, cas: [...new Set(info('CAS').flatMap(i => strings(i.Value)))], inchi: p.InChI, inchi_key: p.InChIKey, smiles: p.SMILES, connectivity_smiles: p.ConnectivitySMILES },
    molecular_properties: { molecular_formula: p.MolecularFormula, molecular_weight_g_mol: number(p.MolecularWeight), exact_mass_da: number(p.ExactMass), monoisotopic_mass_da: number(p.MonoisotopicMass), formal_charge: p.Charge, xlogp: p.XLogP ?? null, topological_polar_surface_area_a2: p.TPSA ?? null, hydrogen_bond_donors: p.HBondDonorCount, hydrogen_bond_acceptors: p.HBondAcceptorCount, rotatable_bonds: p.RotatableBondCount, complexity: p.Complexity },
    physical_properties: { melting_point: evidence('Melting Point'), boiling_point: evidence('Boiling Point'), density: evidence('Density'), solubility: evidence('Solubility'), dissociation_constants: evidence('Dissociation Constants') },
    safety: { ghs: { hazard_codes: codes, precautionary_codes: [...new Set(ghs.flatMap(i => strings(i.Value)).flatMap(s => s.match(/\bP\d{3}\b/g) ?? []))], signal_words: [...new Set(ghs.filter(i => i.Name === 'Signal').flatMap(i => strings(i.Value)))], pictograms: ghsIcons, sources: links('GHS Classification'), note: 'Aggregated reports can differ by supplier, concentration and jurisdiction. Consult the cited source and current product SDS.' }, nfpa_704: { health: null, flammability: null, instability: null, special: null }, toxicology: { ld50_oral_rat_mg_kg: null, ld50_oral_mouse_mg_kg: null, reported_values: evidence('Non-Human Toxicity Values'), occupational_exposure_limits: { osha_pel_mg_m3: null, acgih_tlv_mg_m3: null }, sources: links('Non-Human Toxicity Values') } },
    bioactivity_and_pharmacology: { target_proteins: null, mechanism_of_action: null, metabolism: null, elimination_half_life_hours: null, mechanism_sources: links('Mechanism of Action'), metabolism_sources: links('Metabolism/Metabolites'), half_life_sources: links('Biological Half-Life') },
    provenance: { schema_version: '2.0', retrieved_at: retrieved, null_meaning: 'Not normalized or unavailable in this snapshot; not zero or evidence of safety.', sources: [source('pubchem', 'PubChem / NCBI', url, ['identifiers', 'molecular_properties', 'physical_properties', 'safety', 'bioactivity_and_pharmacology'])], editorial_fields: ['names.tr', 'slug'], measurement_policy: 'Experimental reports retain their original units, conditions and source. Conflicting measurements are not collapsed into a single number.' }
  });
  if (records.length % 10 === 0) console.log(`Compounds: ${records.length}/${compounds.length}`);
}
// The example aspirin record includes a concise editorial synthesis, with the upstream evidence retained.
const aspirin = records.find(c => c.slug === 'aspirin');
if (aspirin?.bioactivity_and_pharmacology.mechanism_sources.length) aspirin.bioactivity_and_pharmacology.mechanism_of_action = 'Siklooksijenaz enzimlerini asetilleyerek prostaglandin ve tromboksan sentezini geri dönüşsüz olarak inhibe eder.';
if (aspirin?.bioactivity_and_pharmacology.metabolism_sources.length) aspirin.bioactivity_and_pharmacology.metabolism = 'Esterazlarla salisilata hidrolize edilir; salisilatın sonraki metabolizması başlıca karaciğerde gerçekleşir.';
if (aspirin?.bioactivity_and_pharmacology.mechanism_sources.length) {
  aspirin.bioactivity_and_pharmacology.target_proteins = [];
  for (const id of ['P23219', 'P35354']) {
    const protein = await download(`https://rest.uniprot.org/uniprotkb/${id}.json`, `uniprot-${id}.json`);
    if (protein.primaryAccession !== id || protein.organism?.taxonId !== 9606) throw new Error(`Unexpected human target ${id}`);
    const url = `https://www.uniprot.org/uniprotkb/${id}/entry`;
    aspirin.bioactivity_and_pharmacology.target_proteins.push({ name: protein.proteinDescription.recommendedName.fullName.value, uniprot_id: id, action: 'irreversible inhibitor', source_url: url });
    aspirin.provenance.sources.push(source('uniprot', 'UniProt — ' + id, url, ['bioactivity_and_pharmacology.target_proteins']));
  }
}
for (const compound of records) compound.provenance.retrieved_at = compound.provenance.sources.map(s => s.retrieved_at).sort().at(-1);
await writeFile(new URL('compound-service/Element.Services.Compound.Infrastructure/Data/scientific-compounds.json', root), JSON.stringify(records, null, 2) + '\n');
console.log(`Saved ${records.length} scientific compounds.`);
// Reapply the separately maintained atlas layer after every scientific refresh.
const { refreshAtlas } = await import('./refresh-atlas.mjs');
await refreshAtlas();
