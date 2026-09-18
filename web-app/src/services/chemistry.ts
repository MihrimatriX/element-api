import catalog from '../data/known-compounds.json' with { type: 'json' };

export interface KnownCompound {
  slug: string;
  formula: string;
  nameTr: string;
  nameEn: string;
  cid?: number;
  summary: string;
  uses: string[];
}
export type Counts = Record<string, number>;
export type FormFailure = 'empty' | 'wrong_ratio' | 'unstable' | 'unknown' | 'noble';
export type FormResult =
  | { ok: true; compound: KnownCompound }
  | { ok: false; code: FormFailure; message: string; expected?: KnownCompound[] };

export const knownCompounds = catalog as KnownCompound[];
export const compoundBySlug = Object.fromEntries(knownCompounds.map(c => [c.slug, c]));

const MASS: Record<string, number> = {
  H: 1.008, He: 4.003, Li: 6.94, Be: 9.012, B: 10.81, C: 12.011, N: 14.007, O: 15.999,
  F: 18.998, Na: 22.99, Mg: 24.305, Al: 26.982, Si: 28.085, P: 30.974, S: 32.06, Cl: 35.45,
  K: 39.098, Ca: 40.078, Ti: 47.867, V: 50.942, Cr: 51.996, Mn: 54.938, Fe: 55.845,
  Co: 58.933, Ni: 58.693, Cu: 63.546, Zn: 65.38, Ga: 69.723, Ge: 72.63, As: 74.922,
  Se: 78.971, Br: 79.904, Rb: 85.468, Sr: 87.62, Mo: 95.95, Pd: 106.42, Ag: 107.868,
  Cd: 112.414, In: 114.818, Sn: 118.71, Sb: 121.76, Te: 127.6, I: 126.904, Xe: 131.293,
  Cs: 132.905, Ba: 137.327, W: 183.84, Pt: 195.084, Au: 196.967, Hg: 200.592, Pb: 207.2,
  Bi: 208.98, U: 238.029,
};

const OX: Record<string, number[]> = {
  H: [1, -1], Li: [1], Na: [1], K: [1], Rb: [1], Cs: [1],
  Be: [2], Mg: [2], Ca: [2], Sr: [2], Ba: [2],
  B: [3], Al: [3], Ga: [3], In: [3],
  C: [-4, -2, 2, 4], Si: [4],
  N: [-3, 2, 3, 4, 5], P: [-3, 3, 5],
  O: [-2, -1], S: [-2, 2, 4, 6],
  F: [-1], Cl: [-1, 1, 3, 5, 7], Br: [-1, 1, 5], I: [-1, 1, 5, 7],
  Ti: [4], V: [5, 4], Cr: [3, 6], Mn: [2, 4, 7], Fe: [2, 3], Co: [2], Ni: [2],
  Cu: [1, 2], Zn: [2], Ag: [1], Cd: [2], Sn: [2, 4], Sb: [3], Te: [4],
  W: [6, 4], Pt: [2], Au: [3], Hg: [2], Pb: [2, 4], Bi: [3], U: [4, 6],
  Mo: [4], Pd: [2], As: [3], Ge: [4], Xe: [2, 4, 6],
};

const COVALENT = new Set(['H', 'C', 'N', 'O', 'F', 'Cl', 'Br', 'I', 'B', 'Si', 'P', 'S']);
const VALENCE: Record<string, number[]> = {
  H: [1], C: [4], N: [3, 5], O: [2], F: [1], Cl: [1, 3, 5, 7], Br: [1, 3, 5], I: [1, 3, 5, 7],
  B: [3], Si: [4], P: [3, 5], S: [2, 4, 6],
};
const NOBLE = new Set(['He', 'Ne', 'Ar', 'Kr', 'Rn', 'Og']);

export function parseFormula(formula: string): Counts {
  let i = 0;
  const add = (into: Counts, symbol: string, n: number) => { into[symbol] = (into[symbol] ?? 0) + n; };
  const group = (): Counts => {
    const map: Counts = {};
    while (i < formula.length && formula[i] !== ')') {
      if (formula[i] === '(') {
        i += 1;
        const inner = group();
        if (formula[i] !== ')') throw new Error(`Desteklenmeyen formül ${formula}`);
        i += 1;
        const digits = formula.slice(i).match(/^\d+/);
        const n = digits ? Number(digits[0]) : 1;
        i += digits ? digits[0].length : 0;
        for (const [symbol, count] of Object.entries(inner)) add(map, symbol, count * n);
      } else {
        const token = formula.slice(i).match(/^([A-Z][a-z]?)(\d*)/);
        if (!token) throw new Error(`Desteklenmeyen formül ${formula}`);
        i += token[0].length;
        add(map, token[1], Number(token[2] || 1));
      }
    }
    return map;
  };
  const counts = group();
  if (i !== formula.length) throw new Error(`Desteklenmeyen formül ${formula}`);
  return prune(counts);
}

