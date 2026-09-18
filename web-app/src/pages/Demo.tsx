import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { ACCOUNTS_ENABLED } from "../config";
import Seo from "../components/Seo";
export default function Demo() {
  return (
    <main className="science-detail demo-page">
      <Seo
        title="Simülasyon demosu · ElementAPI"
        description="Sanal krediyle sipariş ve piyasa akışını deneyin."
        path="/demo"
      />
      <p className="science-eyebrow">Ayrı bir deney alanı</p>
      <h1>Sanal ticaret demosu</h1>
      <p className="lead">
          Sanal krediyle sipariş ve piyasa akışını dene. Fe gramı kredi
          yakar; laboratuvarda su keşfi cüzdanı değiştirmez.
        </p>
      {!ACCOUNTS_ENABLED && (
        <p className="science-notice">
          Bu bağımsız atlas kurulumunda ticaret servisleri kapalı. Aşağıdaki
          akışlar tam platform sürümünün parçasıdır.
        </p>
      )}
      <div className="learning-grid">
        <Card asChild className="gap-0 py-5 max-md:py-3 shadow-none">
          <article className="learning-card">
            <h2>Fe fiyatına bak</h2>
            <p>
              Demirin alış ve satışını karşılaştır. Sayı kredi; borsa değil.
            </p>
            <Button asChild variant="outline">
              <Link className="btn" to="/market">
                Piyasayı aç
              </Link>
            </Button>
          </article>
        </Card>
        <Card asChild className="gap-0 py-5 max-md:py-3 shadow-none">
          <article className="learning-card">
            <h2>Bir sipariş dene</h2>
            <p>
              1 g Fe veya bir su SKU’su. Kasa 10.000 krediyle açılır. 167
              eğitim bileşiği otomatik ürün olmaz.
            </p>
            <Button asChild variant="default">
              <Link className="btn primary" to="/shop">
                Mağazayı aç
              </Link>
            </Button>
          </article>
        </Card>
        <Card asChild className="gap-0 py-5 max-md:py-3 shadow-none">
          <article className="learning-card">
            <h2>Teknik akışı incele</h2>
            <p>
              Sipariş; stok ayırma, ödeme, sevkiyat ve tamamlanma aşamalarından
              geçer. Başarısız işlemlerde stok ve bakiye telafi edilir.
            </p>
            <Button asChild variant="outline">
              <Link className="btn" to="/docs#simulation">
                API örnekleri
              </Link>
            </Button>
          </article>
        </Card>
      </div>
      <p className="science-data-note">
        Atlas ve öğrenme rotaları bu simülasyondan bağımsızdır.{" "}
        <Link to="/collection">Keşiflerine dön</Link>.
      </p>
    </main>
  );
}
