import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { SCIENCE_BASE_URL } from "../config";
import Seo from "../components/Seo";
const steps = [
  [
    "Bir elementle başla",
    "Tabloda Türkçe ad, İngilizce ad, sembol veya atom numarası ara. Element kartını açarak özelliklerini ve kaynaklarını incele.",
  ],
  [
    "İlk bileşiğini keşfet",
    "Laboratuvarda hidrojen ve oksijeni seç, Birleştir düğmesine bas. Bu bir keşif oyunu: kart seçimi gerçek deney koşullarını ya da bir reaksiyon denklemini temsil etmez.",
  ],
  [
    "Bir öğrenme rotasını izle",
    "Koleksiyonum sayfasından Günlük maddeler, Tuzlar veya Oksitler rotasını seç. Gereken üç bileşiği bulduğunda kısa değerlendirme sorusu açılır.",
  ],
  [
    "Keşfini ayrıntılandır",
    "Bulduğun bileşiğin formülüne, hangi elementlerden oluştuğuna ve kullanım alanlarına bak. Yeni elementlerin kilidini açarak başka birleşimleri dene.",
  ],
  [
    "İlerlemeni koru",
    "Misafir kayıtları bu tarayıcıda kalır; tarayıcı verilerini silmek onları da kaldırır. Koleksiyonunu JSON olarak indirebilirsin. Hesaplar açık kurulumlarda giriş yapıp cihazlar arasında eşitleyebilirsin.",
  ],
];
export default function Guide() {
  return (
    <main className="page explainer-page">
      <Seo
        title="Rehber · ElementAPI"
        description="İlk bileşiğini keşfet, öğrenme rotasını tamamla ve koleksiyonunu oluştur."
        path="/nasil"
      />
      <div className="explainer">
        <article className="explainer-prose">
          <p className="kicker">Rehber</p>
          <h1>Kullanım rehberi</h1>
          <p className="lead">
            Hesap açmadan başlayabilirsin. İlk hedef: suyu keşfet ve onun
            formülünü öğren.
          </p>
          <ol className="process">
            {steps.map(([title, body], i) => (
              <li key={title}>
                <span className="process-n" aria-hidden="true">
                  {i + 1}
                </span>
                <div>
                  <h2>{title}</h2>
                  <p>{body}</p>
                </div>
              </li>
            ))}
          </ol>
          <h2>Aynı veriyi kodla keşfet</h2>
          <pre className="code-window explainer-code">
            <code>
              {'curl -s "' +
                SCIENCE_BASE_URL +
                '/elements/fe?view=summary&include=provenance"'}
            </code>
          </pre>
          <p>
            <Link to="/docs">API örnekleri</Link> ·{" "}
            <Link to="/data">Kaynaklar ve veri kapsamı</Link>
          </p>
        </article>
        <aside className="explainer-aside">
          <div className="def-card">
            <p className="kicker">Devam noktası</p>
            <h2>Kaldığın yerden devam et</h2>
            <p>
              Tamamlanan rotaları, kalan keşifleri ve açılan bileşikleri aynı
              yerde bul.
            </p>
            <Button asChild variant="default">
              <Link className="btn primary" to="/collection">
                Koleksiyonum
              </Link>
            </Button>
            <p>
              <Link to="/lab?lesson=everyday">İlk keşfe başla</Link>
            </p>
          </div>
        </aside>
      </div>
    </main>
  );
}
