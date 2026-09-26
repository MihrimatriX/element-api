import { Button } from "@/components/ui/button";
import ProductShell from "./components/ProductShell";
import { track } from "./services/diagnostics";
import {
  Suspense,
  lazy,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  Navigate,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { motion, MotionConfig, useReducedMotion } from "framer-motion";
const Settings = lazy(() => import("./pages/Settings"));
const Recovery = lazy(() => import("./pages/Recovery"));
const Feedback = lazy(() => import("./pages/Feedback"));
const Collection = lazy(() => import("./pages/Collection"));
const Demo = lazy(() => import("./pages/Demo"));
const DataCoverage = lazy(() => import("./pages/DataCoverage"));
import { tokenUser } from "./services/session";
/* Eager: `/` and `/periodic` must paint immediately — lazy Suspense skeleton looked like a CSS height/ratio bug. */
import Landing from "./pages/Landing";
import PeriodicExplorer from "./components/PeriodicExplorer";
const Market = lazy(() => import("./pages/Market"));
const Shop = lazy(() => import("./pages/Shop"));
const ApiDocs = lazy(() => import("./pages/ApiDocs"));
const Developers = lazy(() => import("./pages/Developers"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const Account = lazy(() => import("./pages/Account"));

const About = lazy(() => import("./pages/About"));
const Guide = lazy(() => import("./pages/Guide"));
const Glossary = lazy(() => import("./pages/Glossary"));
const Compounds = lazy(() => import("./pages/Compounds"));
const ScientificDetail = lazy(() => import("./components/ScientificDetail"));
const Laboratory = lazy(() => import("./pages/Laboratory"));
const LabFormula = lazy(() => import("./pages/LabFormula"));
const LabDetective = lazy(() => import("./pages/LabDetective"));
import { ACCOUNTS_ENABLED } from "./config";
import { STACK_REDIRECT } from "./productNav";
import {
  type ElementItem,
  STATIC_ELEMENTS,
  mergeElementData,
} from "./services/elementData";

// Scientific pages remain usable when browser storage is disabled.
function readLocal(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}
function writeLocal(key: string, value: string): boolean {
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

interface SelectedElementContextType {
  selectedSymbol: string;
  setSelectedSymbol: (symbol: string) => void;
  isAuthenticated: boolean;
  setIsAuthenticated: (val: boolean) => void;
}

interface CommerceContextType {
  elements: ElementItem[];
  selectedElement: ElementItem;
  loading: boolean;
  dataAvailable: boolean;
  walletElx: number | null;
  refreshWallet: () => void;
}

const SelectedElementContext = createContext<
  SelectedElementContextType | undefined
>(undefined);
const CommerceContext = createContext<CommerceContextType | undefined>(
  undefined,
);

// The hook and provider intentionally share the same context instance.
// eslint-disable-next-line react-refresh/only-export-components
export function useSelectedElement() {
  const context = useContext(SelectedElementContext);
  if (!context)
    throw new Error(
      "useSelectedElement must be used within a SelectedElementProvider",
    );
  return context;
}

export function SelectedElementProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const location = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    const match = location.pathname.match(
      /^\/(element|compound)\/([a-z0-9_-]+)$/i,
    );
    if (match) track("record_opened", match[2]);
  }, [location.pathname]);
  const [storedSymbol, setSelectedSymbolState] = useState<string>(() => {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get("symbol");
    const fromStore = readLocal("elementapi:selectedSymbol");
    return (fromUrl || fromStore || "Au").toUpperCase();
  });
  const candidate = (
    new URLSearchParams(location.search).get("symbol") || storedSymbol
  ).toUpperCase();
  const selectedSymbol = STATIC_ELEMENTS.some(
    (e) => e.symbol.toUpperCase() === candidate,
  )
    ? candidate
    : "AU";

  const [isAuthenticated, setIsAuthenticated] = useState(
    ACCOUNTS_ENABLED && !!tokenUser(),
  );
  useEffect(() => {
    const check = () => setIsAuthenticated(ACCOUNTS_ENABLED && !!tokenUser());
    window.addEventListener("storage", check);
    window.addEventListener("element:session", check);
    const timer = setInterval(check, 15000);
    return () => {
      clearInterval(timer);
      window.removeEventListener("storage", check);
      window.removeEventListener("element:session", check);
    };
  }, []);

  const setSelectedSymbol = (symbol: string) => {
    const sym = symbol.toUpperCase();
    setSelectedSymbolState(sym);
    writeLocal("elementapi:selectedSymbol", sym);
    const url = new URL(window.location.href);
    url.searchParams.set("symbol", sym);
    if (
      url.pathname + url.search !==
      window.location.pathname + window.location.search
    )
      navigate(url.pathname + url.search);
  };

  return (
    <SelectedElementContext.Provider
      value={{
        selectedSymbol,
        setSelectedSymbol,
        isAuthenticated,
        setIsAuthenticated,
      }}
    >
      {children}
    </SelectedElementContext.Provider>
  );
}

// Same file as CommerceProvider so they share one context instance.
// eslint-disable-next-line react-refresh/only-export-components
export function useCommerce() {
  const context = useContext(CommerceContext);
  if (!context)
    throw new Error("useCommerce must be used within a CommerceProvider");
  return context;
}

function CommerceProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, selectedSymbol } = useSelectedElement();
  const [elements, setElements] = useState<ElementItem[]>(() =>
    mergeElementData([], STATIC_ELEMENTS),
  );
  const [loading, setLoading] = useState(true);
  const [dataAvailable, setDataAvailable] = useState(false);
  const [walletElx, setWalletElx] = useState<number | null>(null);

  const refreshWallet = useCallback(async () => {
    const token = readLocal("token");
    const { walletService } = await import("./services/api");
    const wallet = await (token && readLocal("apiKey")
      ? walletService.get().catch(() => null)
      : Promise.resolve(null));
    if (token === readLocal("token"))
      setWalletElx(wallet ? Number(wallet.balanceElx) : null);
  }, []);

  useEffect(() => {
    let active = true;
    async function loadElements() {
      try {
        setLoading(true);
        const { elementService } = await import("./services/api");
        const results = await elementService.getAllElements();
        if (active) {
          setElements(mergeElementData(results, STATIC_ELEMENTS));
          setDataAvailable(true);
        }
      } catch (err) {
        console.warn(
          "Could not fetch elements from database, falling back to static seeds.",
          err,
        );
        if (active) setDataAvailable(false);
      } finally {
        if (active) setLoading(false);
      }
    }
    loadElements();
    const timer = setInterval(loadElements, 30000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;
    let active = true;
    import("./services/api")
      .then(({ walletService }) => walletService.get())
      .then((wallet) => {
        if (active) setWalletElx(Number(wallet.balanceElx));
      })
      .catch(() => {
        if (active) setWalletElx(null);
      });
    return () => {
      active = false;
    };
  }, [isAuthenticated]);

  const selectedElement =
    elements.find((e) => e.symbol.toUpperCase() === selectedSymbol) ||
    elements[78];

  return (
    <CommerceContext.Provider
      value={{
        elements,
        selectedElement,
        loading,
        dataAvailable,
        walletElx: isAuthenticated ? walletElx : null,
        refreshWallet,
      }}
    >
      {children}
    </CommerceContext.Provider>
  );
}

