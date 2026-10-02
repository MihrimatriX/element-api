import catalog from "../data/known-compounds.json" with { type: "json" };

/**
 * Formula engine behind the lab, games and compound pages: parses and writes
 * formulas, matches atom bags against the 214-compound catalogue, judges
 * whether an unknown bag is chemically plausible, and classifies compounds by
 * geometry and topic. Stays importable from plain Node (tests, scripts).
 */

/** A catalogue compound (`data/known-compounds.json`). */
export interface KnownCompound {
  slug: string;
  formula: string;
  nameTr: string;
  nameEn: string;
  cid?: number;
  summary: string;
  uses: string[];
}

/** Atom counts by element symbol, e.g. `{ H: 2, O: 1 }`. */
export type Counts = Record<string, number>;

/** Why a bag of atoms did not form a catalogue compound. */
export type FormFailure =
  | "empty"
  | "wrong_ratio"
  | "unstable"
  | "unknown"
  | "noble";

/** Outcome of `formCompound`: the matched compound, or a failure code with a Turkish explanation. */
export type FormResult =
  | { ok: true; compound: KnownCompound }
  | {
      ok: false;
      code: FormFailure;
      message: string;
      expected?: KnownCompound[];
    };

/** All catalogue compounds. */
export const knownCompounds = catalog as KnownCompound[];

/** Catalogue compounds by slug. */
export const compoundBySlug = Object.fromEntries(
  knownCompounds.map((compound) => [compound.slug, compound]),
);

// ---------------------------------------------------------------------------
// Element data
// ---------------------------------------------------------------------------

const wordSet = (list: string) => new Set(list.split(" "));

/** Standard atomic weights (g/mol) of the elements the catalogue uses. */
const ATOMIC_MASS: Record<string, number> = {
  H: 1.008, He: 4.003, Li: 6.94, Be: 9.012, B: 10.81, C: 12.011,
  N: 14.007, O: 15.999, F: 18.998, Na: 22.99, Mg: 24.305, Al: 26.982,
  Si: 28.085, P: 30.974, S: 32.06, Cl: 35.45, K: 39.098, Ca: 40.078,
  Ti: 47.867, V: 50.942, Cr: 51.996, Mn: 54.938, Fe: 55.845, Co: 58.933,
  Ni: 58.693, Cu: 63.546, Zn: 65.38, Ga: 69.723, Ge: 72.63, As: 74.922,
  Se: 78.971, Br: 79.904, Rb: 85.468, Sr: 87.62, Mo: 95.95, Pd: 106.42,
  Ag: 107.868, Cd: 112.414, In: 114.818, Sn: 118.71, Sb: 121.76, Te: 127.6,
  I: 126.904, Xe: 131.293, Cs: 132.905, Ba: 137.327, W: 183.84, Pt: 195.084,
  Au: 196.967, Hg: 200.592, Pb: 207.2, Bi: 208.98, U: 238.029,
};

/** Common oxidation states used to test whether an ionic bag can be neutral. */
const OXIDATION_STATES: Record<string, number[]> = {
  H: [1, -1], Li: [1], Na: [1], K: [1], Rb: [1], Cs: [1],
  Be: [2], Mg: [2], Ca: [2], Sr: [2], Ba: [2],
  B: [3], Al: [3], Ga: [3], In: [3],
  C: [-4, -2, 2, 4], Si: [4], N: [-3, 2, 3, 4, 5], P: [-3, 3, 5],
  O: [-2, -1], S: [-2, 2, 4, 6],
  F: [-1], Cl: [-1, 1, 3, 5, 7], Br: [-1, 1, 5], I: [-1, 1, 5, 7],
  Ti: [4], V: [5, 4], Cr: [3, 6], Mn: [2, 4, 7], Fe: [2, 3], Co: [2],
  Ni: [2], Cu: [1, 2], Zn: [2], Ag: [1], Cd: [2], Sn: [2, 4], Sb: [3],
  Te: [4], W: [6, 4], Pt: [2], Au: [3], Hg: [2], Pb: [2, 4], Bi: [3],
  U: [4, 6], Mo: [4], Pd: [2], As: [3], Ge: [4], Xe: [2, 4, 6],
};

/** Non-metals checked with textbook valences for covalent molecules. */
const COVALENT = wordSet("H C N O F Cl Br I B Si P S");
const VALENCE: Record<string, number[]> = {
  H: [1], C: [4], N: [3, 5], O: [2], F: [1],
  Cl: [1, 3, 5, 7], Br: [1, 3, 5], I: [1, 3, 5, 7],
  B: [3], Si: [4], P: [3, 5], S: [2, 4, 6],
};