export function prune(counts: Counts): Counts {
  return Object.fromEntries(Object.entries(counts).filter(([, n]) => n > 0).sort(([a], [b]) => a.localeCompare(b)));
}

export function compositionKey(counts: Counts): string {
  return Object.entries(prune(counts)).map(([symbol, n]) => `${symbol}:${n}`).join('|');
}

export function atomCount(counts: Counts): number {
  return Object.values(counts).reduce((sum, n) => sum + n, 0);
}

export function molecularWeight(counts: Counts): number {
  let sum = 0;
  for (const [symbol, n] of Object.entries(counts)) {
    const mass = MASS[symbol];
    if (!mass) throw new Error(`Atom kütlesi yok: ${symbol}`);
    sum += mass * n;
  }
  return Math.round(sum * 1000) / 1000;
}

export function formulaText(formula: string): string {
  return formula.replace(/\d/g, n => '₀₁₂₃₄₅₆₇₈₉'[Number(n)]);
}

const RANK = Object.fromEntries([
  'Fr','Cs','Rb','K','Na','Li','Ra','Ba','Sr','Ca','Mg','Be',
  'Ac','Th','Pa','U','Np','Pu','Am','Cm','Bk','Cf','Es','Fm','Md','No','Lr',
  'La','Ce','Pr','Nd','Pm','Sm','Eu','Gd','Tb','Dy','Ho','Er','Tm','Yb','Lu',
  'Y','Sc','Hf','Zr','Ti','Ta','Nb','V','W','Mo','Cr','Re','Tc','Mn',
  'Os','Ru','Fe','Ir','Rh','Co','Pt','Pd','Ni','Au','Ag','Cu','Hg','Cd','Zn',
  'Tl','In','Ga','Al','Pb','Sn','Ge','Si','B','Bi','Sb','As','P','C',
  'H','Te','Se','S','I','Br','Cl','N','O','F','Xe','Kr','Ar','Ne','He',
].map((symbol, i) => [symbol, i]));
const H_AFTER_CENTRAL = new Set(['B', 'C', 'Si', 'Ge', 'N', 'P', 'As', 'Sb']);

function formulaOrder(a: string, b: string, symbols: string[]): number {
  if (symbols.includes('C')) {
    if (a === 'C' || b === 'C') return a === 'C' ? -1 : 1;
    if (a === 'H' || b === 'H') return a === 'H' ? -1 : 1;
    return a.localeCompare(b);
  }
  const others = symbols.filter(s => s !== 'H');
  if (symbols.includes('H') && others.length === 1 && H_AFTER_CENTRAL.has(others[0])) {
    if (a === 'H' || b === 'H') return a === 'H' ? 1 : -1;
  }
  return (RANK[a] ?? 400) - (RANK[b] ?? 400) || a.localeCompare(b);
}

export function writeFormula(counts: Counts): string {
  const pruned = prune(counts);
  return Object.keys(pruned)
    .sort((a, b) => formulaOrder(a, b, Object.keys(pruned)))
    .map(symbol => symbol + (pruned[symbol] === 1 ? '' : pruned[symbol]))
    .join('');
}

const byKey = new Map<string, KnownCompound>();
for (const compound of knownCompounds) {
  const key = compositionKey(parseFormula(compound.formula));
  if (!byKey.has(key)) byKey.set(key, compound);
}

export function lookup(counts: Counts): KnownCompound | undefined {
  return byKey.get(compositionKey(counts));
}

export function bagFormula(counts: Counts): string {
  return lookup(counts)?.formula ?? writeFormula(counts);
}

export function sameElements(counts: Counts): KnownCompound[] {
  const symbols = Object.keys(prune(counts)).sort().join('|');
  return knownCompounds.filter(c => Object.keys(parseFormula(c.formula)).sort().join('|') === symbols);
}

