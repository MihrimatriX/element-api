import { useId, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowRight, ArrowUpRight, Check, SkipForward } from "lucide-react";
import GeometryFigure from "@/components/GeometryFigure";
import Seo from "@/components/Seo";
import { LabModes } from "@/components/LabModes";
import { CountStepper } from "@/components/lab/CountStepper";
import { GradeNotice, type Grade } from "@/components/lab/GradeNotice";
import { ProgressAside } from "@/components/lab/ProgressAside";
import { elementInfo } from "@/components/lab/elementInfo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { geometryOf, parseFormula, prune, type Counts } from "@/services/chemistry";
import { familyColor } from "@/services/elementData";
import {
  formulaPool,
  gradeFormula,
  isFormulaUnit,
  pickFormula,
  readGames,
  rememberGame,
  unlockedFormulaTier,
} from "@/services/games";

/**
 * /lab/formula: read a compound's name and set each element's atom count.
 * Scores live in the games store, apart from the discovery notebook.
 * `?compound=<slug>` opens that compound first.
 */
export default function LabFormula() {
  const [params] = useSearchParams();
  const [solved, setSolved] = useState(() => readGames().formula);
  const [target, setTarget] = useState(() => pickFormula(solved, params.get("compound")));
  const [counts, setCounts] = useState<Counts>({});
  const [result, setResult] = useState<Grade | null>(null);
  const headingId = useId();
  const countsRef = useRef<HTMLUListElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const symbols = Object.keys(parseFormula(target.formula));
  const solvedNow = result?.ok === true;

  function step(symbol: string, delta: 1 | -1) {
    setCounts((current) => prune({ ...current, [symbol]: (current[symbol] ?? 0) + delta }));
    setResult(null);
  }

  /** Moves to the next compound; skipping never returns the current one. */
  function nextPuzzle() {
    setTarget(pickFormula(solved, null, target.slug));
    setCounts({});
    setResult(null);
  }

  /** "Sonraki" leaves with the solved puzzle, so focus moves to the new puzzle's first count button. */
  function continueToNextPuzzle() {
    flushSync(nextPuzzle);
    countsRef.current?.querySelector<HTMLButtonElement>("button:enabled")?.focus();
  }

  /** A correct answer disables "Kontrol et", so focus moves on to "Sonraki" once it renders. */
  function check() {
    const graded = gradeFormula(target.slug, counts);
    flushSync(() => {
      setResult(graded);
      if (graded.ok) setSolved(rememberGame("formula", target.slug).formula);
    });
    if (graded.ok) nextRef.current?.focus();
  }

  return (
    <main className="container-page pt-10 pb-24 lg:pt-14">
      <Seo
        title="Formülü kur · ElementAPI"
        description="Suda molekül, tuzda formül birimi. Adı oku, artı eksiyle atom sayısını bas. Keşif defterine yazılmaz."
        path="/lab/formula"
      />
      <PageHeader
        eyebrow="Laboratuvar"
        title="Formülü kur"
        lead="Adı verilen kaydı sayılarla kur. Sürükleme yok; artı eksi yeter. Skor deftere yazılmaz, yalnızca pratik."
        actions={<LabModes />}
        aside={
          <ProgressAside
            label="Doğru formül"
            value={solved.length}
            total={formulaPool(3).length}
            hint={`Seviye ${unlockedFormulaTier(solved.length)} açık`}
          />
        }
      />

      <section
        aria-labelledby={headingId}
        className="panel mt-10 grid overflow-hidden lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]"
      >
        <div className="border-b border-line p-5 sm:p-7 lg:border-r lg:border-b-0">
          <div className="flex items-center justify-between gap-3">
            <p className="eyebrow">Kurulacak kayıt</p>
            <Button variant="ghost" size="sm" onClick={nextPuzzle}>
              <SkipForward strokeWidth={1.75} />
              Başka kayıt
            </Button>
          </div>
          <h2
            id={headingId}
            className="mt-3 font-display text-3xl font-semibold tracking-tight text-ink md:text-4xl"
          >
            {target.nameTr}
          </h2>
          {solved.includes(target.slug) && !solvedNow && (
            <Badge variant="success" className="mt-3">
              <Check strokeWidth={2} />
              Bu kaydı daha önce doğru kurdun
            </Badge>
          )}
          <p className="mt-4 max-w-prose text-[15px] leading-7 text-ink-2">{target.summary}</p>
          <GeometryFigure geometry={geometryOf(target)} className="mt-6" />
          <p className="mt-3 text-[13px] leading-5 text-ink-3">
            {isFormulaUnit(target)
              ? "Bu bir formül birimidir; ayrı molekül arama."
              : "Bu bir molekül formülüdür."}
          </p>
        </div>

        <div className="bg-canvas-2/40 p-5 sm:p-7">
          <h3 className="font-sans text-base font-semibold tracking-normal text-ink">Atom sayıları</h3>
          <ul ref={countsRef} aria-label="Atom sayıları" className="mt-4 grid gap-2">
            {symbols.map((symbol) => {
              const { name, family } = elementInfo(symbol);
              return (
                <li
                  key={symbol}
                  style={{ "--family": familyColor(family) }}
                  className="flex items-center justify-between gap-3 rounded-lg border border-line bg-surface py-2 pr-2 pl-3"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span
                      aria-hidden="true"
                      className="grid size-9 shrink-0 place-items-center rounded-md border border-(--family)/40 bg-[color-mix(in_oklch,var(--family)_16%,var(--color-surface))] font-mono text-base font-semibold text-ink"
                    >
                      {symbol}
                    </span>
                    <span className="truncate text-sm text-ink-2">{name}</span>
                  </span>
                  <CountStepper
                    name={name}
                    count={counts[symbol] ?? 0}
                    announce
                    onStep={(delta) => step(symbol, delta)}
                  />
                </li>
              );
            })}
          </ul>

          <Button
            className="mt-5"
            disabled={Object.keys(counts).length === 0 || solvedNow}
            onClick={check}
          >
            Kontrol et
            <ArrowRight strokeWidth={1.75} />
          </Button>

          <GradeNotice grade={result} idle="Adı oku, sayıları bas. Fazla oksijen suyu bozar." />

          {solvedNow && (
            <div className="mt-4 flex flex-wrap gap-2">
              <Button ref={nextRef} size="sm" onClick={continueToNextPuzzle}>
                Sonraki
                <ArrowRight strokeWidth={1.75} />
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link to={`/compound/${target.slug}`}>
                  Bilimsel kaydı aç
                  <ArrowUpRight strokeWidth={1.75} />
                </Link>
              </Button>
            </div>
          )}
        </div>
      </section>

      <p className="mt-4 max-w-prose text-[13px] leading-5 text-ink-3">
        Skor bu tarayıcıda; keşif defterine karışmaz. Seviye 2 üç, seviye 3 sekiz doğru
        formülden sonra açılır.
      </p>
    </main>
  );
}
