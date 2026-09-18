import {
  Disclosure,
  DisclosureTrigger,
  DisclosureContent,
} from "@/components/ui/disclosure";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { NativeSelect } from "@/components/ui/native-select";
import { Button } from "@/components/ui/button";
import { track } from "../services/diagnostics";
import { playgroundView } from "../services/apiDocs";
import { readStorage } from "../services/session";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  API_ORIGIN,
  ACCOUNTS_ENABLED,
  SCIENCE_BASE_URL,
  getPublicSiteUrl,
  pagePath,
  publicApiUrl,
} from "../config";
import { useSelectedElement } from "../App";
import Seo from "../components/Seo";
import { WorkshopMarks } from "../components/AtlasVisual";

type Language = "curl" | "javascript" | "python";

const FE = "/api/v2/elements/fe";
const WATER =
  "/api/v2/compounds/h2o?fields=slug,names,display_formula,composition,editorial.summary";

const ENDPOINTS = [
  { path: FE, auth: false, label: "GET Demir · tam bilimsel kayıt" },
  {
    path: WATER,
    auth: false,
    label: "GET Su · formül ve bileşim",
  },
  {
    path: "/api/v2/elements/fe?fields=symbol,names,editorial,media,external_links",
    auth: false,
    label: "GET Demir · anlatım ve görseller",
  },
  {
    path: "/api/v2/compounds/nacl?fields=display_formula,composition,editorial,media",
    auth: false,
    label: "GET NaCl · formül birimi",
  },
  {
    path: "/api/v2/elements?view=summary&pageSize=100",
    auth: false,
    label: "GET Elementler · özet liste",
  },
  {
    path: "/api/v2/elements/fe?fields=symbol,names,atomic_properties.radii_pm",
    auth: false,
    label: "GET Demir · alan seçimi",
  },
  {
    path: "/api/v2/elements/fe?view=summary&include=isotopes,provenance",
    auth: false,
    label: "GET Demir · özete izotop ekle",
  },
  {
    path: "/api/v2/elements?q=demir&block=d&pageSize=5",
    auth: false,
    label: "GET Elementler · q + blok",
  },
  {
    path: "/api/v2/compounds?q=su&pageSize=5",
    auth: false,
    label: "GET Bileşikler · su ara",
  },
  {
    path: "/api/v2/compounds/aspirin",
    auth: false,
    label: "GET Aspirin · tam bilimsel kayıt",
  },
  {
    path: "/api/v2/elements?fields=not_a_field",
    auth: false,
    label: "GET geçersiz alan · 400",
  },
  {
    path: "/api/v2/compounds/yok",
    auth: false,
    label: "GET olmayan slug · 404",
  },
  { path: "/api/v1/elements/au", auth: false, label: "GET Au (v1 fiyat)" },
  { path: "/api/v1/elements/au/ticker", auth: false, label: "GET ticker" },
  { path: "/api/v1/market/movers", auth: false, label: "GET movers" },
  { path: "/api/v1/market/board", auth: false, label: "GET board" },
  { path: "/api/v1/compounds?element=au", auth: false, label: "GET mağaza SKU" },
  {
    path: "/api/v1/compounds/h2o",
    auth: false,
    label: "GET v1 bileşik ürünü",
  },
  {
    path: "/api/v1/elements/au/history?limit=5",
    auth: true,
    label: "GET history",
  },
  { path: "/api/v1/me/wallet", auth: true, label: "GET wallet" },
  { path: "/api/v1/orders", auth: true, label: "GET orders" },
];

const QUERY_ROWS = [
  {
    name: "view",
    who: "liste ve kayıt",
    meaning:
      "summary = kısa özet (listelerde varsayılan). full = bütün bölümler (tek kayıtta varsayılan). Başka değer 400.",
  },
  {
    name: "include",
    who: "özet kayıt",
    meaning:
      "summary üzerine bölüm ekler: isotopes, provenance, editorial, media. Virgülle birden fazla. fields varsa include yok sayılır.",
  },
  {
    name: "fields",
    who: "hepsi",
    meaning:
      "Yalnız bu yollar döner; view ve include’u ezer. Noktalı yol: names.tr, composition. En fazla 32 yol, 6 seviye. Dizi bütün gelir. Bilinmeyen yol 400.",
  },
  {
    name: "q",
    who: "liste",
    meaning:
      "Türkçe/İngilizce ad, sembol, atom numarası, formül veya PubChem CID. bakır ve bakir aynı kaydı bulur. En fazla 120 karakter.",
  },
  {
    name: "category, block, group, period",
    who: "yalnız element listesi",
    meaning:
      "classification altındaki değerlerle kesişir (ve). Bileşik listesinde kullanılırsa 400.",
  },
  {
    name: "page, pageSize",
    who: "liste",
    meaning:
      "Sayfa 1’den başlar. pageSize varsayılan 30, en fazla 100. info.next / info.prev aynı filtreleri korur.",
  },
];