function neutralize(counts: Counts): boolean {
  const entries = Object.entries(counts).map(([sym, n]) => ({ n, states: OX[sym] }));
  if (entries.some(e => !e.states?.length)) return false;
  const walk = (i: number, charge: number): boolean => {
    if (i === entries.length) return charge === 0;
    const { n, states } = entries[i];
    for (const state of states) if (walk(i + 1, charge + state * n)) return true;
    if (n >= 2) {
      for (let a = 0; a < states.length; a++) {
        for (let b = a + 1; b < states.length; b++) {
          for (let k = 1; k < n; k++) {
            if (walk(i + 1, charge + states[a] * k + states[b] * (n - k))) return true;
          }
        }
      }
    }
    return false;
  };
  return walk(0, 0);
}

function covalentOk(counts: Counts): boolean {
  const symbols = Object.keys(counts);
  if (!symbols.every(s => COVALENT.has(s))) return false;
  const n = atomCount(counts);
  const c = counts.C ?? 0;
  const h = counts.H ?? 0;
  const extra = (counts.N ?? 0) + (counts.P ?? 0);
  if (c && h > 2 * c + 2 + extra) return false;
  const walk = (i: number, sum: number): boolean => {
    if (i === symbols.length) return sum % 2 === 0 && sum / 2 >= n - 1;
    const symbol = symbols[i];
    for (const v of VALENCE[symbol]) if (walk(i + 1, sum + v * counts[symbol])) return true;
    return false;
  };
  return walk(0, 0);
}

function possible(counts: Counts): boolean {
  // ponytail: oxidation + textbook valence, not a structure generator. Expand the catalog when a real molecule is missing.
  if (atomCount(counts) > 36) return true;
  return neutralize(counts) || covalentOk(counts);
}

export function formCompound(input: Counts): FormResult {
  const counts = prune(input);
  if (!Object.keys(counts).length) {
    return { ok: false, code: 'empty', message: 'En az bir element seç.' };
  }
  const hit = lookup(counts);
  if (hit) return { ok: true, compound: hit };
  const nobles = Object.keys(counts).filter(s => NOBLE.has(s));
  if (nobles.length) {
    return { ok: false, code: 'noble', message: `${nobles.join(', ')} soygazdır. XeF₂ gibi birkaç soygaz bileşiği kütüphanede vardır; He, Ne ve Ar gündelik bileşik oluşturmaz.` };
  }
  const cousins = sameElements(counts);
  if (cousins.length) {
    const shown = cousins.slice(0, 4).map(c => formulaText(c.formula)).join(', ');
    return {
      ok: false,
      code: 'wrong_ratio',
      message: `Bu elementler bilinen bir bileşik verir ama atom sayıları tutmuyor. Dene: ${shown}.`,
      expected: cousins,
    };
  }
  if (!possible(counts)) {
    return { ok: false, code: 'unstable', message: 'Bu atom sayıları kararlı, yüksüz bir bileşik vermez (değerlik veya stoikiometri).' };
  }
  return { ok: false, code: 'unknown', message: 'Oran kimyasal olarak mümkün görünebilir ama bu kütüphanede bilinen bir molekül yok. Hayali bileşik uydurulmaz.' };
}

export const labElements = [...new Set(knownCompounds.flatMap(c => Object.keys(parseFormula(c.formula))))]
  .concat(['He', 'Ne', 'Ar'])
  .filter((symbol, i, all) => all.indexOf(symbol) === i)
  .sort((a, b) => (MASS[a] ?? 999) - (MASS[b] ?? 999) || a.localeCompare(b));

export type GeometryKind =
  | 'linear'
  | 'bent'
  | 'trigonal_planar'
  | 'trigonal_pyramidal'
  | 'tetrahedral'
  | 'trigonal_bipyramidal'
  | 'octahedral'
  | 'network'
  | 'ionic_lattice'
  | 'molecular';
export interface Geometry {
  id: GeometryKind;
  nameTr: string;
  nameEn: string;
  note: string;
}

