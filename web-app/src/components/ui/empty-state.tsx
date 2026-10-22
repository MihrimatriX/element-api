import type { ComponentType, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  /** lucide icon component, e.g. `SearchX`. */
  icon?: ComponentType<{ className?: string; strokeWidth?: number }>;
  title: ReactNode;
  /** Explanation and next step, in one or two sentences. */
  children?: ReactNode;
  actions?: ReactNode;
  /** Heading level. Use `h1` when the empty state is the whole page (404). Default `h2`. */
  titleAs?: "h1" | "h2" | "h3";
  /** `page` is roomier with a display-face title, for full-page states. */
  size?: "default" | "page";
  className?: string;
}

/** Nothing-here state: icon, title, short text and actions, centred on a dashed panel. */
export function EmptyState({
  icon: Icon,
  title,
  children,
  actions,
  titleAs: Title = "h2",
  size = "default",
  className,
}: EmptyStateProps) {
  const isPage = size === "page";
  return (
    <div
      className={cn(
        "flex flex-col items-center rounded-xl border border-dashed border-line-strong bg-canvas-2/60 text-center",
        isPage ? "px-6 py-16 sm:py-24" : "px-6 py-12",
        className,
      )}
    >
      {Icon && (
        <span
          aria-hidden="true"
          className={cn(
            "mb-5 grid place-items-center rounded-lg border border-line bg-surface text-ink-3 shadow-xs",
            isPage ? "size-12" : "size-10",
          )}
        >
          <Icon className={isPage ? "size-5" : "size-4"} strokeWidth={1.75} />
        </span>
      )}
      <Title
        className={cn(
          "text-ink",
          isPage
            ? "font-display text-3xl font-semibold tracking-tight md:text-4xl"
            : "font-sans text-base font-semibold tracking-normal",
        )}
      >
        {title}
      </Title>
      {children && (
        <div
          className={cn(
            "mt-2 max-w-md text-ink-2",
            isPage ? "mt-3 text-base leading-7" : "text-sm leading-6",
          )}
        >
          {children}
        </div>
      )}
      {actions && (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {actions}
        </div>
      )}
    </div>
  );
}
