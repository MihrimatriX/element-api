/** One element as the app uses it: table position from the seed, plus optional gateway and commerce fields. */
export interface ElementItem {
  atomicNumber: number;
  symbol: string;
  name: string;
  nameEn?: string;
  category: string;
  period: number;
  group: number;
  row: number;
  col: number;
  mass?: string;
  phase?: string;
  summary?: string;
  appearance?: string;
  uses?: string;
  block?: string;
  electronegativity?: number;
  imageUrl?: string;
  sellerName?: string;
  rating?: number;
  reviewCount?: number;
  badge?: string;
  deliveryNote?: string;
  currentPrice?: number;
  availableStock?: number;
  pricePerGram?: number;
  density?: number;
  meltingPoint?: number;
  boilingPoint?: number;
  discoveredBy?: string;
  electronConfiguration?: string;
  yearDiscovered?: number;
  color?: string;
}

/** Turkish label of each periodic-table family (keys match `ElementFamily` and the `--color-family-*` tokens). */
export const categoryLabels: Record<string, string> = {
  alkali: "Alkali metal",
  alkaline: "Toprak alkali metal",
  transition: "Geçiş metali",
  post: "Metal",
  metalloid: "Yarı metal",
  nonmetal: "Ametal",
  halogen: "Halojen",
  noble: "Soy gaz",
  lanthanide: "Lantanit",
  actinide: "Aktinit",
};

/** CSS colour of each family: the `--color-family-*` design tokens (usable anywhere CSS takes a colour). */
export const categoryTokens: Record<string, string> = Object.fromEntries(
  Object.keys(categoryLabels).map((family) => [
    family,
    `var(--color-family-${family})`,
  ]),
);

// ponytail: layout seed (row/col) for the table; full atlas is scientific-elements.json; commerce SKUs are EF + element-properties.json. Merge only if the table can live without this compact string.
// Keep the rawElements declaration below a one-line string literal, and never quote its opening
// in a comment above it: scripts/write-sitemap.mjs and deploy/scripts/refresh-scientific-catalog.mjs
// take the first regex match.
// Row format: atomic number, symbol, Turkish name, family, table row, table column (rows 8–9 are the f-block).
const rawElements = "1,H,Hidrojen,nonmetal,1,1|2,He,Helyum,noble,1,18|3,Li,Lityum,alkali,2,1|4,Be,Berilyum,alkaline,2,2|5,B,Bor,metalloid,2,13|6,C,Karbon,nonmetal,2,14|7,N,Azot,nonmetal,2,15|8,O,Oksijen,nonmetal,2,16|9,F,Flor,halogen,2,17|10,Ne,Neon,noble,2,18|11,Na,Sodyum,alkali,3,1|12,Mg,Magnezyum,alkaline,3,2|13,Al,Alüminyum,post,3,13|14,Si,Silisyum,metalloid,3,14|15,P,Fosfor,nonmetal,3,15|16,S,Kükürt,nonmetal,3,16|17,Cl,Klor,halogen,3,17|18,Ar,Argon,noble,3,18|19,K,Potasyum,alkali,4,1|20,Ca,Kalsiyum,alkaline,4,2|21,Sc,Skandiyum,transition,4,3|22,Ti,Titanyum,transition,4,4|23,V,Vanadyum,transition,4,5|24,Cr,Krom,transition,4,6|25,Mn,Manganez,transition,4,7|26,Fe,Demir,transition,4,8|27,Co,Kobalt,transition,4,9|28,Ni,Nikel,transition,4,10|29,Cu,Bakır,transition,4,11|30,Zn,Çinko,transition,4,12|31,Ga,Galyum,post,4,13|32,Ge,Germanyum,metalloid,4,14|33,As,Arsenik,metalloid,4,15|34,Se,Selenyum,nonmetal,4,16|35,Br,Brom,halogen,4,17|36,Kr,Kripton,noble,4,18|37,Rb,Rubidyum,alkali,5,1|38,Sr,Stronsiyum,alkaline,5,2|39,Y,İtriyum,transition,5,3|40,Zr,Zirkonyum,transition,5,4|41,Nb,Niyobyum,transition,5,5|42,Mo,Molibden,transition,5,6|43,Tc,Teknesyum,transition,5,7|44,Ru,Rutenyum,transition,5,8|45,Rh,Rodyum,transition,5,9|46,Pd,Paladyum,transition,5,10|47,Ag,Gümüş,transition,5,11|48,Cd,Kadmiyum,transition,5,12|49,In,İndiyum,post,5,13|50,Sn,Kalay,post,5,14|51,Sb,Antimon,metalloid,5,15|52,Te,Tellür,metalloid,5,16|53,I,İyot,halogen,5,17|54,Xe,Ksenon,noble,5,18|55,Cs,Sezyum,alkali,6,1|56,Ba,Baryum,alkaline,6,2|57,La,Lantan,lanthanide,8,3|58,Ce,Seryum,lanthanide,8,4|59,Pr,Praseodim,lanthanide,8,5|60,Nd,Neodim,lanthanide,8,6|61,Pm,Prometyum,lanthanide,8,7|62,Sm,Samaryum,lanthanide,8,8|63,Eu,Evropiyum,lanthanide,8,9|64,Gd,Gadolinyum,lanthanide,8,10|65,Tb,Terbiyum,lanthanide,8,11|66,Dy,Disprozyum,lanthanide,8,12|67,Ho,Holmiyum,lanthanide,8,13|68,Er,Erbiyum,lanthanide,8,14|69,Tm,Tulyum,lanthanide,8,15|70,Yb,İterbiyum,lanthanide,8,16|71,Lu,Lütesyum,lanthanide,8,17|72,Hf,Hafniyum,transition,6,4|73,Ta,Tantal,transition,6,5|74,W,Tungsten,transition,6,6|75,Re,Renyum,transition,6,7|76,Os,Osmiyum,transition,6,8|77,Ir,İridyum,transition,6,9|78,Pt,Platin,transition,6,10|79,Au,Altın,transition,6,11|80,Hg,Cıva,transition,6,12|81,Tl,Talyum,post,6,13|82,Pb,Kurşun,post,6,14|83,Bi,Bizmut,post,6,15|84,Po,Polonyum,post,6,16|85,At,Astatin,halogen,6,17|86,Rn,Radon,noble,6,18|87,Fr,Fransiyum,alkali,7,1|88,Ra,Radyum,alkaline,7,2|89,Ac,Aktinyum,actinide,9,3|90,Th,Toryum,actinide,9,4|91,Pa,Protaktinyum,actinide,9,5|92,U,Uranyum,actinide,9,6|93,Np,Neptünyum,actinide,9,7|94,Pu,Plütonyum,actinide,9,8|95,Am,Amerikyum,actinide,9,9|96,Cm,Küriyum,actinide,9,10|97,Bk,Berkelyum,actinide,9,11|98,Cf,Kaliforniyum,actinide,9,12|99,Es,Aynştaynyum,actinide,9,13|100,Fm,Fermiyum,actinide,9,14|101,Md,Mendelevyum,actinide,9,15|102,No,Nobelyum,actinide,9,16|103,Lr,Lavrenciyum,actinide,9,17|104,Rf,Rutherfordyum,transition,7,4|105,Db,Dubniyum,transition,7,5|106,Sg,Seaborgiyum,transition,7,6|107,Bh,Bohriyum,transition,7,7|108,Hs,Hassiyum,transition,7,8|109,Mt,Meitneriyum,transition,7,9|110,Ds,Darmstadtiyum,transition,7,10|111,Rg,Röntgenyum,transition,7,11|112,Cn,Kopernikyum,transition,7,12|113,Nh,Nihonyum,post,7,13|114,Fl,Flerovyum,post,7,14|115,Mc,Moskovyum,post,7,15|116,Lv,Livermoryum,post,7,16|117,Ts,Tennessin,halogen,7,17|118,Og,Oganesson,noble,7,18";