const NOBLE_GASES = wordSet("He Ne Ar Kr Rn Og");
const NON_METALS = wordSet(
  "H He B C N O F Ne Si P S Cl Ar Ge As Se Br Kr Sb Te I Xe Rn Og",
);

/** Most electropositive first: the order elements appear in a written formula (NaCl, not ClNa). */
const ELECTROPOSITIVE_ORDER = (
  "Fr Cs Rb K Na Li Ra Ba Sr Ca Mg Be Ac Th Pa U Np Pu Am Cm Bk Cf Es Fm Md No Lr " +
  "La Ce Pr Nd Pm Sm Eu Gd Tb Dy Ho Er Tm Yb Lu Y Sc Hf Zr Ti Ta Nb V W Mo Cr Re Tc " +
  "Mn Os Ru Fe Ir Rh Co Pt Pd Ni Au Ag Cu Hg Cd Zn Tl In Ga Al Pb Sn Ge Si B Bi Sb " +
  "As P C H Te Se S I Br Cl N O F Xe Kr Ar Ne He"
).split(" ");
const ORDER_RANK = new Map(
  ELECTROPOSITIVE_ORDER.map((symbol, rank) => [symbol, rank]),
);
const UNRANKED = 400;

/** Central atoms written before their hydrogens (NH₃, CH₄, SiH₄) rather than after (H₂O, HCl). */
const HYDRIDE_CENTERS = wordSet("B C Si Ge N P As Sb");

// ---------------------------------------------------------------------------
// Parsing and arithmetic
// ---------------------------------------------------------------------------

function addAtoms(counts: Counts, symbol: string, count: number) {
  counts[symbol] = (counts[symbol] ?? 0) + count;
}

/** Parses "Ca(OH)2" into `{ Ca: 1, H: 2, O: 2 }` (nested parentheses allowed). Throws on anything else. */
export function parseFormula(formula: string): Counts {
  const unsupported = () => new Error(`Desteklenmeyen formül ${formula}`);
  let position = 0;

  const readMultiplier = (): number => {
    const digits = formula.slice(position).match(/^\d+/);
    if (!digits) return 1;
    position += digits[0].length;
    return Number(digits[0]);
  };

  const readGroup = (): Counts => {
    const counts: Counts = {};
    while (position < formula.length && formula[position] !== ")") {
      if (formula[position] === "(") {
        position += 1;
        const inner = readGroup();
        if (formula[position] !== ")") throw unsupported();
        position += 1;
        const multiplier = readMultiplier();
        for (const [symbol, count] of Object.entries(inner))
          addAtoms(counts, symbol, count * multiplier);
      } else {
        const atom = formula.slice(position).match(/^([A-Z][a-z]?)(\d*)/);
        if (!atom) throw unsupported();
        position += atom[0].length;
        addAtoms(counts, atom[1], Number(atom[2] || 1));
      }
    }
    return counts;
  };

  const counts = readGroup();
  if (position !== formula.length) throw unsupported();
  return prune(counts);
}

/** Drops zero or negative counts and sorts symbols alphabetically. */
export function prune(counts: Counts): Counts {
  return Object.fromEntries(
    Object.entries(counts)
      .filter(([, count]) => count > 0)
      .sort(([a], [b]) => a.localeCompare(b)),
  );
}

/** Order-independent identity of a composition, e.g. "H:2|O:1". */
export function compositionKey(counts: Counts): string {
  return Object.entries(prune(counts))
    .map(([symbol, count]) => `${symbol}:${count}`)
    .join("|");
}

/** Total number of atoms. */
export function atomCount(counts: Counts): number {
  return Object.values(counts).reduce((sum, count) => sum + count, 0);
}

/** Molar mass in g/mol, rounded to 3 decimals. Throws for an element without a known mass. */
export function molecularWeight(counts: Counts): number {
  let sum = 0;
  for (const [symbol, count] of Object.entries(counts)) {
    const mass = ATOMIC_MASS[symbol];
    if (!mass) throw new Error(`Atom kütlesi yok: ${symbol}`);
    sum += mass * count;
  }
  return Math.round(sum * 1000) / 1000;
}

const SUBSCRIPT_DIGITS = "₀₁₂₃₄₅₆₇₈₉";

