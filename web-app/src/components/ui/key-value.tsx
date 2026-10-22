import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** One row of a KeyValue list. */
export interface KeyValueItem {
  label: ReactNode;
  value: ReactNode;
  /** Small note under the value (unit source, condition). */
  hint?: ReactNode;
}

interface KeyValueProps {
  items: readonly KeyValueItem[];
  /** Two columns from `md`. Default 1. */
  columns?: 1 | 2;
  className?: string;
}

/** Definition list of label/value rows separated by hairlines (element facts, API limits). */
export function KeyValue({ items, columns = 1, className }: KeyValueProps) {
  return (
    <dl
      className={cn(
        "grid border-t border-line",
        columns === 2 && "md:grid-cols-2 md:gap-x-10",
        className,
      )}
    >
      {items.map((item, index) => (
        <div
          key={index}
          className="grid grid-cols-[minmax(7rem,2fr)_3fr] items-baseline gap-4 border-b border-line py-3"
        >
          <dt className="text-[13px] text-ink-3">{item.label}</dt>
          <dd className="min-w-0 text-[15px] text-ink">
            {item.value}
            {item.hint && (
              <span className="mt-0.5 block text-[13px] text-ink-3">
                {item.hint}
              </span>
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}
