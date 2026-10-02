import type { ComponentProps } from "react";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface ExternalLinkProps
  extends Omit<ComponentProps<"a">, "target" | "rel"> {
  href: string;
  /** `inline` (default) is the cuprite text-link style; `plain` keeps only the icon and new-tab hint. */
  variant?: "inline" | "plain";
}

/** Link to another site: opens in a new tab, shows an arrow and tells screen readers it opens a new tab. */
export function ExternalLink({
  children,
  className,
  variant = "inline",
  ...props
}: ExternalLinkProps) {
  return (
    <a
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex items-baseline gap-0.5",
        variant === "inline" && "text-link",
        className,
      )}
      {...props}
    >
      {children}
      <ArrowUpRight
        aria-hidden="true"
        strokeWidth={1.75}
        className="size-3.5 shrink-0 self-center"
      />
      <span className="sr-only"> (yeni sekmede açılır)</span>
    </a>
  );
}
