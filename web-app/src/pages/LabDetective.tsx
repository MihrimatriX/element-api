import { useId, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { Link, useSearchParams } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, ArrowUpRight, Lightbulb, Lock, SkipForward } from "lucide-react";
import Seo from "@/components/Seo";
import { LabModes } from "@/components/LabModes";
import { GradeNotice, type Grade } from "@/components/lab/GradeNotice";
import { ProgressAside } from "@/components/lab/ProgressAside";
import { elementInfo } from "@/components/lab/elementInfo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { cn } from "@/lib/utils";
import { familyColor } from "@/services/elementData";
import {
  detectivePool,
  gradeDetective,
  pickDetective,
  readGames,
  rememberGame,
} from "@/services/games";

/**
 * /lab/detective: reveal clues one by one and name the element, by typing or
 * by picking one of four candidates. `?element=fe` (any case) opens that case.
 */
export default function LabDetective() {
  const [params] = useSearchParams();
  const reduceMotion = useReducedMotion();
  const [solved, setSolved] = useState(() => readGames().detective);
  const [item, setItem] = useState(() => pickDetective(solved, params.get("element")));
  const [open, setOpen] = useState(1);
  const [guess, setGuess] = useState("");
  const [result, setResult] = useState<Grade | null>(null);
  const [wrongPicks, setWrongPicks] = useState<string[]>([]);
  const headingId = useId();
  const guessRef = useRef<HTMLInputElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const { element, clues, choices } = item;
  const solvedNow = result?.ok === true;

  // A correct answer disables the guess controls, the last clue removes "Başka ipucu" and a new
  // case removes "Sonraki". Each handler below moves focus on before its control goes away.

  /** Moves to the next case; "Pas geç" never returns the current element. */
  function nextCase() {
    setItem(pickDetective(solved, null, element.symbol));
    setOpen(1);
    setGuess("");
    setResult(null);
    setWrongPicks([]);
  }

  /** "Sonraki": the guess field is enabled again only after the new case renders. */
  function continueToNextCase() {
    flushSync(nextCase);
    guessRef.current?.focus();
  }

  function revealClue() {
    const next = open + 1;
    if (next === clues.length) guessRef.current?.focus();
    setOpen(next);
  }

  function submit(value: string) {
    const graded = gradeDetective(element.symbol, value);
    flushSync(() => {
      setResult(graded);
      if (graded.ok) setSolved(rememberGame("detective", element.symbol).detective);
    });
    if (graded.ok) nextRef.current?.focus();
  }

  function pick(symbol: string) {
    setGuess(symbol);
    submit(symbol);
    if (symbol !== element.symbol) setWrongPicks((current) => [...current, symbol]);
  }

  return (
    <main className="container-page pt-10 pb-24 lg:pt-14">
      <Seo
        title="Element dedektifi · ElementAPI"
        description="İpucu ipucu element bul. Pas rengi demire götürebilir. Skor keşif defterine yazılmaz."
        path="/lab/detective"
      />
      <PageHeader
        eyebrow="Laboratuvar"
        title="Element dedektifi"
        lead="İpucu aç, elementi bul. İpuçları adı veya sembolü söylemez; skor deftere yazılmaz."
        actions={<LabModes />}
        aside={
          <ProgressAside
            label="Doğru teşhis"
            value={solved.length}
            total={detectivePool().length}
            hint="Bu tarayıcıda"
          />
        }
      />

      <section
        aria-labelledby={headingId}
        className="panel mt-10 grid overflow-hidden lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]"
      >
        <div className="border-b border-line p-5 sm:p-7 lg:border-r lg:border-b-0">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <h2 id={headingId} className="font-sans text-base font-semibold tracking-normal text-ink">
                İpuçları
              </h2>
              <Badge variant="secondary" className="font-mono tabular">
                {open} / {clues.length}
              </Badge>
            </div>
            <Button variant="ghost" size="sm" onClick={nextCase}>
              <SkipForward strokeWidth={1.75} />
              Pas geç
            </Button>
          </div>

          <ol className="mt-5 grid gap-2">
            {clues.map((clue, index) =>
              index < open ? (
                <motion.li
                  key={clue}
                  initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  className="flex gap-3 rounded-lg border border-line bg-surface-2 px-4 py-3 text-[15px] leading-6 text-ink"
                >
                  <span className="mt-0.5 font-mono text-[13px] text-brand-ink tabular">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  {clue}
                </motion.li>
              ) : (
                <li
                  key={clue}
                  aria-hidden="true"
                  className="flex items-center gap-3 rounded-lg border border-dashed border-line px-4 py-3 text-[13px] text-ink-3"
                >
                  <Lock className="size-3.5" strokeWidth={1.75} />
                  Kapalı ipucu
                </li>
              ),
            )}
          </ol>
          {/* Reads out each clue as it opens, while focus stays on "Başka ipucu". The key makes a
              new case's first clue a fresh node, so it is read even when its text repeats. */}
          <p aria-live="polite" aria-atomic="true" className="sr-only">
            <span key={`${element.symbol}-${open}`}>{`${open}. ipucu: ${clues[open - 1]}`}</span>
          </p>

          {open < clues.length && !solvedNow && (
            <Button variant="outline" className="mt-4" onClick={revealClue}>
              <Lightbulb strokeWidth={1.75} />
              Başka ipucu ({open}/{clues.length})
            </Button>
          )}
        </div>

        <div className="bg-canvas-2/40 p-5 sm:p-7">
          <form
            className="flex items-end gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              submit(guess);
            }}
          >
            <Field label="Element adı veya sembol" className="min-w-0 flex-1">
              <Input
                ref={guessRef}
                value={guess}
                autoComplete="off"
                spellCheck={false}
                disabled={solvedNow}
                onChange={(event) => setGuess(event.target.value)}
              />
            </Field>
            <Button type="submit" disabled={solvedNow || !guess.trim()}>
              Tahmin et
            </Button>
          </form>

          <p className="mt-6 text-[13px] text-ink-3">Ya da adaylardan birini seç</p>
          <div role="group" aria-label="Aday elementler" className="mt-2 grid grid-cols-2 gap-2">
            {choices.map((choice) => {
              const wrong = wrongPicks.includes(choice.symbol);
              const correct = solvedNow && choice.symbol === element.symbol;
              return (
                <button
                  key={choice.symbol}
                  type="button"
                  disabled={solvedNow}
                  onClick={() => pick(choice.symbol)}
                  style={{ "--family": familyColor(elementInfo(choice.symbol).family) }}
                  className={cn(
                    "focus-ring relative flex items-center justify-between gap-2 overflow-hidden rounded-lg border bg-surface py-2.5 pr-3 pl-4 text-left text-sm transition-[background-color,border-color,transform] duration-150 before:absolute before:inset-y-0 before:left-0 before:w-0.5 before:bg-(--family) hover:bg-surface-2 active:scale-[0.98] disabled:pointer-events-none",
                    wrong && "border-danger/40 text-ink-3 line-through",
                    correct && "border-success/50 bg-success-soft text-ink",
                    !wrong && !correct && "border-line-strong text-ink-2",
                  )}
                >
                  <span className="truncate">{choice.name}</span>
                  <span className="font-mono text-base font-semibold text-ink">{choice.symbol}</span>
                </button>
              );
            })}
          </div>

          <GradeNotice grade={result} idle="İlk ipucuyla başla. Yetmezse öbürünü aç." />

          {solvedNow && (
            <div className="mt-4 flex flex-wrap gap-2">
              <Button ref={nextRef} size="sm" onClick={continueToNextCase}>
                Sonraki
                <ArrowRight strokeWidth={1.75} />
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link to={`/element/${element.symbol.toLowerCase()}`}>
                  Element kaydını aç
                  <ArrowUpRight strokeWidth={1.75} />
                </Link>
              </Button>
            </div>
          )}
        </div>
      </section>

      <p className="mt-4 max-w-prose text-[13px] leading-5 text-ink-3">
        Havuz ilk 36 element. İpucu sembolü ağzından kaçırmaz. Skor deftere yazılmaz.
      </p>
    </main>
  );
}
