import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import Seo from "../components/Seo";
import { WorkshopMarks } from "../components/AtlasVisual";
export default function About() {
  return (
    <main className="page explainer-page about-page void-page void-enter">
      <Seo
        title="Hakkında · ElementAPI"
        description="Türkçe kimya atlası: 118 element, 214 bileşik, laboratuvarda su ve tuz, altı rota. Açık bilimsel API; kredi masası ayrı demo."
        path="/hakkinda"
      />
      <div className="explainer">
        <article className="explainer-prose">
          <p className="void-kicker">Ürün</p>
          <h1>Hakkında</h1>
          <p className="lead">
            Periyodik tablo, kaynaklı kayıtlar ve bir tezgâh. Nasıl başlanacağı{" "}
            <Link to="/nasil">el kitabında</Link>; burası ürünün ne olduğunu
            anlatır.
          </p>
          <div className="about-sections void-stagger">
            <section className="about-card void-panel">
              <h2>Atlas ve laboratuvar</h2>
              <p>
                118 hücre, kaynaklı sayılar, 214 bileşik kaydı. Adım adım ilk 10
                dakika <Link to="/nasil">el kitabında</Link>.
              </p>
            </section>
            <section className="about-card void-panel">
              <h2>Kaynağı görünen bilgi</h2>
              <p>
                PubChem, RSC, NIST. Türkçe anlatım editöryeldir. Fotoğrafı olmayan
                element şemaya düşer; bu çoğu zaman lisans, gaz veya sentetik
                demektir, unutulmuş hücre değil.
              </p>
              <p className="about-card-link">
                <Link to="/data">Veri kapsamını ve kaynakları incele</Link>
              </p>
            </section>
            <section className="about-card void-panel">
              <h2>Hesapsız başla</h2>
              <p>
                Atlas, laboratuvar ve bilimsel API herkese açık. Misafir
                defterinin kuralları <Link to="/nasil">el kitabında</Link>.
              </p>
            </section>
            <section className="about-card void-panel">
              <h2>Kablo</h2>
              <p>
                Aynı kayıtlar <code>GET /api/v2/elements/fe</code> ve{" "}
                <code>/compounds/h2o</code> ile okunur. Alan budama, filtre, ETag
                var. Piyasa, sipariş ve kargo ayrı bir kredi simülasyonudur;
                JSON’da hâlâ *Elx alanları görürsün, değer KREDI’dir.
              </p>
              <p className="about-links">
                <Link to="/developers">API ürün özeti</Link>
                <Link to="/docs">API tezgâhı</Link>
                <Link to="/sozluk">Sözlük</Link>
                <Link to="/demo">Kredi simülasyonunu tanı</Link>
              </p>
            </section>
          </div>
        </article>
        <aside className="explainer-aside">
          <div className="def-card void-panel">
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
