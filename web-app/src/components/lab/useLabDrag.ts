import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";

/** What is being dragged: an element from the palette, or a chip already on the bench. */
export type DragSource =
  | { kind: "palette"; id: string }
  | { kind: "chip"; id: string; index: number };

/** Live drag position and what lies under the pointer. */
export interface DragState {
  source: DragSource;
  x: number;
  y: number;
  /** Pointer is over the bench drop zone (`[data-lab-drop]`). */
  overBench: boolean;
  /** Index of the bench chip under the pointer (`[data-lab-chip]`). */
  overChip: number | null;
}

/** How a press ended: `moved` is false for a plain tap or click. */
export interface DragEnd {
  moved: boolean;
  overBench: boolean;
  overChip: number | null;
}

/** Pixels the pointer must travel before a press becomes a drag. */
const DRAG_THRESHOLD = 6;

function hitTest(x: number, y: number) {
  const target = document.elementFromPoint(x, y);
  const chip = target?.closest<HTMLElement>("[data-lab-chip]");
  return {
    overBench: Boolean(target?.closest("[data-lab-drop]")),
    overChip: chip ? Number(chip.dataset.labChip) : null,
  };
}

/**
 * Pointer drag and drop for the lab (mouse, pen and touch) without a library.
 * The drag follows window-level pointer events; the drop target is found with
 * `elementFromPoint`, so the ghost must ignore pointer events. A cancelled
 * pointer (for example the browser taking over a touch scroll) ends silently.
 */
export function useLabDrag() {
  const [drag, setDrag] = useState<DragState | null>(null);
  const stopRef = useRef<(() => void) | null>(null);

  useEffect(() => () => stopRef.current?.(), []);

  const startDrag = useCallback(
    (
      event: PointerEvent<HTMLElement>,
      source: DragSource,
      onEnd: (end: DragEnd) => void,
    ) => {
      if (event.button !== 0) return;
      stopRef.current?.();
      const { pointerId, clientX: startX, clientY: startY } = event;
      let current: DragState | null = null;

      const move = (moveEvent: globalThis.PointerEvent) => {
        if (moveEvent.pointerId !== pointerId) return;
        const distance = Math.hypot(moveEvent.clientX - startX, moveEvent.clientY - startY);
        if (!current && distance < DRAG_THRESHOLD) return;
        current = {
          source,
          x: moveEvent.clientX,
          y: moveEvent.clientY,
          ...hitTest(moveEvent.clientX, moveEvent.clientY),
        };
        setDrag(current);
      };
      const finish = (upEvent: globalThis.PointerEvent) => {
        if (upEvent.pointerId !== pointerId) return;
        stop();
        if (upEvent.type === "pointercancel") return;
        onEnd(
          current
            ? { moved: true, overBench: current.overBench, overChip: current.overChip }
            : { moved: false, overBench: false, overChip: null },
        );
      };
      const stop = () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", finish);
        window.removeEventListener("pointercancel", finish);
        stopRef.current = null;
        setDrag(null);
      };

      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", finish);
      window.addEventListener("pointercancel", finish);
      stopRef.current = stop;
    },
    [],
  );

  return { drag, startDrag };
}
