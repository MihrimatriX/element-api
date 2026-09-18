import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import Seo from "../components/Seo";
import { WorkshopMarks } from "../components/AtlasVisual";
import { publicApiUrl } from "../config";

const TERMS_URL =
  "https://github.com/MihrimatriX/element-api/blob/main/docs/API-TERMS.md";
const CHANGELOG_URL =
  "https://github.com/MihrimatriX/element-api/blob/main/docs/API-CHANGELOG.md";

export default function Developers() {
  return (
    <main className="page explainer-page">
      <Seo
        title="Geliştiriciler · ElementAPI"
        description="118 element + 167 bileşik, açık bilimsel API: alan seçimi, ETag, hız sınırları, webhooklar, kullanım şartları."
        path="/developers"
      />
      <div className="explainer">
        <article className="explainer-prose">
          <p className="kicker">Geliştiriciler</p>
          <h1>Geliştiriciler</h1>
          <p className="lead">
            Periyodik tabloyu uygulamanın içine al. Hesap yok, anahtar yok;
            ilk istek aşağıda, deneme tezgâhı <Link to="/docs">/docs</Link>
            sayfasında.
          </p>
          <section>
            <h2>Kim için</h2>
            <ul>
              <li>
                <strong>Uygulama geliştirici:</strong> element ve bileşik
                verisini çeken istemci, bot, eklenti.
              </li>
              <li>
                <strong>Öğretmen ve içerik üretici:</strong> ders materyaline
                kaynaklı sayı ve Türkçe anlatım taşıyan.
              </li>
              <li>
                <strong>Teknik değerlendirici:</strong> sözleşmeyi, hız
                sınırını ve hata gövdelerini inceleyen.
              </li>
            </ul>
          </section>
          <section>
            <h2>Ne verir</h2>
            <ul>
              <li>
                118 element + 167 bileşik; Türkçe editoryal anlatım ve
                kaynakça (PubChem, RSC, NIST).
              </li>
              <li>
                Alan projeksiyonu (<code>fields</code>, <code>view</code>,{" "}
                <code>include</code>) ve liste zarfı{" "}
                <code>{"{ info, results }"}</code>.
              </li>
              <li>
                ETag + 304 ve <code>Cache-Control: public, max-age=3600</code>;
                eksik değer <code>null</code> kalır.
              </li>
            </ul>
            <p>
              Sözleşme: <a href="/openapi.json">v2 OpenAPI</a> ·{" "}
              <a href="/schema/elements.schema.json">Element şeması</a> ·{" "}
              <a href="/schema/compounds.schema.json">Bileşik şeması</a> ·{" "}
              <Link to="/data">Veri kapsamı</Link>
            </p>
          </section>
          <section>
            <h2>Hızlı başla</h2>
            <pre className="code-window">
              <code>{`curl -s "${publicApiUrl("/api/v2/elements/fe")}"`}</code>
            </pre>
            <pre className="code-window">
              <code>{`curl -s "${publicApiUrl("/api/v2/compounds/h2o?fields=slug,names,display_formula,composition")}"`}</code>
            </pre>
            <p>
              Hız sınırı ana bilgisayara göre değişir: atlas (
              <code>:5080</code>) dakikada 300, kapı (<code>:5000</code>) 10
              saniyede 100. Ayrıntı <Link to="/docs">/docs</Link> sayfasında.
            </p>
          </section>
          <section>
            <h2>Kullanım şartları (özet)</h2>
            <ul>
              <li>Toplu çekmede sayfala, ETag ile 304 kullan, 1 saat önbelleğe al.</li>
              <li>
                Uygulamanda görünür kaynak göster: “Veri: ElementAPI” + bağlantı.
              </li>
              <li>v1 cüzdan/sipariş bir kredi simülasyonudur; gerçek para gibi sunma.</li>
            </ul>
            <p>
              Tam metin:{" "}
              <a href={TERMS_URL} target="_blank" rel="noreferrer">
                docs/API-TERMS.md
              </a>
            </p>
          </section>
          <section>
            <h2>Değişiklik kaydı</h2>
            <p>
              v2 kayıt şeması eklemeyle büyür; kırıcı değişiklik yeni sürüm
              ister. Son girişler:{" "}
              <a href={CHANGELOG_URL} target="_blank" rel="noreferrer">
                docs/API-CHANGELOG.md
              </a>
            </p>
          </section>
          <section>
            <h2>English summary</h2>
            <p>
              Open scientific REST for 118 elements and 167 compounds. No
              account or key for v2 reads. Project fields with{" "}
              <code>view</code>/<code>include</code>/<code>fields</code>,
              filter lists with <code>q</code>, page with{" "}
              <code>info.next</code>. Responses carry weak ETags (
              <code>If-None-Match</code> → 304) and cache for one hour.
              Missing values are <code>null</code>, never zero. Rate limit
              depends on host: 300/min on the atlas host (
              <code>:5080</code>), 100/10s behind the gateway (
              <code>:5000</code>). Machine contract:{" "}
              <a href="/openapi.json">/openapi.json</a>; interactive
              playground: <Link to="/docs">/docs</Link>. Simulated wallet and
              orders (v1, key required) are credits, not real money.
            </p>
          </section>
        </article>
        <aside className="explainer-aside">
          <div className="def-card">
            <p className="kicker">İlk istek</p>
            <WorkshopMarks beat="quartz" />
            <h2>Demiri oku</h2>
            <p>
              Tek satır, anahtarsız. Yanıt gelirse istemcin hazır; gelmezse
              adresi değil ana bilgisayarı kontrol et.
            </p>
            <pre className="code-window">
              <code>{`curl -s "${publicApiUrl("/api/v2/elements/fe?fields=symbol,names")}"`}</code>
            </pre>
            <Button asChild variant="default">
              <Link className="btn primary" to="/docs">
                Tezgâhta dene
              </Link>
            </Button>
            <p>
              <Link to="/sozluk">Sözlük</Link>
            </p>
          </div>
        </aside>
      </div>
    </main>
  );
}
