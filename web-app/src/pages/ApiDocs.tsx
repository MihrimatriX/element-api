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
import { readStorage } from "../services/session";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  API_ORIGIN,
  SCIENCE_BASE_URL,
  ACCOUNTS_ENABLED,
  getPublicSiteUrl,
  pagePath,
} from "../config";
import { useSelectedElement } from "../App";
import Seo from "../components/Seo";

const endpointUrl = (path: string) =>
  path.startsWith("/api/v2")
    ? SCIENCE_BASE_URL + path.slice(7)
    : API_ORIGIN + path;

type Language = "curl" | "javascript" | "python";

const ENDPOINTS = [
  {
    path: "/api/v2/elements/fe?fields=symbol,names,editorial,media,external_links",
    auth: false,
    label: "GET Demir · anlatım ve görseller",
  },
  {
    path: "/api/v2/compounds/nacl?fields=display_formula,composition,editorial,media",
    auth: false,
    label: "GET NaCl · formül ve element bileşimi",
  },
  {
    path: "/api/v2/elements/fe",
    auth: false,
    label: "GET Demir · tam bilimsel kayıt",
  },
  {
    path: "/api/v2/elements?view=summary&pageSize=100",
    auth: false,
    label: "GET Elementler · özet",
  },
  {
    path: "/api/v2/elements/fe?fields=symbol,names,atomic_properties.radii_pm",
    auth: false,
    label: "GET Demir · alan seçimi",
  },
  {
    path: "/api/v2/elements/fe?view=summary&include=isotopes,provenance",
    auth: false,
    label: "GET Demir · izotopları ekle",
  },
  {
    path: "/api/v2/compounds/aspirin",
    auth: false,
    label: "GET Aspirin · tam bilimsel kayıt",
  },
  { path: "/api/v1/elements/au", auth: false, label: "GET Au" },
  { path: "/api/v1/elements/au/ticker", auth: false, label: "GET ticker" },
  { path: "/api/v1/market/movers", auth: false, label: "GET movers" },
  { path: "/api/v1/market/board", auth: false, label: "GET board" },
  { path: "/api/v1/compounds?element=au", auth: false, label: "GET compounds" },
  {
    path: "/api/v1/compounds/h2o",
    auth: false,
    label: "GET bileşik özellikleri",
  },
  {
    path: "/api/v1/elements/au/history?limit=5",
    auth: true,
    label: "GET history",
  },
  { path: "/api/v1/me/wallet", auth: true, label: "GET wallet" },
  { path: "/api/v1/orders", auth: true, label: "GET orders" },
];

