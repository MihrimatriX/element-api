/** Glossary content for /sozluk: 25 terms in three groups, each with a "try it" deep link. */

/** Glossary section a term belongs to: lab bench, catalogue and API, or the credit demo. */
export type GlossaryGroupId = "tezgah" | "kablo" | "kasa";

/** One glossary section with its heading and the short badge text its terms carry. */
export interface GlossaryGroup {
  id: GlossaryGroupId;
  title: string;
  /** Badge text next to a term. */
  short: string;
}

/** The "try it" link under a definition. */
export interface GlossaryLink {
  to: string;
  label: string;
}

/** One glossary entry. */
export interface GlossaryTerm {
  /** Anchor id, unique on the page. */
  id: string;
  term: string;
  /** Short specimen shown beside the term (symbol, formula, status code). Decorative. */
  mark: string;
  group: GlossaryGroupId;
  definition: string;
  link: GlossaryLink;
  /** Show the water VSEPR figure under the definition. */
  geometry?: boolean;
}

/** The three sections, in page order. */
export const GLOSSARY_GROUPS: readonly GlossaryGroup[] = [
  { id: "tezgah", title: "Laboratuvar tezgâhı", short: "Tezgâh" },
  { id: "kablo", title: "Katalog ve kablo", short: "Katalog" },
  { id: "kasa", title: "Kredi masası (ayrı demo)", short: "Kredi demosu" },
];

/** Where account-only links point when accounts are switched off. */
const DEMO_LINK: GlossaryLink = { to: "/demo", label: "Kredi demosunu tanı" };
const ACCOUNT_ONLY_PATHS = ["/shop", "/market", "/register", "/account"];

