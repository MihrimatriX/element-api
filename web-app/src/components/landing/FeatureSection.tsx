import { useId, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Reveal } from "./Reveal";

interface FeatureSectionProps {
  /** Mono label above the heading (product area name). */
  eyebrow: string;
  /** Section h2. */
  title: ReactNode;
  /** Body copy under the heading. */
  children: ReactNode;
  /** Links or buttons under the copy. */
  actions?: ReactNode;
  /** The visual half: photo, list or code. */
  media: ReactNode;
  /** Puts the media on the left from `lg`, so consecutive sections zig-zag. */
  mediaFirst?: boolean;
  className?: string;
}

/**
 * One landing feature: copy beside a visual in an asymmetric two-column split
 * (stacked on phones, copy first). Copy and media reveal one after the other.
 */
export function FeatureSection({
  eyebrow,
  title,
  children,
  actions,
  media,
  mediaFirst = false,
  className,
}: FeatureSectionProps) {
  const headingId = useId();
  return (
    <section
      aria-labelledby={headingId}
      className={cn(
        "mt-24 grid items-center gap-10 lg:mt-32 lg:gap-16",
        mediaFirst
          ? "lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]"
          : "lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]",
        className,
      )}
    >
      <Reveal className={cn(mediaFirst && "lg:order-2")}>
        <p className="eyebrow">{eyebrow}</p>
        <h2
          id={headingId}
          className="mt-3 font-display text-3xl font-semibold tracking-tight text-ink md:text-4xl"
        >
          {title}
        </h2>
        <div className="mt-5 max-w-prose space-y-4 text-[15px] leading-7 text-ink-2">
          {children}
        </div>
        {actions && (
          <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3">
            {actions}
          </div>
        )}
      </Reveal>
      <Reveal delay={0.1} className={cn("min-w-0", mediaFirst && "lg:order-1")}>
        {media}
      </Reveal>
    </section>
  );
}
