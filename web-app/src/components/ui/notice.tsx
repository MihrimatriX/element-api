import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { toneStyles, type Tone } from "./classes";

interface NoticeProps {
  tone?: Tone;
  title?: ReactNode;
  children?: ReactNode;
  /** Button or link on the right (e.g. "Yeniden dene"). */
  action?: ReactNode;
  /** `alert` interrupts screen readers; defaults to `alert` for danger, `status` otherwise. */
  role?: "status" | "alert";
  className?: string;
}

/** Inline message with a tone icon: info, success, warning, danger or neutral. Announced politely by default. */
export function Notice({
  tone = "info",
  title,
  children,
  action,
  role,
  className,
}: NoticeProps) {
  const { box, icon, Icon } = toneStyles[tone];
  return (
    <div
      role={role ?? (tone === "danger" ? "alert" : "status")}
      className={cn(
        "flex flex-wrap items-start gap-x-3 gap-y-2 rounded-lg border px-4 py-3 text-sm leading-6 text-ink-2",
        box,
        className,
      )}
    >
      <Icon
        aria-hidden="true"
        strokeWidth={1.75}
        className={cn("mt-1 size-4 shrink-0", icon)}
      />
      <div className="min-w-0 flex-1 basis-56">
        {title && <p className="font-medium text-ink">{title}</p>}
        {children && <div className={cn(title && "mt-0.5")}>{children}</div>}
      </div>
      {action && <div className="ml-7 shrink-0 sm:ml-0">{action}</div>}
    </div>
  );
}
