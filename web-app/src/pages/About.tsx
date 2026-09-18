import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import Seo from "../components/Seo";
import { WorkshopMarks } from "../components/AtlasVisual";
export default function About() {
  return (
    <main className="page explainer-page">
      <Seo
        title="Hakkında · ElementAPI"
        description="Türkçe kimya atlası: 118 element, 167 bileşik, laboratuvarda su ve tuz, altı rota. Açık bilimsel API; kredi masası ayrı demo."
        path="/hakkinda"
      />
      <div className="explainer">
        <article className="explainer-prose">
          <p className="kicker">Hakkında</p>
          <h1>Hakkında</h1>
          <p className="lead">
            Periyodik tablo, kaynaklı kayıtlar ve bir tezgâh. Nasıl
            başlanacağı <Link to="/nasil">el kitabında</Link>; burası
            ürünün ne olduğunu anlatır.
          </p>
          <section>
            <h2>Atlas ve laboratuvar</h2>
            <p>
              118 hücre, kaynaklı sayılar, 167 bileşik kaydı. Adım adım
              ilk 10 dakika <Link to="/nasil">el kitabında</Link>.
            </p>
          </section>
          <section>
            <h2>Kaynağı görünen bilgi</h2>
            <p>
              PubChem, RSC, NIST. Türkçe anlatım editöryeldir. Fotoğrafı olmayan
              element şemaya düşer; bu çoğu zaman lisans, gaz veya sentetik
              demektir, unutulmuş hücre değil.
            </p>
            <Link to="/data">Veri kapsamını ve kaynakları incele</Link>
          </section>
          <section>
            <h2>Hesapsız başla</h2>
            <p>
              Atlas, laboratuvar ve bilimsel API herkese açık. Misafir
              defterinin kuralları <Link to="/nasil">el kitabında</Link>.
            </p>
          </section>
          <section>
            <h2>Kablo</h2>
            <p>
              Aynı kayıtlar <code>GET /api/v2/elements/fe</code> ve{" "}
              <code>/compounds/h2o</code> ile okunur. Alan budama, filtre, ETag
              var. Piyasa, sipariş ve kargo ayrı bir kredi simülasyonudur; JSON’da
              hâlâ *Elx alanları görürsün, değer KREDI’dir.
            </p>
            <p>
              <Link to="/docs">API tezgâhı</Link> ·{" "}
              <Link to="/sozluk">Sözlük</Link> ·{" "}
              <Link to="/demo">Simülasyonu tanı</Link>
            </p>
          </section>
        </article>
        <aside className="explainer-aside">
          <div className="def-card">
            <p className="kicker">İlk keşif</p>
            <WorkshopMarks beat="water" />
            <h2>İki H, bir O</h2>
            <p>
              Suyun tarifi ve ilk rotan <Link to="/nasil">el kitabında</Link>;
              tezgâh bir tık ötede.
            </p>
            <Button asChild variant="default">
              <Link className="btn primary" to="/lab?lesson=everyday">
                Laboratuvara git
              </Link>
            </Button>
            <p>
              <Link to="/nasil">El kitabı</Link>
            </p>
          </div>
        </aside>
      </div>
    </main>
  );
}
