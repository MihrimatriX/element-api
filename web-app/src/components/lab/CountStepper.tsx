import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CountStepperProps {
  /** Element name for the button labels ("Hidrojen azalt"). */
  name: string;
  count: number;
  onStep: (delta: 1 | -1) => void;
  /** Announce the new count to screen readers (when nothing else on the page does). */
  announce?: boolean;
  disabled?: boolean;
}

/** − count + control for one element's atom count. */
export function CountStepper({
  name,
  count,
  onStep,
  announce = false,
  disabled = false,
}: CountStepperProps) {
  return (
    <div
      role="group"
      aria-label={`${name} atom sayısı`}
      className="inline-flex h-8 shrink-0 items-center rounded-md border border-line-strong bg-canvas-2"
    >
      <Button
        variant="ghost"
        size="icon-sm"
        className="h-full rounded-r-none"
        aria-label={`${name} azalt`}
        disabled={disabled || count <= 0}
        onClick={() => onStep(-1)}
      >
        <Minus strokeWidth={1.75} />
      </Button>
      <span
        aria-live={announce ? "polite" : undefined}
        className="min-w-7 text-center font-mono text-sm text-ink tabular"
      >
        {count}
      </span>
      <Button
        variant="ghost"
        size="icon-sm"
        className="h-full rounded-l-none"
        aria-label={`${name} artır`}
        disabled={disabled}
        onClick={() => onStep(1)}
      >
        <Plus strokeWidth={1.75} />
      </Button>
    </div>
  );
}
