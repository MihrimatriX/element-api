import { cn } from "@/lib/utils";

const BEATS = {
  water: ["H₂", "+", "O", "→", "H₂O"],
  salt: ["Na", "+", "Cl", "→", "NaCl"],
  rust: ["Fe", "+", "O₂", "→", "pas"],
  quartz: ["Si", "+", "O₂", "→", "SiO₂"],
} as const;

/** Reaction shown by `WorkshopMarks`. */
export type WorkshopBeat = keyof typeof BEATS;

const OPERATORS = new Set(["+", "→"]);

/** Decorative "A + B → AB" chip row that illustrates a page about building compounds. */
export function WorkshopMarks({
  beat = "water",
  className,
}: {
  beat?: WorkshopBeat;
  className?: string;
}) {
  return (
    <div aria-hidden="true" className={cn("flex flex-wrap items-center gap-2", className)}>
      {BEATS[beat].map((text, index) =>
        OPERATORS.has(text) ? (
          <span key={index} className="font-mono text-sm text-ink-3">
            {text}
          </span>
        ) : (
          <span
            key={index}
            className="rounded-sm border border-line-strong bg-surface-2 px-2 py-0.5 font-mono text-[13px] text-ink"
          >
            {text}
          </span>
        ),
      )}
    </div>
  );
}
