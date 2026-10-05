import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, BookOpen, Check, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Formula } from "@/components/ui/formula";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { materialById } from "../../services/lab";
import type { LearningProgress, Lesson } from "../../services/lessons";
import { QuizQuestion } from "./QuizQuestion";

/** Each route borrows the colour of the element family it leans on. */
const ROUTE_COLOR: Record<string, string> = {
  everyday: "var(--color-family-nonmetal)",
  salts: "var(--color-family-alkali)",
  oxides: "var(--color-family-transition)",
  acids: "var(--color-family-halogen)",
  organics: "var(--color-family-post)",
  environment: "var(--color-family-alkaline)",
};

interface LessonCardProps {
  lesson: Lesson;
  progress: LearningProgress;
  /** Called once the last question of the route is answered correctly. */
  onComplete: (lessonId: string) => void;
}

/**
 * One learning route: its compounds (found ones ticked), then, depending on progress,
 * a link back to the lab, the route's questions, or the explanations once completed.
 */
export function LessonCard({ lesson, progress, onComplete }: LessonCardProps) {
  const total = lesson.discoveries.length;
  const found = lesson.discoveries.filter((id) =>
    progress.discoveries.includes(id),
  ).length;
  const completed = progress.lessons.includes(lesson.id);
  const unlocked = found === total;

  return (
    <article
      style={{
        "--route": ROUTE_COLOR[lesson.id] ?? "var(--color-family-unknown)",
      }}
      className="panel flex flex-col p-5"
    >
      <header className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className="grid size-9 shrink-0 place-items-center rounded-lg border border-[color-mix(in_oklch,var(--route)_35%,transparent)] bg-[color-mix(in_oklch,var(--route)_14%,var(--color-surface))] text-(--route)"
        >
          <BookOpen className="size-4" strokeWidth={1.75} />
        </span>
        <h3 className="min-w-0 flex-1 pt-1.5 font-sans text-base leading-6 font-semibold tracking-normal text-ink">
          {lesson.title}
        </h3>
        {completed ? (
          <Badge variant="success" className="mt-1.5">
            <Check strokeWidth={2} /> Tamamlandı
          </Badge>
        ) : (
          <Badge variant="secondary" className="mt-1.5 font-mono tabular">
            {found} / {total} keşif
          </Badge>
        )}
      </header>
      <p className="mt-3 text-sm leading-6 text-ink-2">{lesson.description}</p>

      <Progress
        value={found}
        max={total}
        aria-label={`${lesson.title}: ${found} / ${total} keşif`}
        className="mt-5"
      />
      <ul
        aria-label="Rotanın bileşikleri"
        className="mt-4 flex flex-wrap gap-2"
      >
        {lesson.discoveries.map((id) => (
          <li key={id}>
            <DiscoveryChip id={id} found={progress.discoveries.includes(id)} />
          </li>
        ))}
      </ul>

      <div className="mt-auto pt-5">
        {completed && <LessonExplanations lesson={lesson} />}
        {!completed && unlocked && (
          <LessonQuiz lesson={lesson} onComplete={onComplete} />
        )}
        {!unlocked && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
            <p className="flex items-center gap-2 text-[13px] text-ink-3">
              <Lock
                aria-hidden="true"
                className="size-3.5"
                strokeWidth={1.75}
              />
              Soru, {total} bileşik kaydedilince açılır.
            </p>
            <Button asChild variant="outline" size="sm">
              <Link to={`/lab?lesson=${lesson.id}`}>
                Keşiflere devam et <ArrowRight strokeWidth={1.75} />
              </Link>
            </Button>
          </div>
        )}
      </div>
    </article>
  );
}

/** Compound link inside a route; ticked once discovered. */
function DiscoveryChip({ id, found }: { id: string; found: boolean }) {
  const material = materialById[id];
  return (
    <Link
      to={`/compound/${id}`}
      title={material.name}
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-sm border px-2.5 text-[13px] transition-colors duration-150",
        found
          ? "border-success/30 bg-success-soft text-ink hover:border-success/55"
          : "border-line bg-canvas-2 text-ink-3 hover:border-line-strong hover:text-ink-2",
      )}
    >
      <Formula value={material.formula} />
      {found && (
        <Check
          aria-hidden="true"
          className="size-3.5 text-success"
          strokeWidth={2}
        />
      )}
      <span className="sr-only">
        {`, ${material.name}, ${found ? "keşfedildi" : "henüz keşfedilmedi"}`}
      </span>
    </Link>
  );
}

/** Walks through the route's questions one at a time. */
function LessonQuiz({
  lesson,
  onComplete,
}: {
  lesson: Lesson;
  onComplete: (lessonId: string) => void;
}) {
  const [step, setStep] = useState(0);
  const total = lesson.questions.length;
  const question = lesson.questions[step];

  function handleCorrect() {
    if (step + 1 < total) setStep(step + 1);
    else onComplete(lesson.id);
  }

  return (
    <div className="border-t border-line pt-4">
      <QuizQuestion
        key={step}
        prompt={question.question}
        choices={question.choices}
        answer={question.answer}
        stepLabel={total > 1 ? `${step + 1}/${total}` : undefined}
        onCorrect={handleCorrect}
      />
    </div>
  );
}

/** What the completed route taught: every question's explanation. */
function LessonExplanations({ lesson }: { lesson: Lesson }) {
  return (
    <div className="grid gap-2 rounded-lg border border-success/25 bg-success-soft p-4">
      {lesson.questions.map((question) => (
        <p
          key={question.question}
          className="flex gap-2.5 text-sm leading-6 text-ink-2"
        >
          <Check
            aria-hidden="true"
            className="mt-1 size-4 shrink-0 text-success"
            strokeWidth={2}
          />
          {question.explanation}
        </p>
      ))}
    </div>
  );
}
