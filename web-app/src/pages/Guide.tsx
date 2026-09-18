import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { publicApiUrl } from "../config";
import Seo from "../components/Seo";
import { WorkshopMarks } from "../components/AtlasVisual";

const steps: {
  title: string;
  body: string;
  links: { to: string; label: string }[];
}[] = [
  {
    title: "Demir'i bul",
    body: "Atlas'ta Fe, Demir veya 26 yaz. Kaynağını oku. Fotoğraf yoksa şema var; boş hücre çoğu zaman bilinçli bir lisans veya gaz kararı.",
    links: [{ to: "/element/fe", label: "Fe kaydını aç" }],
  },
  {
    title: "Suyu kur",
    body: "Laboratuvarda hidrojeni iki kez, oksijeni bir kez seç, Birleştir. HO su değildir; sayı tutmazsa kart açılmaz.",
    links: [{ to: "/lab?lesson=everyday", label: "İki H, bir O" }],
  },
  {
    title: "İlk rotayı bitir",
    body: "Defterinde altı rota var. Günlük maddeler su, karbondioksit, amonyak ister. Keşifler dolunca soru açılır.",
    links: [{ to: "/collection", label: "Defterime git" }],
  },
  {
    title: "Formülü kur, Dedektifi oyna",
    body: "Adı verilen kaydın atom sayılarını bas; ipuçlarından elementi bul. Skorlar ayrı kutudadır, keşif defterine yazılmaz.",
    links: [
      { to: "/lab/formula?compound=nacl", label: "Tuzla başla" },
      { to: "/lab/detective", label: "Dedektifi aç" },
    ],
  },
  {
    title: "Defteri yedekle",
    body: "Misafir kayıtları yalnız bu tarayıcıda. JSON indir, aynı dosyayı geri yükle. Hesap açarsan defter cihazlar arası eşitlenir.",
    links: [
      { to: "/collection", label: "Dosyamı indir" },
      { to: "/register?returnTo=/collection", label: "Hesap aç" },
    ],
  },
  {
    title: "İstersen pazara geç",
    body: "Bilim bitti, simülasyon başlar: 10.000 sanal kredi, Fe gramı, alış-satış farkı. Gerçek para yok; keşif defterin değişmez.",
    links: [
      { to: "/demo", label: "Simülasyonu tanı" },
      { to: "/market", label: "Fiyat tablosu" },
    ],
  },
];

const faq: [string, string][] = [
  [
    "HO neden su değil?",
    "Su iki hidrojen, bir oksijen ister. Bir H bir O kataloğumuzda yok; laboratuvarda Birleştir boş döner. Sayı tutmalı, adı benzemek yetmez.",
  ],
  [
    "Misafir verim ne zaman silinir?",
    "Tarayıcı verisini silersen veya JSON yedeğin yoksa gider. Hesap açıp defterini taşımadıkça kayıtlar yalnız bu cihazda durur.",
  ],
  [
    "5080 ile 3000'in farkı ne?",
    "5080 yalnız bilim kataloğunu sunar; hesap kapalıdır. 3000 hesap, cüzdan ve mağazayı da açan tam yığının kapısıdır.",
  ],
  [
    "API çalışmazsa ne olur?",
    "Tablo gömülü kayıtlarla açılır, ayrıntı sayfası yeniden denemeni ister. Keşiflerin tarayıcıda durur; kaybolmaz.",
  ],
  [
    "Oyun skorları deftere yazılır mı?",
    "Hayır. Formülü kur ve Dedektif skorları ayrı kutudadır. Giriş yaptıysan Sıfırla düğmesi görünmez; sunucudaki defterin korunur.",
  ],
];

export default function Guide() {
  return (
    <main className="page explainer-page">
      <Seo
        title="El kitabı · ElementAPI"
        description="İlk 10 dakika: Demir'i bul, suyu kur, ilk rotayı bitir, Formülü kur ve Dedektifi oyna, defteri yedekle."
        path="/nasil"
      />
      <div className="explainer">
        <article className="explainer-prose">
          <p className="kicker">El kitabı</p>
          <h1>İlk 10 dakika</h1>
          <p className="lead">
            Atlas'ta bul, laboratuvarda kur, defterde biriktir. İstersen
            pazarda dene. Hesap şart değil.
          </p>
          <ol className="process">
            {steps.map((step, i) => (
              <li key={step.title}>
                <span className="process-n" aria-hidden="true">
                  {i + 1}
                </span>
                <div>
                  <h2>{step.title}</h2>
                  <p>{step.body}</p>
                  <p>
                    {step.links.map((link, j) => (
                      <span key={link.to}>
                        {j > 0 && " · "}
                        <Link to={link.to}>{link.label}</Link>
                      </span>
                    ))}
                  </p>
                </div>
              </li>
            ))}
          </ol>
          <h2>Sık sorulanlar</h2>
          {faq.map(([q, a]) => (
            <section key={q}>
              <h3>{q}</h3>
              <p>{a}</p>
            </section>
          ))}
          <h2>Aynı kaydı kabloyla</h2>
          <pre className="code-window explainer-code">
            <code>
              {'curl -s "' +
                publicApiUrl(
                  "/api/v2/elements/fe?fields=symbol,names,editorial.summary",
                ) +
                '"'}
            </code>
          </pre>
          <pre className="code-window explainer-code">
            <code>
              {'curl -s "' +
                publicApiUrl(
                  "/api/v2/compounds/h2o?fields=slug,names,display_formula,composition",
                ) +
                '"'}
            </code>
          </pre>
          <p>
            <Link to="/docs">API tezgâhı</Link> ·{" "}
            <Link to="/sozluk">Sözlük</Link> ·{" "}
            <Link to="/data">Kaynaklar</Link>
          </p>
        </article>
        <aside className="explainer-aside">
          <div className="def-card">
            <p className="kicker">Defter</p>
            <WorkshopMarks beat="salt" />
            <h2>Kaldığın yer</h2>
            <p>
              Rotalar, kalan keşifler, indirdiğin JSON. Oyun skorları burada
              görünmez, ayrı kutu.
            </p>
            <Button asChild variant="default">
              <Link className="btn primary" to="/collection">
                Defterime git
              </Link>
            </Button>
            <p>
              <Link to="/lab?lesson=everyday">İki H, bir O</Link>
            </p>
          </div>
        </aside>
      </div>
    </main>
  );
}
