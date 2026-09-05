import { Link } from 'react-router-dom';
import Seo from '../components/Seo';

const TERMS = [
  {
    term: 'Element',
    def: 'Periyodik tablodaki bir madde. Altın (Au), gümüş (Ag), demir (Fe) gibi. Her birinin numarası, adı ve kaydı vardır.'
  },
  {
    term: 'Bileşik',
    def: 'Birden fazla elementin bir araya geldiği ürün. Mağazada satılan şey çoğunlukla budur; saf külçe değil.'
  },
  {
    term: 'kredi',
    def: 'Uygulamanın para birimi. Kayıtta 10.000 kredi gelir. Gerçek para değil. Bankadan çekilmez, karta yatmaz.'
  },
  {
    term: 'Alış fiyatı',
    def: 'Senin ödeyeceğin fiyat. Mağazada gram alırken bu tutar kullanılır. Birim: gram başına kredi.'
  },
  {
    term: 'Satış fiyatı',
    def: 'Elindeki gramı geri verdiğinde hesabına yazılacak fiyat. Alıştan biraz düşüktür. Birim: gram başına kredi.'
  },
  {
    term: 'Gram',
    def: 'Miktar birimi. Fiyat her zaman 1 gram içindir. Mağazada paket olarak 1, 10 veya 100 gram seçilir.'
  },
  {
    term: 'API anahtarı',
    def: 'Hesabına bağlı kısa bir kod. Fiyatı okumak için gerekmez. Cüzdan, sipariş ve satış için istek başlığına yazılır.'
  }
];

export default function Glossary() {
  return (
    <main className="page explainer-page">
      <Seo
        title="Sözlük · Element API"
        description="Element, bileşik, kredi, alış fiyatı, satış fiyatı, gram ve API anahtarı. Kısa tanımlar."
        path="/sozluk"
      />

      <div className="explainer">
        <article className="explainer-prose">
          <p className="kicker">Sözlük</p>
          <h1>Bu sözler ne demek.</h1>
          <p className="lead">
            Sayfada geçen yedi söz. Kısa cümlelerle, günlük dilde.
          </p>

          <dl className="glossary">
            {TERMS.map((item) => (
              <div key={item.term} className="glossary-row">
                <dt>{item.term}</dt>
                <dd>{item.def}</dd>
              </div>
            ))}
          </dl>
        </article>

        <aside className="explainer-aside">
          <div className="def-card">
            <p className="kicker">Üç satır</p>
            <h2>Ne yapıyorsun</h2>
            <p>
              Katalogdan elementi oku. Fiyatı gör. İstersen bileşik al, istersen geri sat.
              Kredi uygulamanın deneme bakiyesidir. Gerçek para değil.
            </p>
            <p>
              Sıra için <Link to="/nasil">rehber</Link>.
              Kurum için <Link to="/hakkinda">hakkında</Link>.
            </p>
          </div>
        </aside>
      </div>
    </main>
  );
}
