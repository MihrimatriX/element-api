import { Link } from 'react-router-dom';
import { API_ORIGIN } from '../config';
import Seo from '../components/Seo';

const STEPS = [
  {
    title: 'Bir elementle başla',
    body: 'Ana sayfadaki tabloda Türkçe veya İngilizce ad, sembol ya da atom numarası ara. Kategori filtreleri birlikte çalışır; telefonda liste görünümünü de kullanabilirsin.'
  },
  {
    title: 'Özellikleri ve kaynakları incele',
    body: 'Elemente tıkla; atomik yapı, termodinamik, mekanik özellikler ve izotoplara geç. Eksik alanları gösterebilir, kaynağı açabilir veya JSON kaydını indirebilirsin.'
  },
  {
    title: 'Bileşikleri keşfet',
    body: 'Bileşikler sayfasında ad, molekül formülü veya PubChem CID ile ara. Moleküler tanımlayıcıları, fiziksel deneyleri ve kaynaklı güvenlik bilgilerini birlikte incele.'
  },
  {
    title: 'Veriyi kendi projende kullan',
    body: 'Bilimsel v2 API hesap veya anahtar istemez. view=summary ile küçük bir yanıt, include ile ek bölümler, fields ile yalnız ihtiyacın olan alanları al.'
  },
  {
    title: 'İstersen simülasyona katıl',
    body: 'Piyasa ve Mağaza sanal Kredi ile çalışan ayrı bir deneme alanıdır. Alım ve satım için hesap gerekir; gerçek ödeme veya fiziksel gönderim yapılmaz.'
  }
];

export default function Guide() {
  const sample = `curl -s "${API_ORIGIN}/api/v2/elements/fe?view=summary&include=isotopes"`;

  return (
    <main className="page explainer-page">
      <Seo
        title="Rehber · Element API"
        description="Periyodik tablo, element özellikleri, bileşikler ve açık bilimsel API. ElementAPI nasıl kullanılır."
        path="/nasil"
      />

      <div className="explainer">
        <article className="explainer-prose">
          <p className="kicker">Rehber</p>
          <h1>Merak ettiğin yerden başla.</h1>
          <p className="lead">
            Önce bak, sonra dene. Gezmek için hesap gerekmez. Almak ve satmak için kayıt yeter.
          </p>

          <ol className="process">
            {STEPS.map((step, i) => (
              <li key={step.title}>
                <span className="process-n" aria-hidden="true">{i + 1}</span>
                <div>
                  <h2>{step.title}</h2>
                  <p>{step.body}</p>
                </div>
              </li>
            ))}
          </ol>

          <pre className="code-window explainer-code"><code>{sample}</code></pre>
          <p className="muted">
            Uçların tam listesi <Link to="/docs">API dokümantasyonunda</Link>.
          </p>
        </article>

        <aside className="explainer-aside">
          <div className="def-card">
            <p className="kicker">Gram</p>
            <h2>Ne kadar alıyorsun</h2>
            <p>
              Fiyat gram başınadır. Mağazada 1, 10 veya 100 gramlık paket seçersin.
              Kredi uygulamanın deneme bakiyesidir. Gerçek para değil.
            </p>
            <p>
              Kelimeler için <Link to="/sozluk">sözlük</Link>.
              Ne olduğu için <Link to="/hakkinda">hakkında</Link>.
            </p>
          </div>
        </aside>
      </div>
    </main>
  );
}
