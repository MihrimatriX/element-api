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

/** Feedback under the bench: ready prompt, hint, miss notice with the right ratios, or the discovery card. */
export function MixOutcome({
  outcome,
  preview,
  discovered,
  nextUp,
  onLoad,
  onRestart,
}: MixOutcomeProps) {
  if (!outcome) return preview ? <ReadyPrompt preview={preview} /> : null;

  if (outcome.kind === "tip")
    return (
      <Notice tone="neutral" title="İpucu" className="mt-4">
        {outcome.message}
      </Notice>
    );

  if (outcome.kind === "miss") {
    const { tone, title } = MISS_NOTICE[outcome.tone];
    return (
      <Notice tone={tone} title={title} role="status" className="mt-4">
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
      </Notice>
    );
  }

  const { compound, fresh } = outcome;
  const message = fresh
    ? `${compound.nameTr} deftere işlendi. ${discovered} / ${catalogSize}`
    : `Tekrar: ${compound.nameTr}. Oran tuttu; defterde zaten var.`;
  return (
    <>
      <Notice tone="success" title={fresh ? "Yeni keşif" : "Bunu biliyordun"} className="mt-4">
        {message}
      </Notice>
      <ResultCard
        key={compound.slug}
        compound={compound}
        fresh={fresh}
        nextHint={nextHintText(nextUp, discovered)}
        onRestart={onRestart}
      />
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