export default function ApiDocs() {
  const { selectedSymbol } = useSelectedElement();
  const [activeLang, setActiveLang] = useState<Language>("curl");
  const [tryItEndpoint, setTryItEndpoint] = useState("/api/v2/elements/fe");
  const [apiResponse, setApiResponse] = useState<unknown>({ loading: true });
  const [isLoading, setIsLoading] = useState(false);
  const apiKey = typeof window !== "undefined" ? readStorage("apiKey") : null;

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    fetch(`${SCIENCE_BASE_URL}/elements/fe`, { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
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
    const fullUrl = endpointUrl(endpoint);
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

  const handleTryIt = async () => {
    track("api_example_run");
    setIsLoading(true);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    try {
      const response = await fetch(endpointUrl(tryItEndpoint), {
        headers: tryItEndpoint.startsWith("/api/v2") ? {} : headers,
        signal: controller.signal,
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setApiResponse(
          data ?? { error: `HTTP ${response.status}`, status: response.status },
        );
      } else {
        setApiResponse(data);
      }
    } catch (error: unknown) {
      const err = error as { message?: string };
      setApiResponse({ error: err.message });
    } finally {
      clearTimeout(timer);
      setIsLoading(false);
    }
  };

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

  return (
    <main className="page api-docs-page">
      <Seo
        title="API · ElementAPI"
        description="118 element ve kaynaklı bileşikler için herkese açık bilimsel REST API. Alan seçimi, izotoplar ve kaynaklar."
        path={pagePath("/docs", selectedSymbol)}
        jsonLd={{
          "@type": "WebAPI",
          name: "ElementAPI",
          url: `${origin}/docs`,
          documentation: `${origin}/docs`,
          description:
            "Element bilgisi ve fiyatı için HTTP API. Fiyat herkese açık; cüzdan, sipariş ve satış API anahtarı ister.",
          provider: {
            "@type": "Organization",
            name: "ElementAPI",
            url: origin,
          },
        }}
      />
      <section className="hero compact" style={{ marginBottom: 34 }}>
        <div>
          <p className="kicker">Geliştirici</p>
          <h1>API</h1>
          <p className="lead">
            Bilimsel katalog herkese açık; hesap veya API anahtarı gerekmez.
            Cüzdan, sipariş ve satış için <code>X-API-Key</code> gerekir.
            Kaynaklar ve kullanım kapsamı <Link to="/hakkinda">Hakkında</Link>{" "}
            sayfasında.
          </p>
        </div>
      </section>

      <section className="screen-grid">
        <Card asChild className="gap-0 py-0 shadow-none">
          <div className="panel padded">
            <p className="kicker">Sözleşme</p>
            <h2>Ne çağırırsın</h2>
            <h3>Bilimsel katalog · v2</h3>
            <p>
              Tam kayıt şemaları:{" "}
              <a href="/schema/elements.schema.json">Element JSON Schema</a> ·{" "}
              <a href="/schema/compounds.schema.json">Bileşik JSON Schema</a>.
              Bunlar bu veri sürümünün tam kayıtlarını tanımlar; alan seçimi
              yanıtları bazı alanları içermez.{" "}
              <Link to="/data">Veri kapsamı</Link>.
            </p>
            <p>
              Elementlerde atomik, termodinamik, mekanik, elektromanyetik,
              kristal yapı, bolluk, tarihçe ve izotop bölümleri; bileşiklerde
              moleküler özellikler, kaynaklı deneyler, güvenlik ve farmakoloji
              bulunur. Kaynağı olmayan değerler <code>null</code> kalır.
            </p>
            <ul className="check-list">
              <li>
                <code>GET /api/v2/elements/fe</code> veya <code>/26</code>: tam
                element kaydı.
              </li>
              <li>
                <code>GET /api/v2/compounds/aspirin</code> veya{" "}
                <code>/2244</code>: bileşik kaydı.
              </li>
              <li>
                <code>view=summary</code>: hafif özet; listelerin varsayılanı.{" "}
                <code>view=full</code>: tüm bölümler.
              </li>
              <li>
                <code>include=isotopes,provenance</code>: özete bölüm ekler.
              </li>
              <li>
                <code>fields=symbol,names,atomic_properties.radii_pm</code>:
                yalnız seçilen alanları döndürür; view ve include üzerinde
                önceliklidir.
              </li>
              <li>
                <code>q</code> ile Türkçe/İngilizce ad, sembol, numara veya
                formül ara. Elementlerde{" "}
                <code>category,block,group,period</code> filtreleri birleşir.
              </li>
              <li>
                <code>page</code> ve <code>pageSize</code> (1–100); devam
                bağlantıları tüm filtreleri korur.
              </li>
              <li>
                Bilinmeyen alan/geçersiz sayfalama <code>400</code>, olmayan
                kayıt <code>404</code> döner. Diziler bütün olarak seçilir.
              </li>
              <li>
                <code>ETag / If-None-Match</code>, bir saatlik ortak önbellek ve
                gzip/Brotli desteklenir. Bilimsel GET uçları tüm web
                originlerine açıktır.
              </li>
            </ul>
            <Disclosure id="simulation">
              <DisclosureTrigger>
                <h3>Simülasyon ve hesap · v1</h3>
              </DisclosureTrigger>
              <DisclosureContent>
                <p>
                  Bu ayrı teknik demo tam servis kurulumu gerektirir.{" "}
                  <Link to="/demo">Demo akışını incele</Link>.
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
                    Para birimi kodu <code>KREDI</code>. JSON alan adları
                    uyumluluk için <code>balanceElx</code>,{" "}
                    <code>avgCostElx</code>, <code>proceedsElx</code> kalır;
                    değerler kredidir.
                  </li>
                  <li>
                    Bileşik fiyatı = ana element alış fiyatı × ürün çarpanı ×
                    gram. Her ürün kasada ayrı tutulur; satışta aynı{" "}
                    <code>compoundSlug</code> gönderilir.
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
                  <li>
                    Elementlerde kütle: u; yoğunluk: g/cm³; sıcaklık: K.
                    Bileşiklerde <code>properties</code>, PubChem kimliği,
                    kaynak bağlantısı ve alınma tarihini içerir.
                    Karışım/preparat için molekül verisi <code>null</code>{" "}
                    olabilir.
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
                        <TableCell>bileşikler</TableCell>
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
              <div className="panel-header">
                <div>
                  <p className="kicker">Canlı</p>
                  <h3 style={{ margin: 0 }}>Dene</h3>
                </div>
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
                <Button
                  variant="default"
                  onClick={handleTryIt}
                  disabled={isLoading}
                  className="btn primary"
                  style={{ width: "100%" }}
                >
                  {isLoading ? "…" : "İsteği gönder"}
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
