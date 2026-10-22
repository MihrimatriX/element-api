import { useEffect, useState } from "react";

/**
 * Id of the first section (in `ids` order) inside the reading band at the top
 * of the viewport, for highlighting the table of contents. `ids` must be stable.
 */
export function useScrollSpy(ids: readonly string[]): string | null {
  const [activeId, setActiveId] = useState<string | null>(ids[0] ?? null);

  useEffect(() => {
    const inBand = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) inBand.add(entry.target.id);
          else inBand.delete(entry.target.id);
        }
        const first = ids.find((id) => inBand.has(id));
        if (first) setActiveId(first);
      },
      // The band starts under the sticky header and covers the upper ~40 % of the screen.
      { rootMargin: "-72px 0px -60% 0px" },
    );
    for (const id of ids) {
      const section = document.getElementById(id);
      if (section) observer.observe(section);
    }
    return () => observer.disconnect();
  }, [ids]);

  return activeId;
}
