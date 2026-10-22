import { Fragment } from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/** One breadcrumb step; omit `to` for the current page (always the last item). */
export interface BreadcrumbItem {
  label: string;
  to?: string;
}

/** "Tablo › Demir" trail. The last item is the current page. */
export function Breadcrumb({
  items,
  className,
}: {
  items: readonly BreadcrumbItem[];
  className?: string;
}) {
  return (
    <nav aria-label="Konum" className={className}>
      <ol className="flex flex-wrap items-center gap-1.5 text-[13px] text-ink-3">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <Fragment key={`${item.label}-${index}`}>
              <li className="min-w-0">
                {item.to && !isLast ? (
                  <Link
                    to={item.to}
                    className="rounded-sm transition-colors hover:text-ink"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span
                    aria-current={isLast ? "page" : undefined}
                    className={cn("truncate", isLast && "text-ink-2")}
                  >
                    {item.label}
                  </span>
                )}
              </li>
              {!isLast && (
                <li aria-hidden="true" className="text-ink-4">
                  <ChevronRight className="size-3.5" strokeWidth={1.75} />
                </li>
              )}
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
