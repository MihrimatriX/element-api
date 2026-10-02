import { cn } from "@/lib/utils";
import { formatFixed } from "../../lib/format";

const HEIGHT = 40;
/** Keeps the stroke inside the box at the highest and lowest points. */
const INSET = 3;

/**
 * Small line chart of recent prices, scaled to its own min–max. Colour comes from
 * `currentColor`, so the caller tints it by trend. Renders nothing for fewer than two points.
 */
export function Sparkline({
  prices,
  className,
}: {
  prices: readonly number[];
  className?: string;
}) {
  if (prices.length < 2) return null;
  const low = Math.min(...prices);
  const high = Math.max(...prices);
  const span = high - low || 1;
  const line = prices
    .map((price, index) => {
      const x = (index / (prices.length - 1)) * 100;
      const y = INSET + (1 - (price - low) / span) * (HEIGHT - INSET * 2);
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");

  return (
    <svg
      role="img"
      aria-label={`Son ${prices.length} fiyat: en düşük ${formatFixed(low, 4)}, en yüksek ${formatFixed(high, 4)} kredi`}
      viewBox={`0 0 100 ${HEIGHT}`}
      preserveAspectRatio="none"
      className={cn("block h-12 w-full overflow-visible", className)}
    >
      <polygon
        points={`0,${HEIGHT} ${line} 100,${HEIGHT}`}
        className="fill-current opacity-10"
      />
      <polyline
        points={line}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
