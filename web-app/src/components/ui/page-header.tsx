import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  /** Small mono label above the title ("Laboratuvar", "Element 26"). */
  eyebrow?: ReactNode;
  /** Page h1. */
  title: ReactNode;
  /** One or two sentences under the title. */
  lead?: ReactNode;
  /** Buttons/links under the lead. */
  actions?: ReactNode;
  /** Right-hand column from `lg` (a Stat, ProgressRing or small figure). */
  aside?: ReactNode;
  /** Optional `<Breadcrumb>` above everything. */
  breadcrumb?: ReactNode;
  className?: string;
}

/** Top of every page: eyebrow, h1, lead, actions and an optional aside. Renders the page's only h1. */
export function PageHeader({
  eyebrow,
  title,
  lead,
  actions,
  aside,
  breadcrumb,
  className,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        "grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end lg:gap-12",
        className,
      )}
    >
      <div className="min-w-0">
        {breadcrumb && <div className="mb-6">{breadcrumb}</div>}
        {eyebrow && (
          <p className="eyebrow mb-4 flex items-center gap-2.5">
            <span aria-hidden="true" className="h-px w-5 bg-brand-ink" />
            {eyebrow}
          </p>
        )}
        <h1 className="font-display text-display-sm font-semibold tracking-tight text-ink">
          {title}
        </h1>
        {lead && (
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-ink-2">
            {lead}
          </p>
        )}
        {actions && (
          <div className="mt-7 flex flex-wrap items-center gap-3">{actions}</div>
        )}
      </div>
      {aside && <div className="min-w-0 lg:justify-self-end">{aside}</div>}
    </header>
  );
}
