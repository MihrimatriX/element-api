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
      <p className="science-eyebrow">AYRI BİR DENEY ALANI</p>
      <h1>Sanal ticaret demosu</h1>
      <p className="lead">
        Elementleri ve bileşikleri sanal krediyle alıp sat. Fiyat, ödeme ve
        kargo işlemleri simülasyondur; gerçek para veya fiziksel teslimat
        içermez.
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
            <h2>Fiyatları incele</h2>
            <p>
              Elementlerin simüle edilen alış ve satış fiyatlarını karşılaştır.
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
              Hesabınla mağazayı kullan. Deneme kasan ilk açılışta 10.000
              krediyle başlar.
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
