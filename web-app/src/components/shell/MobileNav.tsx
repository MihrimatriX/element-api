import { useCallback, useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { LogOut, Menu, Settings2, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import { ACCOUNTS_ENABLED } from "../../config";
import { useSelectedElement } from "../../context/selection";
import { isNavActive, siteMap } from "../../productNav";
import { Button } from "../ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "../ui/sheet";
import { BrandLink } from "./BrandLink";
import { NavIcon } from "./NavIcon";
import { useNavigationMenuFocus } from "./navigationFocus";
import { useSignOut } from "./useSignOut";

const rowClass =
  "relative flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-[15px] text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink";

/** Sign-in links, or account links and sign-out. Each one calls `onNavigate` to close the sheet. */
function MobileAccount({ onNavigate }: { onNavigate: () => void }) {
  const { isAuthenticated } = useSelectedElement();
  const signOut = useSignOut();

  if (!isAuthenticated)
    return (
      <div className="grid grid-cols-2 gap-2">
        <Button asChild variant="outline">
          <Link to="/login" onClick={onNavigate}>
            Giriş yap
          </Link>
        </Button>
        <Button asChild>
          <Link to="/register" onClick={onNavigate}>
            Hesap aç
          </Link>
        </Button>
      </div>
    );

  return (
    <div className="grid gap-0.5">
      <Link to="/account" onClick={onNavigate} className={rowClass}>
        <Wallet aria-hidden="true" className="size-4" strokeWidth={1.75} />
        Hesabım
      </Link>
      <Link to="/settings" onClick={onNavigate} className={rowClass}>
        <Settings2 aria-hidden="true" className="size-4" strokeWidth={1.75} />
        Ayarlar
      </Link>
      <button
        type="button"
        onClick={() => {
          onNavigate();
          signOut();
        }}
        className={rowClass}
      >
        <LogOut aria-hidden="true" className="size-4" strokeWidth={1.75} />
        Çıkış
      </button>
    </div>
  );
}

/** Hamburger + left sheet with every route and the account actions. Below `lg` only. */
export function MobileNav() {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const { markNavigation, onCloseAutoFocus } = useNavigationMenuFocus();
  // Following a link closes the sheet, and so does back/forward. It does not track `pathname`:
  // the router updates that only once a lazy page has loaded, possibly after the sheet was
  // opened again, which would then close by itself.
  const close = useCallback(() => {
    markNavigation();
    setOpen(false);
  }, [markNavigation]);
  useEffect(() => {
    if (!open) return;
    window.addEventListener("popstate", close);
    return () => window.removeEventListener("popstate", close);
  }, [open, close]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Menüyü aç"
          className="-ml-1.5 lg:hidden"
        >
          <Menu aria-hidden="true" strokeWidth={1.75} />
        </Button>
      </SheetTrigger>
      <SheetContent
        side="left"
        aria-describedby={undefined}
        onCloseAutoFocus={onCloseAutoFocus}
        className="w-[min(20rem,86vw)] gap-0 p-0"
      >
        <SheetTitle className="sr-only">Gezinme</SheetTitle>
        <div className="flex h-14 shrink-0 items-center border-b border-line px-5">
          <BrandLink onClick={close} />
        </div>
        <nav aria-label="Mobil menü" className="flex-1 overflow-y-auto px-3 py-4">
          {siteMap.map((group) => (
            <div key={group.title} className="mb-5 last:mb-0">
              <p className="eyebrow px-3 pb-2">{group.title}</p>
              <ul className="grid gap-0.5">
                {group.routes.map((route) => {
                  const active = isNavActive(route.to, pathname);
                  return (
                    <li key={route.to}>
                      <Link
                        to={route.to}
                        onClick={close}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          rowClass,
                          active &&
                            "bg-surface-2 text-ink before:absolute before:inset-y-2 before:left-0 before:w-0.5 before:rounded-full before:bg-brand-ink",
                        )}
                      >
                        <NavIcon
                          to={route.to}
                          className={active ? "text-brand-ink" : "text-ink-3"}
                        />
                        {route.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
        {ACCOUNTS_ENABLED && (
          <div className="shrink-0 border-t border-line p-3">
            <MobileAccount onNavigate={close} />
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
