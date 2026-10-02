import { useEffect, useId, useRef, useState, type PointerEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowRight, FlaskConical, Lightbulb, RotateCcw } from "lucide-react";
import Seo from "@/components/Seo";
import { LabModes } from "@/components/LabModes";
import { BenchDropZone, type ChipDragStart } from "@/components/lab/BenchDropZone";
import { DiscoveryNotebook } from "@/components/lab/DiscoveryNotebook";
import { DragGhost } from "@/components/lab/DragGhost";
import { ElementPalette } from "@/components/lab/ElementPalette";
import { MixOutcome, type Outcome } from "@/components/lab/MixOutcome";
import { ProgressAside } from "@/components/lab/ProgressAside";
import { useBench } from "@/components/lab/useBench";
import { useLabDrag } from "@/components/lab/useLabDrag";
import { Button } from "@/components/ui/button";
import { Formula } from "@/components/ui/formula";
import { Notice } from "@/components/ui/notice";
import { PageHeader } from "@/components/ui/page-header";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { parseFormula, prune, type Counts } from "@/services/chemistry";
import { track } from "@/services/diagnostics";
import {
  bagFormula,
  catalogSize,
  compoundBySlug,
  discover,
  findLabElement,
  formCompound,
  hint,
  materialById,
  missTone,
  type KnownCompound,
} from "@/services/lab";
import { lessons } from "@/services/lessons";
import { useLearning } from "@/services/useLearning";

/** "İpucu: Su için 2 hidrojen ve 1 oksijen dene." without the prefix. */
function hintMessage(compound: KnownCompound): string {
  const parts = Object.entries(parseFormula(compound.formula)).map(
    ([symbol, count]) =>
      `${count} ${(materialById[symbol]?.name ?? symbol).toLocaleLowerCase("tr")}`,
  );
  return `${compound.nameTr} için ${parts.join(" ve ")} dene.`;
}

function progressHint(found: number): string {
  if (found === 0) return "Tezgâhta ilk molekülü dene";
  if (found === catalogSize) return "Katalog tamam";
  return `${catalogSize - found} bileşik kaldı`;
}

/**
 * /lab: free-play stoichiometry bench. Elements go from the palette to the bench
 * (click, keys or drag), "Dene" matches the mix against the catalogue, and a hit
 * is written to the learning notebook. `?material=Fe` preloads one atom,
 * `?lesson=<id>` follows a learning route.
 */