/** The 118 elements in atomic-number order with their table position; works offline, before any API call. */
export const STATIC_ELEMENTS: ElementItem[] = rawElements
  .split("|")
  .map((item) => {
    const [atomicNumber, symbol, name, category, rowText, columnText] =
      item.split(",");
    const row = Number(rowText);
    const column = Number(columnText);
    const isFBlock = row > 7;
    return {
      atomicNumber: Number(atomicNumber),
      symbol,
      name,
      category,
      period: isFBlock ? row - 2 : row,
      group: isFBlock ? 3 : column,
      row,
      col: column,
    };
  });

const enriched: Record<
  string,
  { mass: string; phase: string; summary: string }
> = {
  H: {
    mass: "1.008",
    phase: "gaz",
    summary:
      "Hidrojen, evrende en bol bulunan elementtir ve hafif API örnekleri için iyi bir başlangıç kaydıdır.",
  },
  C: {
    mass: "12.011",
    phase: "katı",
    summary:
      "Karbon, organik bileşiklerin temel omurgasını oluşturan ve API örneklerinde sık kullanılan bir ametaldir.",
  },
  O: {
    mass: "15.999",
    phase: "gaz",
    summary:
      "Oksijen, atmosfer ve biyolojik süreçlerle ilişkili istemci örneklerinde en anlaşılır kayıtlardan biridir.",
  },
  Fe: {
    mass: "55.845",
    phase: "katı",
    summary:
      "Demir, geçiş metallerinin tipik alanlarını göstermek için güçlü bir örnek kayıttır.",
  },
  Au: {
    mass: "196.967",
    phase: "katı",
    summary:
      "Altın, yüksek atom kütlesi ve sembol bilinirliği nedeniyle arama örneklerinde kullanışlıdır.",
  },
  U: {
    mass: "238.029",
    phase: "katı",
    summary:
      "Uranyum, aktinit kategorisi ve f-blok konumlandırması için açıklayıcı bir örnektir.",
  },
};

