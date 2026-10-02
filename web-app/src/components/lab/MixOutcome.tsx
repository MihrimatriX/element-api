import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Formula } from "@/components/ui/formula";
import { Notice } from "@/components/ui/notice";
import type { Tone } from "@/components/ui/classes";
import { parseFormula, type Counts } from "@/services/chemistry";
import { catalogSize, type KnownCompound, type MissTone } from "@/services/lab";
import { ResultCard } from "./ResultCard";

/** What the bench shows after "Dene" or "İpucu". */
export type Outcome =
  | { kind: "hit"; compound: KnownCompound; fresh: boolean }
  | { kind: "miss"; tone: MissTone; message: string; cousins: KnownCompound[] }
  | { kind: "tip"; message: string };

const MISS_NOTICE: Record<MissTone, { tone: Tone; title: string }> = {
  almost: { tone: "warning", title: "Neredeyse" },
  impossible: { tone: "danger", title: "Bu karışmaz" },
  unknown: { tone: "info", title: "Katalogda yok" },
  empty: { tone: "neutral", title: "Tezgâh boş" },
};

interface MixOutcomeProps {
  outcome: Outcome | null;
  /** Formula of the atoms on the bench, or "" when it is empty. */
  preview: string;
  /** Discoveries after this mix, for the "x / 214" line. */
  discovered: number;
  /** Next compound to aim for (lesson or catalogue order). */
  nextUp: KnownCompound | undefined;
  onLoad: (counts: Counts) => void;
  onRestart: () => void;
}

function noticeLook(outcome: Outcome | null): { tone: Tone; title?: string } {
  if (!outcome) return { tone: "neutral" };
  if (outcome.kind === "tip") return { tone: "neutral", title: "İpucu" };
  if (outcome.kind === "miss") return MISS_NOTICE[outcome.tone];
  return { tone: "success", title: outcome.fresh ? "Yeni keşif" : "Bunu biliyordun" };
}

/**
 * Feedback under the bench: ready prompt, hint, miss notice with the right
 * ratios, or the discovery card. The status notice stays mounted while idle,
 * empty and visually hidden: screen readers often skip a live region that
 * arrives together with its text, but read text added to one already there.
 */
export function MixOutcome({
  outcome,
  preview,
  discovered,
  nextUp,
  onLoad,
  onRestart,
}: MixOutcomeProps) {
  const { tone, title } = noticeLook(outcome);
  return (
    <>
      {!outcome && preview && <ReadyPrompt preview={preview} />}
      <div className={outcome ? "mt-4" : "sr-only"}>
        <Notice tone={tone} title={title} role="status">
          {outcome && <OutcomeMessage outcome={outcome} discovered={discovered} onLoad={onLoad} />}
        </Notice>
      </div>
      {outcome?.kind === "hit" && (
        <ResultCard
          key={outcome.compound.slug}
          compound={outcome.compound}
          fresh={outcome.fresh}
          nextHint={nextHintText(nextUp, discovered)}
          onRestart={onRestart}
        />
      )}
    </>
  );
}

/** Body of the status notice; a miss offers the catalogue ratios for the same elements. */
function OutcomeMessage({
  outcome,
  discovered,
  onLoad,
}: {
  outcome: Outcome;
  discovered: number;
  onLoad: (counts: Counts) => void;
}) {
  if (outcome.kind === "tip") return outcome.message;
  if (outcome.kind === "hit")
    return outcome.fresh
      ? `${outcome.compound.nameTr} deftere işlendi. ${discovered} / ${catalogSize}`
      : `Tekrar: ${outcome.compound.nameTr}. Oran tuttu; defterde zaten var.`;
  return (
    <>
      <p>{outcome.message}</p>
      {outcome.cousins.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-[13px] text-ink-3">Doğru oranı yükle:</span>
          {outcome.cousins.slice(0, 4).map((cousin) => (
            <Button
              key={cousin.slug}
              variant="outline"
              size="xs"
              aria-label={`${cousin.nameTr} oranını yükle`}
              onClick={() => onLoad(parseFormula(cousin.formula))}
            >
              <Formula value={cousin.formula} />
            </Button>
          ))}
        </div>
      )}
    </>
  );
}

function nextHintText(nextUp: KnownCompound | undefined, discovered: number): string {
  if (nextUp) return `Koleksiyonda sıradaki: ${nextUp.nameTr}.`;
  if (discovered === catalogSize)
    return "Katalog tamam. Formülü kur ve dedektif modlarına bakabilirsin.";
  return "";
}

/** Atoms on the bench, nothing tried yet. */
function ReadyPrompt({ preview }: { preview: string }) {
  return (
    <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-3 rounded-lg border border-line bg-canvas-2/50 px-4 py-3.5">
      <p aria-hidden="true" className="flex items-center gap-2.5 font-mono text-lg text-ink-2">
        <Formula value={preview} className="text-ink" />
        <ArrowRight className="size-4 text-ink-3" strokeWidth={1.75} />
        <span className="text-ink-3">?</span>
      </p>
      <div className="min-w-0 flex-1 basis-60">
        <p className="text-sm font-medium text-ink">Hazır. Dene’ye bas.</p>
        <p className="text-[13px] leading-5 text-ink-3">
          Oran tutarsa kayıt kartı açılır. Tutmazsa neyin uymadığını söyleriz;
          uydurma tepkime yok.
        </p>
      </div>
    </div>
  );
}
