import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight, FlaskConical, RotateCcw, Sigma } from "lucide-react";
import AtlasVisual from "@/components/AtlasVisual";
import GeometryFigure from "@/components/GeometryFigure";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Formula } from "@/components/ui/formula";
import { Skeleton } from "@/components/ui/skeleton";
import { recordKindQuestion } from "@/services/games";
import { formulaText, geometryOf, type KnownCompound } from "@/services/lab";
import { useScience, type ScientificCompound } from "@/services/science";
import { KindQuiz } from "./KindQuiz";

interface ResultCardProps {
  compound: KnownCompound;
  /** First time this compound was discovered: celebrate and offer the quiz. */
  fresh: boolean;
  /** "Next in the collection" line, or empty. */
  nextHint: string;
  onRestart: () => void;
}

/** Card for a matched compound: name, formula, structure, geometry, uses and where to go next. */
export function ResultCard({ compound, fresh, nextHint, onRestart }: ResultCardProps) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.article
      initial={reduceMotion ? false : { opacity: 0, y: 12, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 320, damping: 30 }}
      className="relative mt-4 overflow-hidden rounded-xl border border-line-strong bg-surface-2 shadow-md"
    >
      {fresh && !reduceMotion && <Celebration />}
      <div className="grid gap-5 p-5 sm:grid-cols-[minmax(0,1fr)_10rem] sm:p-6">
        <div className="min-w-0">
          <p className="eyebrow flex items-center gap-2">
            <FlaskConical aria-hidden="true" className="size-3.5" strokeWidth={1.75} />
            {fresh ? "Deftere eklendi" : "Keşif kaydı"}
          </p>
          <h3 className="mt-3 font-display text-2xl font-semibold tracking-tight text-ink md:text-3xl">
            {compound.nameTr}
          </h3>
          <Formula value={compound.formula} className="mt-1 block text-lg text-brand-ink" />
          <p className="mt-4 max-w-prose text-[15px] leading-7 text-ink-2">{compound.summary}</p>
        </div>
        <div className="w-full max-w-40 justify-self-start sm:justify-self-end">
          <ResultVisual compound={compound} />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-4 border-t border-line px-5 py-4 sm:px-6">
        <GeometryFigure compact geometry={geometryOf(compound)} />
        {compound.uses.length > 0 && (
          <ul aria-label="Kullanım alanları" className="flex flex-wrap gap-1.5">
            {compound.uses.map((use) => (
              <li key={use}>
                <Badge variant="secondary">{use}</Badge>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-line px-5 py-4 sm:px-6">
        <Button asChild variant="outline" size="sm">
          <Link to={`/compound/${compound.slug}`}>
            Bilimsel kaydı aç
            <ArrowUpRight strokeWidth={1.75} />
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link to={`/lab/formula?compound=${compound.slug}`}>
            <Sigma strokeWidth={1.75} />
            Formülü kur
          </Link>
        </Button>
        <Button variant="ghost" size="sm" onClick={onRestart}>
          <RotateCcw strokeWidth={1.75} />
          Yeniden karıştır
        </Button>
        {nextHint && <p className="basis-full pt-1 text-[13px] text-ink-3">{nextHint}</p>}
      </div>

      {fresh && <KindQuiz quiz={recordKindQuestion(compound)} />}
    </motion.article>
  );
}

/** Structure image from the science API; a skeleton while it loads, the formula when there is none. */
function ResultVisual({ compound }: { compound: KnownCompound }) {
  const { data, error } = useScience<ScientificCompound>("compounds", compound.slug);
  if (!data && !error) return <Skeleton className="aspect-square w-full rounded-lg" />;
  return (
    <AtlasVisual
      compact
      formula={formulaText(compound.formula)}
      structure={data?.media?.structure}
    />
  );
}

const PARTICLES = Array.from({ length: 8 }, (_, index) => (index / 8) * Math.PI * 2);

/** Short burst of eight cuprite dots for a first discovery (skipped with reduced motion). */
function Celebration() {
  return (
    <span aria-hidden="true" className="pointer-events-none absolute top-10 left-10">
      {PARTICLES.map((angle) => (
        <motion.i
          key={angle}
          className="absolute size-1.5 rounded-full bg-brand-ink"
          initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
          animate={{ x: Math.cos(angle) * 64, y: Math.sin(angle) * 44, opacity: 0, scale: 0.4 }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        />
      ))}
    </span>
  );
}
