import { useEffect, useId, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { FlaskConical, GripVertical, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Formula } from "@/components/ui/formula";
import { cn } from "@/lib/utils";
import type { Counts } from "@/services/chemistry";
import { CountStepper } from "./CountStepper";
import { elementInfo, familyColor } from "./elementInfo";
import type { DragSource, DragState } from "./useLabDrag";

/** Ready-made mixes for a quick start; choosing one loads it and runs "Dene". */
const STARTERS: { label: string; formula: string; counts: Counts }[] = [
  { label: "Su", formula: "H2O", counts: { H: 2, O: 1 } },
  { label: "Tuz", formula: "NaCl", counts: { Na: 1, Cl: 1 } },
  { label: "Karbondioksit", formula: "CO2", counts: { C: 1, O: 2 } },
];

const HOW_TO = [
  { step: "Sürükle", detail: "paletten tezgâha" },
  { step: "Ayarla", detail: "+ ve − ile oran" },
  { step: "Dene", detail: "eşleşirse kart açılır" },
];

/** Starts dragging a bench chip by its handle. */
export type ChipDragStart = (
  event: PointerEvent<HTMLElement>,
  source: Extract<DragSource, { kind: "chip" }>,
) => void;

interface BenchDropZoneProps {
  counts: Counts;
  chipIds: string[];
  drag: DragState | null;
  onStep: (id: string, delta: 1 | -1) => void;
  onRemove: (id: string) => void;
  onMove: (from: number, to: number) => void;
  onChipDragStart: ChipDragStart;
  onStarter: (counts: Counts) => void;
}

/**
 * The bench: drop zone (`data-lab-drop`) holding one chip per element. Chips
 * reorder by dragging their handle or with the arrow keys on it, and leave the
 * bench when dropped outside it or with their remove button.
 */
export function BenchDropZone({
  counts,
  chipIds,
  drag,
  onStep,
  onRemove,
  onMove,
  onChipDragStart,
  onStarter,
}: BenchDropZoneProps) {
  const hintId = useId();
  const listRef = useRef<HTMLUListElement>(null);
  const [moved, setMoved] = useState<{ id: string; position: number } | null>(null);
  const hot = Boolean(drag?.overBench);

  // Moving a chip re-inserts its DOM node, which drops focus; put it back on the handle.
  useEffect(() => {
    if (!moved) return;
    listRef.current
      ?.querySelector<HTMLElement>(`[data-chip-handle="${CSS.escape(moved.id)}"]`)
      ?.focus();
  }, [moved]);

  function moveWithKeys(event: KeyboardEvent, index: number, id: string) {
    const offsets: Record<string, number> = { ArrowLeft: -1, ArrowUp: -1, ArrowRight: 1, ArrowDown: 1 };
    const offset = offsets[event.key];
    if (offset === undefined) return;
    event.preventDefault();
    const target = index + offset;
    if (target < 0 || target >= chipIds.length) return;
    onMove(index, target);
    setMoved({ id, position: target + 1 });
  }

  return (
    <div
      data-lab-drop
      className={cn(
        "relative mt-4 rounded-lg border border-dashed p-3 transition-colors duration-150 sm:p-4",
        hot ? "border-brand-ink bg-brand-soft" : "border-line-strong bg-canvas-2/60",
        drag && !hot && "border-ink-4",
        chipIds.length === 0 && "grid min-h-64 place-items-center",
      )}
    >
      {chipIds.length === 0 ? (
        <BenchInvite dropping={hot} onStarter={onStarter} />
      ) : (
        <>
          <p id={hintId} className="sr-only">
            Sırayı değiştirmek için tutamaçta sol ve sağ ok tuşlarını kullan.
          </p>
          <ul ref={listRef} aria-label="Tezgâhtaki elementler" className="flex flex-wrap gap-2">
            {chipIds.map((id, index) => (
              <BenchChip
                key={id}
                id={id}
                index={index}
                count={counts[id] ?? 0}
                hintId={hintId}
                drag={drag}
                onStep={onStep}
                onRemove={onRemove}
                onHandleKeyDown={moveWithKeys}
                onDragStart={onChipDragStart}
              />
            ))}
          </ul>
        </>
      )}
      <p aria-live="polite" className="sr-only">
        {moved ? `${elementInfo(moved.id).name} ${moved.position}. sırada.` : ""}
      </p>
    </div>
  );
}

interface BenchChipProps {
  id: string;
  index: number;
  count: number;
  hintId: string;
  drag: DragState | null;
  onStep: (id: string, delta: 1 | -1) => void;
  onRemove: (id: string) => void;
  onHandleKeyDown: (event: KeyboardEvent, index: number, id: string) => void;
  onDragStart: ChipDragStart;
}

/** One element on the bench: handle, symbol and name, − count + and remove. */
function BenchChip({
  id,
  index,
  count,
  hintId,
  drag,
  onStep,
  onRemove,
  onHandleKeyDown,
  onDragStart,
}: BenchChipProps) {
  const reduceMotion = useReducedMotion();
  const { name, family } = elementInfo(id);
  const chipDrag = drag?.source.kind === "chip" ? drag : null;
  const isSource = chipDrag?.source.id === id;
  const isTarget = !isSource && chipDrag?.overChip === index;
  return (
    <motion.li
      layout={!reduceMotion}
      initial={reduceMotion ? false : { opacity: 0, scale: 0.94, y: 4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 420, damping: 30 }}
      data-lab-chip={index}
      style={{ "--family": familyColor(family) }}
      className={cn(
        "relative flex items-center gap-2 overflow-hidden rounded-lg border border-line-strong bg-[color-mix(in_oklch,var(--family)_12%,var(--color-surface-2))] py-1 pr-1 pl-0.5 shadow-xs transition-[opacity,box-shadow] before:absolute before:inset-y-0 before:left-0 before:w-0.5 before:bg-(--family)",
        isSource && "opacity-40",
        isTarget && "ring-2 ring-brand-ink",
      )}
    >
      <button
        type="button"
        data-chip-handle={id}
        aria-label={`${name}: sırasını değiştir`}
        aria-describedby={hintId}
        onKeyDown={(event) => onHandleKeyDown(event, index, id)}
        onPointerDown={(event) => onDragStart(event, { kind: "chip", id, index })}
        className="focus-ring grid h-8 w-6 shrink-0 cursor-grab touch-none place-items-center rounded-sm text-ink-3 transition-colors hover:text-ink active:cursor-grabbing"
      >
        <GripVertical aria-hidden="true" className="size-4" strokeWidth={1.75} />
      </button>
      <span className="min-w-6 font-mono text-lg leading-none font-semibold text-ink">{id}</span>
      <span className="text-[13px] text-ink-2 max-sm:sr-only">{name}</span>
      <CountStepper name={name} count={count} onStep={(delta) => onStep(id, delta)} />
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={`${name} kaldır`}
        onClick={() => onRemove(id)}
      >
        <X strokeWidth={1.75} />
      </Button>
    </motion.li>
  );
}

/** Empty bench: how the lab works and three ready-made mixes. */
function BenchInvite({
  dropping,
  onStarter,
}: {
  dropping: boolean;
  onStarter: (counts: Counts) => void;
}) {
  if (dropping)
    return <p className="font-medium text-ink">Bırak: tezgâha eklenir.</p>;
  return (
    <div className="flex max-w-md flex-col items-center px-2 py-6 text-center">
      <span
        aria-hidden="true"
        className="grid size-11 place-items-center rounded-xl border border-line bg-surface text-brand-ink shadow-xs"
      >
        <FlaskConical className="size-5" strokeWidth={1.75} />
      </span>
      <h3 className="mt-4 font-sans text-base font-semibold tracking-normal text-ink">
        Tezgâh boş
      </h3>
      <p className="mt-1.5 text-sm leading-6 text-ink-2">
        Paletten bir elementi buraya sürükle veya üstüne tıkla. Hızlı başlamak
        için hazır bir karışım seç.
      </p>
      <ol
        aria-label="Nasıl oynanır"
        className="mt-5 flex flex-wrap justify-center gap-x-5 gap-y-2 text-[13px] text-ink-3"
      >
        {HOW_TO.map((item, index) => (
          <li key={item.step} className="flex items-center gap-1.5">
            <span className="grid size-5 place-items-center rounded-full border border-line-strong font-mono text-[11px] text-ink-2">
              {index + 1}
            </span>
            <span>
              <span className="font-medium text-ink-2">{item.step}:</span> {item.detail}
            </span>
          </li>
        ))}
      </ol>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {STARTERS.map((starter) => (
          <Button
            key={starter.label}
            variant="outline"
            size="sm"
            onClick={() => onStarter(starter.counts)}
          >
            <Sparkles strokeWidth={1.75} />
            {starter.label}
            <Formula value={starter.formula} className="text-ink-3" />
          </Button>
        ))}
      </div>
    </div>
  );
}
