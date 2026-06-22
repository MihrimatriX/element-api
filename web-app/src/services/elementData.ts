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
  actinide: "Aktinit"
};

export const categoryTokens: Record<string, string> = {
  alkali: "var(--cat-alkali)",
  alkaline: "var(--cat-alkaline)",
  transition: "var(--cat-transition)",
  post: "var(--cat-post)",
  metalloid: "var(--cat-metalloid)",
  nonmetal: "var(--cat-nonmetal)",
  halogen: "var(--cat-halogen)",
  noble: "var(--cat-noble)",
  lanthanide: "var(--cat-lanthanide)",
  actinide: "var(--cat-actinide)"
};

const rawElements = "1,H,Hidrojen,nonmetal,1,1|2,He,Helyum,noble,1,18|3,Li,Lityum,alkali,2,1|4,Be,Berilyum,alkaline,2,2|5,B,Bor,metalloid,2,13|6,C,Karbon,nonmetal,2,14|7,N,Azot,nonmetal,2,15|8,O,Oksijen,nonmetal,2,16|9,F,Flor,halogen,2,17|10,Ne,Neon,noble,2,18|11,Na,Sodyum,alkali,3,1|12,Mg,Magnezyum,alkaline,3,2|13,Al,Alüminyum,post,3,13|14,Si,Silisyum,metalloid,3,14|15,P,Fosfor,nonmetal,3,15|16,S,Kükürt,nonmetal,3,16|17,Cl,Klor,halogen,3,17|18,Ar,Argon,noble,3,18|19,K,Potasyum,alkali,4,1|20,Ca,Kalsiyum,alkaline,4,2|21,Sc,Skandiyum,transition,4,3|22,Ti,Titanyum,transition,4,4|23,V,Vanadyum,transition,4,5|24,Cr,Krom,transition,4,6|25,Mn,Manganez,transition,4,7|26,Fe,Demir,transition,4,8|27,Co,Kobalt,transition,4,9|28,Ni,Nikel,transition,4,10|29,Cu,Bakır,transition,4,11|30,Zn,Çinko,transition,4,12|31,Ga,Galyum,post,4,13|32,Ge,Germanyum,metalloid,4,14|33,As,Arsenik,metalloid,4,15|34,Se,Selenyum,nonmetal,4,16|35,Br,Brom,halogen,4,17|36,Kr,Kripton,noble,4,18|37,Rb,Rubidyum,alkali,5,1|38,Sr,Stronsiyum,alkaline,5,2|39,Y,İtriyum,transition,5,3|40,Zr,Zirkonyum,transition,5,4|41,Nb,Niyobyum,transition,5,5|42,Mo,Molibden,transition,5,6|43,Tc,Teknesyum,transition,5,7|44,Ru,Rutenyum,transition,5,8|45,Rh,Rodyum,transition,5,9|46,Pd,Paladyum,transition,5,10|47,Ag,Gümüş,transition,5,11|48,Cd,Kadmiyum,transition,5,12|49,In,İndiyum,post,5,13|50,Sn,Kalay,post,5,14|51,Sb,Antimon,metalloid,5,15|52,Te,Tellür,metalloid,5,16|53,I,İyot,halogen,5,17|54,Xe,Ksenon,noble,5,18|55,Cs,Sezyum,alkali,6,1|56,Ba,Baryum,alkaline,6,2|57,La,Lantan,lanthanide,8,3|58,Ce,Seryum,lanthanide,8,4|59,Pr,Praseodim,lanthanide,8,5|60,Nd,Neodim,lanthanide,8,6|61,Pm,Prometyum,lanthanide,8,7|62,Sm,Samaryum,lanthanide,8,8|63,Eu,Evropiyum,lanthanide,8,9|64,Gd,Gadolinyum,lanthanide,8,10|65,Tb,Terbiyum,lanthanide,8,11|66,Dy,Disprozyum,lanthanide,8,12|67,Ho,Holmiyum,lanthanide,8,13|68,Er,Erbiyum,lanthanide,8,14|69,Tm,Tulyum,lanthanide,8,15|70,Yb,İterbiyum,lanthanide,8,16|71,Lu,Lütesyum,lanthanide,8,17|72,Hf,Hafniyum,transition,6,4|73,Ta,Tantal,transition,6,5|74,W,Tungsten,transition,6,6|75,Re,Renyum,transition,6,7|76,Os,Osmiyum,transition,6,8|77,Ir,İridyum,transition,6,9|78,Pt,Platin,transition,6,10|79,Au,Altın,transition,6,11|80,Hg,Cıva,transition,6,12|81,Tl,Talyum,post,6,13|82,Pb,Kurşun,post,6,14|83,Bi,Bizmut,post,6,15|84,Po,Polonyum,post,6,16|85,At,Astatin,halogen,6,17|86,Rn,Radon,noble,6,18|87,Fr,Fransiyum,alkali,7,1|88,Ra,Radyum,alkaline,7,2|89,Ac,Aktinyum,actinide,9,3|90,Th,Toryum,actinide,9,4|91,Pa,Protaktinyum,actinide,9,5|92,U,Uranyum,actinide,9,6|93,Np,Neptünyum,actinide,9,7|94,Pu,Plütonyum,actinide,9,8|95,Am,Amerikyum,actinide,9,9|96,Cm,Küriyum,actinide,9,10|97,Bk,Berkelyum,actinide,9,11|98,Cf,Kaliforniyum,actinide,9,12|99,Es,Aynştaynyum,actinide,9,13|100,Fm,Fermiyum,actinide,9,14|101,Md,Mendelevyum,actinide,9,15|102,No,Nobelyum,actinide,9,16|103,Lr,Lavrenciyum,actinide,9,17|104,Rf,Rutherfordyum,transition,7,4|105,Db,Dubniyum,transition,7,5|106,Sg,Seaborgiyum,transition,7,6|107,Bh,Bohriyum,transition,7,7|108,Hs,Hassiyum,transition,7,8|109,Mt,Meitneriyum,transition,7,9|110,Ds,Darmstadtiyum,transition,7,10|111,Rg,Röntgenyum,transition,7,11|112,Cn,Kopernikyum,transition,7,12|113,Nh,Nihonyum,post,7,13|114,Fl,Flerovyum,post,7,14|115,Mc,Moskovyum,post,7,15|116,Lv,Livermoryum,post,7,16|117,Ts,Tennessin,halogen,7,17|118,Og,Oganesson,noble,7,18";

