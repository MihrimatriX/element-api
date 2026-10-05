import { Link } from "react-router-dom";
import {
  ArrowRight,
  CircleDashed,
  ImageOff,
  type LucideIcon,
} from "lucide-react";
import { ExternalLink } from "@/components/ui/external-link";
import { PageHeader } from "@/components/ui/page-header";
import { Section } from "@/components/ui/section";
import { Stat, StatGrid } from "@/components/ui/stat";
import { formatNumber } from "@/lib/format";
import { WorkshopMarks } from "../components/WorkshopMarks";
import Seo from "../components/Seo";
import coverage from "../data/coverage.json";

const SECTION_LABELS: Record<string, string> = {
  electromagnetic_and_optical: "Elektromanyetik ve optik özellikler",
  crystallography: "Kristal yapı",
  abundance: "Doğada bulunma",
};

const SOURCES = [
  {
    name: "PubChem",
    href: "https://pubchem.ncbi.nlm.nih.gov/periodic-table/",
    covers: "Element ve bileşik verileri",
  },
  {
    name: "Royal Society of Chemistry",
    href: "https://periodic-table.rsc.org/",
    covers: "Element özellikleri",
  },
  {
    name: "NIST",
    href: "https://physics.nist.gov/PhysRefData/Compositions/",
    covers: "Referans izotop bileşimleri",
  },
];

const RELATED = [
  { to: "/developers", label: "API ürün özeti" },
  { to: "/docs", label: "API’de kaynak ve alan seçimi" },
  { to: "/hakkinda", label: "Ürün hakkında" },
];

