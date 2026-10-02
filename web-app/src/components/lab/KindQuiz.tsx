import { useState } from "react";
import { Disclosure, DisclosureContent, DisclosureTrigger } from "@/components/ui/disclosure";
import { cn } from "@/lib/utils";
import type { KindQuestion } from "@/services/games";

/** Optional one-question check after a discovery: molecule, formula unit or mixture. */
export function KindQuiz({ quiz }: { quiz: KindQuestion }) {
  const [picked, setPicked] = useState<number | null>(null);
  const correct = picked === quiz.answer;
  const wrongNote = "Bir daha düşün. Formül birimi ile molekül aynı şey değildir.";
  const feedback = correct ? quiz.explanation : wrongNote;
  return (
    <Disclosure className="border-t border-line px-5">
      <DisclosureTrigger>İstersen kısa soru</DisclosureTrigger>
      <DisclosureContent>
        <fieldset className="pb-5">
          <legend className="text-sm text-ink-2">{quiz.question}</legend>
          <div className="mt-3 flex flex-wrap gap-2">
            {quiz.choices.map((choice, index) => (
              <button
                key={choice}
                type="button"
                aria-pressed={picked === index}
                onClick={() => setPicked(index)}
                className={cn(
                  "focus-ring inline-flex h-8 items-center rounded-sm border px-3 text-[13px] font-medium transition-[color,background-color,border-color,transform] duration-150 active:scale-[0.97]",
                  picked === index
                    ? "border-brand-line bg-brand-soft text-ink"
                    : "border-line-strong bg-surface text-ink-2 hover:border-ink-4 hover:text-ink",
                )}
              >
                {choice}
              </button>
            ))}
          </div>
          <p
            role="status"
            className={cn("mt-3 text-sm leading-6", correct ? "text-success" : "text-ink-2")}
          >
            {picked === null ? "" : feedback}
          </p>
        </fieldset>
      </DisclosureContent>
    </Disclosure>
  );
}