/** Fallback summary per family when neither the gateway nor `enriched` has one. */
const genericSummaries: Record<string, string> = {
  alkali:
    "Alkali metaller düşük grup numarasıyla tabloda sol tarafta yer alır ve kategori filtreleri için net bir koleksiyon oluşturur.",
  alkaline:
    "Toprak alkali metaller ikinci grupta yer alır; liste endpointlerinde grup bazlı filtreleme için idealdir.",
  transition:
    "Geçiş metalleri orta blokta yoğunlaşır ve periyot-grup sorgularının okunabilirliğini test eder.",
  post: "Metaller, tablo üzerinde p-blok konumlarıyla API şemasında kategori ayrımını gösterir.",
  metalloid:
    "Yarı metaller, metal ve ametal davranışları arasındaki sınıflandırma sınırını temsil eder.",
  nonmetal:
    "Ametaller, temel kimya eğitiminde sık arandığı için arama endpointinin ana kullanım örneklerindendir.",
  halogen:
    "Halojenler on yedinci grupta yer alır ve grup filtresiyle hızlıca listelenebilir.",
  noble:
    "Soy gazlar on sekizinci grupta yer alır; kapalı kabuk örnekleri için tutarlı bir kategoridir.",
  lanthanide:
    "Lantanitler f-blokta ayrı satırda gösterilir; tablo yerleşiminde özel konum davranışını temsil eder.",
  actinide:
    "Aktinitler f-blokta yer alır; ileri seviye filtreler ve kategori açıklamaları için ayrı tutulur.",
};

/** Maps a gateway category ("Alkaline earth metal", "Post-transition metal") to a family key; unknown values fall back to "nonmetal". */
export function dbCategoryToStaticCategory(dbCategory: string): string {
  const category = dbCategory.toLowerCase().trim();
  if (category.includes("alkali metal") && !category.includes("alkaline"))
    return "alkali";
  if (category.includes("alkaline earth")) return "alkaline";
  if (category.includes("transition metal") && !category.includes("post"))
    return "transition";
  if (category.includes("post-transition")) return "post";
  if (category.includes("metalloid")) return "metalloid";
  if (category.includes("nonmetal")) return "nonmetal";
  if (category.includes("noble gas")) return "noble";
  if (category.includes("lanthanide")) return "lanthanide";
  if (category.includes("actinide")) return "actinide";
  if (category.includes("halogen")) return "halogen";
  return "nonmetal";
}

/** One element as the gateway (/api/v1/elements) returns it: flat fields plus nested market, detail, media and commerce blocks. */
interface ApiElement extends Partial<ElementItem> {
  symbol: string;
  atomicMass?: number;
  market?: { pricePerGram?: number; availableStock?: number };
  detail?: Partial<ElementItem> & { nameTr?: string };
  media?: { imageUrl?: string };
  commerce?: Partial<ElementItem>;
}

const phaseNames: Record<string, string> = {
  Solid: "katı",
  Liquid: "sıvı",
  Gas: "gaz",
};

/**
 * Overlays live gateway rows on the static seed: every seed element is returned (in seed order),
 * enriched with whatever the gateway knows about it. Elements the gateway lacks keep seed values.
 */
export function mergeElementData(
  liveElements: ApiElement[],
  seedElements: ElementItem[],
): ElementItem[] {
  return seedElements.map((seed) => {
    const live = liveElements.find(
      (item) => item.symbol.toLowerCase() === seed.symbol.toLowerCase(),
    );
    const category = live?.category
      ? dbCategoryToStaticCategory(live.category)
      : seed.category;
    const fallback = enriched[seed.symbol];
    const price = live?.market?.pricePerGram ?? live?.pricePerGram;
    const stock = live?.market?.availableStock ?? live?.availableStock ?? 0;

    return {
      ...seed,
      category,
      name: live?.detail?.nameTr ?? seed.name,
      nameEn: live?.name,
      mass: live?.atomicMass?.toString() ?? fallback?.mass ?? "N/A",
      phase: phaseNames[live?.phase ?? ""] ?? fallback?.phase ?? "—",
      summary:
        live?.detail?.summary ??
        fallback?.summary ??
        genericSummaries[category] ??
        "Açıklama bulunmuyor.",
      appearance: live?.detail?.appearance,
      uses: live?.detail?.uses,
      block: live?.detail?.block,
      electronegativity:
        live?.detail?.electronegativity != null
          ? Number(live.detail.electronegativity)
          : undefined,
      imageUrl: live?.media?.imageUrl,
      sellerName: live?.commerce?.sellerName,
      rating:
        live?.commerce?.rating != null ? Number(live.commerce.rating) : undefined,
      reviewCount: live?.commerce?.reviewCount,
      badge: live?.commerce?.badge,
      deliveryNote: live?.commerce?.deliveryNote,
      currentPrice: price == null ? undefined : Number(price),
      availableStock: Number(stock),
      pricePerGram: price == null ? undefined : Number(price),
      density: live?.density ? Number(live.density) : undefined,
      meltingPoint: live?.meltingPoint ? Number(live.meltingPoint) : undefined,
      boilingPoint: live?.boilingPoint ? Number(live.boilingPoint) : undefined,
      discoveredBy: live?.discoveredBy ?? undefined,
      electronConfiguration: live?.electronConfiguration ?? undefined,
      yearDiscovered: live?.yearDiscovered ?? undefined,
      color: live?.color ?? undefined,
    };
  });
}
