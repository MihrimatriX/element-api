import { cn } from "@/lib/utils";
import { familyColor } from "@/services/elementData";
import { elementInfo } from "./elementInfo";
import type { DragState } from "./useLabDrag";

/**
 * Floating copy of the dragged element under the pointer. A bench chip held
 * outside the bench turns red, because letting go there removes it.
 */
export function DragGhost({ drag }: { drag: DragState }) {
  const { name, family } = elementInfo(drag.source.id);
  const removing = drag.source.kind === "chip" && !drag.overBench;
  return (
    <div
      aria-hidden="true"
      style={{
        "--drag-x": `${drag.x}px`,
        "--drag-y": `${drag.y}px`,
        "--family": familyColor(family),
      }}
      className={cn(
        "pointer-events-none fixed top-(--drag-y) left-(--drag-x) z-(--z-overlay) flex -translate-x-1/2 -translate-y-[120%] items-center gap-2 rounded-lg border px-3 py-2 shadow-lg",
        removing
          ? "border-danger/50 bg-[color-mix(in_oklch,var(--color-danger)_16%,var(--color-surface-2))] text-danger"
          : "border-(--family) bg-[color-mix(in_oklch,var(--family)_22%,var(--color-surface-2))] text-ink",
      )}
    >
      <span className="font-mono text-lg font-semibold">{drag.source.id}</span>
      <span className="text-[13px]">{removing ? "Bırak: tezgâhtan çıkar" : name}</span>
    </div>
  );
}