const dateFormat = new Intl.DateTimeFormat("tr-TR", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

/** "2026-09-05 / 2026-09-17" → "5 Eylül 2026 ve 17 Eylül 2026". */
const retrievalDates = new Intl.ListFormat("tr-TR", { type: "conjunction" }).format(
  coverage.retrievedAt
    .split(" / ")
    .map((day) => dateFormat.format(new Date(`${day}T00:00:00`))),
);

const totalRecords = coverage.elements + coverage.compounds;
const missingPhotos = coverage.elements - coverage.photos;
const percent = (part: number, whole: number) => Math.round((part / whole) * 100);

/** One honest gap: what is missing and what the interface shows instead. */
function GapRow({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon;
  title: string;
  children: string;
}) {
  return (
    <li className="flex gap-4 p-5">
      <span
        aria-hidden="true"
        className="grid size-9 shrink-0 place-items-center rounded-lg border border-warning/25 bg-warning-soft text-warning"
      >
        <Icon className="size-4" strokeWidth={1.75} />
      </span>
      <div className="min-w-0">
        <h3 className="font-sans text-[15px] font-semibold tracking-normal text-ink">
          {title}
        </h3>
        <p className="mt-1 text-sm leading-6 text-ink-2">{children}</p>
      </div>
    </li>
  );
}

/** /data: what this data release covers, where the numbers come from and what is still empty. */
export default function DataCoverage() {
  return (
    <main className="container-page pb-24 pt-10 lg:pt-14">
      <Seo
        title="Kaynaklar ve veri kapsamı · ElementAPI"
        description="PubChem, RSC, NIST. null sıfır değildir. 118 element, 214 bileşik; eksik bölümler açıkça boş."
        path="/data"
      />
      <PageHeader
        eyebrow="Kaynak"
        title="Kaynaklar ve veri kapsamı"
        lead={`${coverage.elements} element, ${coverage.compounds} bileşik. Sayı PubChem, RSC ve NIST’ten; Türkçe cümle bizden. Değer yoksa null; suyun erime noktası bile uydurulmaz.`}
        aside={<WorkshopMarks beat="quartz" />}
      />

      <Section
        title="Bu sürüm"
        description={`Veri alım tarihleri: ${retrievalDates}.`}
        className="mt-12 lg:mt-16"
      >
        <StatGrid columns={3}>
          <Stat label="Element" value={formatNumber(coverage.elements)} />
          <Stat label="Bileşik" value={formatNumber(coverage.compounds)} />
          <Stat
            label="Türkçe anlatım"
            value={formatNumber(coverage.editorial)}
            unit="kayıt"
            hint={
              coverage.editorial === totalRecords
                ? "Her element ve bileşikte"
                : `${formatNumber(totalRecords)} kayıttan`
            }
          />
          <Stat
            label="Element fotoğrafı"
            value={formatNumber(coverage.photos)}
            unit={`/ ${coverage.elements}`}
            progress={percent(coverage.photos, coverage.elements)}
          />
          <Stat
            label="Bileşik yapı görseli"
            value={formatNumber(coverage.structures)}
            unit={`/ ${coverage.compounds}`}
            progress={percent(coverage.structures, coverage.compounds)}
          />
          <Stat
            label="Boş element bölümü"
            value={formatNumber(coverage.unavailableElementSections.length)}
            hint="Şemada var, içerikte yok"
          />
        </StatGrid>
      </Section>

      <Section title="Nasıl okunur">
        <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
          <article className="panel flex flex-col p-6 lg:p-8">
            <p aria-hidden="true" className="font-mono text-sm">
              <span className="text-syntax-key">"abundance"</span>
              <span className="text-syntax-punct">: </span>
              <span className="text-syntax-literal">null</span>
            </p>
            <h3 className="mt-auto pt-10 text-2xl text-ink">
              Eksik, sıfır değildir
            </h3>
            <p className="mt-3 max-w-prose text-[15px] leading-7 text-ink-2">
              “Veri yok”, bu veri sürümünde doğrulanmış bir değerin bulunmadığını
              anlatır. Maddenin o özelliğe sahip olmadığı anlamına gelmez.
            </p>
          </article>
          <div className="grid gap-4">
            <article className="panel p-6">
              <h3 className="font-sans text-base font-semibold tracking-normal text-ink">
                Ölçümün koşulları
              </h3>
              <p className="mt-2 text-[15px] leading-7 text-ink-2">
                Sıcaklık, basınç ve saflık sonuçları değiştirebilir. Farklı
                deneyler tek bir kesin değere indirgenmez. Kaynak bağlantıları
                ayrıntı sayfasında.
              </p>
            </article>
            <article className="panel p-6">
              <h3 className="font-sans text-base font-semibold tracking-normal text-ink">
                Şema ve içerik
              </h3>
              <p className="mt-2 text-[15px] leading-7 text-ink-2">
                Bu sürümde {coverage.unavailableElementSections.length} element
                bölümü tamamen boş. API şemasında alanlar korunur; arayüz bunları
                varsayılan olarak gizler.
              </p>
            </article>
          </div>
        </div>
      </Section>

      <Section
        title="Henüz doldurulmamış bölümler"
        description="Eksik olanı saklamıyoruz. Doldurulana kadar bu alanlar API’de null döner."
      >
        <ul className="panel divide-y divide-line">
          {coverage.unavailableElementSections.map((section) => (
            <GapRow
              key={section}
              icon={CircleDashed}
              title={SECTION_LABELS[section] ?? section}
            >
              {`${coverage.elements} elementin hiçbirinde doğrulanmış değer yok; bölüm ayrıntı sayfasında gizli.`}
            </GapRow>
          ))}
          {missingPhotos > 0 && (
            <GapRow icon={ImageOff} title={`${missingPhotos} elementin fotoğrafı yok`}>
              Lisansı uygun fotoğraf bulunamayan ya da gaz olan elementlerde şema
              gösterilir; şema ölçüm gibi sunulmaz.
            </GapRow>
          )}
        </ul>
      </Section>

      <Section
        title="Kaynaklar"
        description="Fotoğrafların kaynağı, üreticisi ve lisansı görselin yanında gösterilir. Her element için fotoğraf bulunması beklenmez."
      >
        <ul className="panel divide-y divide-line">
          {SOURCES.map((source) => (
            <li
              key={source.href}
              className="grid gap-1 p-5 sm:grid-cols-[16rem_minmax(0,1fr)] sm:items-baseline sm:gap-6"
            >
              <ExternalLink href={source.href} className="font-medium">
                {source.name}
              </ExternalLink>
              <p className="min-w-0 text-[15px] text-ink-2">
                {source.covers}
                <span className="mt-0.5 block truncate font-mono text-xs text-ink-3">
                  {new URL(source.href).host}
                </span>
              </p>
            </li>
          ))}
        </ul>
        <nav aria-label="İlgili sayfalar" className="mt-8">
          <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            {RELATED.map((link) => (
              <li key={link.to}>
                <Link
                  to={link.to}
                  className="text-link inline-flex items-center gap-1"
                >
                  {link.label}
                  <ArrowRight aria-hidden="true" strokeWidth={1.75} className="size-3.5" />
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </Section>
    </main>
  );
}
