import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Atom, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ElementFamily } from "@/components/ui/element-tile";
import { EmptyState } from "@/components/ui/empty-state";
import { Notice } from "@/components/ui/notice";
import { PageHeader } from "@/components/ui/page-header";
import { STATIC_ELEMENTS } from "@/services/elementData";
import { useScience, type ScientificElement } from "@/services/science";
import { ElementCards } from "./periodic/ElementCards";
import { ElementPreviewDialog } from "./periodic/ElementPreviewDialog";
import { ExplorerToolbar } from "./periodic/ExplorerToolbar";
import { LensLegend } from "./periodic/LensLegend";
import { LENS_VALUE_LABEL, lensDomain, readLens, type Lens } from "./periodic/lenses";
import { bestMatch, elementMatches, type ExplorerView } from "./periodic/model";
import { PeriodicTable } from "./periodic/PeriodicTable";
import { SelectedElementPanel } from "./periodic/SelectedElementPanel";
import { useTileNavigation } from "./periodic/useTileNavigation";
import Seo from "./Seo";

/** Phones open on the card view; wider screens on the table. Not persisted. */
function initialView(): ExplorerView {
  return window.matchMedia("(max-width: 767px)").matches ? "cards" : "table";
}

/**
 * /periodic: the 118-element explorer. Search, family filter and colour lenses over a table or
 * card view; hovering or focusing a tile previews it, click or Space opens the preview dialog
 * and Enter opens the full record.
 */
export default function PeriodicExplorer() {
  const { data, error, retry } = useScience<ScientificElement[]>("elements");
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [families, setFamilies] = useState<ElementFamily[]>([]);
  const [lens, setLens] = useState<Lens>("category");
  const [view, setView] = useState<ExplorerView>(initialView);
  const [selected, setSelected] = useState("Fe");
  const [previewOpen, setPreviewOpen] = useState(false);

  const records = useMemo(
    () => new Map((data ?? []).map((record) => [record.symbol, record])),
    [data],
  );
  const domain = useMemo(() => lensDomain(lens, data ?? []), [lens, data]);
  const matches = STATIC_ELEMENTS.filter((element) =>
    elementMatches(element, query, families, records.get(element.symbol)?.names.en),
  );
  const matchingSymbols = new Set(matches.map((element) => element.symbol));
  const selectedElement =
    STATIC_ELEMENTS.find((element) => element.symbol === selected) ?? STATIC_ELEMENTS[0];
  const readingOf = (symbol: string) => readLens(lens, records.get(symbol), domain);

  const { gridProps, focusTile } = useTileNavigation({
    view,
    matches,
    onSelect: setSelected,
  });

  function openPreview(symbol: string) {
    setSelected(symbol);
    setPreviewOpen(true);
  }

  function openBestMatch() {
    const match = bestMatch(query, matches);
    if (match) navigate(`/element/${match.symbol.toLowerCase()}`);
  }

  function clearFilters() {
    setQuery("");
    setFamilies([]);
  }

  const tileProps = {
    readingOf,
    valueLabel: lens === "category" ? undefined : LENS_VALUE_LABEL[lens],
    selected,
    onOpen: openPreview,
    gridProps,
  };

  return (
    <main className="container-page pt-10 pb-24 lg:pt-14">
      <Seo
        title="Periyodik tablo · ElementAPI"
        description="118 element. PubChem, RSC ve NIST kaynaklı Türkçe kayıtlar."
        path="/periodic"
      />
      <PageHeader
        eyebrow="118 element · kaynaklı atlas"
        title="Periyodik tablo"
        lead="Bir hücreye dokun; kütlesini, hâlini ve kaynaklı özetini gör."
        actions={
          <Button asChild variant="outline">
            <Link to="/lab">
              Laboratuvar
              <ArrowRight aria-hidden="true" strokeWidth={1.75} />
            </Link>
          </Button>
        }
      />

      <section aria-label="Element keşfi" className="mt-10">
        <ExplorerToolbar
          query={query}
          onQueryChange={setQuery}
          onSearchSubmit={openBestMatch}
          matchCount={matches.length}
          lens={lens}
          onLensChange={setLens}
          view={view}
          onViewChange={setView}
          families={families}
          onFamiliesChange={setFamilies}
          onClear={clearFilters}
        />

        {error && (
          <Notice
            tone="warning"
            className="mt-6"
            action={
              <Button variant="outline" size="sm" onClick={retry}>
                Yeniden dene
              </Button>
            }
          >
            Temel tablo gösteriliyor. Ayrıntılı verilere ulaşılamıyor.
          </Notice>
        )}

        <div className="mt-6">
          {matches.length === 0 ? (
            <EmptyState
              icon={SearchX}
              title="Eşleşen element yok"
              actions={
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  Filtreyi temizle
                </Button>
              }
            >
              {query.trim()
                ? `“${query.trim()}” tabloyla eşleşmedi. Sembol (Fe), Türkçe ad (Demir) ya da atom numarası (26) dene.`
                : "Seçili ailelerde element yok."}
            </EmptyState>
          ) : (
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={view}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              >
                {view === "table" ? (
                  <PeriodicTable
                    {...tileProps}
                    elements={STATIC_ELEMENTS}
                    matchingSymbols={matchingSymbols}
                    panel={<SelectedElementPanel element={selectedElement} className="h-full" />}
                    legend={<LensLegend lens={lens} domain={domain} className="h-full" />}
                  />
                ) : (
                  <>
                    <LensLegend lens={lens} domain={domain} className="mb-4 max-w-sm" />
                    <ElementCards {...tileProps} elements={matches} />
                  </>
                )}
              </motion.div>
            </AnimatePresence>
          )}
        </div>

        <p className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-ink-3">
          <span className="inline-flex items-center gap-1.5">
            <Atom aria-hidden="true" className="size-3.5" strokeWidth={1.75} />
            Kaynaklar: PubChem, RSC, NIST
          </span>
          <span className="hidden lg:inline">
            Ok tuşlarıyla gezin, <Key>Boşluk</Key> önizler, <Key>Enter</Key> kaydı açar
          </span>
          <span className="lg:hidden">Dokunarak önizle</span>
        </p>
      </section>

      <ElementPreviewDialog
        element={selectedElement}
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        onReturnFocus={() => focusTile(selected)}
      />
    </main>
  );
}

/** Keyboard key name in running text. */
function Key({ children }: { children: string }) {
  return (
    <kbd className="rounded-xs border border-line-strong bg-surface px-1 py-px font-mono text-[11px] text-ink-2">
      {children}
    </kbd>
  );
}
