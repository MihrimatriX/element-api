import { Card } from "@/components/ui/card";
import Seo from "../components/Seo";
import { Link } from "react-router-dom";
import coverage from "../data/coverage.json";
const sectionLabels: Record<string, string> = {
  electromagnetic_and_optical: "Elektromanyetik ve optik özellikler",
  crystallography: "Kristal yapı",
  abundance: "Doğada bulunma",
};
export default function DataCoverage() {
  return (
    <main className="science-detail">
      <Seo
        title="Kaynaklar ve veri kapsamı · ElementAPI"
        description="Bilimsel verinin kaynakları, kapsamı ve eksik değerlerin anlamı."
        path="/data"
      />
      <p className="science-eyebrow">BİLGİNİN DAYANAĞI</p>
      <h1>Kaynaklar ve veri kapsamı</h1>
      <p className="lead">
        {coverage.elements} element ve {coverage.compounds} bileşik için
        kaynaklı kayıtlar. Türkçe açıklamalar editöryeldir; sayısal değerler ve
        ölçüm koşulları kendi kaynaklarıyla gösterilir.
      </p>
      <div className="learning-grid">
        <Card asChild className="gap-0 py-5 max-md:py-3 shadow-none">
          <article className="learning-card">
            <h2>Eksik, sıfır değildir</h2>
            <p>
              “Veri yok”, bu veri sürümünde doğrulanmış bir değerin
              bulunmadığını anlatır. Maddenin o özelliğe sahip olmadığı anlamına
              gelmez.
            </p>
          </article>
        </Card>
        <Card asChild className="gap-0 py-5 max-md:py-3 shadow-none">
          <article className="learning-card">
            <h2>Ölçümün koşulları</h2>
            <p>
              Sıcaklık, basınç ve saflık sonuçları değiştirebilir. Farklı
              deneyler tek bir kesin değere indirgenmez. Kaynak bağlantılarını
              ayrıntı sayfasında bulabilirsin.
            </p>
          </article>
        </Card>
        <Card asChild className="gap-0 py-5 max-md:py-3 shadow-none">
          <article className="learning-card">
            <h2>Şema ve içerik</h2>
            <p>
              Bu sürümde {coverage.unavailableElementSections.length} element
              bölümü tamamen boş. API şemasında alanlar korunur; arayüz bunları
              varsayılan olarak gizler.
            </p>
          </article>
        </Card>
      </div>
      <h2>Bu sürüm</h2>
      <dl className="coverage-facts">
        <div>
          <dt>Veri alım tarihi</dt>
          <dd>{coverage.retrievedAt}</dd>
        </div>
        <div>
          <dt>Türkçe anlatım</dt>
          <dd>{coverage.editorial} kayıt</dd>
        </div>
        <div>
          <dt>Element fotoğrafı</dt>
          <dd>
            {coverage.photos} / {coverage.elements}
          </dd>
        </div>
        <div>
          <dt>Bileşik yapı görseli</dt>
          <dd>
            {coverage.structures} / {coverage.compounds}
          </dd>
        </div>
      </dl>
      <h2>Henüz doldurulmamış bölümler</h2>
      <ul>
        {coverage.unavailableElementSections.map((section) => (
          <li key={section}>{sectionLabels[section] ?? section}</li>
        ))}
      </ul>
      <h2>Kaynaklar</h2>
      <ul>
        <li>
          <a
            href="https://pubchem.ncbi.nlm.nih.gov/periodic-table/"
            target="_blank"
            rel="noreferrer"
          >
            PubChem — element ve bileşik verileri
          </a>
        </li>
        <li>
          <a
            href="https://periodic-table.rsc.org/"
            target="_blank"
            rel="noreferrer"
          >
            Royal Society of Chemistry — element özellikleri
          </a>
        </li>
        <li>
          <a
            href="https://physics.nist.gov/PhysRefData/Compositions/"
            target="_blank"
            rel="noreferrer"
          >
            NIST — referans izotop bileşimleri
          </a>
        </li>
      </ul>
      <p>
        Fotoğrafların kaynağı, üreticisi ve lisansı görselin yanında gösterilir.
        Her element için fotoğraf bulunması beklenmez; şemalar fotoğrafın yerine
        bilimsel ölçüm gibi sunulmaz.
      </p>
      <p>
        <Link to="/docs">API'de kaynak ve alan seçimi</Link> ·{" "}
        <Link to="/hakkinda">Ürün hakkında</Link>
      </p>
    </main>
  );
}
