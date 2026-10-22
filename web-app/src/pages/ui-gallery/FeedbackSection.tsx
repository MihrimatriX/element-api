import { SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Notice } from "@/components/ui/notice";
import { Progress } from "@/components/ui/progress";
import { ProgressRing } from "@/components/ui/progress-ring";
import { Section } from "@/components/ui/section";
import { Skeleton } from "@/components/ui/skeleton";
import { Stat, StatGrid } from "@/components/ui/stat";
import { formatFixed } from "@/lib/format";
import { Specimen } from "./Specimen";

/** Notices, empty and loading states, metrics and progress. */
export function FeedbackSection() {
  return (
    <Section
      id="geri-bildirim"
      eyebrow="04"
      title="Durumlar ve ölçüler"
      description="Her veri görünümünün yükleniyor, boş ve hata hâli vardır. Sayılar mono ve tablo hizalı."
    >
      <div className="grid gap-5">
        <Specimen title="Uyarılar" note="Notice · info / success / warning / danger / neutral" className="grid gap-3">
          <Notice tone="info">Veriler PubChem'den 12 Eylül 2026'da alındı.</Notice>
          <Notice tone="success" title="Bileşik deftere eklendi">
            Su (H₂O) artık Defter › Bileşikler altında.
          </Notice>
          <Notice
            tone="warning"
            title="Canlı fiyatlar alınamadı"
            action={<Button size="sm" variant="outline">Yeniden dene</Button>}
          >
            Statik değerler gösteriliyor; alışveriş geçici olarak kapalı.
          </Notice>
          <Notice tone="danger" title="Anahtar oluşturulamadı">
            Sunucu 503 döndürdü. Birkaç dakika sonra yeniden dene.
          </Notice>
          <Notice tone="neutral">Bu sayfa demo verisi kullanıyor.</Notice>
        </Specimen>

        <div className="grid gap-5 lg:grid-cols-2">
          <Specimen title="Boş durum" note="EmptyState">
            <EmptyState
              icon={SearchX}
              title="Bu aramaya uyan element yok"
              actions={<Button size="sm" variant="outline">Aramayı temizle</Button>}
            >
              “xenon” yerine Türkçe adını dene: Ksenon.
            </EmptyState>
          </Specimen>
          <Specimen title="Yükleniyor" note="Skeleton · içeriğin biçiminde">
            <div aria-hidden="true" className="rounded-xl border border-line bg-surface p-5">
              <div className="flex items-center gap-4">
                <Skeleton className="size-14 rounded-md" />
                <div className="grid flex-1 gap-2.5">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
              <Skeleton className="mt-6 h-3 w-full" />
              <Skeleton className="mt-2.5 h-3 w-11/12" />
              <Skeleton className="mt-2.5 h-3 w-2/3" />
            </div>
          </Specimen>
        </div>

        <Specimen title="Ölçüler" note="Stat · StatGrid · ProgressRing · Progress" className="grid gap-6">
          <StatGrid>
            <Stat label="Keşfedilen element" value="42" unit="/ 118" progress={36} />
            <Stat label="Kurulan bileşik" value="17" hint="Son 7 günde 4 yeni" />
            <Stat label="Seri" value="6" unit="gün" />
            <Stat label="Bakiye" value={formatFixed(1250, 2)} unit="kredi" hint="Sanal KREDI" />
          </StatGrid>
          <div className="flex flex-wrap items-center gap-8">
            <Stat variant="plain" size="lg" label="Element" value="118" />
            <Stat variant="plain" size="lg" label="Bileşik" value="214" />
            <ProgressRing value={42} max={118} label="Tablo ilerlemesi" size={72} />
            <ProgressRing value={3} max={5} label="Ders ilerlemesi" size={56}>
              3/5
            </ProgressRing>
            <div className="min-w-48 flex-1">
              <div className="mb-2 flex justify-between text-[13px]">
                <span className="text-ink-3">Gündelik kimya rotası</span>
                <span className="font-mono text-ink tabular">%60</span>
              </div>
              <Progress value={60} aria-label="Gündelik kimya rotası" />
            </div>
          </div>
        </Specimen>
      </div>
    </Section>
  );
}
