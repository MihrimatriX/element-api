import { Fragment } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiShortcut, isNavActive, moreRoutes, primaryRoutes } from "../../productNav";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { NavIcon } from "./NavIcon";
import { useNavigationMenuFocus } from "./navigationFocus";

/** Primary sections; the active one gets a cuprite bar that slides between items. Visible from `lg`. */
export function PrimaryNav() {
  const { pathname } = useLocation();
  return (
    <nav aria-label="Ana menü" className="hidden h-full items-stretch lg:flex">
      {primaryRoutes.map((route) => {
        const active = isNavActive(route.to, pathname);
        return (
          <Link
            key={route.to}
            to={route.to}
            aria-current={active ? "page" : undefined}
            className="group relative flex items-center px-0.5 outline-none"
          >
            <span
              className={cn(
                "flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors duration-150 group-hover:bg-surface-2 group-focus-visible:outline-2 group-focus-visible:outline-ring",
                active ? "text-ink" : "text-ink-3 group-hover:text-ink",
              )}
            >
              <NavIcon to={route.to} className="hidden xl:block" />
              {route.label}
            </span>
            {active && (
              <motion.span
                layoutId="primary-nav-indicator"
                aria-hidden="true"
                transition={{ type: "spring", stiffness: 480, damping: 40 }}
                className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-brand-ink"
              />
            )}
          </Link>
        );
      })}
    </nav>
  );
}

/** "Daha fazla" dropdown with the secondary pages. Visible from `lg`. */
export function MoreMenu() {
  const { pathname } = useLocation();
  const { markNavigation, onCloseAutoFocus } = useNavigationMenuFocus();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="group hidden text-ink-3 data-[state=open]:bg-surface-2 data-[state=open]:text-ink lg:inline-flex"
        >
          Daha fazla
          <ChevronDown
            aria-hidden="true"
            strokeWidth={1.75}
            className="size-3.5 transition-transform duration-200 group-data-[state=open]:rotate-180"
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        onCloseAutoFocus={onCloseAutoFocus}
        className="w-60"
      >
        {moreRoutes.map((route) => {
          const active = isNavActive(route.to, pathname);
          return (
            <Fragment key={route.to}>
              {route.to === "/demo" && <DropdownMenuSeparator />}
              <DropdownMenuItem asChild onSelect={markNavigation}>
                <Link
                  to={route.to}
                  aria-current={active ? "page" : undefined}
                  className={cn(active && "text-ink")}
                >
                  <NavIcon to={route.to} />
                  {route.label}
                </Link>
              </DropdownMenuItem>
            </Fragment>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Mono "API" shortcut to the developer page; active on /developers and /docs. Visible from `lg`. */
export function ApiShortcut() {
  const { pathname } = useLocation();
  const active = isNavActive(apiShortcut.to, pathname);
  return (
    <Link
      to={apiShortcut.to}
      aria-current={active ? "page" : undefined}
      className={cn(
        "hidden h-8 items-center gap-1.5 rounded-md border px-2.5 font-mono text-xs transition-colors duration-150 lg:inline-flex",
        active
          ? "border-brand-line bg-brand-soft text-ink"
          : "border-line-strong text-ink-2 hover:border-ink-4 hover:text-ink",
      )}
    >
      <NavIcon to={apiShortcut.to} className="size-3.5" />
      {apiShortcut.label}
    </Link>
  );
}