export const STATIC_ELEMENTS: ElementItem[] = rawElements.split("|").map((item) => {
  const [atomicNumber, symbol, name, category, period, group] = item.split(",");
  return {
    atomicNumber: Number(atomicNumber),
    symbol,
    name,
    category,
    period: Number(period),
    group: Number(group),
    row: Number(period),
    col: Number(group)
  };
});

const enriched: Record<string, { mass: string; phase: string; summary: string }> = {
  H: { mass: "1.008", phase: "gaz", summary: "Hidrojen, evrende en bol bulunan elementtir ve hafif API örnekleri için iyi bir başlangıç kaydıdır." },
  C: { mass: "12.011", phase: "katı", summary: "Karbon, organik bileşiklerin temel omurgasını oluşturan ve API örneklerinde sık kullanılan bir ametaldir." },
  O: { mass: "15.999", phase: "gaz", summary: "Oksijen, atmosfer ve biyolojik süreçlerle ilişkili istemci örneklerinde en anlaşılır kayıtlardan biridir." },
  Fe: { mass: "55.845", phase: "katı", summary: "Demir, geçiş metallerinin tipik alanlarını göstermek için güçlü bir örnek kayıttır." },
  Au: { mass: "196.967", phase: "katı", summary: "Altın, yüksek atom kütlesi ve sembol bilinirliği nedeniyle arama örneklerinde kullanışlıdır." },
  U: { mass: "238.029", phase: "katı", summary: "Uranyum, aktinit kategorisi ve f-blok konumlandırması için açıklayıcı bir örnektir." }
};

