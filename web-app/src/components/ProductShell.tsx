import type { ReactNode } from "react";
import { AccountMenu } from "./shell/AccountMenu";
import { BrandLink } from "./shell/BrandLink";
import { ApiShortcut, MoreMenu, PrimaryNav } from "./shell/DesktopNav";
import { MobileNav } from "./shell/MobileNav";
import { SiteFooter } from "./shell/SiteFooter";

/**
 * Global chrome around every route: skip link, sticky header (one nav
 * breakpoint: `lg`), the `#main-content` focus target and the footer.
 */
export default function ProductShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main-content"
        className="sr-only rounded-md bg-surface-3 px-3 py-2 text-sm font-medium text-ink shadow-md focus:not-sr-only focus:fixed focus:top-3 focus:left-4 focus:z-(--z-toast)"
      >
        İçeriğe geç
      </a>
      <header className="sticky top-0 z-(--z-header) border-b border-line bg-canvas/80 backdrop-blur-md">
        <div className="container-page flex h-14 items-center gap-2">
          <MobileNav />
          <BrandLink className="mr-3 xl:mr-5" />
          <PrimaryNav />
          <div className="ml-auto flex items-center gap-1.5">
            <MoreMenu />
            <ApiShortcut />
            <AccountMenu />
          </div>
        </div>
      </header>
      <div id="main-content" tabIndex={-1} className="flex-1 outline-none">
        {children}
      </div>
      <SiteFooter />
    </div>
  );
}
