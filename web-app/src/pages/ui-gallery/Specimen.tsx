import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Labelled frame around one gallery example. */
export function Specimen({
  title,
  note,
  children,
  className,
}: {
  title: string;
  note?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className="min-w-0 overflow-hidden rounded-xl border border-line bg-canvas-2/40">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-line px-5 py-3">
        <h3 className="font-sans text-sm font-semibold tracking-normal text-ink">
          {title}
        </h3>
        {note && <p className="font-mono text-xs text-ink-3">{note}</p>}
      </div>
      <div className={cn("p-5 sm:p-6", className)}>{children}</div>
    </div>
  );
}
