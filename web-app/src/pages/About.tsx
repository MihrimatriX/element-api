import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import Seo from "../components/Seo";
export default function About() {
  return (
    <main className="page explainer-page">
      <Seo
        title="Hakkında · ElementAPI"
        description="Elementleri tanı, bileşikleri keşfet ve öğrendiklerini kendi koleksiyonunda biriktir."
        path="/hakkinda"
      />
      <div className="explainer">
        <article className="explainer-prose">
          <p className="kicker">Hakkında</p>
          <h1>ElementAPI hakkında</h1>
          <p className="lead">
            ElementAPI, kimyayı merak edenler için Türkçe bir keşif atlası. 118
            elementin özelliklerini inceleyebilir, 51 bileşiğin gündelik
            hayattaki yerini öğrenebilir ve laboratuvarda kendi keşif
            koleksiyonunu oluşturabilirsin.
          </p>
          <section>
            <h2>Atlas ve keşif laboratuvarı</h2>
            <p>
              Periyodik tablo sana başlangıç noktası verir. Laboratuvarda
              element kartlarını birleştirir, ortaya çıkan bileşiği tanırsın. Üç
              kısa öğrenme rotası, keşiflerini bir soruyla pekiştirir. Hangi
              rotadan devam edeceğini koleksiyonunda görebilirsin.
            </p>
          </section>
          <section>
            <h2>Kaynağı görünen bilgi</h2>
            <p>
              Sayısal değerler, kaynak bağlantıları ve ölçüm koşullarıyla
              gösterilir. Türkçe anlatımlar editöryeldir. Kaynakta bulunmayan
              bir değer sıfır kabul edilmez; ayrıntı ekranındaki eksik alanları
              istersen açabilirsin.
            </p>
            <Link to="/data">Veri kapsamını ve kaynakları incele</Link>
          </section>
          <section>
            <h2>Hesapsız başlayabilirsin</h2>
            <p>
              Atlas, laboratuvar ve bilimsel API herkese açık. Misafir keşifleri
              kullandığın tarayıcıda saklanır. Hesap özelliği açık kurulumlarda
              ilerleme cihazlar arasında eşitlenir; mevcut misafir kayıtlarını
              hesabına aktarmak senin seçimindir.
            </p>
          </section>
          <section>
            <h2>Geliştiriciler için</h2>
            <p>
              Aynı bilimsel kayıtlar açık v2 API ile kullanılabilir. Alan
              seçimi, filtreleme, sayfalama ve koşullu istekler desteklenir.
              Sanal piyasa, sipariş ve kargo akışı ayrı bir yazılım
              simülasyonudur.
            </p>
            <p>
              <Link to="/docs">API dokümantasyonu</Link> ·{" "}
              <Link to="/demo">Simülasyonu tanı</Link>
            </p>
          </section>
        </article>
        <aside className="explainer-aside">
          <div className="def-card">
            <p className="kicker">İlk keşif</p>
            <h2>Suyun bileşenleri</h2>
            <p>
              Laboratuvarda hidrojen ve oksijeni seç. İlk bileşiğini keşfet,
              formülünü incele ve gündelik maddeler rotasına devam et.
            </p>
            <Button asChild variant="default">
              <Link className="btn primary" to="/lab?lesson=everyday">
                Laboratuvara git
              </Link>
            </Button>
            <p>
              <Link to="/nasil">Kullanım rehberi</Link>
            </p>
          </div>
        </aside>
      </div>
    </main>
  );
}
