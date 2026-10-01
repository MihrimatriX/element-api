import { Construction } from "lucide-react";
import Seo from "../components/Seo";
import { EmptyState } from "../components/ui/empty-state";
import { PageHeader } from "../components/ui/page-header";

/** Placeholder for /kilavuz until the system guide is written. */
export default function SystemGuide() {
  return (
    <main className="container-page pt-10 pb-24 lg:pt-14">
      <Seo
        title="Sistem kılavuzu · ElementAPI"
        description="ElementAPI'nin parçaları ve birlikte nasıl çalıştıkları."
        path="/kilavuz"
        noIndex
      />
      <PageHeader
        eyebrow="Geliştirici"
        title="Sistem kılavuzu"
        lead="Servisler, veri akışı ve kurulum seçenekleri tek sayfada."
      />
      <EmptyState icon={Construction} title="Hazırlanıyor" className="mt-12">
        Bu sayfa yazılıyor. O zamana kadar API dokümanları ve kaynaklar
        sayfası en güncel bilgiyi veriyor.
      </EmptyState>
    </main>
  );
}
