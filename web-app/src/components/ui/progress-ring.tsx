import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ProgressRingProps {
  value: number;
  max?: number;
  /** Diameter in px. Default 64. */
  size?: number;
  /** Ring thickness in px. Default 5. */
  thickness?: number;
  /** Accessible name, e.g. "Rota ilerlemesi". */
  label: string;
  /** Centre content; defaults to the percentage. */
  children?: ReactNode;
  className?: string;
}

/** Circular progress meter (role="progressbar") with the percentage, or custom content, in the middle. */
export function ProgressRing({
  value,
  max = 100,
  size = 64,
  thickness = 5,
  label,
  children,
  className,
}: ProgressRingProps) {
  const percent = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  const radius = (size - thickness) / 2;
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      className={cn("relative inline-grid shrink-0 place-items-center", className)}
      style={{ "--ring-size": `${size}px` }}
    >
      <svg
        aria-hidden="true"
        viewBox={`0 0 ${size} ${size}`}
        className="size-(--ring-size) -rotate-90"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={thickness}
          className="stroke-surface-3"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={thickness}
          strokeLinecap="round"
          pathLength={100}
          strokeDasharray={100}
          strokeDashoffset={100 - percent}
          className="stroke-brand-ink transition-[stroke-dashoffset] duration-700 ease-out-expo"
        />
      </svg>
      <span className="absolute inset-0 grid place-items-center font-mono text-sm text-ink tabular">
        {children ?? `%${Math.round(percent)}`}
      </span>
    </div>
  );
}
