import { useState, type ReactNode, type ComponentType } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  BookOpen,
  BookOpenText,
  ChevronDown,
  Code2,
  Database,
  FlaskConical,
  Grid2X2,
  Layers3,
  LogOut,
  Menu,
  MessageSquare,
  Settings2,
  UserRound,
} from "lucide-react";
import { ACCOUNTS_ENABLED } from "../config";
import { clearSession } from "../services/session";
import { useSelectedElement } from "../App";
import { apiShortcut, moreRoutes, primaryRoutes } from "../productNav";
import { Button } from "./ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "./ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

const icons: Record<string, ComponentType<{ size?: number }>> = {
  "/periodic": Grid2X2,
  "/compounds": Layers3,
  "/lab": FlaskConical,
  "/collection": BookOpen,
  "/nasil": BookOpenText,
  "/sozluk": BookOpenText,
  "/docs": Code2,
  "/developers": Code2,
  "/data": Database,
  "/feedback": MessageSquare,
};

function BrandMark({ className }: { className?: string }) {
  return (
    <span className={className ?? "workspace-mark"} aria-hidden="true">
      <img src="/brand/mark.svg" alt="" width={22} height={22} />
    </span>
  );
}

function linkClass(isActive: boolean, extra = false, api = false) {
  return `workspace-nav-link ${isActive || extra ? "is-active" : ""} ${api ? "is-api" : ""}`;
}

function isApiPath(pathname: string) {
  return (
    pathname === "/developers" ||
    pathname === "/docs" ||
    pathname.startsWith("/docs/")
  );
}

export default function ProductShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, setIsAuthenticated } = useSelectedElement();
  const page = location.pathname.split("/")[1] || "";
  const close = () => setMobileOpen(false);
  const apiActive = isApiPath(location.pathname);

  const primaryNav = (onNavigate?: () => void) =>
    primaryRoutes.map((item) => {
      const Icon = icons[item.to];
      return (
        <NavLink
          onClick={onNavigate}
          to={item.to}
          key={item.to}
          className={({ isActive }) =>
            linkClass(
              isActive,
              (item.to === "/periodic" &&
                (page === "element" || page === "periodic")) ||
                (item.to === "/compounds" && page === "compound"),
            )
          }
        >
          {Icon && <Icon size={17} />}
          <span>{item.label}</span>
        </NavLink>
      );
    });

  return (
    <div className="workspace">
      <a className="skip-link" href="#main-content">
        İçeriğe geç
      </a>
      <header className="workspace-toolbar">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="workspace-mobile-trigger min-[901px]:hidden"
              aria-label="Menüyü aç"
            >
              <Menu size={19} />
            </Button>
          </SheetTrigger>
          <SheetContent
            side="left"
            className="workspace-mobile-sidebar w-[260px] gap-0"
            aria-describedby={undefined}
          >
            <SheetTitle className="sr-only">Gezinme</SheetTitle>
            <div className="workspace-sidebar-content">
              <Link to="/" className="workspace-brand" onClick={close}>
                <BrandMark />
                <span className="workspace-wordmark">ElementAPI</span>
              </Link>
              <nav aria-label="Ana menü" className="workspace-nav">
                {primaryNav(close)}
                <NavLink
                  onClick={close}
                  to={apiShortcut.to}
                  className={() => linkClass(apiActive, false, true)}
                >
                  <Code2 size={17} />
                  <span>{apiShortcut.label}</span>
                </NavLink>
                {moreRoutes.map((item) => {
                  const Icon = icons[item.to];
                  return (
                    <NavLink
                      onClick={close}
                      to={item.to}
                      key={item.to}
                      className={({ isActive }) => linkClass(isActive)}
                    >
                      {Icon && <Icon size={17} />}
                      <span>{item.label}</span>
                    </NavLink>
                  );
                })}
              </nav>
            </div>
          </SheetContent>
        </Sheet>
        <Link to="/" className="workspace-brand">
          <BrandMark />
          <span className="workspace-wordmark">ElementAPI</span>
        </Link>
        <nav aria-label="Ana menü" className="workspace-nav workspace-nav-desktop">
          {primaryNav()}
        </nav>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="workspace-more max-[900px]:hidden"
            >
              Daha fazla <ChevronDown size={14} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {moreRoutes.map((item) => (
              <DropdownMenuItem asChild key={item.to}>
                <Link to={item.to}>{item.label}</Link>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <div className="workspace-toolbar-actions">
          <NavLink
            to={apiShortcut.to}
            className={() =>
              `workspace-nav-link is-api max-[900px]:hidden ${apiActive ? "is-active" : ""}`
            }
          >
            <Code2 size={16} />
            <span>{apiShortcut.label}</span>
          </NavLink>
          {ACCOUNTS_ENABLED &&
            (isAuthenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <UserRound size={15} />
                    <span>Hesabım</span>
                    <ChevronDown size={13} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Hesabın</DropdownMenuLabel>
                  <DropdownMenuItem asChild>
                    <Link to="/settings">
                      <Settings2 />
                      Ayarlar · profil, güvenlik, veri
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/account">
                      <Code2 />
                      Hesabım · cüzdan, anahtarlar, webhook
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onSelect={() => {
                      clearSession();
                      setIsAuthenticated(false);
                      navigate("/");
                    }}
                  >
                    <LogOut />
                    Çıkış yap
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <Button asChild variant="default" size="sm">
                  <Link to="/register">Hesap aç</Link>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link to="/login">
                    <UserRound size={15} />
                    Giriş yap
                  </Link>
                </Button>
              </>
            ))}
        </div>
      </header>
      <div className="workspace-body">
        {children}
        <footer className="workspace-footer">
          <div className="workspace-footer-copy">
            <Link to="/" className="workspace-footer-brand">
              <BrandMark className="workspace-mark" />
              ElementAPI
            </Link>
            <span className="workspace-footer-tagline">Hücreden moleküle.</span>
            <span>Kimya kayıtları, laboratuvar ve açık bilimsel API.</span>
          </div>
          <nav>
            <Link to="/periodic">Tablo</Link>
            <Link to="/lab">Laboratuvar</Link>
            <Link to="/developers">API</Link>
          </nav>
        </footer>
      </div>
    </div>
  );
}
