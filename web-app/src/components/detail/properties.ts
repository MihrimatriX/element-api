import type { JsonValue, ScientificRecord } from "@/services/science";
import { formatNumber } from "@/lib/format";
import { matchesSearch } from "@/lib/text";

/**
 * Turkish labels for scientific record keys. A top-level key that appears here
 * becomes a collapsible property section on the detail page; nested keys use
 * the same map for their row labels.
 */
export const PROPERTY_LABELS: Record<string, string> = {
  precautionary_codes: "Önlem kodları",
  signal_words: "Uyarı sözcükleri",
  names: "Adlandırma",
  tr: "Türkçe",
  en: "İngilizce",
  la: "Latince",
  de: "Almanca",
  iupac: "IUPAC adı",
  classification: "Sınıflandırma",
  period: "Periyot",
  group: "Grup",
  block: "Blok",
  series: "Seri",
  category: "Kategori",
  cas_number: "CAS numarası",
  appearance: "Görünüm",
  atomic_properties: "Atomik özellikler",
  atomic_mass: "Atom kütlesi (u)",
  standard_atomic_weight_reported: "Standart atom ağırlığı · kaynak gösterimi",
  standard_atomic_weight_uncertainty: "Atom ağırlığı belirsizliği",
  electron_configuration: "Elektron dizilimi",
  short: "Kısa gösterim",
  full: "Tam gösterim",
  term_symbol: "Terim sembolü",
  electrons_per_shell: "Kabuk başına elektron",
  valence_electrons: "Değerlik elektronları",
  oxidation_states: "Yükseltgenme basamakları",
  common: "Yaygın",
  rare: "Nadir",
  electronegativity: "Elektronegatiflik",
  pauling: "Pauling",
  allen: "Allen",
  allred_rochow: "Allred–Rochow",
  mulliken: "Mulliken",
  ionization_energies_kj_mol: "İyonlaşma enerjileri (kJ/mol)",
  electron_affinity_kj_mol: "Elektron ilgisi (kJ/mol)",
  radii_pm: "Yarıçaplar (pm)",
  atomic_empirical: "Atomik · deneysel",
  atomic_calculated: "Atomik · hesaplanan",
  covalent_single_bond: "Kovalent · tek bağ",
  covalent_double_bond: "Kovalent · çift bağ",
  covalent_triple_bond: "Kovalent · üçlü bağ",
  van_der_waals: "Van der Waals",
  thermodynamic_properties: "Termodinamik",
  standard_state: "Standart hâl",
  melting_point: "Erime noktası",
  boiling_point: "Kaynama noktası",
  k: "Kelvin (K)",
  c: "Santigrat (°C)",
  triple_point: "Üçlü nokta",
  critical_point: "Kritik nokta",
  temperature_k: "Sıcaklık (K)",
  pressure_kpa: "Basınç (kPa)",
  pressure_mpa: "Basınç (MPa)",
  density_g_cm3: "Yoğunluk (g/cm³)",
  reported: "Kaynakta bildirilen",
  conditions: "Ölçüm koşulları",
  stp: "STP koşullarında",
  liquid_at_mp: "Erime noktasında sıvı",
  enthalpy_of_fusion_kj_mol: "Erime entalpisi (kJ/mol)",
  enthalpy_of_vaporization_kj_mol: "Buharlaşma entalpisi (kJ/mol)",
  specific_heat_capacity_j_g_k: "Özgül ısı kapasitesi (J/g·K)",
  molar_heat_capacity_j_mol_k: "Molar ısı kapasitesi (J/mol·K)",
  mechanical_properties: "Mekanik özellikler",
  mohs_hardness: "Mohs sertliği",
  vickers_hardness_mpa: "Vickers sertliği (MPa)",
  brinell_hardness_mpa: "Brinell sertliği (MPa)",
  youngs_modulus_gpa: "Young modülü (GPa)",
  youngs_modulus_reported: "Young modülü · koşullarıyla (GPa)",
  shear_modulus_gpa: "Kayma modülü (GPa)",
  shear_modulus_reported: "Kayma modülü · koşullarıyla (GPa)",
  bulk_modulus_gpa: "Hacim modülü (GPa)",
  poissons_ratio: "Poisson oranı",
  speed_of_sound_m_s: "Ses hızı (m/s)",
  electromagnetic_and_optical: "Elektromanyetik ve optik",
  electrical_resistivity_ohm_m: "Elektrik özdirenci (Ω·m)",
  electrical_conductivity_s_m: "Elektrik iletkenliği (S/m)",
  thermal_conductivity_w_m_k: "Isıl iletkenlik (W/m·K)",
  thermal_expansion_coefficient_um_m_k: "Isıl genleşme (µm/m·K)",
  magnetic_ordering: "Manyetik düzen",
  curie_temperature_k: "Curie sıcaklığı (K)",
  refractive_index: "Kırılma indisi",
  crystallography: "Kristal yapı",
  structure_name: "Yapı adı",
  space_group_number: "Uzay grubu numarası",
  space_group_symbol: "Uzay grubu sembolü",
  lattice_parameters_pm: "Örgü parametreleri (pm; açılar °)",
  a: "a",
  b: "b",
  alpha: "α",
  beta: "β",
  gamma: "γ",
  abundance: "Doğada bulunma",
  universe_mass_percent: "Evrende kütlece (%)",
  solar_system_mass_percent: "Güneş sisteminde kütlece (%)",
  crust_mg_kg: "Yer kabuğunda (mg/kg)",
  ocean_mg_l: "Okyanusta (mg/L)",
  human_body_mass_percent: "İnsan vücudunda kütlece (%)",
  history: "Tarihçe",
  discovered_year: "Keşif yılı",
  discovery_reported: "Kaynakta keşif bilgisi",
  discoverers: "Keşfedenler",
  etymology: "Köken",
  isotopes: "İzotoplar",
  mass_number: "Kütle numarası",
  exact_mass_da: "Kesin kütle (Da)",
  exact_mass_reported: "Kesin kütle · belirsizliğiyle",
  abundance_percent: "Doğal bolluk (%)",
  abundance_fraction_reported: "Bolluk oranı · belirsizliğiyle",
  half_life: "Yarı ömür",
  spin_parity: "Spin / parite",
  decay_mode: "Bozunma biçimi",
  identifiers: "Kimlik ve yapı",
  pubchem_cid: "PubChem CID",
  cas: "CAS",
  inchi: "InChI",
  inchi_key: "InChIKey",
  smiles: "SMILES",
  connectivity_smiles: "Bağlantı SMILES",
  molecular_properties: "Moleküler özellikler",
  molecular_formula: "Molekül formülü",
  molecular_weight_g_mol: "Molar kütle (g/mol)",
  monoisotopic_mass_da: "Monoizotopik kütle (Da)",
  formal_charge: "Formal yük",
  xlogp: "XLogP",
  topological_polar_surface_area_a2: "Topolojik polar yüzey alanı (Å²)",
  hydrogen_bond_donors: "Hidrojen bağı vericileri",
  hydrogen_bond_acceptors: "Hidrojen bağı alıcıları",
  rotatable_bonds: "Dönebilen bağlar",
  complexity: "Moleküler karmaşıklık",
  physical_properties: "Fiziksel özellikler",
  density: "Yoğunluk",
  solubility: "Çözünürlük",
  dissociation_constants: "Ayrışma sabitleri",
  safety: "Güvenlik ve toksikoloji",
  ghs: "GHS sınıflandırması",
  hazard_codes: "Tehlike kodları",
  pictograms: "Piktogram kodları",
  nfpa_704: "NFPA 704",
  health: "Sağlık",
  flammability: "Yanıcılık",
  instability: "Kararsızlık",
  special: "Özel",
  toxicology: "Toksikoloji",
  ld50_oral_rat_mg_kg: "LD₅₀ · sıçan, oral (mg/kg)",
  ld50_oral_mouse_mg_kg: "LD₅₀ · fare, oral (mg/kg)",
  reported_values: "Kaynaklarda bildirilen deneyler",
  occupational_exposure_limits: "Mesleki maruziyet sınırları",
  osha_pel_mg_m3: "OSHA PEL (mg/m³)",
  acgih_tlv_mg_m3: "ACGIH TLV (mg/m³)",
  bioactivity_and_pharmacology: "Biyoaktivite ve farmakoloji",
  target_proteins: "Hedef proteinler",
  mechanism_of_action: "Etki mekanizması",
  metabolism: "Metabolizma",
  elimination_half_life_hours: "Eliminasyon yarı ömrü (saat)",
  mechanism_sources: "Etki mekanizması kaynakları",
  metabolism_sources: "Metabolizma kaynakları",
  half_life_sources: "Yarı ömür kaynakları",
  sources: "Kaynaklar",
  note: "Veri notu",
  value: "Bildirilen değer",
  source: "Kaynak",
  source_url: "Kaynağı aç",
  name: "Ad",
  uniprot_id: "UniProt",
  action: "Etki",
};

