import type { ReactNode } from "react";

/** Mono code fragment inside running text (parameter names, header names, paths). */
export function InlineCode({ children }: { children: ReactNode }) {
  return (
    <code className="rounded-xs border border-line bg-surface-2 px-1 py-px font-mono text-[0.85em] break-words text-ink">
      {children}
    </code>
  );
}
