import { useState, type ReactNode } from "react";
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
  ShoppingBag,
  UserRound,
} from "lucide-react";
import { ACCOUNTS_ENABLED } from "../config";
import { clearSession } from "../services/session";
import { useSelectedElement } from "../App";
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

const primary = [
  { to: "/", label: "Periyodik tablo", icon: Grid2X2 },
  { to: "/compounds", label: "Bileşikler", icon: Layers3 },
  { to: "/lab", label: "Laboratuvar", icon: FlaskConical },
  { to: "/collection", label: "Defterim", icon: BookOpen },
  { to: "/nasil", label: "El kitabı", icon: BookOpenText },
];
const more = [
  { to: "/sozluk", label: "Sözlük", icon: BookOpenText },
  { to: "/docs", label: "API dokümanları", icon: Code2 },
  { to: "/developers", label: "Geliştiriciler", icon: Code2 },
  { to: "/data", label: "Kaynaklar ve veri", icon: Database },
  { to: "/demo", label: "Piyasa ve mağaza", icon: ShoppingBag },
  { to: "/hakkinda", label: "Hakkında" },
  { to: "/feedback", label: "Geri bildirim", icon: MessageSquare },
];

function linkClass(
  isActive: boolean,
  extra = false,
) {
  return `workspace-nav-link ${isActive || extra ? "is-active" : ""}`;
}

export default function ProductShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, setIsAuthenticated } = useSelectedElement();
  const page = location.pathname.split("/")[1] || "";
  const close = () => setMobileOpen(false);
  const items = (
    <nav aria-label="Ana menü" className="workspace-nav">
      {primary.map((item) => (
        <NavLink
          onClick={close}
          to={item.to}
          end={item.to === "/"}
          key={item.to}
          className={({ isActive }) =>
            linkClass(
              isActive,
              (item.to === "/" && (page === "element" || page === "periodic")) ||
                (item.to === "/compounds" && page === "compound"),
            )
          }
        >
          <item.icon size={17} />
          <span>{item.label}</span>
        </NavLink>
      ))}
      {more.map((item) => (
        <NavLink
          onClick={close}
          to={item.to}
          key={item.to}
          className={({ isActive }) => linkClass(isActive)}
        >
          {item.icon && <item.icon size={17} />}
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );

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
                <span className="workspace-mark">
                  El<span>118</span>
                </span>
                ElementAPI
              </Link>
              {items}
            </div>
          </SheetContent>
        </Sheet>
        <Link to="/" className="workspace-brand">
          <span className="workspace-mark">
            El<span>118</span>
          </span>
          ElementAPI
        </Link>
        <nav aria-label="Ana menü" className="workspace-nav workspace-nav-desktop">
          {primary.map((item) => (
            <NavLink
              to={item.to}
              end={item.to === "/"}
              key={item.to}
              className={({ isActive }) =>
                linkClass(
                  isActive,
                  (item.to === "/" &&
                    (page === "element" || page === "periodic")) ||
                    (item.to === "/compounds" && page === "compound"),
                )
              }
            >
              <item.icon size={17} />
              <span>{item.label}</span>
            </NavLink>
          ))}
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
            {more.map((item) => (
              <DropdownMenuItem asChild key={item.to}>
                <Link to={item.to}>{item.label}</Link>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <div className="workspace-toolbar-actions">
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
                <Button asChild variant="ghost" size="sm">
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
          <span>118 element, 167 bileşik</span>
          <nav>
            <Link to="/nasil">El kitabı</Link>
            <Link to="/lab">Laboratuvar</Link>
            <Link to="/data">Kaynaklar</Link>
          </nav>
        </footer>
      </div>
    </div>
  );
}