/** Renders formula digits as Unicode subscripts: "H2O" → "H₂O". */
export function formulaText(formula: string): string {
  return formula.replace(/\d/g, (digit) => SUBSCRIPT_DIGITS[Number(digit)]);
}

/**
 * Sort order for writing a formula: Hill order (C, H, then alphabetical) for
 * carbon compounds; otherwise most electropositive first, with H after the
 * central atom of simple hydrides (NH₃) and before everything else (H₂O).
 */
function compareForFormula(a: string, b: string, symbols: string[]): number {
  if (symbols.includes("C")) {
    if (a === "C" || b === "C") return a === "C" ? -1 : 1;
    if (a === "H" || b === "H") return a === "H" ? -1 : 1;
    return a.localeCompare(b);
  }
  const others = symbols.filter((symbol) => symbol !== "H");
  const isSimpleHydride =
    symbols.includes("H") &&
    others.length === 1 &&
    HYDRIDE_CENTERS.has(others[0]);
  if (isSimpleHydride && (a === "H" || b === "H")) return a === "H" ? 1 : -1;
  const rank = (symbol: string) => ORDER_RANK.get(symbol) ?? UNRANKED;
  return rank(a) - rank(b) || a.localeCompare(b);
}

/** Writes counts as a conventional formula: `{ O: 1, H: 2 }` → "H2O". */
export function writeFormula(counts: Counts): string {
  const pruned = prune(counts);
  const symbols = Object.keys(pruned);
  return [...symbols]
    .sort((a, b) => compareForFormula(a, b, symbols))
    .map((symbol) => symbol + (pruned[symbol] === 1 ? "" : pruned[symbol]))
    .join("");
}

// ---------------------------------------------------------------------------
// Catalogue lookup
// ---------------------------------------------------------------------------

/** First catalogue compound for each composition (isomers share one key). */
const compoundByComposition = new Map<string, KnownCompound>();
for (const compound of knownCompounds) {
  const key = compositionKey(parseFormula(compound.formula));
  if (!compoundByComposition.has(key)) compoundByComposition.set(key, compound);
}

/** The catalogue compound with exactly these atom counts, if any. */
export function lookup(counts: Counts): KnownCompound | undefined {
  return compoundByComposition.get(compositionKey(counts));
}

/** The catalogue spelling for a known composition, else a conventionally written formula. */
export function bagFormula(counts: Counts): string {
  return lookup(counts)?.formula ?? writeFormula(counts);
}

/** Catalogue compounds made of exactly the same elements, in any ratio. */
export function sameElements(counts: Counts): KnownCompound[] {
  const symbols = Object.keys(prune(counts)).sort().join("|");
  return knownCompounds.filter(
    (compound) =>
      Object.keys(parseFormula(compound.formula)).sort().join("|") === symbols,
  );
}

// ---------------------------------------------------------------------------
// Plausibility of unknown bags
// ---------------------------------------------------------------------------

/** Larger bags are not searched (the search is exponential) and count as plausible. */
const MAX_CHECKED_ATOMS = 36;

/**
 * True when some choice of oxidation states sums to zero. Each element takes
 * one state, or splits its atoms between two states (mixed valence, Fe₃O₄).
 */
function canBalanceCharges(counts: Counts): boolean {
  const elements = Object.entries(counts).map(([symbol, count]) => ({
    count,
    states: OXIDATION_STATES[symbol],
  }));
  if (elements.some((element) => !element.states?.length)) return false;

  const balances = (index: number, charge: number): boolean => {
    if (index === elements.length) return charge === 0;
    const { count, states } = elements[index];
    if (states.some((state) => balances(index + 1, charge + state * count)))
      return true;
    for (let a = 0; a < states.length; a++)
      for (let b = a + 1; b < states.length; b++)
        for (let inFirst = 1; inFirst < count; inFirst++) {
          const mixed = states[a] * inFirst + states[b] * (count - inFirst);
          if (balances(index + 1, charge + mixed)) return true;
        }
    return false;
  };
  return balances(0, 0);
}

/**
 * True for an all-non-metal bag that is not over-hydrogenated
 * (H ≤ 2C + 2 + N + P) and has some valence choice giving a whole number of
 * bonds that can connect every atom.
 */
