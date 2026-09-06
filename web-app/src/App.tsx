import { Suspense, lazy, createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
const Landing = lazy(() => import('./pages/Landing'));
const PeriodicTable = lazy(() => import('./pages/PeriodicTable'));
const Market = lazy(() => import('./pages/Market'));
const Shop = lazy(() => import('./pages/Shop'));
const ApiDocs = lazy(() => import('./pages/ApiDocs'));
const ElementDetail = lazy(() => import('./pages/ElementDetail'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Account = lazy(() => import('./pages/Account'));

const About = lazy(() => import('./pages/About'));
const Guide = lazy(() => import('./pages/Guide'));
const Glossary = lazy(() => import('./pages/Glossary'));
const Compounds = lazy(() => import('./pages/Compounds'));
const ScientificDetail = lazy(() => import('./components/ScientificDetail'));
const Laboratory = lazy(() => import('./pages/Laboratory'));
import { HUB_URL } from './config';
import { readLocal, writeLocal, removeLocal } from './services/storage';
import { type ElementItem, STATIC_ELEMENTS, mergeElementData } from './services/elementData';

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

const SelectedElementContext = createContext<SelectedElementContextType | undefined>(undefined);

// The hook and provider intentionally share the same context instance.
// eslint-disable-next-line react-refresh/only-export-components
export function useSelectedElement() {
  const context = useContext(SelectedElementContext);
  if (!context) throw new Error('useSelectedElement must be used within a SelectedElementProvider');
  return context;
}

export function SelectedElementProvider({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const commerceActive = /^\/(market|shop|account|values|trading)(\/|$)/.test(location.pathname);
  const [storedSymbol, setSelectedSymbolState] = useState<string>(() => {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get('symbol');
    const fromStore = readLocal('elementapi:selectedSymbol');
    return (fromUrl || fromStore || 'Au').toUpperCase();
  });
  const candidate = (new URLSearchParams(location.search).get('symbol') || storedSymbol).toUpperCase();
  const selectedSymbol = STATIC_ELEMENTS.some((e) => e.symbol.toUpperCase() === candidate) ? candidate : 'AU';

  const [elements, setElements] = useState<ElementItem[]>(() => mergeElementData([], STATIC_ELEMENTS));
  const [loading, setLoading] = useState(true);
  const [dataAvailable, setDataAvailable] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(!!readLocal('token'));
  const [walletElx, setWalletElx] = useState<number | null>(null);

  const refreshWallet = useCallback(async () => {
    const token = readLocal('token');
    const { walletService } = await import('./services/api');
    const wallet = await (token && readLocal('apiKey') ? walletService.get().catch(() => null) : Promise.resolve(null));
    if (token === readLocal('token')) setWalletElx(wallet ? Number(wallet.balanceElx) : null);
  }, []);

  useEffect(() => {
    if (!commerceActive) return;
    let active = true;
    async function loadElements() {
      try {
        setLoading(true);
        const { elementService } = await import('./services/api');
        const results = await elementService.getAllElements();
        if (active) { setElements(mergeElementData(results, STATIC_ELEMENTS)); setDataAvailable(true); }
      } catch (err) {
        console.warn('Could not fetch elements from database, falling back to static seeds.', err);
        if (active) setDataAvailable(false);
      } finally {
        if (active) setLoading(false);
      }
    }
    loadElements();
    const timer = setInterval(loadElements, 30000);
    return () => { active = false; clearInterval(timer); };
  }, [isAuthenticated, commerceActive]);

  useEffect(() => {
    if (!isAuthenticated || !commerceActive) return;
    let active = true;
    import('./services/api').then(({walletService})=>walletService.get()).then((wallet) => { if (active) setWalletElx(Number(wallet.balanceElx)); })
      .catch(() => { if (active) setWalletElx(null); });
    return () => { active = false; };
  }, [isAuthenticated, commerceActive]);

  const setSelectedSymbol = (symbol: string) => {
    const sym = symbol.toUpperCase();
    setSelectedSymbolState(sym);
    writeLocal('elementapi:selectedSymbol', sym);
    const url = new URL(window.location.href);
    url.searchParams.set('symbol', sym);
    if (url.pathname + url.search !== window.location.pathname + window.location.search) navigate(url.pathname + url.search);
  };

  useEffect(() => {
    if (!commerceActive) return;
    let disposed = false;
    let stop = () => {};
    void import('@microsoft/signalr').then(signalR => {
      if (disposed) return;
      const connection = new signalR.HubConnectionBuilder().withUrl(HUB_URL).withAutomaticReconnect().build();
      connection.on('PriceUpdated', (data: {symbol?:string;price?:number}) => {
        if (!data?.symbol || typeof data.price !== 'number' || !Number.isFinite(data.price) || data.price <= 0) return;
        setElements(prev => prev.map(e => e.symbol.toLowerCase() === data.symbol!.toLowerCase() ? {...e, currentPrice:data.price, pricePerGram:data.price} : e));
      });
      const started=connection.start().catch(err=>{if(!disposed)console.error('SignalR connection:',err);});
      stop=()=>{void started.then(()=>connection.stop());};
    }).catch(err=>{if(!disposed)console.error('Price connection unavailable:',err);});
    return () => { disposed=true;stop(); };
  }, [commerceActive]);

  const selectedElement = elements.find((e) => e.symbol.toUpperCase() === selectedSymbol) || elements[78];

  return (
    <SelectedElementContext.Provider value={{
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
      refreshWallet
    }}>
      {children}
    </SelectedElementContext.Provider>
  );
}

function Navbar() {
  const { selectedSymbol, isAuthenticated, setIsAuthenticated, walletElx } = useSelectedElement();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    removeLocal('token');
    removeLocal('apiKey');
    setIsAuthenticated(false);
    navigate('/');
  };

  const page = location.pathname.replace('/', '').split('/')[0] || 'home';
  const navPage = page === 'element' || page === 'home' ? 'periodic' : page;
  const aboutOpen = page === 'hakkinda' || page === 'nasil' || page === 'sozluk';
  const aboutRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    aboutRef.current?.removeAttribute('open');
  }, [location.pathname]);

  const fmt = (n: number) =>
    new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 }).format(n);

  return (
    <header className="topbar">
      <div className="topbar-start">
        <Link to={`/?symbol=${selectedSymbol}`} className="brand">
          <span className="brand-mark" aria-hidden="true">El</span>
          <span className="brand-text">
            <span className="brand-name">Element API</span>
            <span className="brand-sub">Kimyasal katalog</span>
          </span>
        </Link>
      </div>
      <nav className="nav" aria-label="Ana menü">
        <Link to={`/periodic?symbol=${selectedSymbol}`} className={navPage === 'periodic' ? 'active' : ''}>Elementler</Link>
        <Link to="/compounds" className={page === 'compounds' || page === 'compound' ? 'active' : ''}>Bileşikler</Link>
        <Link to="/lab" className={page === 'lab' ? 'active' : ''}>Laboratuvar</Link>
        <Link to="/docs" className={page === 'docs' ? 'active' : ''}>API</Link>
        <Link to={`/market?symbol=${selectedSymbol}`} className={page === 'market' ? 'active' : ''}>Piyasa</Link>
        <Link to={`/shop?symbol=${selectedSymbol}`} className={page === 'shop' ? 'active' : ''}>Mağaza</Link>
        <details ref={aboutRef} className={`nav-drop ${aboutOpen ? 'active' : ''}`}>
          <summary>Hakkında</summary>
          <div className="nav-drop-menu">
            <Link to="/hakkinda">Hakkında</Link>
            <Link to="/nasil">Rehber</Link>
            <Link to="/sozluk">Sözlük</Link>
          </div>
        </details>
      </nav>
      <div className="top-actions">
        {isAuthenticated && walletElx != null && (
          <Link to="/account" className="elx-pill mono" title="Hesap">
            {fmt(walletElx)} kredi
          </Link>
        )}
        {isAuthenticated ? (
          <>
            <Link to="/account" className="btn mini-btn">Hesap</Link>
            <button onClick={handleLogout} className="btn mini-btn">Çıkış</button>
          </>
        ) : (
          <div className="auth-links">
            <Link to="/login" className="btn mini-btn">Giriş</Link>
            <Link to="/register" className="btn primary mini-btn">Kayıt</Link>
          </div>
        )}
      </div>
    </header>
  );
}

