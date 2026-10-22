import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const DEFAULT_RETRY_HINT =
  "Bir daha düşün. İlgili bilimsel kayıtlardaki formül açıklamalarından yararlanabilirsin.";

interface QuizQuestionProps {
  prompt: string;
  choices: readonly string[];
  /** Index of the correct choice. */
  answer: number;
  /** Position in a multi-question set, e.g. "1/2". */
  stepLabel?: string;
  /** Shown after a wrong pick. */
  retryHint?: string;
  /** Called when the correct choice is picked. */
  onCorrect: () => void;
}

/**
 * One multiple-choice question. A wrong pick is marked and explained, the right one
 * calls `onCorrect`. Give it a new `key` to move on to the next question.
 */
export function QuizQuestion({
  prompt,
  choices,
  answer,
  stepLabel,
  retryHint = DEFAULT_RETRY_HINT,
  onCorrect,
}: QuizQuestionProps) {
  const [picked, setPicked] = useState<number | null>(null);
  const wrongPick = picked !== null && picked !== answer;

  function pick(index: number) {
    setPicked(index);
    if (index === answer) onCorrect();
  }

  return (
    <fieldset className="min-w-0">
      <legend className="mb-3 text-sm leading-6 font-medium text-ink">
        {stepLabel && (
          <span className="mr-2 font-mono text-[13px] text-ink-3 tabular">
            {stepLabel}
          </span>
        )}
        {prompt}
      </legend>
      <div className="grid gap-2">
        {choices.map((choice, index) => {
          const isWrong = wrongPick && picked === index;
          return (
            <Button
              key={choice}
              type="button"
              variant="plain"
              size="none"
              aria-pressed={picked === index}
              onClick={() => pick(index)}
              className={cn(
                "min-h-10 justify-start gap-3 rounded-md border px-3 py-2 text-left text-sm whitespace-normal",
                isWrong
                  ? "border-danger/40 bg-danger-soft text-ink"
                  : "border-line-strong bg-canvas-2 text-ink-2 hover:border-ink-4 hover:bg-surface-2 hover:text-ink",
              )}
            >
              <span aria-hidden="true" className="font-mono text-xs text-ink-3">
                {String.fromCharCode(65 + index)}
              </span>
              {choice}
            </Button>
          );
        })}
      </div>
      <p
        role="status"
        className="mt-2 text-[13px] leading-5 text-warning empty:mt-0"
      >
        {wrongPick ? retryHint : ""}
      </p>
    </fieldset>
  );
}
