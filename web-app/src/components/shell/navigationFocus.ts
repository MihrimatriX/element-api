import { useState } from "react";

/** Moves focus to the shell's `#main-content` target without scrolling. */
export function focusMainContent() {
  document.getElementById("main-content")?.focus({ preventScroll: true });
}

/**
 * Focus for a Radix menu or sheet whose items open pages. Radix gives focus
 * back to the trigger once the panel has closed, which can be after RouteFocus
 * moved it to the new page. Once `markNavigation` is called, the close sends
 * focus to the page instead; Escape and outside clicks still return it to the
 * trigger. Both functions keep their identity across renders.
 */
export function useNavigationMenuFocus() {
  const [handlers] = useState(() => {
    let navigating = false;
    return {
      /** Call when an item that opens a page is chosen. */
      markNavigation() {
        navigating = true;
      },
      /** Pass to the panel's `onCloseAutoFocus`. */
      onCloseAutoFocus(event: Event) {
        if (!navigating) return;
        navigating = false;
        event.preventDefault();
        focusMainContent();
      },
    };
  });
  return handlers;
}
