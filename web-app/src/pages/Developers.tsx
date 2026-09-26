import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import Seo from "../components/Seo";
import { publicApiUrl } from "../config";
import { highlightJson } from "../lib/highlightJson";

const TERMS_URL =
  "https://github.com/MihrimatriX/element-api/blob/main/docs/API-TERMS.md";
const CHANGELOG_URL =
  "https://github.com/MihrimatriX/element-api/blob/main/docs/API-CHANGELOG.md";

const FE_FIELDS = "/api/v2/elements/fe?fields=symbol,names,classification";
const STATIC_SNIPPET = `{
  "symbol": "Fe",
  "names": { "tr": "Demir", "en": "Iron" },
  "classification": { "category": "transition_metal", "block": "d" }
}`;

export default function Developers() {
  const [snippet, setSnippet] = useState(STATIC_SNIPPET);
  const [live, setLive] = useState(false);
  const [copied, setCopied] = useState(false);
  const feUrl = publicApiUrl(FE_FIELDS);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    fetch(publicApiUrl(FE_FIELDS), { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        setSnippet(JSON.stringify(json, null, 2));
        setLive(true);
      })
      .catch(() => {
        setSnippet(STATIC_SNIPPET);
        setLive(false);
      })
      .finally(() => clearTimeout(timer));
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      /* ignore */
    }
  };

  return (
    <main className="page api-product-page">
      <Seo
        title="API · ElementAPI"
        description="118 element + 214 bileşik, anahtarsız bilimsel API. Alan seçimi, ETag, Türkçe kayıt. Deneme tezgâhı /docs."
        path="/developers"
      />

      <section className="api-hero">
        <h1>ElementAPI API</h1>
        <p className="lead">
          118 element ve 214 bileşik. PubChem, RSC ve NIST kaynaklı Türkçe
          kayıtlar. Hesap yok, anahtar yok; ilk isteği şimdi dene.
        </p>
        <div className="api-hero-cta">
          <Button asChild>
            <Link to="/docs">Deneme tezgâhı</Link>
          </Button>
          <Button asChild variant="outline">
            <a href="/openapi.json">OpenAPI</a>
          </Button>
        </div>
      </section>

      <section className="api-live" aria-label="Canlı örnek">
        <header>
          <h2>Canlı örnek · Demir</h2>
          <p>
            {live
              ? "Aşağıdaki JSON şu an API’den geldi."
              : "Çevrimdışı yedek snippet; gateway ayaktaysa canlı JSON yüklenir."}
          </p>
        </header>
        <pre className="code-window api-live-json">
          <code>{highlightJson(snippet)}</code>
        </pre>
        <div className="api-live-actions">
          <Button type="button" variant="outline" onClick={copy}>
            {copied ? "Kopyalandı" : "JSON’u kopyala"}
          </Button>
          <code className="api-live-url">{`GET ${feUrl}`}</code>
        </div>
      </section>

      <section className="api-abilities">
        <h2>Ne alırsın</h2>
        <dl>
          <div>
            <dt>
              Alan seçimi · <code>fields</code>
            </dt>
            <dd>
              Yalnız ihtiyacın olan yolları çek.{" "}
              <code>view=summary</code> listelerde kısa özet;{" "}
              <code>include</code> üzerine bölüm ekler.
            </dd>
          </div>
          <div>
            <dt>
              Önbellek · ETag / 304
            </dt>
            <dd>
              Zayıf ETag ve <code>Cache-Control: public, max-age=3600</code>. Aynı
              parmak iziyle <code>If-None-Match</code> → 304, gövde yok.
            </dd>
          </div>
          <div>
            <dt>Türkçe editoryal + kaynakça</dt>
            <dd>
              Anlatım Türkçe; sayılar PubChem / RSC / NIST. Eksik değer{" "}
              <code>null</code> kalır — sıfır uydurulmaz.
            </dd>
          </div>
        </dl>
      </section>

      <section className="api-who">
        <h2>Kim için</h2>
        <ul>
          <li>Uygulama, bot veya eklentiye element/bileşik verisi çekenler</li>
          <li>Ders materyaline kaynaklı sayı ve Türkçe anlatım taşıyanlar</li>
          <li>Sözleşme, hız sınırı ve hata gövdelerini inceleyenler</li>
        </ul>
      </section>

      <section className="api-terms">
        <h2>Şartlar (özet)</h2>
        <ul>
          <li>Toplu çekmede sayfala, ETag ile 304 kullan, bir saat önbelleğe al.</li>
          <li>
            Uygulamada görünür kaynak: “Veri: ElementAPI” + bağlantı.
          </li>
          <li>
            v1 cüzdan/sipariş kredi simülasyonudur; gerçek para gibi sunma.
          </li>
        </ul>
        <p>
          Tam metin:{" "}
          <a href={TERMS_URL} target="_blank" rel="noreferrer">
            API-TERMS.md
          </a>
          {" · "}
          <a href={CHANGELOG_URL} target="_blank" rel="noreferrer">
            Değişiklik kaydı
          </a>
        </p>
      </section>

      <section className="api-next">
        <h2>Sonraki adım</h2>
        <p>
          <Link to="/docs">Deneme tezgâhında Fe veya H₂O iste</Link>
          {" · "}
          <Link to="/data">Veri dürüstlüğü ve kapsam</Link>
          {" · "}
          <a href="/schema/elements.schema.json">Element şeması</a>
          {" · "}
          <a href="/schema/compounds.schema.json">Bileşik şeması</a>
        </p>
      </section>
    </main>
  );
}
