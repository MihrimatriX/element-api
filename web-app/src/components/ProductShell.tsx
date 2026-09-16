import { useState, type ReactNode } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  BookOpen,
  BookOpenText,
  ChevronDown,
  ChevronRight,
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
import { Separator } from "./ui/separator";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "./ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

const navigation = [
  {
    label: "Kütüphane",
    items: [
      { to: "/periodic", label: "Element atlası", icon: Grid2X2 },
      { to: "/compounds", label: "Bileşikler", icon: Layers3 },
    ],
  },
  {
    label: "Çalışma alanı",
    items: [
      { to: "/lab", label: "Laboratuvar", icon: FlaskConical },
      { to: "/collection", label: "Koleksiyonum", icon: BookOpen },
    ],
  },
  {
    label: "Referans",
    items: [
      { to: "/docs", label: "API dokümanları", icon: Code2 },
      { to: "/data", label: "Kaynaklar ve veri", icon: Database },
      { to: "/sozluk", label: "Sözlük", icon: BookOpenText },
    ],
  },
];
const titles: Record<string, string> = {
  "": "Element atlası",
  periodic: "Element atlası",
  element: "Element kaydı",
  compound: "Bileşik kaydı",
  compounds: "Bileşikler",
  lab: "Laboratuvar",
  collection: "Koleksiyonum",
  docs: "API dokümanları",
  data: "Kaynaklar ve veri",
  sozluk: "Sözlük",
  login: "Giriş",
  register: "Hesap oluştur",
  settings: "Hesap ayarları",
  account: "Hesabım",
  market: "Piyasa",
  shop: "Mağaza",
  demo: "Simülasyon",
  hakkinda: "Hakkında",
  nasil: "Kullanım rehberi",
  feedback: "Geri bildirim",
  "reset-password": "Şifre kurtarma",
  "verify-email": "E-posta doğrulama",
};

export default function ProductShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, setIsAuthenticated } = useSelectedElement();
  const page = location.pathname.split("/")[1] || "";
  const close = () => setMobileOpen(false);
  const nav = (
    <div className="workspace-sidebar-content">
      <Link to="/" className="workspace-brand" onClick={close}>
        <span className="workspace-mark">
          El<span>118</span>
        </span>
        <span>
          Element<span>Kimya atlası</span>
        </span>
      </Link>
      <nav aria-label="Ana menü" className="workspace-nav">
        {navigation.map((group) => (
          <div className="workspace-nav-group" key={group.label}>
            <p>{group.label}</p>
            {group.items.map((item) => (
              <NavLink
                onClick={close}
                to={item.to}
                key={item.to}
                className={({ isActive }) =>
                  `workspace-nav-link ${isActive || (item.to === "/periodic" && (page === "" || page === "element")) || (item.to === "/compounds" && page === "compound") ? "is-active" : ""}`
                }
              >
                <item.icon size={17} />
                <span>{item.label}</span>
                {item.to === "/periodic" && <small>118</small>}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
      <div className="workspace-sidebar-bottom">
        <NavLink to="/demo" onClick={close} className="workspace-nav-link">
          <ShoppingBag size={17} />
          <span>Simülasyon demosu</span>
          <ChevronRight size={14} />
        </NavLink>
        <Link
          to="/feedback"
          onClick={close}
          className="workspace-nav-link min-[901px]:hidden"
        >
          <MessageSquare size={17} />
          <span>Geri bildirim</span>
        </Link>
        <Separator />
        <div className="workspace-meta">
          <Link to="/hakkinda" onClick={close}>
            Hakkında
          </Link>
          <span>·</span>
          <Link to="/nasil" onClick={close}>
            Rehber
          </Link>
        </div>
        <p className="workspace-edition">Bilgi, kaynağıyla birlikte.</p>
      </div>
    </div>
  );

  return (
    <div className="workspace">
      <a className="skip-link" href="#main-content">
        İçeriğe geç
      </a>
      <aside className="workspace-sidebar">{nav}</aside>
      <div className="workspace-body">
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
              {nav}
            </SheetContent>
          </Sheet>
          <div className="workspace-breadcrumb">
            <span>Çalışma alanı</span>
            <ChevronRight size={13} />
            <strong>{titles[page] || "Element"}</strong>
          </div>
          <div className="workspace-toolbar-actions">
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="workspace-feedback max-[900px]:hidden"
            >
              <Link to="/feedback">
                <MessageSquare size={15} /> Geri bildirim
              </Link>
            </Button>
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
                        Hesap ayarları
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/account">
                        <Code2 />
                        API anahtarları ve kasa
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
                <Button asChild variant="outline" size="sm">
                  <Link to="/login">
                    <UserRound size={15} />
                    Giriş yap
                  </Link>
                </Button>
              ))}
          </div>
        </header>
        {children}
        <footer className="workspace-footer">
          <span>Element · Kimya atlası</span>
          <Link to="/data">
            Kaynaklar ve veri kapsamı <ChevronRight size={12} />
          </Link>
        </footer>
      </div>
    </div>
  );
}