function CommerceNotice() {
  const { loading, dataAvailable } = useCommerce();
  if (loading || dataAvailable) return null;
  return (
    <p className="service-notice" role="status">
      Bağlantı kurulamadı. Temel element bilgilerini inceleyebilirsiniz; güncel
      fiyat ve alışveriş geçici olarak kullanılamıyor.
    </p>
  );
}

function CommerceLayout() {
  return (
    <CommerceProvider>
      <CommerceNotice />
      <Outlet />
    </CommerceProvider>
  );
}

function RouteStage({ children }: { children: ReactNode }) {
  const reduce = useReducedMotion();
  const { pathname } = useLocation();
  const detail = /^\/(element|compound)\/[^/]+$/.test(pathname);
  return (
    <motion.div
      key={pathname}
      className="route-stage"
      initial={reduce ? false : { opacity: 0, y: detail ? 8 : 0 }}
      animate={{ opacity: 1, y: 0 }}
      transition={
        reduce
          ? { duration: 0 }
          : { type: "spring", stiffness: 380, damping: 32 }
      }
    >
      {children}
    </motion.div>
  );
}

function LegacyRedirect({ to }: { to: string }) {
  const location = useLocation();
  return <Navigate to={`${to}${location.search}`} replace />;
}

function FeatureUnavailable() {
  return (
    <main className="science-detail page-miss">
      <h1>Bu kurulum keşif için hazır.</h1>
      <p>
        Hesap ve ticaret servisleri bu bağımsız atlas sürümünde açık değil.
        Keşiflerini bu tarayıcıda sürdürebilirsin. Su için iki H, bir O yeter.
      </p>
      <Button asChild variant="default">
        <Link className="btn primary" to="/lab">
          Laboratuvara dön
        </Link>
      </Button>
      <Button asChild variant="outline">
        <Link className="btn" to="/collection">
          Defterime dön
        </Link>
      </Button>
    </main>
  );
}

