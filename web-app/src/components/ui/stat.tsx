import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Progress } from "./progress";

interface StatProps {
  label: ReactNode;
  /** Pre-formatted value (use lib/format). */
  value: ReactNode;
  /** Unit after the value ("g", "kredi", "/ 118"). */
  unit?: ReactNode;
  /** Small line under the value. */
  hint?: ReactNode;
  /** 0–100; draws a progress bar under the value. */
  progress?: number;
  /** `panel` (default) sits in a bordered tile; `plain` is bare for headers and heroes. */
  variant?: "panel" | "plain";
  /** `lg` for hero numbers. */
  size?: "md" | "lg";
  className?: string;
}

/** One metric: label, big mono number, optional unit, hint and progress bar. Renders its own `<dl>`. */
export function Stat({
  label,
  value,
  unit,
  hint,
  progress,
  variant = "panel",
  size = "md",
  className,
}: StatProps) {
  return (
    <dl
      className={cn(
        "flex min-w-0 flex-col",
        variant === "panel" &&
          "rounded-lg border border-line bg-surface p-4 shadow-xs",
        className,
      )}
    >
      <dt className="text-[13px] text-ink-3">{label}</dt>
      <dd
        className={cn(
          "mt-2 flex items-baseline gap-1.5 font-mono leading-none text-ink tabular",
          size === "lg" ? "text-4xl tracking-tight md:text-5xl" : "text-2xl",
        )}
      >
        {value}
        {unit && <span className="text-sm text-ink-3">{unit}</span>}
      </dd>
      {hint && <dd className="mt-2 text-[13px] text-ink-3">{hint}</dd>}
      {progress !== undefined && (
        <dd className="mt-3">
          <Progress value={progress} aria-label={typeof label === "string" ? label : undefined} />
        </dd>
      )}
    </dl>
  );
}

interface StatGridProps {
  children: ReactNode;
  /** Columns from `md`; phones always show two. Default 4. */
  columns?: 2 | 3 | 4;
  className?: string;
}

const columnClass = {
  2: "md:grid-cols-2",
  3: "md:grid-cols-3",
  4: "md:grid-cols-4",
} as const;

/** Responsive grid of `Stat` tiles. */
export function StatGrid({ children, columns = 4, className }: StatGridProps) {
  return (
    <div className={cn("grid grid-cols-2 gap-3", columnClass[columns], className)}>
      {children}
    </div>
  );
}
