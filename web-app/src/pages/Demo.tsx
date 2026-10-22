import { Link } from "react-router-dom";
import { BookOpen, CandlestickChart, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LinkCard } from "@/components/ui/link-card";
import { Notice } from "@/components/ui/notice";
import { PageHeader } from "@/components/ui/page-header";
import { Section } from "@/components/ui/section";
import { SagaSteps } from "../components/commerce/SagaSteps";
import Seo from "../components/Seo";
import { ACCOUNTS_ENABLED } from "../config";

/** Honest framing of the demo: what is simulated and what is not. */
function ShowcaseNote() {
  return (
    <aside role="note" className="panel w-full p-5 lg:w-96">
      <p className="eyebrow">Bu sayfa bir vitrin</p>
      <p className="mt-3 text-sm leading-6 text-ink-2">
        Mağaza, sepet ve kasa buradaki DEMO parçalarıdır. Gerçek ödeme, fiziksel kargo veya
        canlı borsa yok; para birimi sanal KREDI.
      </p>
      <p className="mt-3 border-t border-line pt-3 text-[13px] leading-5 text-ink-3">
        Bu vitrin değişebilir. Atlas ve laboratuvar buradan bağımsızdır.
      </p>
    </aside>
  );
}

/**
 * /demo: explains the virtual-KREDI simulation (market → shop → order saga) as a
 * clearly separate showcase, with entry points into /market, /shop and the API docs.
 */
export default function Demo() {
  return (
    <main className="container-page pb-24 pt-10 lg:pt-14">
      <Seo
        title="DEMO · Kredi simülasyonu · ElementAPI"
        description="Vitrin demosu: sanal KREDI ile piyasa ve sipariş akışı. Gerçek ödeme veya kargo yok. Atlas ve laboratuvarın parçası değil."
        path="/demo"
      />
      <PageHeader
        eyebrow="Demo"
        title="Kredi simülasyonu"
        lead="Atlas ve laboratuvarın parçası değil. Sanal krediyle sipariş ve piyasa akışını dene; Fe gramı kredi harcar, laboratuvarda su keşfi cüzdanı değiştirmez."
        actions={
          ACCOUNTS_ENABLED && (
            <>
              <Button asChild size="lg">
                <Link to="/shop">Mağazayı aç</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link to="/market">Piyasayı aç</Link>
              </Button>
            </>
          )
        }
        aside={<ShowcaseNote />}
      />

      {!ACCOUNTS_ENABLED && (
        <Notice tone="info" className="mt-10">
          Bu bağımsız atlas kurulumunda ticaret servisleri kapalı. Aşağıdaki akışlar tam
          platform sürümünün parçasıdır.
        </Notice>
      )}

      <Section
        title="Bir sipariş nasıl ilerler"
        description="Sipariş; stok ayırma, ödeme, sevkiyat ve tamamlanma aşamalarından geçer. Her adımı ayrı bir servis yürütür; başarısız işlemlerde stok ve bakiye telafi edilir."
      >
        <SagaSteps />
      </Section>

      <Section title="Nereden başlamalı">
        <div className="grid gap-3 md:grid-cols-2">
          {ACCOUNTS_ENABLED && (
            <>
              <LinkCard
                to="/market"
                icon={CandlestickChart}
                title="Fe fiyatına bak"
                description="Demirin alış ve satışını karşılaştır. Sayı kredi; borsa değil."
                meta="/market"
              />
              <LinkCard
                to="/shop"
                icon={ShoppingCart}
                title="Bir sipariş dene"
                description="1 g Fe veya bir su SKU’su. Kasa 10.000 krediyle açılır; 214 eğitim bileşiği otomatik ürün olmaz."
                meta="/shop"
              />
            </>
          )}
          <LinkCard
            to="/docs#simulation"
            icon={BookOpen}
            title="Teknik akışı incele"
            description="Sipariş, cüzdan ve webhook uçlarının istek ve yanıt örnekleri."
            meta="/docs#simulation"
            className="md:col-span-2"
          />
        </div>
      </Section>

      <p className="mt-12 text-sm text-ink-3">
        Atlas ve öğrenme rotaları bu simülasyondan bağımsızdır.{" "}
        <Link to="/collection" className="text-link">
          Keşiflerine dön
        </Link>
        .
      </p>
    </main>
  );
}