function satisfiesValence(counts: Counts): boolean {
  const symbols = Object.keys(counts);
  if (!symbols.every((symbol) => COVALENT.has(symbol))) return false;
  const carbon = counts.C ?? 0;
  const hydrogen = counts.H ?? 0;
  const nitrogenAndPhosphorus = (counts.N ?? 0) + (counts.P ?? 0);
  if (carbon && hydrogen > 2 * carbon + 2 + nitrogenAndPhosphorus) return false;
  const atoms = atomCount(counts);

  const fits = (index: number, valenceSum: number): boolean => {
    if (index === symbols.length)
      return valenceSum % 2 === 0 && valenceSum / 2 >= atoms - 1;
    const symbol = symbols[index];
    return VALENCE[symbol].some((valence) =>
      fits(index + 1, valenceSum + valence * counts[symbol]),
    );
  };
  return fits(0, 0);
}

function isPlausible(counts: Counts): boolean {
  // ponytail: oxidation states + textbook valence, not a structure generator. Expand the catalogue when a real molecule is missing.
  if (atomCount(counts) > MAX_CHECKED_ATOMS) return true;
  return canBalanceCharges(counts) || satisfiesValence(counts);
}

/**
 * Tries to form a compound from a bag of atoms. Only catalogue compounds
 * succeed; failures explain why (empty bag, noble gas, right elements in the
 * wrong ratio, chemically impossible, or plausible but not catalogued).
 */
export function formCompound(input: Counts): FormResult {
  const counts = prune(input);
  if (!Object.keys(counts).length) {
    return { ok: false, code: "empty", message: "En az bir element seç." };
  }
  const hit = lookup(counts);
  if (hit) return { ok: true, compound: hit };

  const nobles = Object.keys(counts).filter((symbol) => NOBLE_GASES.has(symbol));
  if (nobles.length) {
    return {
      ok: false,
      code: "noble",
      message: `${nobles.join(", ")} soygazdır. XeF₂ gibi birkaç soygaz bileşiği kütüphanede vardır; He, Ne ve Ar gündelik bileşik oluşturmaz.`,
    };
  }

  const cousins = sameElements(counts);
  if (cousins.length) {
    const suggestions = cousins
      .slice(0, 4)
      .map((compound) => formulaText(compound.formula))
      .join(", ");
    return {
      ok: false,
      code: "wrong_ratio",
      message: `Bu elementler bilinen bir bileşik verir ama atom sayıları tutmuyor. Dene: ${suggestions}.`,
      expected: cousins,
    };
  }

  if (!isPlausible(counts)) {
    return {
      ok: false,
      code: "unstable",
      message:
        "Bu atom sayıları kararlı, yüksüz bir bileşik vermez (değerlik veya stoikiometri).",
    };
  }
  return {
    ok: false,
    code: "unknown",
    message:
      "Oran kimyasal olarak mümkün görünebilir ama bu kütüphanede bilinen bir molekül yok. Hayali bileşik uydurulmaz.",
  };
}

/** Elements offered in the lab: every catalogue element plus He, Ne and Ar, lightest first. */
export const labElements = [
  ...new Set([
    ...knownCompounds.flatMap((compound) =>
      Object.keys(parseFormula(compound.formula)),
    ),
    "He",
    "Ne",
    "Ar",
  ]),
].sort(
  (a, b) =>
    (ATOMIC_MASS[a] ?? 999) - (ATOMIC_MASS[b] ?? 999) || a.localeCompare(b),
);

// ---------------------------------------------------------------------------
// Geometry
// ---------------------------------------------------------------------------

/** VSEPR shapes plus the solid-state cases that have no discrete molecule. */
export type GeometryKind =
  | "linear"
  | "bent"
  | "trigonal_planar"
  | "trigonal_pyramidal"
  | "tetrahedral"
  | "trigonal_bipyramidal"
  | "octahedral"
  | "network"
  | "ionic_lattice"
  | "molecular";

/** A compound's shape with Turkish and English names and a short explanation. */
export interface Geometry {
  id: GeometryKind;
  nameTr: string;
  nameEn: string;
  note: string;
}

