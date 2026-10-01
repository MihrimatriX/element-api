import { useId, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SectionProps {
  /** Section h2. */
  title: ReactNode;
  eyebrow?: ReactNode;
  description?: ReactNode;
  /** Right-aligned controls next to the heading (filters, "Tümü" link). */
  actions?: ReactNode;
  /** Anchor id for in-page links (`/docs#etag`). */
  id?: string;
  className?: string;
  children?: ReactNode;
}

/** Page section with an h2, optional description and actions; owns the vertical rhythm between sections. */
export function Section({
  title,
  eyebrow,
  description,
  actions,
  id,
  className,
  children,
}: SectionProps) {
  const headingId = useId();
  return (
    <section
      id={id}
      aria-labelledby={headingId}
      className={cn("mt-16 scroll-mt-24 first:mt-0 lg:mt-20", className)}
    >
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="min-w-0">
          {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
          <h2
            id={headingId}
            className="font-display text-2xl font-semibold tracking-tight text-ink md:text-3xl"
          >
            {title}
          </h2>
          {description && (
            <p className="mt-2 max-w-prose text-[15px] leading-7 text-ink-2">
              {description}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex flex-wrap items-center gap-2">{actions}</div>
        )}
      </div>
      {children && <div className="mt-6 lg:mt-8">{children}</div>}
    </section>
  );
}