function SiteFooter() {
  return (
    <footer className="site-footer app-footer">
      <div className="footer-inner">
        <div className="footer-brand-block">
          <span className="footer-brand">Element API</span>
          <p className="footer-tag">Kimyasal katalog</p>
        </div>
        <nav className="footer-map" aria-label="Site haritası">
          <Link to="/hakkinda">Hakkında</Link>
          <Link to="/nasil">Rehber</Link>
          <Link to="/sozluk">Sözlük</Link>
          <Link to="/compounds">Bileşikler</Link>
          <Link to="/docs">API</Link>
          <Link to="/lab">Laboratuvar</Link>
        </nav>
        <p className="footer-legal">Kredi, uygulamanın sanal para birimidir.</p>
      </div>
    </footer>
  );
}

function LegacyRedirect({ to }: { to: string }) {
  const location = useLocation();
  return <Navigate to={`${to}${location.search}`} replace />;
}

function AppContent() {
  const { dataAvailable, loading } = useSelectedElement();
  const location = useLocation();
  const commerceActive = /^\/(market|shop|account)(\/|$)/.test(location.pathname);
  return (
    <div className="app-shell">
      <Navbar />
      {commerceActive && !loading && !dataAvailable && <p className="service-notice" role="status">Bağlantı kurulamadı. Temel element bilgilerini inceleyebilirsiniz; güncel fiyat ve alışveriş geçici olarak kullanılamıyor.</p>}
      <Suspense fallback={<main className="science-detail"><p role="status">Sayfa yükleniyor…</p></main>}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/periodic" element={<PeriodicTable />} />
        <Route path="/market" element={<Market />} />
        <Route path="/shop" element={<Shop />} />
        <Route path="/account" element={<Account />} />
        <Route path="/values" element={<LegacyRedirect to="/market" />} />
        <Route path="/trading" element={<LegacyRedirect to="/shop" />} />
        <Route path="/element/:symbol" element={<ElementDetail />} />
        <Route path="/compounds" element={<Compounds />} />
        <Route path="/compound/:slug" element={<ScientificDetail kind="compounds" />} />
        <Route path="/docs" element={<ApiDocs />} />
        <Route path="/lab" element={<Laboratory />} />
        <Route path="/stack" element={<LegacyRedirect to="/hakkinda" />} />
        <Route path="/hakkinda" element={<About />} />
        <Route path="/nasil" element={<Guide />} />
        <Route path="/sozluk" element={<Glossary />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="*" element={<main className="page"><h1>Sayfa bulunamadı</h1><p>Bu bağlantı artık geçerli olmayabilir.</p><Link className="btn primary" to="/">Ana sayfaya dön</Link></main>} />
      </Routes>
      </Suspense>
      <SiteFooter />
      <div className="toast" id="toast" role="status" aria-live="polite" />
    </div>
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