const GEOMETRY_LABEL: Record<GeometryKind, Omit<Geometry, "id">> = {
  linear: {
    nameTr: "Doğrusal",
    nameEn: "Linear",
    note: "VSEPR: AX₂ veya iki atomlu molekül; bağ açısı 180°.",
  },
  bent: {
    nameTr: "Açısal (V)",
    nameEn: "Bent",
    note: "VSEPR: merkez atomdaki ortaklanmamış çift bağları büker.",
  },
  trigonal_planar: {
    nameTr: "Üçgen düzlem",
    nameEn: "Trigonal planar",
    note: "VSEPR: AX₃; bağ açıları 120°.",
  },
  trigonal_pyramidal: {
    nameTr: "Üçgen piramit",
    nameEn: "Trigonal pyramidal",
    note: "VSEPR: AX₃E; amonyak tipi.",
  },
  tetrahedral: {
    nameTr: "Tetrahedral",
    nameEn: "Tetrahedral",
    note: "VSEPR: AX₄; bağ açıları yaklaşık 109,5°.",
  },
  trigonal_bipyramidal: {
    nameTr: "Üçgen çift piramit",
    nameEn: "Trigonal bipyramidal",
    note: "VSEPR: AX₅; ekvator 120°, eksen 90°.",
  },
  octahedral: {
    nameTr: "Oktahedral",
    nameEn: "Octahedral",
    note: "VSEPR: AX₆; bağ açıları 90°.",
  },
  network: {
    nameTr: "Ağ yapılı katı",
    nameEn: "Network solid",
    note: "Ayrı bir küçük molekül değildir; kristalde tekrarlayan kovalent bağ ağı vardır.",
  },
  ionic_lattice: {
    nameTr: "İyon örgüsü",
    nameEn: "Ionic lattice",
    note: "Ayrı molekül yoktur; zıt yüklü iyonlar üç boyutlu örgüyü oluşturur.",
  },
  molecular: {
    nameTr: "Molekül",
    nameEn: "Molecular",
    note: "Ayrı moleküller halindedir; bu kayıtta tam VSEPR şeması işaretli değil.",
  },
};

/** Textbook shapes for specific catalogue compounds; the rest are inferred. */
const KNOWN_GEOMETRY: Partial<Record<GeometryKind, string>> = {
  bent: "h2o h2s so2 no2 h2o2 hclo",
  linear: "co2 co no n2o hcn hf hcl hbr hi xef2 c2h2",
  trigonal_planar: "so3 hcho bf3",
  trigonal_pyramidal: "nh3 ph3 pcl3",
  tetrahedral: "ch4 ccl4 cf4 sih4 chcl3 ch2cl2 ch3cl",
  trigonal_bipyramidal: "pcl5",
  octahedral: "sf6",
  ionic_lattice: "nacl kcl caco3",
  network: "sio2 sic bn al2o3 b2o3 tio2 geo2 sno2 beo",
};
const geometryBySlug = new Map<string, GeometryKind>();
for (const [kind, slugs] of Object.entries(KNOWN_GEOMETRY))
  for (const slug of slugs.split(" "))
    geometryBySlug.set(slug, kind as GeometryKind);

/** Compound-specific notes that replace the generic note of the shape. */
const GEOMETRY_NOTE: Record<string, string> = {
  h2o: "İki bağ, iki ortaklanmamış çift; bağ açısı yaklaşık 104,5°.",
  co2: "O=C=O; merkez karbonun iki çift bağı doğrusal AX₂ verir.",
  nh3: "Üç N–H bağı ve bir ortaklanmamış çift; üçgen piramit.",
  ch4: "Dört eşdeğer C–H bağı; tetrahedral.",
  nacl: "Na⁺ ve Cl⁻ iyon örgüsü; sofra tuzu kristali ayrı NaCl molekülü değildir.",
  sio2: "Kuvars ve camda her Si dört O’ya bağlıdır. SiO₂ bir formül birimidir, serbest molekül değil.",
  caco3:
    "Ca²⁺ ve düzlemsel CO₃²⁻ iyonları; kireçtaşı ayrı CaCO₃ molekülü değildir.",
  sf6: "Altı F, kükürt etrafında oktahedral.",
  pcl5: "Beş Cl; üçgen çift piramit.",
  al2o3: "Korundum: oksijen-alüminyum ağı; ayrı Al₂O₃ molekülü yok.",
  sic: "Kovalent ağ (karborundum); elmas benzeri örgü.",
  bn: "Kovalent ağ; hekzagonal veya kübik allotrop.",
};

/** Listed shape, else: any metal → ionic lattice, two atoms → linear, otherwise a generic molecule. */
function inferGeometryKind(compound: KnownCompound): GeometryKind {
  const known = geometryBySlug.get(compound.slug);
  if (known) return known;
  const counts = parseFormula(compound.formula);
  if (Object.keys(counts).some((symbol) => !NON_METALS.has(symbol)))
    return "ionic_lattice";
  if (atomCount(counts) <= 2) return "linear";
  return "molecular";
}