const TERMS: readonly GlossaryTerm[] = [
  {
    id: "element",
    term: "Element",
    mark: "Fe",
    group: "tezgah",
    link: { to: "/periodic", label: "Tabloda Demir’e bak" },
    definition:
      "Periyodik tablodaki bir tür atom. Demir Fe, oksijen O, helyum He. Tezgâhta hidrojeni + ile ikiye çıkarırsan iki atom koymuş olursun; yeni bir element icat etmezsin.",
  },
  {
    id: "bilesik",
    term: "Bileşik",
    mark: "H₂O",
    group: "tezgah",
    link: { to: "/compounds", label: "214 kayda bak" },
    definition:
      "Birden fazla elementin bilinen bir oranı. Su H₂O, sofra tuzu NaCl, pasın hikâyesi demir oksitler. Kataloğumuzda 214 kayıt var; hayali molekül yok.",
  },
  {
    id: "molekul",
    term: "Molekül",
    mark: "H₂O",
    group: "tezgah",
    link: { to: "/compound/h2o", label: "Su kaydını aç" },
    definition:
      "Kendi başına durabilen bir parça. Su öyledir: iki hidrojen, bir oksijen, bükük bir şekil. Laboratuvarda H₂O kartı açılır.",
  },
  {
    id: "formul-birimi",
    term: "Formül birimi",
    mark: "NaCl",
    group: "tezgah",
    link: { to: "/lab/formula?compound=nacl", label: "Tuzu formülle kur" },
    definition:
      "Tuz tanesi milyarlarca Na⁺ ve Cl⁻; yine de deftere NaCl yazarız. Kuvars (SiO₂) da tek molekül değil, uçsuz bir ağ. Formülü kur oyununda “ayrı molekül arama” denmesinin sebebi bu.",
  },
  {
    id: "stoikiometri",
    term: "Stoikiometri",
    mark: "2H+O",
    group: "tezgah",
    link: { to: "/lab", label: "Labda suyu dene" },
    definition:
      "Kaç atom. İki H + bir O = su. Bir H + bir O = HO; katalogda yok, Dene’ye bassan da kayıt açılmaz. Atomları doğru seçip sayıyı yanlış ayarlamak en sık hata.",
  },
  {
    id: "vsepr",
    term: "VSEPR",
    mark: "∠",
    group: "tezgah",
    geometry: true,
    link: { to: "/compound/h2o#geometry", label: "Suyun şekline bak" },
    definition:
      "Elektron çiftleri birbirini iter, şekil oradan çıkar. Su bükülür, karbondioksit cetvel gibi durur. Burada iki boyutlu şema var; 3D model yok.",
  },
  {
    id: "ag-kristal",
    term: "Ağ / kristal",
    mark: "SiO₂",
    group: "tezgah",
    link: { to: "/compound/sio2", label: "Kuvars kaydını aç" },
    definition:
      "SiO₂ kuvars gibi maddeler molekül torbası değil, tekrarlayan kafes. Keşif kartı “ağ” der; tuz “iyonik kafes” der.",
  },
  {
    id: "oksiasit",
    term: "Oksiasit",
    mark: "H₂SO₄",
    group: "tezgah",
    link: { to: "/lab/formula?compound=h2so4", label: "Asidin formülünü kur" },
    definition:
      "Hidrojen + oksijen + bir ametal. Sülfürik asit H₂SO₄ bu aileden. Laboratuvarda doğru atom sayılarıyla kurulur; “asit damlat” deneyi değildir.",
  },
  {
    id: "kesif",
    term: "Keşif",
    mark: "✓",
    group: "tezgah",
    link: { to: "/lab", label: "İlk kartı aç" },
    definition:
      "Deftere yazılan “bildim”. İki H bir O ile suyu bir kez kaydedersin; Dene’ye yeniden basmak aynı kartı çoğaltmaz. Cam tüpte gaz çıkışı yok.",
  },
  {
    id: "gercek-reaksiyon-degil",
    term: "Gerçek reaksiyon değil",
    mark: "—",
    group: "tezgah",
    link: { to: "/lab", label: "Tezgâhın sınırını gör" },
    definition:
      "Tezgâha element dizmek laboratuvar tarifi değildir. Isı, katalizör, yan ürün yok. Soygazlar birleşmez; kararsız oran açıklanır ve kart açılmaz.",
  },
  {
    id: "formulu-kur",
    term: "Formülü kur",
    mark: "NaCl",
    group: "tezgah",
    link: { to: "/lab/formula", label: "Oyunu aç" },
    definition:
      "Adı verilen kaydın atom sayılarını ayarlarsın. Skor keşif defterine karışmaz. Tuzda formül birimi, suda molekül.",
  },
  {
    id: "element-dedektifi",
    term: "Element dedektifi",
    mark: "Fe?",
    group: "tezgah",
    link: { to: "/lab/detective", label: "Pas rengini dene" },
    definition:
      "İpucu ipucu element bul. Havuz ilk 36 element; skor yine ayrı. Pas rengi bir ipucu demire götürebilir, kesin teşhis değil.",
  },
  {
    id: "rota",
    term: "Rota",
    mark: "6",
    group: "tezgah",
    link: { to: "/collection", label: "Altı rotaya bak" },
    definition:
      "Defterdeki kısa öğrenme yolu. Altı tane. Günlük maddeler su, karbondioksit, amonyak ister. Soru, keşiflerden sonra açılır.",
  },
  {
    id: "izomer",
    term: "İzomer",
    mark: "C₆H₁₂O₆",
    group: "tezgah",
    link: { to: "/compound/c6h12o6", label: "Glikoz kaydını aç" },
    definition:
      "Aynı atomlar, farklı düzen. Glikoz ile fruktoz burada tek anahtara düşer. Bilerek kaba; ayırt etmek ayrı iş.",
  },
  {
    id: "atlas",
    term: "Atlas",
    mark: "118",
    group: "kablo",
    link: { to: "/periodic", label: "118 hücre" },
    definition:
      "Türkçe anlatım + lisanslı fotoğraf veya şema + kaynaklı sayı. Sayı PubChem, RSC ve NIST’ten; anlatım editöryel. Fotoğrafı olmayan hücre şemaya düşer; boşluk çoğu zaman bilinçli.",
  },
  {
    id: "slug",
    term: "slug",
    mark: "h2o",
    group: "kablo",
    link: { to: "/compound/h2o", label: "h2o kaydı" },
    definition:
      "Bileşiğin URL adı: h2o, nacl, aspirin. API’de slug veya PubChem CID (aspirin = 2244) aynı kaydı açar.",
  },
  {
    id: "fields-view",
    term: "fields / view",
    mark: "fields",
    group: "kablo",
    link: { to: "/docs", label: "API tezgâhında kes" },
    definition:
      "fields = “şunları ver”. view=summary kısa, full uzun. fields varsa öteki ikisini ezer. Geçersiz bir alan adı 400 döner.",
  },
  {
    id: "etag",
    term: "ETag",
    mark: "304",
    group: "kablo",
    link: { to: "/docs", label: "Aynı ETag ile sor" },
    definition:
      "Kaydın parmak izi. Aynı izle sorarsan sunucu 304 der, JSON göndermez. Farklı fields farklı iz. API sayfasında “Aynı ETag ile sor” bunu dener.",
  },
  {
    id: "null",
    term: "null",
    mark: "null",
    group: "kablo",
    link: { to: "/data", label: "Eksik bölümler" },
    definition:
      "Bu sürümde doğrulanmış değer yok. Sıfır değil, “güvenli” değil, “ölçülmedi” de değil; yalnızca elimizde yok. Ayrıntı sayfasında eksik alanları sen açarsın.",
  },
  {
    id: "kredi-birimi",
    term: "KREDI",
    mark: "KREDI",
    group: "kablo",
    link: { to: "/demo", label: "Kredi simülasyonunu tanı" },
    definition:
      "Ekrandaki sanal para. Bankadan çekilmez. JSON’da balanceElx, avgCostElx, reason INSUFFICIENT_ELX gibi eski alan adları görünebilir; değer yine kredidir. Uyumluluk için adlar değiştirilmedi.",
  },
  {
    id: "api-anahtari",
    term: "API anahtarı",
    mark: "X-API-Key",
    group: "kablo",
    link: { to: "/docs", label: "v2 anahtarsız" },
    definition:
      "Bilimsel v2 için gerekmez. Cüzdan, sipariş ve satış için v1 uçları X-API-Key ister. Fiyat tablosunu okumak ücretsizdir.",
  },
  {
    id: "kredi-bakiyesi",
    term: "kredi",
    mark: "10.000",
    group: "kasa",
    link: { to: "/shop", label: "Mağazada Fe gramı" },
    definition:
      "Hesap açınca 10.000 kredi gelir. Gerçek para değil. Bilimsel keşif cüzdanı değiştirmez.",
  },
  {
    id: "alis-fiyati",
    term: "Alış fiyatı",
    mark: "ask",
    group: "kasa",
    link: { to: "/market", label: "Fiyat tablosu" },
    definition:
      "Gram alırken ödeyeceğin simülasyon fiyatı. Son fiyatın biraz üstü.",
  },
  {
    id: "satis-fiyati",
    term: "Satış fiyatı",
    mark: "bid",
    group: "kasa",
    link: { to: "/market", label: "Alış–satış farkı" },
    definition:
      "Gramı geri verince yazılacak fiyat. Alıştan biraz düşük. Aradaki fark kasıtlı.",
  },
  {
    id: "gram",
    term: "Gram",
    mark: "1 g",
    group: "kasa",
    link: { to: "/shop", label: "1 / 10 / 100 g paket" },
    definition:
      "Miktar birimi. Mağaza paketleri 1, 10 ve 100 gram. Eğitim kataloğundaki 214 bileşik kendiliğinden satılık ürün olmaz.",
  },
];

