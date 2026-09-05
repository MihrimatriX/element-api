import { Link } from 'react-router-dom';
import { getPublicSiteUrl } from '../config';
import Seo from '../components/Seo';

export default function About() {
  const origin = getPublicSiteUrl();
  const desc = 'ElementAPI; elementleri, izotopları ve bileşikleri kaynaklarıyla keşfedebileceğiniz herkese açık bilimsel katalogdur.';

  return (
    <main className="page explainer-page">
      <Seo
        title="Hakkında · Element API"
        description={desc}
        path="/hakkinda"
        jsonLd={{
          '@type': 'Organization',
          name: 'ElementAPI',
          url: origin,
          description: desc
        }}
      />

      <div className="explainer">
        <article className="explainer-prose">
          <p className="kicker">Hakkında</p>
          <h1>Kimyasal kaydı herkese açık bir katalog.</h1>
          <p className="lead">
            ElementAPI, 118 elementi ve bileşikleri kaynaklarıyla bir araya getirir.
            Periyodik tabloda gezin, atomik özellikleri inceleyin, aynı veriyi kendi projenizde kullanın.
            Bilimsel kataloğun tamamı hesap açmadan okunabilir.
          </p>

          <section>
            <h2>Element verisi</h2>
            <p>
              Atomik, termodinamik ve mekanik özellikler, izotoplar ve kaynak bağlantıları
              aynı kayıtta bulunur. <code>GET /api/v2/elements/fe</code> ile tam kaydı alın;
              yalnız gereken alanlar için <code>fields</code> kullanın. PubChem, RSC ve NIST
              kaynaklarının sağlamadığı değerler açıkça eksik gösterilir.
            </p>
          </section>

          <section>
            <h2>Fiyat</h2>
            <p>
              Her elementin gram başına alış ve satış fiyatı vardır. Alış, senin ödeyeceğin
              fiyattır. Satış, elindeki gramı geri verdiğinde hesabına yazılacak fiyattır.
              Fiyat değişir; Piyasa sayfasında canlı görünür.
            </p>
          </section>

          <section>
            <h2>Mağazada bileşik</h2>
            <p>
              Mağazada saf elementler, bileşikler ve preparatlar sanal Kredi ile alınır.
              Ana elementin alış fiyatına göre tutar çıkar; gram seçip alırsın. İstersen
              Piyasa’dan geri satarsın.
            </p>
          </section>

          <section>
            <h2>Kimler için</h2>
            <ul className="explainer-list">
              <li>
                <strong>Öğrenci.</strong> Tabloyu aç, bir elemente tıkla, kaydı oku.
                Ölçüm koşullarını ve kaynakları da incele.
              </li>
              <li>
                <strong>Geliştirici.</strong> HTTP ile aynı veriyi çek. Anahtar isteyen
                uçlar hesap açınca gelir.
              </li>
              <li>
                <strong>Meraklı.</strong> Bir sembolden başlayıp elementin özelliklerine,
                izotoplarına ve bileşiklerin dünyasına geç. Keşfetmek için hesap gerekmez.
              </li>
            </ul>
          </section>
        </article>

        <aside className="explainer-aside">
          <div className="def-card">
            <p className="kicker">Kısa not</p>
            <h2>Banka değil</h2>
            <p>
              Kredi uygulamanın deneme bakiyesidir. Gerçek para değil. Burada hesap açmak
              yatırım, kumar veya ödeme sistemi değildir.
            </p>
            <p>
              Sözler takılırsa <Link to="/sozluk">sözlüğe</Link> bak.
              Adımlar için <Link to="/nasil">rehber</Link>.
            </p>
          </div>
        </aside>
      </div>
    </main>
  );
}
