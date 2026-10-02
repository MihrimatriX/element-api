import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/** One in-page link; `children` are listed indented on desktop only. */
export interface TocItem {
  id: string;
  label: string;
  children?: { id: string; label: string }[];
}

/** Id of the top-level section currently under the sticky header, for the active marker. */
function useActiveSection(ids: string[]): string | undefined {
  const [active, setActive] = useState<string>();
  const key = ids.join(" ");
  useEffect(() => {
    const order = key.split(" ");
    const inView = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) inView.add(entry.target.id);
          else inView.delete(entry.target.id);
        }
        const first = order.find((id) => inView.has(id));
        if (first) setActive(first);
      },
      // A band just under the 56px header: the section crossing it is the one being read.
      { rootMargin: "-72px 0px -60% 0px" },
    );
    for (const id of order) {
      const target = document.getElementById(id);
      if (target) observer.observe(target);
    }
    return () => observer.disconnect();
  }, [key]);
  return active;
}

const linkClass =
  "focus-ring block rounded-sm transition-colors hover:text-ink aria-[current=true]:text-ink";

/**
 * "Bu sayfada" index: a sticky column with nested property links on desktop,
 * a horizontally scrolling row of section chips on smaller screens.
 */
export function DetailToc({ items, className }: { items: TocItem[]; className?: string }) {
  const active = useActiveSection(items.map((item) => item.id));
  return (
    <nav aria-label="Bu sayfada" className={cn("min-w-0", className)}>
      <div className="lg:sticky lg:top-20 lg:max-h-[calc(100dvh-6rem)] lg:overflow-y-auto lg:pb-6">
        <p className="eyebrow mb-3 hidden lg:block">Bu sayfada</p>
        <ol className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:-mx-6 sm:px-6 lg:mx-0 lg:block lg:space-y-0.5 lg:border-l lg:border-line lg:p-0">
          {items.map((item) => {
            const current = item.id === active;
            return (
              <li key={item.id} className="shrink-0">
                <a
                  href={`#${item.id}`}
                  aria-current={current ? "true" : undefined}
                  className={cn(
                    linkClass,
                    "rounded-sm border border-line bg-surface px-3 py-1.5 text-[13px] whitespace-nowrap text-ink-2",
                    "lg:-ml-px lg:rounded-none lg:border-0 lg:border-l lg:border-transparent lg:bg-transparent lg:py-1 lg:pl-3.5 lg:text-ink-3",
                    current && "border-brand-line lg:border-brand-ink",
                  )}
                >
                  {item.label}
                </a>
                {item.children && (
                  <ol className="mt-0.5 mb-1.5 hidden space-y-0.5 lg:block">
                    {item.children.map((child) => (
                      <li key={child.id}>
                        <a
                          href={`#${child.id}`}
                          className={cn(linkClass, "py-0.5 pl-6 text-[13px] text-ink-3")}
                        >
                          {child.label}
                        </a>
                      </li>
                    ))}
                  </ol>
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </nav>
  );
}
