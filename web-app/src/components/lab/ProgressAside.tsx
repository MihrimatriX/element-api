import type { ReactNode } from "react";
import { ProgressRing } from "@/components/ui/progress-ring";
import { Stat } from "@/components/ui/stat";

/** "%0,5", "%12": one decimal so the first find out of 214 does not read as zero. */
const percentFormat = new Intl.NumberFormat("tr-TR", {
  style: "percent",
  maximumFractionDigits: 1,
});

interface ProgressAsideProps {
  /** What is counted ("Keşif", "Doğru formül"). */
  label: string;
  value: number;
  total: number;
  /** One short line under the number. */
  hint: ReactNode;
}

/** Page-header aside for the lab modes: a progress ring next to the "x / total" count. */
export function ProgressAside({ label, value, total, hint }: ProgressAsideProps) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-line bg-surface/70 py-4 pr-6 pl-4 shadow-xs">
      <ProgressRing value={value} max={total} size={60} label={`${label} ilerlemesi`}>
        <span className="text-xs">{percentFormat.format(total > 0 ? value / total : 0)}</span>
      </ProgressRing>
      <Stat variant="plain" label={label} value={value} unit={`/ ${total}`} hint={hint} />
    </div>
  );
}