function AppContent() {
  const location = useLocation();
  return (
    <ProductShell>
      {/^\/(market|shop|account|demo)(\/|$)/.test(location.pathname) && (
        <div className="simulation-banner" role="note">
          Demo · KREDI sanal; gerçek para, ödeme veya kargo yok.{" "}
          <Link to="/collection">Keşiflerime dön</Link>
        </div>
      )}
      <div id="main-content" tabIndex={-1}>
        <Suspense
          fallback={
            <main className="route-stage-fallback" aria-busy="true">
              <p role="status" className="sr-only">
                Sayfa yükleniyor…
              </p>
              <div aria-hidden="true" className="route-stage-fallback-stack">
                <span className="route-stage-fallback-bar is-title" />
                <span className="route-stage-fallback-bar is-lead" />
                <span className="route-stage-fallback-panel" />
              </div>
            </main>
          }
        >
          <RouteStage>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/periodic" element={<PeriodicExplorer />} />
              <Route element={<CommerceLayout />}>
                <Route
                  path="/market"
                  element={
                    ACCOUNTS_ENABLED ? <Market /> : <FeatureUnavailable />
                  }
                />
                <Route
                  path="/shop"
                  element={ACCOUNTS_ENABLED ? <Shop /> : <FeatureUnavailable />}
                />
                <Route
                  path="/account"
                  element={
                    ACCOUNTS_ENABLED ? <Account /> : <FeatureUnavailable />
                  }
                />
              </Route>
              <Route path="/values" element={<LegacyRedirect to="/market" />} />
              <Route path="/trading" element={<LegacyRedirect to="/shop" />} />
              <Route
                path="/element/:symbol"
                element={<ScientificDetail kind="elements" />}
              />
              <Route path="/compounds" element={<Compounds />} />
              <Route
                path="/compound/:slug"
                element={<ScientificDetail kind="compounds" />}
              />
              <Route path="/docs" element={<ApiDocs />} />
              <Route path="/developers" element={<Developers />} />
              <Route path="/lab/formula" element={<LabFormula />} />
              <Route path="/lab/detective" element={<LabDetective />} />
              <Route path="/lab" element={<Laboratory />} />
              <Route
                path="/settings"
                element={
                  ACCOUNTS_ENABLED ? <Settings /> : <FeatureUnavailable />
                }
              />
              <Route
                path="/reset-password"
                element={
                  ACCOUNTS_ENABLED ? <Recovery /> : <FeatureUnavailable />
                }
              />
              <Route
                path="/verify-email"
                element={
                  ACCOUNTS_ENABLED ? (
                    <Recovery verify />
                  ) : (
                    <FeatureUnavailable />
                  )
                }
              />
              <Route path="/feedback" element={<Feedback />} />
              <Route path="/collection" element={<Collection />} />
              <Route path="/demo" element={<Demo />} />
              <Route path="/data" element={<DataCoverage />} />
              <Route
                path="/stack"
                element={<LegacyRedirect to={STACK_REDIRECT} />}
              />
              <Route path="/hakkinda" element={<About />} />
              <Route path="/nasil" element={<Guide />} />
              <Route path="/sozluk" element={<Glossary />} />
              <Route
                path="/login"
                element={ACCOUNTS_ENABLED ? <Login /> : <FeatureUnavailable />}
              />
              <Route
                path="/register"
                element={
                  ACCOUNTS_ENABLED ? <Register /> : <FeatureUnavailable />
                }
              />
              <Route
                path="*"
                element={
                  <main className="page page-miss">
                    <h1>Sayfa bulunamadı</h1>
                    <p>
                      Bu bağlantı artık geçerli olmayabilir. Su hâlâ /lab, Demir
                      hâlâ /element/fe.
                    </p>
                    <Button asChild variant="default">
                      <Link className="btn primary" to="/">
                        Ana sayfaya dön
                      </Link>
                    </Button>
                    <Button asChild variant="outline">
                      <Link className="btn" to="/lab">
                        Laboratuvar
                      </Link>
                    </Button>
                  </main>
                }
              />
            </Routes>
          </RouteStage>
        </Suspense>
      </div>
      <div className="toast" id="toast" role="status" aria-live="polite" />
    </ProductShell>
  );
}

function App() {
  return (
    <MotionConfig reducedMotion="user">
      <Router>
        <SelectedElementProvider>
          <AppContent />
        </SelectedElementProvider>
      </Router>
    </MotionConfig>
  );
}

export default App;
