import { useEffect, useRef, useSyncExternalStore } from "react";
import { useLocation } from "react-router-dom";

/**
 * Live `matchMedia` result. Used where phones need a different structure, not
 * just different styles (rendering both would duplicate the deep-link ids).
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
  );
}

/** Deep-link target from the URL hash (`#src-db-pool-ts` → "src-db-pool-ts"); "" without one. */
export function useActiveAnchor(): string {
  return useLocation().hash.slice(1);
}

/**
 * After every navigation inside the guide: scrolls to the hash target and
 * moves focus there (rows and files carry tabIndex -1), or jumps back to the
 * top when a new page opened without a hash; the router keeps the scroll
 * position otherwise. Within one page the scroll glides; landing on a page
 * (deep link, another page, search result elsewhere) jumps straight there.
 */
export function useAnchorScroll() {
  const { key, hash, pathname } = useLocation();
  const previousPathname = useRef<string>(undefined);
  useEffect(() => {
    const landing = previousPathname.current !== pathname;
    previousPathname.current = pathname;
    const anchor = hash.slice(1);
    if (!anchor) {
      window.scrollTo({ top: 0, behavior: "instant" });
      return;
    }
    let active = true;
    // Web fonts reflow the text above the target once they arrive; scroll after them.
    void document.fonts.ready.then(() => {
      const target = active ? document.getElementById(anchor) : null;
      target?.scrollIntoView({ block: "start", behavior: landing ? "instant" : "smooth" });
      target?.focus({ preventScroll: true });
    });
    return () => {
      active = false;
    };
  }, [key, hash, pathname]);
}
