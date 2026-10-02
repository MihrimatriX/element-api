import type { ReactNode } from "react";
import { toneStyles } from "@/components/ui/classes";
import { cn } from "@/lib/utils";

interface AuthStatusProps {
  tone: "info" | "success" | "warning";
  title: ReactNode;
  /** Explanation and next step. */
  children: ReactNode;
}

/**
 * Message that stands in for the form inside the auth panel (link sent, feature off,
 * link incomplete). Announced politely; the panel already frames it, so no second box.
 */
export function AuthStatus({ tone, title, children }: AuthStatusProps) {
  const { box, icon, Icon } = toneStyles[tone];
  return (
    <div role="status" className="flex flex-col items-center text-center">
      <span
        aria-hidden="true"
        className={cn("grid size-11 place-items-center rounded-full border", box)}
      >
        <Icon className={cn("size-5", icon)} strokeWidth={1.75} />
      </span>
      <p className="mt-4 text-base font-semibold text-ink">{title}</p>
      <div className="mt-2 text-sm leading-6 text-ink-2">{children}</div>
    </div>
  );
}
