import { useState } from "react";
import { prune, type Counts } from "@/services/chemistry";
import { moveChip, syncChipOrder } from "@/services/lab";

interface BenchState {
  counts: Counts;
  /** Display order of the chips; always the same ids as `counts`. */
  order: string[];
}

function fromCounts(counts: Counts): BenchState {
  const pruned = prune(counts);
  return { counts: pruned, order: Object.keys(pruned) };
}

/**
 * Atom counts on the lab bench plus the order the chips are shown in.
 * Every update is functional, so callbacks captured at drag start stay correct.
 */
export function useBench(initial: () => Counts) {
  const [state, setState] = useState(() => fromCounts(initial()));
  return {
    counts: state.counts,
    chipIds: state.order,
    /** Adds (or with a negative delta removes) atoms; a count of zero drops the chip. */
    add(id: string, delta = 1) {
      setState(({ counts, order }) => {
        const next = prune({ ...counts, [id]: (counts[id] ?? 0) + delta });
        return { counts: next, order: syncChipOrder(order, next) };
      });
    },
    remove(id: string) {
      setState(({ counts, order }) => {
        const next = { ...counts };
        delete next[id];
        return { counts: next, order: order.filter((chip) => chip !== id) };
      });
    },
    move(from: number, to: number) {
      setState(({ counts, order }) => ({ counts, order: moveChip(order, from, to) }));
    },
    load(counts: Counts) {
      setState(fromCounts(counts));
    },
    clear() {
      setState({ counts: {}, order: [] });
    },
  };
}