const GEOMETRY_LABEL: Record<GeometryKind, Omit<Geometry, 'id'>> = {
  linear: { nameTr: 'Doğrusal', nameEn: 'Linear', note: 'VSEPR: AX₂ veya iki atomlu molekül; bağ açısı 180°.' },
  bent: { nameTr: 'Açısal (V)', nameEn: 'Bent', note: 'VSEPR: merkez atomdaki ortaklanmamış çift bağları büker.' },
  trigonal_planar: { nameTr: 'Üçgen düzlem', nameEn: 'Trigonal planar', note: 'VSEPR: AX₃; bağ açıları 120°.' },
  trigonal_pyramidal: { nameTr: 'Üçgen piramit', nameEn: 'Trigonal pyramidal', note: 'VSEPR: AX₃E; amonyak tipi.' },
  tetrahedral: { nameTr: 'Tetrahedral', nameEn: 'Tetrahedral', note: 'VSEPR: AX₄; bağ açıları yaklaşık 109,5°.' },
  trigonal_bipyramidal: { nameTr: 'Üçgen çift piramit', nameEn: 'Trigonal bipyramidal', note: 'VSEPR: AX₅; ekvator 120°, eksen 90°.' },
  octahedral: { nameTr: 'Oktahedral', nameEn: 'Octahedral', note: 'VSEPR: AX₆; bağ açıları 90°.' },
  network: { nameTr: 'Ağ yapılı katı', nameEn: 'Network solid', note: 'Ayrı bir küçük molekül değildir; kristalde tekrarlayan kovalent bağ ağı vardır.' },
  ionic_lattice: { nameTr: 'İyon örgüsü', nameEn: 'Ionic lattice', note: 'Ayrı molekül yoktur; zıt yüklü iyonlar üç boyutlu örgüyü oluşturur.' },
  molecular: { nameTr: 'Molekül', nameEn: 'Molecular', note: 'Ayrı moleküller halindedir; bu kayıtta tam VSEPR şeması işaretli değil.' },
};

const GEOMETRY_KIND: Record<string, GeometryKind> = {
  h2o: 'bent', h2s: 'bent', so2: 'bent', no2: 'bent', h2o2: 'bent', hclo: 'bent',
  co2: 'linear', co: 'linear', no: 'linear', n2o: 'linear', hcn: 'linear',
  hf: 'linear', hcl: 'linear', hbr: 'linear', hi: 'linear', xef2: 'linear', c2h2: 'linear',
  so3: 'trigonal_planar', hcho: 'trigonal_planar', bf3: 'trigonal_planar',
  nh3: 'trigonal_pyramidal', ph3: 'trigonal_pyramidal', pcl3: 'trigonal_pyramidal',
  ch4: 'tetrahedral', ccl4: 'tetrahedral', cf4: 'tetrahedral', sih4: 'tetrahedral',
  chcl3: 'tetrahedral', ch2cl2: 'tetrahedral', ch3cl: 'tetrahedral',
  pcl5: 'trigonal_bipyramidal',
  sf6: 'octahedral',
  nacl: 'ionic_lattice', kcl: 'ionic_lattice', caco3: 'ionic_lattice',
  sio2: 'network', sic: 'network', bn: 'network', al2o3: 'network', b2o3: 'network',
  tio2: 'network', geo2: 'network', sno2: 'network', beo: 'network',
};
const GEOMETRY_NOTE: Record<string, string> = {
  h2o: 'İki bağ, iki ortaklanmamış çift; bağ açısı yaklaşık 104,5°.',
  co2: 'O=C=O; merkez karbonun iki çift bağı doğrusal AX₂ verir.',
  nh3: 'Üç N–H bağı ve bir ortaklanmamış çift; üçgen piramit.',
  ch4: 'Dört eşdeğer C–H bağı; tetrahedral.',
  nacl: 'Na⁺ ve Cl⁻ iyon örgüsü; sofra tuzu kristali ayrı NaCl molekülü değildir.',
  sio2: 'Kuvars ve camda her Si dört O’ya bağlıdır. SiO₂ bir formül birimidir, serbest molekül değil.',
  caco3: 'Ca²⁺ ve düzlemsel CO₃²⁻ iyonları; kireçtaşı ayrı CaCO₃ molekülü değildir.',
  sf6: 'Altı F, kükürt etrafında oktahedral.',
  pcl5: 'Beş Cl; üçgen çift piramit.',
  al2o3: 'Korundum: oksijen-alüminyum ağı; ayrı Al₂O₃ molekülü yok.',
  sic: 'Kovalent ağ (karborundum); elmas benzeri örgü.',
  bn: 'Kovalent ağ; hekzagonal veya kübik allotrop.',
};