export default function Laboratory() {
  const [params] = useSearchParams();
  const learning = useLearning();
  const found = learning.progress.discoveries;
  const lesson = lessons.find((candidate) => candidate.id === params.get("lesson"));
  const bench = useBench(() => {
    const symbol = findLabElement(params.get("material"));
    return symbol ? { [symbol]: 1 } : {};
  });
  const { drag, startDrag } = useLabDrag();
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const benchRef = useRef<HTMLElement>(null);
  const benchTitleId = useId();

  useEffect(() => {
    track("lab_started");
  }, []);

  const lessonLeft = lesson
    ? lesson.discoveries.filter((id) => !found.includes(id)).map((id) => compoundBySlug[id])
    : [];
  const nextUp = lesson ? lessonLeft[0] : hint(found);
  const preview = bagFormula(bench.counts);
  const hasAtoms = bench.chipIds.length > 0;

  /** Every bench edit invalidates the last result. */
  function edit(change: () => void) {
    change();
    setOutcome(null);
  }

  function mix(override?: Counts) {
    const counts = override ? prune(override) : bench.counts;
    if (override) bench.load(counts);
    const formed = formCompound(counts);
    if (!formed.ok) {
      setOutcome({
        kind: "miss",
        tone: missTone(formed),
        message: formed.message,
        cousins: formed.expected ?? [],
      });
      return;
    }
    const { slug } = formed.compound;
    const fresh = !found.includes(slug);
    if (fresh) track("discovery_completed", slug);
    learning.save({ ...learning.progress, discoveries: discover(found, slug) });
    setOutcome({ kind: "hit", compound: formed.compound, fresh });
  }

  function showHint() {
    const target = nextUp ?? hint(found);
    setOutcome({
      kind: "tip",
      message: target ? hintMessage(target) : "Katalogdaki bütün bileşikler kayıtlı.",
    });
  }

  /** Empties the bench and focuses it: "Temizle" disables itself, so focus must not stay there. */
  function clearBench() {
    edit(bench.clear);
    benchRef.current?.focus();
  }

  function resetNotebook() {
    learning.save({ ...learning.progress, discoveries: [] });
    edit(bench.clear);
    toast("Yeni keşif defteri açıldı.", { tone: "success" });
  }

  function startPaletteDrag(event: PointerEvent<HTMLElement>, id: string, addOnTap: boolean) {
    startDrag(event, { kind: "palette", id }, ({ moved, overBench }) => {
      if (moved ? overBench : addOnTap) edit(() => bench.add(id));
    });
  }

  const startChipDrag: ChipDragStart = (event, source) => {
    startDrag(event, source, ({ moved, overBench, overChip }) => {
      if (!moved) return;
      if (overChip !== null && overChip !== source.index) {
        edit(() => bench.move(source.index, overChip));
      } else if (!overBench) {
        // Dropped outside: the chip whose handle held focus is gone, so the bench takes focus.
        edit(() => bench.remove(source.id));
        benchRef.current?.focus();
      }
    });
  };

  return (
    <main className={cn("container-page pt-10 pb-24 lg:pt-14", drag && "cursor-grabbing select-none")}>
      <Seo
        title="Laboratuvar · ElementAPI"
        description="Paletten tezgâha sürükle, Dene’ye bas. Bilinen molekül deftere yazılır; uydurma tepkime yok."
        path="/lab"
      />
      <PageHeader
        eyebrow="Tezgâh"
        title="Laboratuvar"
        lead="Elementi tezgâha sürükle, oranı ayarla, Dene’ye bas. Katalogdaki molekül çıkarsa deftere yazılır; gerçek deney tarifi değil."
        actions={<LabModes />}
        aside={
          <ProgressAside
            label="Keşif"
            value={found.length}
            total={catalogSize}
            hint={progressHint(found.length)}
          />
        }
      />

      {lesson && (
        <Notice
          tone="info"
          title={`Rota: ${lesson.title}`}
          className="mt-10"
          action={
            <Button asChild variant="outline" size="sm">
              <Link to="/collection">Rotaya dön</Link>
            </Button>
          }
        >
          {lessonLeft.length > 0
            ? `Kalan keşifler: ${lessonLeft.map((compound) => compound.nameTr).join(" · ")}`
            : "Hepsi kayıtlı. Koleksiyondaki soruyu aç."}
        </Notice>
      )}

      <div
        className={cn(
          "grid gap-5 lg:grid-cols-[minmax(0,23rem)_minmax(0,1fr)]",
          lesson ? "mt-5" : "mt-10",
        )}
      >
        <ElementPalette
          counts={bench.counts}
          onAdd={(id) => edit(() => bench.add(id))}
          onDragStart={startPaletteDrag}
          draggingId={drag?.source.kind === "palette" ? drag.source.id : undefined}
        />

        <section
          ref={benchRef}
          tabIndex={-1}
          aria-labelledby={benchTitleId}
          className="panel flex min-w-0 flex-col p-4 sm:p-6"
        >
          <div className="flex items-center justify-between gap-3">
            <h2 id={benchTitleId} className="font-sans text-base font-semibold tracking-normal text-ink">
              Tezgâh
            </h2>
            <Button variant="ghost" size="sm" disabled={!hasAtoms} onClick={clearBench}>
              <RotateCcw strokeWidth={1.75} />
              Temizle
            </Button>
          </div>

          <BenchDropZone
            counts={bench.counts}
            chipIds={bench.chipIds}
            drag={drag}
            onStep={(id, delta) => edit(() => bench.add(id, delta))}
            onRemove={(id) => edit(() => bench.remove(id))}
            onMove={(from, to) => edit(() => bench.move(from, to))}
            onChipDragStart={startChipDrag}
            onStarter={mix}
          />

          <div className="mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
            <p aria-live="polite" className="flex min-w-0 items-baseline gap-3">
              <span className="text-[13px] text-ink-3">Formül</span>
              {preview ? (
                <Formula value={preview} className="text-2xl text-ink" />
              ) : (
                <span className="font-mono text-2xl text-ink-4">—</span>
              )}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={showHint}>
                <Lightbulb strokeWidth={1.75} />
                İpucu
              </Button>
              <Button disabled={!hasAtoms} onClick={() => mix()}>
                <FlaskConical strokeWidth={1.75} />
                Dene
                <ArrowRight strokeWidth={1.75} />
              </Button>
            </div>
          </div>

          <MixOutcome
            outcome={outcome}
            preview={preview}
            discovered={found.length}
            nextUp={nextUp}
            onLoad={(counts) => edit(() => bench.load(counts))}
            onRestart={clearBench}
          />

          <p className="mt-5 text-[13px] text-ink-3">
            {catalogSize} bilinen kayıt · stokiyometri ve katalog · tehlikeli madde tarifi yok.
          </p>
        </section>
      </div>

      <DiscoveryNotebook
        found={found}
        status={learning.status}
        canReset={!learning.user}
        onReset={resetNotebook}
      />

      {drag && <DragGhost drag={drag} />}
    </main>
  );
}
