import type { ReactNode } from "react";

interface GuideLayoutProps {
  /** Sticky left column from `lg` (search + page list). */
  sidebar: ReactNode;
  /** Above the content below `lg` (page list button + search), in a one- or two-column grid. */
  toolbar: ReactNode;
  children: ReactNode;
}

/** Docs layout of /kilavuz: sticky sidebar on desktop, a toolbar above the content on smaller screens. */
export function GuideLayout({ sidebar, toolbar, children }: GuideLayoutProps) {
  return (
    <div className="grid gap-8 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-14">
      <aside className="hidden lg:block">
        {/* px-1 keeps the search field's focus ring inside the scrolling column. */}
        <div className="sticky top-20 -mx-1 max-h-[calc(100dvh-6rem)] overflow-y-auto px-1 pb-8">
          {sidebar}
        </div>
      </aside>
      <div className="min-w-0">
        <div className="mb-10 grid gap-3 sm:grid-cols-2 lg:hidden">{toolbar}</div>
        {children}
      </div>
    </div>
  );
}