const genericSummaries: Record<string, string> = {
  alkali: "Alkali metaller düşük grup numarasıyla tabloda sol tarafta yer alır ve kategori filtreleri için net bir koleksiyon oluşturur.",
  alkaline: "Toprak alkali metaller ikinci grupta yer alır; liste endpointlerinde grup bazlı filtreleme için idealdir.",
  transition: "Geçiş metalleri orta blokta yoğunlaşır ve periyot-grup sorgularının okunabilirliğini test eder.",
  post: "Metaller, tablo üzerinde p-blok konumlarıyla API şemasında kategori ayrımını gösterir.",
  metalloid: "Yarı metaller, metal ve ametal davranışları arasındaki sınıflandırma sınırını temsil eder.",
  nonmetal: "Ametaller, temel kimya eğitiminde sık arandığı için arama endpointinin ana kullanım örneklerindendir.",
  halogen: "Halojenler on yedinci grupta yer alır ve grup filtresiyle hızlıca listelenebilir.",
  noble: "Soy gazlar on sekizinci grupta yer alır; kapalı kabuk örnekleri için tutarlı bir kategoridir.",
  lanthanide: "Lantanitler f-blokta ayrı satırda gösterilir; tablo yerleşiminde özel konum davranışını temsil eder.",
  actinide: "Aktinitler f-blokta yer alır; ileri seviye filtreler ve kategori açıklamaları için ayrı tutulur."
};

export const financeProfiles: Record<string, { multiplier: number; liquidity: string; use: string; risk: string; volatility: string; collateral: number }> = {
  alkali: { multiplier: 1.16, liquidity: "Orta", use: "Batarya ve reaktif", risk: "Oynak", volatility: "Yüksek", collateral: 48 },
  alkaline: { multiplier: 1.05, liquidity: "Orta", use: "Alaşım ve mineral", risk: "Dengeli", volatility: "Orta", collateral: 54 },
  transition: { multiplier: 1.34, liquidity: "Yüksek", use: "Sanayi ve kataliz", risk: "Dengeli", volatility: "Orta", collateral: 68 },
  post: { multiplier: 1.12, liquidity: "Orta", use: "Elektronik ve kaplama", risk: "Dengeli", volatility: "Orta", collateral: 58 },
  metalloid: { multiplier: 1.22, liquidity: "Yüksek", use: "Yarı iletken", risk: "Büyüme", volatility: "Orta", collateral: 62 },
  nonmetal: { multiplier: 1.1, liquidity: "Yüksek", use: "Yaşam ve eğitim", risk: "Düşük", volatility: "Düşük", collateral: 64 },
  halogen: { multiplier: 1.08, liquidity: "Orta", use: "İlaç ve arıtma", risk: "Kontrollü", volatility: "Orta", collateral: 50 },
  noble: { multiplier: 1.28, liquidity: "Sınırlı", use: "Işık ve kriyojenik", risk: "Nadir", volatility: "Düşük", collateral: 72 },
  lanthanide: { multiplier: 1.46, liquidity: "Sınırlı", use: "Mıknatıs ve optik", risk: "Stratejik", volatility: "Yüksek", collateral: 44 },
  actinide: { multiplier: 1.52, liquidity: "Kısıtlı", use: "Enerji ve araştırma", risk: "Yüksek", volatility: "Yüksek", collateral: 36 }
};

export function dbCategoryToStaticCategory(dbCategory: string): string {
  const norm = dbCategory.toLowerCase().trim();
  if (norm.includes("alkali metal") && !norm.includes("alkaline")) return "alkali";
  if (norm.includes("alkaline earth")) return "alkaline";
  if (norm.includes("transition metal") && !norm.includes("post")) return "transition";
  if (norm.includes("post-transition")) return "post";
  if (norm.includes("metalloid")) return "metalloid";
  if (norm.includes("nonmetal")) return "nonmetal";
  if (norm.includes("noble gas")) return "noble";
  if (norm.includes("lanthanide")) return "lanthanide";
  if (norm.includes("actinide")) return "actinide";
  if (norm.includes("halogen")) return "halogen";
  return "nonmetal"; // default fallback
}