/** Reading notes shown at the top of a few sections whose numbers are easy to misread. */
export const SECTION_NOTES: Partial<Record<string, string>> = {
  isotopes:
    "NIST referans izotop bileşimleri. Doğal bolluk, kararlılık veya yarı ömür anlamına gelmez. Parantezli sayılar kaynak belirsizliğini korur.",
  safety:
    "Farklı derişim ve deney koşullarına ait raporlar birlikte bulunabilir. Kaynak ve ürün güvenlik bilgi formundaki koşulları inceleyin.",
  thermodynamic_properties:
    "Kaynakta belirtilmeyen yoğunluk ölçüm koşulu varsayılmaz. °C = K − 273,15.",
};

/** One collapsible property section: its record key, Turkish title and raw value. */
export interface PropertySection {
  key: string;
  label: string;
  value: JsonValue;
}

/** True when a value carries at least one real datum (not null, not an empty string, not only empty children). */
export function isPopulated(value: JsonValue): boolean {
  if (value === null || value === "") return false;
  if (Array.isArray(value)) return value.some(isPopulated);
  if (typeof value === "object") return Object.values(value).some(isPopulated);
  return true;
}

/** Row label for `key`; `parentKey` disambiguates keys reused with another meaning (lattice "c" vs Celsius). */
export function propertyLabel(key: string, parentKey?: string): string {
  if (parentKey === "lattice_parameters_pm" && key === "c") return "c";
  return PROPERTY_LABELS[key] ?? key.replace(/_/g, " ");
}

