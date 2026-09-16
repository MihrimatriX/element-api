import { Skeleton } from "@/components/ui/skeleton";
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
} from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  Navigate,
  useLocation,
  useNavigate,
} from "react-router-dom";
const Settings = lazy(() => import("./pages/Settings"));
const Recovery = lazy(() => import("./pages/Recovery"));
const Feedback = lazy(() => import("./pages/Feedback"));
const Collection = lazy(() => import("./pages/Collection"));
const Demo = lazy(() => import("./pages/Demo"));
const DataCoverage = lazy(() => import("./pages/DataCoverage"));
import { tokenUser } from "./services/session";
const Landing = lazy(() => import("./pages/Landing"));
const PeriodicTable = lazy(() => import("./pages/PeriodicTable"));
const Market = lazy(() => import("./pages/Market"));
const Shop = lazy(() => import("./pages/Shop"));
const ApiDocs = lazy(() => import("./pages/ApiDocs"));
const ElementDetail = lazy(() => import("./pages/ElementDetail"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const Account = lazy(() => import("./pages/Account"));

const About = lazy(() => import("./pages/About"));
const Guide = lazy(() => import("./pages/Guide"));
const Glossary = lazy(() => import("./pages/Glossary"));
const Compounds = lazy(() => import("./pages/Compounds"));
const ScientificDetail = lazy(() => import("./components/ScientificDetail"));
const Laboratory = lazy(() => import("./pages/Laboratory"));
import { ACCOUNTS_ENABLED, HUB_URL } from "./config";
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
  selectedElement: ElementItem;
  setSelectedSymbol: (symbol: string) => void;
  elements: ElementItem[];
  setElements: React.Dispatch<React.SetStateAction<ElementItem[]>>;
  loading: boolean;
  dataAvailable: boolean;
  isAuthenticated: boolean;
  setIsAuthenticated: (val: boolean) => void;
  walletElx: number | null;
  refreshWallet: () => void;
}

const SelectedElementContext = createContext<
  SelectedElementContextType | undefined
>(undefined);

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
  const commerceActive = /^\/(market|shop|account|values|trading)(\/|$)/.test(
    location.pathname,
  );
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

  const [elements, setElements] = useState<ElementItem[]>(() =>
    mergeElementData([], STATIC_ELEMENTS),
  );
  const [loading, setLoading] = useState(true);
  const [dataAvailable, setDataAvailable] = useState(false);
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
    if (!commerceActive) return;
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
  }, [isAuthenticated, commerceActive]);

  useEffect(() => {
    if (!isAuthenticated || !commerceActive) return;
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
  }, [isAuthenticated, commerceActive]);

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

  useEffect(() => {
    if (!commerceActive) return;
    let disposed = false;
    let stop = () => {};
    void import("@microsoft/signalr")
      .then((signalR) => {
        if (disposed) return;
        const connection = new signalR.HubConnectionBuilder()
          .withUrl(HUB_URL)
          .withAutomaticReconnect()
          .build();
        connection.on(
          "PriceUpdated",
          (data: { symbol?: string; price?: number }) => {
            if (
              !data?.symbol ||
              typeof data.price !== "number" ||
              !Number.isFinite(data.price) ||
              data.price <= 0
            )
              return;
            setElements((prev) =>
              prev.map((e) =>
                e.symbol.toLowerCase() === data.symbol!.toLowerCase()
                  ? { ...e, currentPrice: data.price, pricePerGram: data.price }
                  : e,
              ),
            );
          },
        );
        const started = connection.start().catch((err) => {
          if (!disposed) console.error("SignalR connection:", err);
        });
        stop = () => {
          void started.then(() => connection.stop());
        };
      })
      .catch((err) => {
        if (!disposed) console.error("Price connection unavailable:", err);
      });
    return () => {
      disposed = true;
      stop();
    };
  }, [commerceActive]);

  const selectedElement =
    elements.find((e) => e.symbol.toUpperCase() === selectedSymbol) ||
    elements[78];

  return (
    <SelectedElementContext.Provider
      value={{
        selectedSymbol,
        selectedElement,
        setSelectedSymbol,
        elements,
        setElements,
        loading,
        dataAvailable,
        isAuthenticated,
        setIsAuthenticated,
        walletElx: isAuthenticated ? walletElx : null,
        refreshWallet,
      }}
    >
      {children}
    </SelectedElementContext.Provider>
  );
}

function LegacyRedirect({ to }: { to: string }) {
  const location = useLocation();
  return <Navigate to={`${to}${location.search}`} replace />;
}

