import { useRef, useSyncExternalStore } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { toneStyles } from "./classes";
import {
  dismissToast,
  getToasts,
  holdToast,
  subscribeToToasts,
  type ToastItem,
} from "./toast";

/** One toast. Its timer stops while the pointer is over it or focus is inside it. */
function ToastCard({ item }: { item: ToastItem }) {
  const hovered = useRef(false);
  const focused = useRef(false);
  const syncHold = () => holdToast(item.id, hovered.current || focused.current);
  const { Icon, icon } = toneStyles[item.tone];
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.15 } }}
      transition={{ type: "spring", stiffness: 420, damping: 34 }}
      onPointerEnter={() => {
        hovered.current = true;
        syncHold();
      }}
      onPointerLeave={() => {
        hovered.current = false;
        syncHold();
      }}
      onFocus={() => {
        focused.current = true;
        syncHold();
      }}
      onBlur={(event) => {
        if (event.currentTarget.contains(event.relatedTarget)) return;
        focused.current = false;
        syncHold();
      }}
      className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg border border-line-strong bg-surface-3 py-3 pr-2 pl-4 shadow-lg"
    >
      <Icon
        aria-hidden="true"
        strokeWidth={1.75}
        className={cn("mt-0.5 size-4 shrink-0", icon)}
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-ink">{item.message}</p>
        {item.description && (
          <p className="mt-0.5 text-[13px] text-ink-2">{item.description}</p>
        )}
      </div>
      <button
        type="button"
        onClick={() => dismissToast(item.id)}
        className="focus-ring -my-1 grid size-7 shrink-0 place-items-center rounded-md text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink"
      >
        <X aria-hidden="true" className="size-3.5" strokeWidth={1.75} />
        <span className="sr-only">Bildirimi kapat</span>
      </button>
    </motion.div>
  );
}

/**
 * Global live region that renders `toast()` messages bottom-right (bottom-centre
 * on phones). Errors stay until closed; the others pause while hovered or focused.
 * Mount once.
 */
export function Toaster() {
  const items = useSyncExternalStore(subscribeToToasts, getToasts);
  return (
    <section
      aria-label="Bildirimler"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-(--z-toast) flex flex-col items-center gap-2 p-4 sm:items-end sm:p-6"
    >
      <AnimatePresence initial={false}>
        {items.map((item) => (
          <ToastCard key={item.id} item={item} />
        ))}
      </AnimatePresence>
    </section>
  );
}