export default function ApiDocs() {
  const { selectedSymbol } = useSelectedElement();
  const [activeLang, setActiveLang] = useState<Language>("curl");
  const [tryItEndpoint, setTryItEndpoint] = useState(FE);
  const [apiResponse, setApiResponse] = useState<unknown>({ loading: true });
  const [httpStatus, setHttpStatus] = useState<number | null>(null);
  const [etag, setEtag] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const apiKey = typeof window !== "undefined" ? readStorage("apiKey") : null;

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    fetch(publicApiUrl(FE), { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        setHttpStatus(res.status);
        setEtag(res.headers.get("ETag"));
        setApiResponse(await res.json());
      })
      .catch((err) =>
        setApiResponse({
          error: err.message,
          note: "Demir bilimsel kaydı yüklenemedi.",
        }),
      )
      .finally(() => clearTimeout(timer));
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, []);

  const headers: Record<string, string> = {};
  if (apiKey) headers["X-API-Key"] = apiKey;

  const getCodeSnippet = (lang: Language, endpoint: string) => {
    const fullUrl = publicApiUrl(endpoint);
    const useKey = !endpoint.startsWith("/api/v2") && apiKey;
    const keyLine = apiKey ? `X-API-Key: ${apiKey}` : "X-API-Key: ele_live_…";
    switch (lang) {
      case "curl":
        return useKey ||
          endpoint.includes("history") ||
          endpoint.includes("orders") ||
          endpoint.includes("/me/")
          ? `curl -s "${fullUrl}" -H "${keyLine}"`
          : `curl -s "${fullUrl}"`;
      case "javascript":
        return `fetch("${fullUrl}"${useKey ? `, { headers: { "X-API-Key": "${apiKey}" } }` : ""})\n  .then(r => r.json())\n  .then(console.log);`;
      case "python":
        return `import requests\nprint(requests.get("${fullUrl}"${apiKey ? `, headers={"X-API-Key": "${apiKey}"}` : ""}).json())`;
    }
  };

  const send = async (path: string, extra: Record<string, string> = {}) => {
    track("api_example_run");
    setIsLoading(true);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    try {
      const response = await fetch(publicApiUrl(path), {
        headers: {
          ...(path.startsWith("/api/v2") ? {} : headers),
          ...extra,
        },
        cache: "no-store",
        signal: controller.signal,
      });
      const nextEtag = response.headers.get("ETag");
      setHttpStatus(response.status);
      if (nextEtag) setEtag(nextEtag);
      const data = await response.json().catch(() => null);
      setApiResponse(playgroundView(response.status, nextEtag, data));
    } catch (error: unknown) {
      const err = error as { message?: string };
      setApiResponse({ error: err.message });
    } finally {
      clearTimeout(timer);
      setIsLoading(false);
    }
  };

  const handleTryIt = () => send(tryItEndpoint);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    const toast = document.getElementById("toast");
    if (toast) {
      toast.textContent = "Kopyalandı";
      toast.classList.add("show");
      setTimeout(() => toast.classList.remove("show"), 1500);
    }
  };

  const sellExample = `curl -s -X POST "${API_ORIGIN}/api/v1/desk/sell" \\
  -H "X-API-Key: ${apiKey || "ele_live_…"}" \\
  -H "Content-Type: application/json" \\
  -d '{"symbol":"Au","grams":1}'`;

  const orderExample = `curl -s -X POST "${API_ORIGIN}/api/v1/orders" \\
  -H "X-API-Key: ${apiKey || "ele_live_…"}" \\
  -H "Content-Type: application/json" \\
  -d '{"elementSymbol":"Au","quantity":1}'`;

  const origin = getPublicSiteUrl();
  const scienceDirect = SCIENCE_BASE_URL.startsWith("/");
  const feUrl = publicApiUrl(FE);
  const waterUrl = publicApiUrl(WATER);
  const etagUrl = publicApiUrl(
    "/api/v2/elements/fe?fields=symbol,names",
  );

  return (
    <main className="page api-docs-page">
      <Seo
        title="Bilimsel API · ElementAPI"
        description="Fe ve H2O örnekleri, fields/view/filtre, ETag/304 ve hata gövdeleri. Anahtar yok. KREDI simülasyonu ayrı v1 uçlarda."
        path={pagePath("/docs", selectedSymbol)}
        jsonLd={{
          "@type": "WebAPI",
          name: "ElementAPI",
          url: `${origin}/docs`,
          documentation: `${origin}/docs`,
          description:
            "118 element ve bileşikler için herkese açık bilimsel REST. Cüzdan ve sipariş ayrı v1 uçlardır; API anahtarı ister.",
          provider: {
            "@type": "Organization",
            name: "ElementAPI",
            url: origin,
          },
        }}
      />
      <section className="hero compact" style={{ marginBottom: 34 }}>
        <div>
          <p className="kicker">Geliştirici tezgâhı</p>
          <h1>Bilimsel API</h1>
          <p className="lead">
            Demiri oku, suyu oku, JSON’u kopyala. Hesap yok, anahtar yok. Sağdaki
            kutuda isteği gönder; solda parametrelerin Türkçesi ve curl satırları
            var. Sözler için <Link to="/sozluk">sözlük</Link>.
          </p>
          <WorkshopMarks beat="rust" />
        </div>
      </section>

      <section className="screen-grid">
        <Card asChild className="gap-0 py-0 shadow-none">
          <div className="panel padded">
            <p className="kicker">v2 · herkese açık</p>
            <h2>Ne çağırırsın</h2>
            <p>
              Tam kayıt şemaları:{" "}
              <a href="/schema/elements.schema.json">Element JSON Schema</a> ·{" "}
              <a href="/schema/compounds.schema.json">Bileşik JSON Schema</a> ·{" "}
              <a href="/openapi.json">v2 OpenAPI</a>. Alan seçimi bazı
              anahtarları düşürür; şema “her özet yanıt bunu içerir” demez.
              Eksik değer <code>null</code> kalır, sıfır yapılmaz.{" "}
              <Link to="/data">Veri kapsamı</Link> ·{" "}
              <Link to="/developers">Geliştirici girişi</Link>.
            </p>
            <p>
              Kapsam özeti <code>GET /api/v2/coverage</code> yalnız bağımsız
              atlas ana bilgisayarında (<code>:5080</code>) vardır; kapı (
              <code>:5000</code>) bu ucu geçirmez. Kapıdayken liste uçlarının{" "}
              <code>info.count</code> alanını oku.
            </p>
            <p>
              Kimlikler: elementte <code>fe</code>, <code>26</code> veya{" "}
              <code>fe-26</code>. Bileşikte slug (<code>h2o</code>,{" "}
              <code>nacl</code>, <code>aspirin</code>) veya PubChem CID (
              <code>2244</code> aspirin). v1 mağaza SKU’su bilimsel katalog
              değildir.
            </p>

            <h3>Kopyala, yapıştır</h3>
            <pre className="code-window">
              <code>{`curl -s "${feUrl}"`}</code>
            </pre>
            <pre className="code-window">
              <code>{`curl -s "${waterUrl}"`}</code>
            </pre>
            <pre className="code-window">
              <code>{`curl -s "${publicApiUrl("/api/v2/elements?q=demir&block=d&pageSize=5")}"`}</code>
            </pre>

            <h3 id="etag">ETag ve 304</h3>
            <p>
              Başarılı v2 yanıtı zayıf ETag ve <code>Cache-Control: public,
              max-age=3600</code> taşır. Aynı gövdenin parmak izini{" "}
              <code>If-None-Match</code> ile geri gönderirsen 304 gelir; JSON
              yok. Farklı <code>fields</code> farklı ETag üretir. CORS: GET ve
              OPTIONS, her origin; <code>ETag</code> başlığı açıktır.
            </p>
            <pre className="code-window">
              <code>{`curl -sI "${etagUrl}"\ncurl -s -D - -H "If-None-Match: W/\\"…\\"" "${etagUrl}"`}</code>
            </pre>

            <h3>Parametreler</h3>
            <div style={{ overflowX: "auto" }}>
              <Table className="api-table">
                <TableHeader>
                  <TableRow>
                    <TableHead>Parametre</TableHead>
                    <TableHead>Nerede</TableHead>
                    <TableHead>Ne işe yarar</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {QUERY_ROWS.map((row) => (
                    <TableRow key={row.name}>
                      <TableCell>
                        <code>{row.name}</code>
                      </TableCell>
                      <TableCell>{row.who}</TableCell>
                      <TableCell>{row.meaning}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <h3>Özet ne içerir</h3>
            <p>
              Liste <code>view=summary</code> ile gelir. Tek kayıtta varsayılan{" "}
              <code>full</code>’dur. Element özetinde kimlik, sınıflama,
              yerleşim, atom kütlesi, kısa elektron dizilimi, elektronegatiflik,
              hâl, erime/kaynama, yoğunluk ve keşif yılı vardır. Bileşik
              özetinde slug, adlar, CID, molekül formülü, ağırlık,{" "}
              <code>display_formula</code>, <code>composition</code>, kısa
              anlatım ve medya vardır.
            </p>
            <p>
              Liste gövdesi <code>{"{ info, results }"}</code> şeklindedir.{" "}
              <code>info.count</code> eşleşen kayıt sayısıdır;{" "}
              <code>page_size</code> bu sayfanın boyudur.
            </p>

            <h3>English summary</h3>
            <p>
              Open scientific REST: <code>GET /api/v2/elements/fe</code> and{" "}
              <code>/api/v2/compounds/h2o</code>. No account or key. Shape
              responses with <code>view</code>/<code>include</code>/
              <code>fields</code>, search lists with <code>q</code>, follow{" "}
              <code>info.next</code>. Weak ETags (<code>If-None-Match</code>{" "}
              → 304), one-hour cache, missing values are <code>null</code>.
              Rate limit is per host: 300/min on the atlas host (
              <code>:5080</code>), 100/10s behind the gateway (
              <code>:5000</code>). Machine contract:{" "}
              <a href="/openapi.json">/openapi.json</a>. Wallet, orders and
              webhooks are the separate keyed v1 simulation below.
            </p>

            <h3>Hatalar</h3>
            <ul className="check-list">
              <li>
                <code>400</code> · <code>Invalid scientific query</code> —
                bilinmeyen alan, <code>view=everything</code>,{" "}
                <code>pageSize=101</code>, bileşikte <code>block=</code>.
              </li>
              <li>
                <code>404</code> · <code>Scientific record not found</code> —{" "}
                <code>detail</code> sorulan kimliktir.
              </li>
              <li>
                <code>304</code> — gövde yok; ETag tuttu.
              </li>
              <li>
                <code>429</code> — hız sınırı ana bilgisayara göre: atlas (
                <code>:5080</code>) dakikada 300, kapı (<code>:5000</code>) 10
                saniyede 100. Bu tezgâh şu an{" "}
                {scienceDirect ? "atlas" : "kapı"} profilinden okuyor.
              </li>
            </ul>
            <pre className="code-window">
              <code>{`curl -s "${publicApiUrl("/api/v2/elements?fields=not_a_field")}"\ncurl -s "${publicApiUrl("/api/v2/compounds/yok")}"`}</code>
            </pre>

            <h3>Webhooklar (v1, anahtarlı kurulum)</h3>
            <p>
              İki olay: <code>price.updated</code>{" "}
              <code>{"{ Symbol, Price, Timestamp }"}</code> ve{" "}
              <code>order.updated</code>{" "}
              <code>{"{ OrderId, Status, ErrorMessage, TrackingNumber }"}</code>.
              Her POST <code>X-Element-Event</code> başlığı ve gövdenin secret
              ile HMAC-SHA256 imzası (<code>X-Element-Signature</code>, küçük
              harf hex) taşır. URL herkese açık HTTPS olmalı; localhost ve özel
              ağ engellenir. Başarısız gönderim 10 saniye sonra bir kez daha
              denenir. Kurulum <Link to="/account">hesap</Link> sayfasından veya{" "}
              <code>POST /api/v1/webhooks</code>{" "}
              <code>{"{ url, events, secret }"}</code> ile.
            </p>

            <Disclosure id="simulation">
              <DisclosureTrigger>
                <h3>Simülasyon ve hesap · v1</h3>
              </DisclosureTrigger>
              <DisclosureContent>
                <p>
                  Bu ayrı teknik demo tam servis kurulumu gerektirir.{" "}
                  <Link to="/demo">Demo akışını incele</Link>. Bilimsel v2 ile
                  karışmaz.
                </p>
                <ul
                  style={{
                    color: "var(--muted-foreground)",
                    fontSize: 14,
                    lineHeight: 1.6,
                  }}
                >
                  <li>
                    Alış son fiyatın %0,8 üstünde, satış %0,8 altında. Fiyatlar
                    gerçek piyasa verisi değil, kredi simülasyonudur.
                  </li>
                  <li>
                    Alış fiyatı yükseltir, satış düşürür. Tek seferde en fazla
                    %3.
                  </li>
                  <li>
                    Kayıt olunca hesabına 10.000 kredi yüklenir. Sipariş = alış
                    × gram; 402 = yetersiz bakiye (reason{" "}
                    <code>INSUFFICIENT_ELX</code> olabilir).
                  </li>
                  <li>
                    Ekranda para birimi <code>KREDI</code>. JSON alan adları
                    uyumluluk için <code>balanceElx</code>,{" "}
                    <code>avgCostElx</code>, <code>proceedsElx</code> kalır;
                    değerler kredidir. Elrond token’ı değildir.
                  </li>
                  <li>
                    Bileşik fiyatı = ana element alış fiyatı × ürün çarpanı ×
                    gram. Her ürün kasada ayrı tutulur; satışta aynı{" "}
                    <code>compoundSlug</code> gönderilir. 167 eğitim bileşiği
                    otomatik mağaza ürünü olmaz.
                  </li>
                  <li>
                    Tekrar denemelerde aynı UUID değerini{" "}
                    <code>Idempotency-Key</code> başlığıyla gönder. Aynı sipariş
                    tekrar oluşturulmaz.
                  </li>
                  <li>
                    Miktar pozitif bir JSON sayısıdır; en fazla 4 ondalık
                    basamak. 409 = stok yetersiz veya istek anahtarı başka bir
                    siparişte kullanılmış.
                  </li>
                </ul>
                <div style={{ overflowX: "auto", marginTop: 16 }}>
                  <Table className="api-table">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Yol</TableHead>
                        <TableHead>Anahtar</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell>
                          <code>GET /api/v1/elements/au/ticker</code>
                        </TableCell>
                        <TableCell>Yok</TableCell>
                        <TableCell>son fiyat, alış, satış</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>
                          <code>GET /api/v1/market/board</code>
                        </TableCell>
                        <TableCell>Yok</TableCell>
                        <TableCell>118 satır fiyat</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>
                          <code>GET /api/v1/elements/au/history</code>
                        </TableCell>
                        <TableCell>Var</TableCell>
                        <TableCell>fiyat geçmişi</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>
                          <code>GET /api/v1/compounds</code>
                        </TableCell>
                        <TableCell>Yok</TableCell>
                        <TableCell>mağaza SKU listesi</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>
                          <code>POST /api/v1/orders</code>
                        </TableCell>
                        <TableCell>Var</TableCell>
                        <TableCell>{`{ elementSymbol, quantity, compoundSlug? }`}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>
                          <code>GET /api/v1/orders</code>
                        </TableCell>
                        <TableCell>Var</TableCell>
                        <TableCell>sipariş listesi</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>
                          <code>GET /api/v1/orders/:id</code>
                        </TableCell>
                        <TableCell>Var</TableCell>
                        <TableCell>tek sipariş + takip no</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>
                          <code>GET /api/v1/orders/search</code>
                        </TableCell>
                        <TableCell>Var</TableCell>
                        <TableCell>duruma göre ara</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>
                          <code>GET /api/v1/shipments/track/:no</code>
                        </TableCell>
                        <TableCell>Var</TableCell>
                        <TableCell>kargo takibi</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>
                          <code>POST /api/v1/desk/sell</code>
                        </TableCell>
                        <TableCell>Var</TableCell>
                        <TableCell>
                          {`{ symbol, grams, compoundSlug? }`} satış
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>
                          <code>GET /api/v1/me/wallet</code>
                        </TableCell>
                        <TableCell>Var</TableCell>
                        <TableCell>
                          bakiye (<code>balanceElx</code>,{" "}
                          <code>currency: KREDI</code>)
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>
                          <code>GET /api/v1/me/holdings</code>
                        </TableCell>
                        <TableCell>Var</TableCell>
                        <TableCell>
                          ürün, gram ve ortalama maliyet (
                          <code>avgCostElx</code>)
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
                <h3>POST örnekleri</h3>
                <pre className="code-window">
                  <code>{orderExample}</code>
                </pre>
                <pre className="code-window">
                  <code>{sellExample}</code>
                </pre>
              </DisclosureContent>
            </Disclosure>
          </div>
        </Card>

        <aside className="side-stack">
          <Card asChild className="gap-0 py-0 shadow-none">
            <div className="panel">
              <div className="panel-header docs-playground-head">
                <div>
                  <p className="kicker">Canlı</p>
                  <h3 style={{ margin: 0 }}>Dene · Fe veya H₂O</h3>
                </div>
                <WorkshopMarks beat="water" />
              </div>
              <div className="playground">
                <div className="field">
                  <label htmlFor="tryItSelect">GET</label>
                  <NativeSelect
                    id="tryItSelect"
                    value={tryItEndpoint}
                    onChange={(e) => setTryItEndpoint(e.target.value)}
                  >
                    {ENDPOINTS.filter(
                      (e) => ACCOUNTS_ENABLED || e.path.startsWith("/api/v2"),
                    ).map((e) => (
                      <option key={e.path} value={e.path}>
                        {e.label}
                        {e.auth ? " (anahtar)" : ""}
                      </option>
                    ))}
                  </NativeSelect>
                </div>
                <p className="muted" style={{ fontSize: 12 }}>
                  {tryItEndpoint.startsWith("/api/v2")
                    ? "Bilimsel API açıktır; anahtar veya hesap gerekmez."
                    : apiKey
                      ? "Bu oturumun API anahtarı kullanılıyor."
                      : "Bu uç için hesap ayarlarından API anahtarı oluştur."}
                </p>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <Button
                    variant="outline"
                    className="mini-btn"
                    type="button"
                    onClick={() => {
                      setTryItEndpoint(FE);
                      void send(FE);
                    }}
                  >
                    Demir
                  </Button>
                  <Button
                    variant="outline"
                    className="mini-btn"
                    type="button"
                    onClick={() => {
                      setTryItEndpoint(WATER);
                      void send(WATER);
                    }}
                  >
                    Su
                  </Button>
                </div>
                <Button
                  variant="default"
                  onClick={handleTryIt}
                  disabled={isLoading}
                  className="btn primary"
                  style={{ width: "100%" }}
                >
                  {isLoading ? "…" : "İsteği gönder"}
                </Button>
                <Button
                  variant="outline"
                  className="mini-btn"
                  type="button"
                  disabled={!etag || isLoading}
                  onClick={() =>
                    send(tryItEndpoint, { "If-None-Match": etag ?? "" })
                  }
                >
                  Aynı ETag ile sor
                </Button>
                <div
                  style={{
                    display: "flex",
                    gap: 4,
                    borderBottom: "1px solid var(--border)",
                    marginTop: 18,
                  }}
                >
                  {(["curl", "javascript", "python"] as Language[]).map(
                    (lang) => (
                      <Button
                        variant="outline"
                        key={lang}
                        onClick={() => setActiveLang(lang)}
                        className={`mini-btn ${activeLang === lang ? "active" : ""}`}
                      >
                        {lang}
                      </Button>
                    ),
                  )}
                </div>
                <div style={{ position: "relative" }}>
                  <pre className="code-window">
                    <code>{getCodeSnippet(activeLang, tryItEndpoint)}</code>
                  </pre>
                  <Button
                    variant="outline"
                    className="mini-btn"
                    style={{ position: "absolute", top: 8, right: 8 }}
                    onClick={() =>
                      copyToClipboard(getCodeSnippet(activeLang, tryItEndpoint))
                    }
                  >
                    Kopyala
                  </Button>
                </div>
                {httpStatus != null && (
                  <p className="muted" style={{ fontSize: 12 }}>
                    HTTP {httpStatus}
                    {etag ? ` · ${etag}` : ""}
                  </p>
                )}
                <pre
                  className="code-window"
                  style={{ maxHeight: 280, overflow: "auto" }}
                >
                  <code>{JSON.stringify(apiResponse, null, 2)}</code>
                </pre>
              </div>
            </div>
          </Card>
        </aside>
      </section>
    </main>
  );
}