function FeatureUnavailable() {
  return (
    <main className="science-detail">
      <h1>Bu kurulum keşif için hazır.</h1>
      <p>
        Hesap ve ticaret servisleri bu bağımsız atlas sürümünde açık değil.
        Keşiflerini bu tarayıcıda sürdürebilirsin.
      </p>
      <Button asChild variant="default">
        <Link className="btn primary" to="/collection">
          Koleksiyonuma dön
        </Link>
      </Button>
    </main>
  );
}

function AppContent() {
  const { dataAvailable, loading } = useSelectedElement();
  const location = useLocation();
  const commerceActive = /^\/(market|shop|account)(\/|$)/.test(
    location.pathname,
  );
  return (
    <ProductShell>
      {/^\/(market|shop|account)(\/|$)/.test(location.pathname) && (
        <div className="simulation-banner">
          Sanal ticaret demosu · Gerçek para ve teslimat içermez.{" "}
          <Link to="/collection">Keşiflerime dön</Link>
        </div>
      )}
      <div id="main-content" tabIndex={-1}>
        {commerceActive && !loading && !dataAvailable && (
          <p className="service-notice" role="status">
            Bağlantı kurulamadı. Temel element bilgilerini inceleyebilirsiniz;
            güncel fiyat ve alışveriş geçici olarak kullanılamıyor.
          </p>
        )}
        <Suspense
          fallback={
            <main className="science-detail">
              <p role="status" className="sr-only">
                Sayfa yükleniyor…
              </p>
              <div aria-hidden="true" className="space-y-5">
                <Skeleton className="h-8 w-52" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="mt-8 h-64 w-full" />
              </div>
            </main>
          }
        >
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/periodic" element={<PeriodicTable />} />
            <Route
              path="/market"
              element={ACCOUNTS_ENABLED ? <Market /> : <FeatureUnavailable />}
            />
            <Route
              path="/shop"
              element={ACCOUNTS_ENABLED ? <Shop /> : <FeatureUnavailable />}
            />
            <Route
              path="/account"
              element={ACCOUNTS_ENABLED ? <Account /> : <FeatureUnavailable />}
            />
            <Route path="/values" element={<LegacyRedirect to="/market" />} />
            <Route path="/trading" element={<LegacyRedirect to="/shop" />} />
            <Route path="/element/:symbol" element={<ElementDetail />} />
            <Route path="/compounds" element={<Compounds />} />
            <Route
              path="/compound/:slug"
              element={<ScientificDetail kind="compounds" />}
            />
            <Route path="/docs" element={<ApiDocs />} />
            <Route path="/lab" element={<Laboratory />} />
            <Route
              path="/settings"
              element={ACCOUNTS_ENABLED ? <Settings /> : <FeatureUnavailable />}
            />
            <Route
              path="/reset-password"
              element={ACCOUNTS_ENABLED ? <Recovery /> : <FeatureUnavailable />}
            />
            <Route
              path="/verify-email"
              element={
                ACCOUNTS_ENABLED ? <Recovery verify /> : <FeatureUnavailable />
              }
            />
            <Route path="/feedback" element={<Feedback />} />
            <Route path="/collection" element={<Collection />} />
            <Route path="/demo" element={<Demo />} />
            <Route path="/data" element={<DataCoverage />} />
            <Route path="/stack" element={<LegacyRedirect to="/hakkinda" />} />
            <Route path="/hakkinda" element={<About />} />
            <Route path="/nasil" element={<Guide />} />
            <Route path="/sozluk" element={<Glossary />} />
            <Route
              path="/login"
              element={ACCOUNTS_ENABLED ? <Login /> : <FeatureUnavailable />}
            />
            <Route
              path="/register"
              element={ACCOUNTS_ENABLED ? <Register /> : <FeatureUnavailable />}
            />
            <Route
              path="*"
              element={
                <main className="page">
                  <h1>Sayfa bulunamadı</h1>
                  <p>Bu bağlantı artık geçerli olmayabilir.</p>
                  <Button asChild variant="default">
                    <Link className="btn primary" to="/">
                      Ana sayfaya dön
                    </Link>
                  </Button>
                </main>
              }
            />
          </Routes>
        </Suspense>
      </div>
      <div className="toast" id="toast" role="status" aria-live="polite" />
    </ProductShell>
  );
}

function App() {
  return (
    <Router>
      <SelectedElementProvider>
        <AppContent />
      </SelectedElementProvider>
    </Router>
  );
}

export default App;
