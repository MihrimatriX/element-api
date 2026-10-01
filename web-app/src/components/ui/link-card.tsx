import type { ComponentType, ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface LinkCardProps {
  /** Internal route (router link). */
  to?: string;
  /** External URL; opens in a new tab. Used when `to` is absent. */
  href?: string;
  icon?: ComponentType<{ className?: string; strokeWidth?: number }>;
  title: ReactNode;
  description?: ReactNode;
  /** Small mono line under the description (path, count). */
  meta?: ReactNode;
  className?: string;
}

const cardClass =
  "focus-ring group relative flex h-full items-start gap-4 rounded-xl border border-line bg-surface p-5 shadow-xs transition-[background-color,border-color,transform] duration-200 hover:border-line-strong hover:bg-surface-2 active:scale-[0.99]";

/** Navigation card: icon, title, description and an arrow; the whole card is the link. */
export function LinkCard({
  to,
  href,
  icon: Icon,
  title,
  description,
  meta,
  className,
}: LinkCardProps) {
  const Arrow = to ? ArrowRight : ArrowUpRight;
  const body = (
    <>
      {Icon && (
        <span
          aria-hidden="true"
          className="grid size-9 shrink-0 place-items-center rounded-lg border border-line bg-surface-2 text-ink-2 transition-colors group-hover:text-brand-ink"
        >
          <Icon className="size-4" strokeWidth={1.75} />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block text-base font-semibold text-ink">{title}</span>
        {description && (
          <span className="mt-1 block text-sm leading-6 text-ink-2">
            {description}
          </span>
        )}
        {meta && (
          <span className="mt-3 block font-mono text-xs text-ink-3">{meta}</span>
        )}
      </span>
      <Arrow
        aria-hidden="true"
        strokeWidth={1.75}
        className="mt-1 size-4 shrink-0 text-ink-3 transition-[color,transform] duration-200 group-hover:translate-x-0.5 group-hover:text-ink"
      />
    </>
  );

  if (to)
    return (
      <Link to={to} className={cn(cardClass, className)}>
        {body}
      </Link>
    );
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(cardClass, className)}
    >
      {body}
      <span className="sr-only"> (yeni sekmede açılır)</span>
    </a>
  );
}