export function valuationFor(element: ElementItem, range = 12) {
  const profile = financeProfiles[element.category] || financeProfiles.nonmetal;
  // Calculate price based on atomic number and multipliers
  const basePrice = 42 + element.atomicNumber * 3.55 * profile.multiplier;
  const price = Number(basePrice.toFixed(2));
  const trend = Number((((element.atomicNumber % 9) - 3) * 0.7 + profile.multiplier).toFixed(1));
  const index = Math.min(96, Math.round(34 + element.atomicNumber * 0.38 + profile.multiplier * 18));
  const supply = Math.max(8400, Math.round((128000 / (1 + element.atomicNumber * 0.055)) * (2 - profile.multiplier)));
  const useScore = Math.min(99, Math.round(index + profile.multiplier * 7));
  
  const history = Array.from({ length: range }, (_, i) => {
    const wave = ((element.atomicNumber + i * 5) % 17) / 100;
    return Number((price * (0.91 + wave + i * 0.006)).toFixed(2));
  });

  return {
    price,
    trend,
    index,
    supply,
    useScore,
    history,
    liquidity: profile.liquidity,
    use: profile.use,
    risk: profile.risk,
    volatility: profile.volatility,
    collateral: profile.collateral
  };
}

export function mergeElementData(dbElements: any[], staticElements: ElementItem[]): ElementItem[] {
  return staticElements.map((st) => {
    const db = dbElements.find((item) => item.symbol.toLowerCase() === st.symbol.toLowerCase());
    
    // Determine category based on DB category or static category
    let category = st.category;
    if (db && db.category) {
      category = dbCategoryToStaticCategory(db.category);
    }

    const detail = enriched[st.symbol] || {};
    
    // Resolve price: Use DB price if available, otherwise calculate model price
    const modelVal = valuationFor({ ...st, category });
    const resolvedPrice = db?.market?.pricePerGram ?? db?.pricePerGram ?? modelVal.price;
    const resolvedStock = db?.market?.availableStock ?? db?.availableStock ?? modelVal.supply;

    return {
      ...st,
      category,
      name: db?.detail?.nameTr ?? st.name,
      nameEn: db?.name,
      mass: db?.atomicMass?.toString() ?? detail.mass ?? "N/A",
      phase: db?.phase?.toLowerCase() ?? detail.phase ?? "katı",
      summary: db?.detail?.summary ?? detail.summary ?? genericSummaries[category] ?? "Açıklama bulunmuyor.",
      appearance: db?.detail?.appearance,
      uses: db?.detail?.uses,
      block: db?.detail?.block,
      electronegativity: db?.detail?.electronegativity != null ? Number(db.detail.electronegativity) : undefined,
      imageUrl: db?.media?.imageUrl,
      sellerName: db?.commerce?.sellerName,
      rating: db?.commerce?.rating != null ? Number(db.commerce.rating) : undefined,
      reviewCount: db?.commerce?.reviewCount,
      badge: db?.commerce?.badge,
      deliveryNote: db?.commerce?.deliveryNote,
      currentPrice: Number(resolvedPrice),
      availableStock: Math.round(resolvedStock),
      pricePerGram: Number(resolvedPrice),
      density: db?.density ? Number(db.density) : undefined,
      meltingPoint: db?.meltingPoint ? Number(db.meltingPoint) : undefined,
      boilingPoint: db?.boilingPoint ? Number(db.boilingPoint) : undefined,
      discoveredBy: db?.discoveredBy ?? undefined,
      electronConfiguration: db?.electronConfiguration ?? undefined,
      yearDiscovered: db?.yearDiscovered ?? undefined,
      color: db?.color ?? undefined
    };
  });
}