// Identifiers and years read wrong with thousands separators ("1.735", "23.925").
const UNGROUPED_NUMBER_KEY = /year|_cid$|number$/;

/** Turkish number formatting that keeps source precision (up to 14 significant digits). */
export function formatPropertyNumber(value: number, key?: string): string {
  if (key && UNGROUPED_NUMBER_KEY.test(key)) return String(value);
  return formatNumber(value, { maximumSignificantDigits: 14 });
}

/** Labelled top-level sections of a record, in record order; empty ones only when `showMissing`. */
export function propertySections(
  record: ScientificRecord,
  showMissing: boolean,
): PropertySection[] {
  return Object.entries(record)
    .filter(([key, value]) => key in PROPERTY_LABELS && (showMissing || isPopulated(value)))
    .map(([key, value]) => ({ key, label: PROPERTY_LABELS[key], value }));
}

/**
 * Size of a section for its badge: a list counts its records ("4 kayıt"),
 * an object counts its populated leaf values ("12 değer").
 */
export function sectionCount(value: JsonValue): string | null {
  if (!isPopulated(value)) return null;
  if (Array.isArray(value)) return `${value.filter(isPopulated).length} kayıt`;
  return `${countLeaves(value)} değer`;
}

function countLeaves(value: JsonValue): number {
  if (value === null || !isPopulated(value)) return 0;
  if (Array.isArray(value)) return 1;
  if (typeof value === "object")
    return Object.values(value).reduce<number>((sum, child) => sum + countLeaves(child), 0);
  return 1;
}

/** True when the section title or any field label inside it matches the query (Turkish-folded). */
export function sectionMatches(section: PropertySection, query: string): boolean {
  return matchesSearch(query, section.label, ...nestedLabels(section.value));
}

function nestedLabels(value: JsonValue): string[] {
  if (value === null || typeof value !== "object") return [];
  if (Array.isArray(value)) return value.flatMap(nestedLabels);
  return Object.entries(value).flatMap(([key, child]) => [
    propertyLabel(key),
    ...nestedLabels(child),
  ]);
}