/** All terms; when accounts are off, links to account-only pages point to the /demo tour instead. */
export function glossaryTerms(accountsEnabled: boolean): GlossaryTerm[] {
  if (accountsEnabled) return [...TERMS];
  return TERMS.map((term) =>
    ACCOUNT_ONLY_PATHS.some((path) => term.link.to.startsWith(path))
      ? { ...term, link: DEMO_LINK }
      : term,
  );
}

/** Turkish alphabet, in dictionary order. */
export const TURKISH_ALPHABET = [..."ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ"];

/** First letter of a term, upper-cased the Turkish way ("izomer" → "İ"). */
export function initialOf(term: string): string {
  return term.charAt(0).toLocaleUpperCase("tr-TR");
}

/** Terms grouped by initial, letters and terms in Turkish dictionary order. */
export function termsByLetter(
  terms: readonly GlossaryTerm[],
): Map<string, GlossaryTerm[]> {
  const sorted = [...terms].sort((a, b) =>
    a.term.localeCompare(b.term, "tr-TR", { sensitivity: "base" }),
  );
  const letters = new Map<string, GlossaryTerm[]>();
  for (const letter of TURKISH_ALPHABET) {
    const matches = sorted.filter((term) => initialOf(term.term) === letter);
    if (matches.length) letters.set(letter, matches);
  }
  return letters;
}

/** Anchor id of a letter section ("Ç" → "harf-ç"). */
export function letterAnchor(letter: string): string {
  return `harf-${letter.toLocaleLowerCase("tr-TR")}`;
}
