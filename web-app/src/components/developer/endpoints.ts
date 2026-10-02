/**
 * Static API catalogue shared by /developers and /docs: the requests the
 * playground can send and the reference rows the docs tables print.
 */

/** A GET request the playground can send. `keyed` requests need the v1 API key. */
export interface PlaygroundEndpoint {
  path: string;
  label: string;
  keyed?: boolean;
}

export const IRON_PATH = "/api/v2/elements/fe";
export const WATER_PATH =
  "/api/v2/compounds/h2o?fields=slug,names,display_formula,composition,editorial.summary";

/** Keyless scientific v2 requests, from the full iron record to the 400/404 error bodies. */
export const SCIENCE_ENDPOINTS: readonly PlaygroundEndpoint[] = [
  { path: IRON_PATH, label: "Demir · tam bilimsel kayıt" },
  { path: WATER_PATH, label: "Su · formül ve bileşim" },
  {
    path: "/api/v2/elements/fe?fields=symbol,names,editorial,media,external_links",
    label: "Demir · anlatım ve görseller",
  },
  {
    path: "/api/v2/compounds/nacl?fields=display_formula,composition,editorial,media",
    label: "NaCl · formül birimi",
  },
  { path: "/api/v2/elements?view=summary&pageSize=100", label: "Elementler · özet liste" },
  {
    path: "/api/v2/elements/fe?fields=symbol,names,atomic_properties.radii_pm",
    label: "Demir · alan seçimi",
  },
  {
    path: "/api/v2/elements/fe?view=summary&include=isotopes,provenance",
    label: "Demir · özete izotop ekle",
  },
  { path: "/api/v2/elements?q=demir&block=d&pageSize=5", label: "Elementler · q ve blok" },
  { path: "/api/v2/compounds?q=su&pageSize=5", label: "Bileşikler · su ara" },
  { path: "/api/v2/compounds/aspirin", label: "Aspirin · tam bilimsel kayıt" },
  { path: "/api/v2/elements?fields=not_a_field", label: "Geçersiz alan · 400" },
  { path: "/api/v2/compounds/yok", label: "Olmayan slug · 404" },
];

/** v1 credit-simulation requests; shown only when the build has accounts. */
export const SIMULATION_ENDPOINTS: readonly PlaygroundEndpoint[] = [
  { path: "/api/v1/elements/au", label: "Altın · v1 fiyat kaydı" },
  { path: "/api/v1/elements/au/ticker", label: "Altın · anlık fiyat" },
  { path: "/api/v1/market/movers", label: "Piyasa · en çok değişenler" },
  { path: "/api/v1/market/board", label: "Piyasa · fiyat tahtası" },
  { path: "/api/v1/compounds?element=au", label: "Mağaza · altın ürünleri" },
  { path: "/api/v1/compounds/h2o", label: "Mağaza · su ürünü" },
  { path: "/api/v1/elements/au/history?limit=5", label: "Altın · fiyat geçmişi", keyed: true },
  { path: "/api/v1/me/wallet", label: "Cüzdan · bakiye", keyed: true },
  { path: "/api/v1/orders", label: "Siparişler · liste", keyed: true },
];

/** True for the open scientific API; everything else is the v1 simulation. */
export function isSciencePath(path: string): boolean {
  return path.startsWith("/api/v2");
}

/** Playground entry for a path (undefined for paths outside the catalogue). */
export function findEndpoint(path: string): PlaygroundEndpoint | undefined {
  return [...SCIENCE_ENDPOINTS, ...SIMULATION_ENDPOINTS].find(
    (endpoint) => endpoint.path === path,
  );
}

/** The five v2 routes, for the /developers quick list. */
export const SCIENCE_ROUTES = [
  { path: "/api/v2/elements", returns: "Element listesi", accepts: "q, category, block, group, period, page, pageSize" },
  { path: "/api/v2/elements/{kimlik}", returns: "Tek element", accepts: "fe, 26 veya fe-26" },
  { path: "/api/v2/compounds", returns: "Bileşik listesi", accepts: "q, page, pageSize" },
  { path: "/api/v2/compounds/{kimlik}", returns: "Tek bileşik", accepts: "slug (h2o) veya PubChem CID (2244)" },
  { path: "/api/v2/coverage", returns: "Kapsam özeti", accepts: "yalnız atlas ana bilgisayarında (:5080)" },
] as const;

/** Query parameters of the v2 API. */
export const QUERY_PARAMETERS = [
  {
    name: "view",
    scope: "liste ve kayıt",
    meaning:
      "summary = kısa özet (listelerde varsayılan). full = bütün bölümler (tek kayıtta varsayılan). Başka değer 400.",
  },
  {
    name: "include",
    scope: "özet kayıt",
    meaning:
      "summary üzerine bölüm ekler: isotopes, provenance, editorial, media. Virgülle birden fazla. fields varsa include yok sayılır.",
  },
  {
    name: "fields",
    scope: "hepsi",
    meaning:
      "Yalnız bu yollar döner; view ve include’u ezer. Noktalı yol: names.tr, composition. En fazla 32 yol, 6 seviye. Dizi bütün gelir. Bilinmeyen yol 400.",
  },
  {
    name: "q",
    scope: "liste",
    meaning:
      "Türkçe/İngilizce ad, sembol, atom numarası, formül veya PubChem CID. bakır ve bakir aynı kaydı bulur. En fazla 120 karakter.",
  },
  {
    name: "category, block, group, period",
    scope: "yalnız element listesi",
    meaning:
      "classification altındaki değerlerle kesişir (ve). Bileşik listesinde kullanılırsa 400.",
  },
  {
    name: "page, pageSize",
    scope: "liste",
    meaning:
      "Sayfa 1’den başlar. pageSize varsayılan 30, en fazla 100. info.next / info.prev aynı filtreleri korur.",
  },
] as const;

/** v1 simulation routes with whether they need the API key. */
export const SIMULATION_ROUTES = [
  { method: "GET", path: "/api/v1/elements/au/ticker", keyed: false, purpose: "Son fiyat, alış, satış" },
  { method: "GET", path: "/api/v1/market/board", keyed: false, purpose: "118 satır fiyat" },
  { method: "GET", path: "/api/v1/elements/au/history", keyed: true, purpose: "Fiyat geçmişi" },
  { method: "GET", path: "/api/v1/compounds", keyed: false, purpose: "Mağaza SKU listesi" },
  { method: "POST", path: "/api/v1/orders", keyed: true, purpose: "{ elementSymbol, quantity, compoundSlug? }" },
  { method: "GET", path: "/api/v1/orders", keyed: true, purpose: "Sipariş listesi" },
  { method: "GET", path: "/api/v1/orders/:id", keyed: true, purpose: "Tek sipariş ve takip numarası" },
  { method: "GET", path: "/api/v1/orders/search", keyed: true, purpose: "Duruma göre ara" },
  { method: "GET", path: "/api/v1/shipments/track/:no", keyed: true, purpose: "Kargo takibi" },
  { method: "POST", path: "/api/v1/desk/sell", keyed: true, purpose: "{ symbol, grams, compoundSlug? } satış" },
  { method: "GET", path: "/api/v1/me/wallet", keyed: true, purpose: "Bakiye (balanceElx, currency: KREDI)" },
  { method: "GET", path: "/api/v1/me/holdings", keyed: true, purpose: "Ürün, gram ve ortalama maliyet (avgCostElx)" },
] as const;
