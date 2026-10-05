import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { FileJson } from "lucide-react";
import Seo from "@/components/Seo";
import {
  KeyedEndpointsSection,
  WebhooksSection,
} from "@/components/developer/AccountSections";
import { ApiPlayground } from "@/components/developer/ApiPlayground";
import { DocsToc, type OutlineGroup } from "@/components/developer/DocsToc";
import {
  EtagSection,
  ExamplesSection,
  ParametersSection,
  ReferenceSection,
} from "@/components/developer/ReferenceSections";
import {
  EnglishSection,
  ErrorsSection,
  SummarySection,
} from "@/components/developer/ResponseSections";
import { SimulationSection } from "@/components/developer/SimulationSection";
import { useScrollSpy } from "@/components/developer/useScrollSpy";
import { Button } from "@/components/ui/button";
import {
  Disclosure,
  DisclosureContent,
  DisclosureTrigger,
} from "@/components/ui/disclosure";
import { PageHeader } from "@/components/ui/page-header";
import { getPublicSiteUrl } from "@/config";

const OUTLINE: readonly OutlineGroup[] = [
  {
    title: "Bilimsel API · v2",
    items: [
      { id: "playground", label: "Canlı istek" },
      { id: "reference", label: "v2 referans" },
      { id: "examples", label: "Kopyala, yapıştır" },
      { id: "etag", label: "ETag ve 304" },
      { id: "parameters", label: "Parametreler" },
      { id: "summary", label: "Özet ne içerir" },
      { id: "errors", label: "Hatalar" },
      { id: "english", label: "English summary" },
    ],
  },
  {
    title: "Hesaplı uçlar · v1",
    items: [
      { id: "v1-auth", label: "Anahtar ve sınırlar" },
      { id: "webhooks", label: "Webhooklar" },
      { id: "simulation", label: "Simülasyon ve hesap" },
    ],
  },
];

const SECTION_IDS = OUTLINE.flatMap((group) => group.items.map((item) => item.id));
const SIMULATION_HASH = "#simulation";

/**
 * /docs: two-column API reference. A sticky table of contents follows the
 * section in view; the content holds the live playground, the v2 reference and
 * the keyed v1 endpoints. Anchors such as `#etag` scroll into place, and
 * `#simulation` also opens the collapsed simulation section.
 */
export default function ApiDocs() {
  const { hash } = useLocation();
  const activeId = useScrollSpy(SECTION_IDS);
  const [simulationOpen, setSimulationOpen] = useState(hash === SIMULATION_HASH);
  const [seenHash, setSeenHash] = useState(hash);
  const origin = getPublicSiteUrl();

  // A later navigation to #simulation (from the TOC or another page) opens it too.
  if (hash !== seenHash) {
    setSeenHash(hash);
    if (hash === SIMULATION_HASH) setSimulationOpen(true);
  }

  // The route loads lazily, so the browser's own jump to the anchor misses; redo it.
  useEffect(() => {
    if (!hash) return;
    document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView();
  }, [hash]);

  // Following the TOC link again after closing the section reopens it (the hash stays the same).
  function handleNavigate(id: string) {
    if (`#${id}` === SIMULATION_HASH) setSimulationOpen(true);
  }

  return (
    <main className="container-page pb-24 pt-10 lg:pt-14">
      <Seo
        title="Bilimsel API · ElementAPI"
        description="Fe ve H2O örnekleri, fields/view/filtre, ETag/304 ve hata gövdeleri. Anahtar yok. KREDI simülasyonu ayrı v1 uçlarda."
        path="/docs"
        jsonLd={{
          "@type": "WebAPI",
          name: "ElementAPI",
          url: `${origin}/docs`,
          documentation: `${origin}/docs`,
          description:
            "118 element ve bileşikler için herkese açık bilimsel REST. Cüzdan ve sipariş ayrı v1 uçlardır; API anahtarı ister.",
          provider: {
            "@type": "Organization",
            name: "ElementAPI",
            url: origin,
          },
        }}
      />

      <PageHeader
        eyebrow="API dokümanları"
        title="Deneme tezgâhı"
        lead={
          <>
            Demiri veya suyu iste, JSON’u kopyala. Hesap yok, anahtar yok. Ürün
            özeti için{" "}
            <Link to="/developers" className="text-link">
              API sayfası
            </Link>
            , terimler için{" "}
            <Link to="/sozluk" className="text-link">
              sözlük
            </Link>
            .
          </>
        }
        actions={
          <Button asChild variant="outline">
            <a href="/openapi.json">
              <FileJson strokeWidth={1.75} />
              OpenAPI
            </a>
          </Button>
        }
      />

      <div className="mt-10 grid gap-10 lg:mt-14 lg:grid-cols-[12.5rem_minmax(0,1fr)] lg:gap-14">
        <aside className="hidden lg:block">
          <div className="sticky top-24 max-h-[calc(100dvh-8rem)] overflow-y-auto pb-6">
            <DocsToc groups={OUTLINE} activeId={activeId} onNavigate={handleNavigate} />
          </div>
        </aside>

        <div className="min-w-0">
          <Disclosure
            className="mb-12 rounded-lg border border-line bg-surface px-4 lg:hidden"
          >
            <DisclosureTrigger>Bu sayfada</DisclosureTrigger>
            <DisclosureContent>
              <div className="pt-1 pb-5">
                <DocsToc groups={OUTLINE} activeId={activeId} onNavigate={handleNavigate} />
              </div>
            </DisclosureContent>
          </Disclosure>

          <div>
            <ApiPlayground />
            <ReferenceSection />
            <ExamplesSection />
            <EtagSection />
            <ParametersSection />
            <SummarySection />
            <ErrorsSection />
            <EnglishSection />
            <KeyedEndpointsSection />
            <WebhooksSection />
            <SimulationSection open={simulationOpen} onOpenChange={setSimulationOpen} />
          </div>
        </div>
      </div>
    </main>
  );
}