const NONMETAL = new Set(['H','He','B','C','N','O','F','Ne','Si','P','S','Cl','Ar','Ge','As','Se','Br','Kr','Sb','Te','I','Xe','Rn','Og']);

function inferGeometryKind(compound: KnownCompound): GeometryKind {
  if (GEOMETRY_KIND[compound.slug]) return GEOMETRY_KIND[compound.slug];
  const counts = parseFormula(compound.formula);
  if (Object.keys(counts).some(symbol => !NONMETAL.has(symbol))) return 'ionic_lattice';
  if (atomCount(counts) <= 2) return 'linear';
  return 'molecular';
}

export function geometryOf(compound: KnownCompound): Geometry {
  const id = inferGeometryKind(compound);
  const base = GEOMETRY_LABEL[id];
  return { id, nameTr: base.nameTr, nameEn: base.nameEn, note: GEOMETRY_NOTE[compound.slug] ?? base.note };
}

export const COMPOUND_GROUP_LABELS = {
  gunluk: 'Günlük',
  organik: 'Organik',
  tuz: 'Tuzlar',
  oksit: 'Oksitler',
  asit: 'Asitler',
  malzeme: 'Malzemeler',
  cevre: 'Çevre',
} as const;
export type CompoundGroup = keyof typeof COMPOUND_GROUP_LABELS;

const DAILY = new Set(['h2o', 'co2', 'nacl', 'nh3', 'ch4', 'c2h5oh', 'c6h12o6', 'c12h22o11', 'nahco3', 'caco3', 'acetic', 'aspirin', 'paracetamol', 'caffeine', 'ascorbic']);
const ENV = new Set(['so2', 'so3', 'no', 'no2', 'n2o', 'co', 'co2', 'ch4', 'h2s', 'h2co3', 'caco3']);
const INORGANIC_C = new Set(['co', 'co2', 'h2co3', 'hcn', 'caco3', 'mgco3', 'na2co3', 'nahco3', 'k2co3', 'li2co3', 'nh42co3']);
const BINARY_ACID = new Set(['hf', 'hcl', 'hbr', 'hi', 'hcn']);

export function compoundGroups(c: KnownCompound): CompoundGroup[] {
  const counts = parseFormula(c.formula);
  const keys = Object.keys(counts);
  const geom = inferGeometryKind(c);
  const uses = c.uses.join(' ');
  const found = new Set<CompoundGroup>();
  if (DAILY.has(c.slug) || /Gıda|Çözücü|Yakıt|İçecek|Metabolizma/.test(uses)) found.add('gunluk');
  if (counts.C && counts.H && !INORGANIC_C.has(c.slug) && keys.every((s) => NONMETAL.has(s))) found.add('organik');
  if (geom === 'ionic_lattice') found.add('tuz');
  if (keys.includes('O') && keys.length === 2 && !counts.H) found.add('oksit');
  if (c.nameTr.includes('asit') || BINARY_ACID.has(c.slug)) found.add('asit');
  if (/Cam|Seramik|Pigment|Aşındırıcı|Refrakter/.test(uses)) found.add('malzeme');
  if (ENV.has(c.slug)) found.add('cevre');
  return [...found];
}

export function asScienceCompound(c: KnownCompound) {
  const counts = parseFormula(c.formula);
  const pubchem = c.cid ? `https://pubchem.ncbi.nlm.nih.gov/compound/${c.cid}` : `https://pubchem.ncbi.nlm.nih.gov/#query=${encodeURIComponent(c.nameEn)}`;
  return {
    id: c.slug,
    slug: c.slug,
    names: { tr: c.nameTr, en: c.nameEn, iupac: c.nameEn },
    identifiers: { pubchem_cid: c.cid ?? 0 },
    molecular_properties: { molecular_formula: c.formula, molecular_weight_g_mol: molecularWeight(counts) },
    display_formula: c.formula,
    composition: Object.entries(counts).map(([symbol, count]) => ({ symbol, count })),
    editorial: { summary: c.summary, uses: c.uses, story: null, sources: [{ name: 'PubChem / NCBI', url: pubchem }] },
    media: { photo: null, structure: null },
    external_links: { wikipedia: null, pubchem },
    provenance: { schema_version: '2.0', retrieved_at: 'catalog', sources: [{ name: 'PubChem / NCBI', url: pubchem }], editorial_fields: ['editorial'] },
  };
}
