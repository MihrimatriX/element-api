import { useState } from "react";
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
import { useSignOut } from "./useSignOut";

const rowClass =
  "relative flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-[15px] text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink";

function MobileAccount() {
  const { isAuthenticated } = useSelectedElement();
  const signOut = useSignOut();

  if (!isAuthenticated)
    return (
      <div className="grid grid-cols-2 gap-2">
        <Button asChild variant="outline">
          <Link to="/login">Giriş yap</Link>
        </Button>
        <Button asChild>
          <Link to="/register">Hesap aç</Link>
        </Button>
      </div>
    );

  return (
    <div className="grid gap-0.5">
      <Link to="/account" className={rowClass}>
        <Wallet aria-hidden="true" className="size-4" strokeWidth={1.75} />
        Hesabım
      </Link>
      <Link to="/settings" className={rowClass}>
        <Settings2 aria-hidden="true" className="size-4" strokeWidth={1.75} />
        Ayarlar
      </Link>
      <button type="button" onClick={signOut} className={rowClass}>
        <LogOut aria-hidden="true" className="size-4" strokeWidth={1.75} />
        Çıkış
      </button>
    </div>
  );
}

/** Hamburger + left sheet with every route and the account actions. Below `lg` only. */
export function MobileNav() {
  const { pathname } = useLocation();
  // The sheet belongs to the page it was opened on, so any navigation closes it.
  const [openedOn, setOpenedOn] = useState<string | null>(null);

  return (
    <Sheet
      open={openedOn === pathname}
      onOpenChange={(open) => setOpenedOn(open ? pathname : null)}
    >
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
        className="w-[min(20rem,86vw)] gap-0 p-0"
      >
        <SheetTitle className="sr-only">Gezinme</SheetTitle>
        <div className="flex h-14 shrink-0 items-center border-b border-line px-5">
          <BrandLink />
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
            <MobileAccount />
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
