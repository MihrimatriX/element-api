import Seo from "../components/Seo";
import { ElementTile } from "../components/ui/element-tile";
import { PageHeader } from "../components/ui/page-header";
import { ActionsSection } from "./ui-gallery/ActionsSection";
import { ChemistrySection } from "./ui-gallery/ChemistrySection";
import { CodeSection } from "./ui-gallery/CodeSection";
import { DataSection } from "./ui-gallery/DataSection";
import { FeedbackSection } from "./ui-gallery/FeedbackSection";
import { FormsSection } from "./ui-gallery/FormsSection";
import { FoundationsSection } from "./ui-gallery/FoundationsSection";

const CONTENTS = [
  { id: "temel", label: "Temeller" },
  { id: "eylemler", label: "Eylemler" },
  { id: "formlar", label: "Formlar ve filtreler" },
  { id: "geri-bildirim", label: "Durumlar ve ölçüler" },
  { id: "veri", label: "Veri ve gezinme" },
  { id: "kimya", label: "Kimya bileşenleri" },
  { id: "kod", label: "Kod ve bağlantılar" },
];

/** Dev-only (/_ui) gallery of every primitive and building block with realistic content. */
export default function UiGallery() {
  return (
    <main className="container-page pt-10 pb-24 lg:pt-14">
      <Seo
        title="Bileşen galerisi · ElementAPI"
        description="Mineral tasarım sisteminin bileşenleri."
        path="/_ui"
        noIndex
      />
      <PageHeader
        eyebrow="Tasarım sistemi · yalnızca geliştirme"
        title="Mineral bileşen galerisi"
        lead="Her ilkel ve yapı taşı, gerçek Türkçe içerikle. Renk, yazı ve aralıklar src/styles.css jetonlarından gelir; sayfalar bileşenleri buradan seçer."
        aside={
          <div aria-hidden="true" className="grid w-56 grid-cols-3 gap-1.5">
            <ElementTile symbol="Cu" atomicNumber={29} name="Bakır" family="transition" />
            <ElementTile symbol="O" atomicNumber={8} name="Oksijen" family="nonmetal" />
            <ElementTile symbol="Ne" atomicNumber={10} name="Neon" family="noble" />
          </div>
        }
      />
      <div className="mt-14 grid gap-12 lg:grid-cols-[11rem_minmax(0,1fr)]">
        <nav aria-label="Galeri içeriği" className="hidden lg:block">
          <ol className="sticky top-24 grid gap-1 border-l border-line">
            {CONTENTS.map((item, index) => (
              <li key={item.id}>
                <a
                  href={`#${item.id}`}
                  className="-ml-px flex gap-3 border-l border-transparent py-1 pl-4 text-[13px] text-ink-3 transition-colors hover:border-ink-3 hover:text-ink"
                >
                  <span className="font-mono text-ink-4 tabular">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  {item.label}
                </a>
              </li>
            ))}
          </ol>
        </nav>
        <div className="min-w-0">
          <FoundationsSection />
          <ActionsSection />
          <FormsSection />
          <FeedbackSection />
          <DataSection />
          <ChemistrySection />
          <CodeSection />
        </div>
      </div>
    </main>
  );
}
