import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  LENS_VALUE_LABEL,
  NUMERIC_LENSES,
  PHASES,
  formatLensNumber,
  heatPaint,
  isNumericLens,
  type Lens,
  type LensDomain,
} from "./lenses";

const SCALE_STOPS = [0, 0.25, 0.5, 0.75, 1];

/** Same tile fill as heat-lens tiles, sampled at five points. */
const scaleGradient = `linear-gradient(to right, ${SCALE_STOPS.map(
  (stop) => `${heatPaint(stop).fill} ${stop * 100}%`,
).join(", ")})`;

interface LensLegendProps {
  lens: Lens;
  /** Range of the numeric lens; undefined while data loads. */
  domain?: LensDomain;
  className?: string;
}

/**
 * Key for the active colour lens: a numeric colour scale with its range (mass, electronegativity)
 * or the three state swatches (phase), plus the hatch used for missing data. Nothing for the
 * family lens, whose key is the family filter.
 */
export function LensLegend({ lens, domain, className }: LensLegendProps) {
  if (lens === "category") return null;
  const unit = isNumericLens(lens) ? NUMERIC_LENSES[lens].unit : "standart koşullarda";

  return (
    <div className={cn("grid content-center gap-1.5", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <p className="truncate text-[11px] leading-4 font-medium text-ink-2">
          {LENS_VALUE_LABEL[lens]} <span className="text-ink-3">· {unit}</span>
        </p>
        <MissingKey label={lens === "phase" ? "Bilinmiyor" : "Veri yok"} />
      </div>
      {isNumericLens(lens) ? <ColorScale domain={domain} /> : <PhaseKey />}
    </div>
  );
}

function ColorScale({ domain }: { domain?: LensDomain }) {
  if (!domain) return <Skeleton className="h-[1.6rem] w-full" />;
  const [min, max] = domain;
  return (
    <div>
      <div
        aria-hidden="true"
        style={{ "--scale": scaleGradient }}
        className="h-2 rounded-full border border-line bg-(image:--scale)"
      />
      <p className="mt-1 flex justify-between font-mono text-[11px] leading-4 text-ink-3 tabular">
        <span>
          <span className="sr-only">En düşük </span>
          {formatLensNumber(min)}
        </span>
        <span>
          <span className="sr-only">En yüksek </span>
          {formatLensNumber(max)}
        </span>
      </p>
    </div>
  );
}

function PhaseKey() {
  return (
    <ul className="flex flex-wrap gap-x-3 gap-y-1">
      {Object.entries(PHASES).map(([state, phase]) => (
        <li key={state} className="flex items-center gap-1.5 text-[12px] text-ink-2">
          <span
            aria-hidden="true"
            style={{ "--swatch": phase.color }}
            className="size-2.5 rounded-xs bg-(--swatch)"
          />
          {phase.label}
        </li>
      ))}
    </ul>
  );
}

/** Hatched swatch matching ElementTile's `missing` state. */
function MissingKey({ label }: { label: string }) {
  return (
    <span className="flex shrink-0 items-center gap-1.5 text-[11px] leading-4 text-ink-3">
      <span
        aria-hidden="true"
        className="size-2.5 rounded-xs border border-line-strong bg-[repeating-linear-gradient(135deg,var(--color-surface)_0_3px,var(--color-surface-3)_3px_4px)]"
      />
      {label}
    </span>
  );
}