/** The shape of a catalogue compound with its names and note. */
export function geometryOf(compound: KnownCompound): Geometry {
  const id = inferGeometryKind(compound);
  const label = GEOMETRY_LABEL[id];
  return {
    id,
    nameTr: label.nameTr,
    nameEn: label.nameEn,
    note: GEOMETRY_NOTE[compound.slug] ?? label.note,
  };
}

// ---------------------------------------------------------------------------
// Topic groups
// ---------------------------------------------------------------------------

/** Turkish labels of the compound filter groups. */
export const COMPOUND_GROUP_LABELS = {
  gunluk: "Günlük",
  organik: "Organik",
  tuz: "Tuzlar",
  oksit: "Oksitler",
  asit: "Asitler",
  malzeme: "Malzemeler",
  cevre: "Çevre",
} as const;
/** A compound filter group id. */
export type CompoundGroup = keyof typeof COMPOUND_GROUP_LABELS;

const EVERYDAY = wordSet(
  "h2o co2 nacl nh3 ch4 c2h5oh c6h12o6 c12h22o11 nahco3 caco3 acetic aspirin paracetamol caffeine ascorbic",
);
const ENVIRONMENT = wordSet(
  "so2 so3 no no2 n2o n2o4 co co2 ch4 h2s h2co3 caco3 clo2",
);
/** Carbon compounds that chemistry treats as inorganic (oxides, carbonates, cyanide). */
const INORGANIC_CARBON = wordSet(
  "co co2 cs2 h2co3 hcn caco3 mgco3 na2co3 nahco3 khco3 k2co3 li2co3 nh42co3",
);
const BINARY_ACIDS = wordSet("hf hcl hbr hi hcn hno2");
const EVERYDAY_USES = /Gıda|Çözücü|Yakıt|İçecek|Metabolizma/;
const MATERIAL_USES = /Cam|Seramik|Pigment|Aşındırıcı|Refrakter/;

/** Filter groups a compound belongs to (zero or more), from its slug, formula, name and uses. */
export function compoundGroups(compound: KnownCompound): CompoundGroup[] {
  const counts = parseFormula(compound.formula);
  const symbols = Object.keys(counts);
  const uses = compound.uses.join(" ");
  const groups = new Set<CompoundGroup>();
  if (EVERYDAY.has(compound.slug) || EVERYDAY_USES.test(uses))
    groups.add("gunluk");
  if (
    counts.C &&
    counts.H &&
    !INORGANIC_CARBON.has(compound.slug) &&
    symbols.every((symbol) => NON_METALS.has(symbol))
  )
    groups.add("organik");
  if (inferGeometryKind(compound) === "ionic_lattice") groups.add("tuz");
  if (symbols.includes("O") && symbols.length === 2 && !counts.H)
    groups.add("oksit");
  if (compound.nameTr.includes("asit") || BINARY_ACIDS.has(compound.slug))
    groups.add("asit");
  if (MATERIAL_USES.test(uses)) groups.add("malzeme");
  if (ENVIRONMENT.has(compound.slug)) groups.add("cevre");
  return [...groups];
}

// ---------------------------------------------------------------------------
// Offline records
// ---------------------------------------------------------------------------

/** A minimal `/api/v2`-shaped compound record built from the catalogue, for offline use. */
export function asScienceCompound(compound: KnownCompound) {
  const counts = parseFormula(compound.formula);
  const pubchem = compound.cid
    ? `https://pubchem.ncbi.nlm.nih.gov/compound/${compound.cid}`
    : `https://pubchem.ncbi.nlm.nih.gov/#query=${encodeURIComponent(compound.nameEn)}`;
  const sources = [{ name: "PubChem / NCBI", url: pubchem }];
  return {
    id: compound.slug,
    slug: compound.slug,
    names: { tr: compound.nameTr, en: compound.nameEn, iupac: compound.nameEn },
    identifiers: { pubchem_cid: compound.cid ?? 0 },
    molecular_properties: {
      molecular_formula: compound.formula,
      molecular_weight_g_mol: molecularWeight(counts),
    },
    display_formula: compound.formula,
    composition: Object.entries(counts).map(([symbol, count]) => ({
      symbol,
      count,
    })),
    editorial: { summary: compound.summary, uses: compound.uses, story: null, sources },
    media: { photo: null, structure: null },
    external_links: { wikipedia: null, pubchem },
    provenance: {
      schema_version: "2.0",
      retrieved_at: "catalog",
      sources,
      editorial_fields: ["editorial"],
    },
  };
}
