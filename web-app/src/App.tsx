import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import * as signalR from '@microsoft/signalr';
import Landing from './pages/Landing';
import PeriodicTable from './pages/PeriodicTable';
import Market from './pages/Market';
import Shop from './pages/Shop';
import ApiDocs from './pages/ApiDocs';
import ElementDetail from './pages/ElementDetail';
import Login from './pages/Login';
import Register from './pages/Register';
import Account from './pages/Account';
import Stack from './pages/Stack';
import About from './pages/About';
import Guide from './pages/Guide';
import Glossary from './pages/Glossary';
import Compounds from './pages/Compounds';
import ScientificDetail from './components/ScientificDetail';
import { elementService, walletService } from './services/api';
import { HUB_URL } from './config';
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
    const fromStore = localStorage.getItem('elementapi:selectedSymbol');
    return (fromUrl || fromStore || 'Au').toUpperCase();
  });
  const candidate = (new URLSearchParams(location.search).get('symbol') || storedSymbol).toUpperCase();
  const selectedSymbol = STATIC_ELEMENTS.some((e) => e.symbol.toUpperCase() === candidate) ? candidate : 'AU';

  const [elements, setElements] = useState<ElementItem[]>(() => mergeElementData([], STATIC_ELEMENTS));
  const [loading, setLoading] = useState(true);
  const [dataAvailable, setDataAvailable] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('token'));
  const [walletElx, setWalletElx] = useState<number | null>(null);

  const refreshWallet = useCallback(async () => {
    const token = localStorage.getItem('token');
    const wallet = await (token && localStorage.getItem('apiKey') ? walletService.get().catch(() => null) : Promise.resolve(null));
    if (token === localStorage.getItem('token')) setWalletElx(wallet ? Number(wallet.balanceElx) : null);
  }, []);

  useEffect(() => {
    if (!commerceActive) return;
    let active = true;
    async function loadElements() {
      try {
        setLoading(true);
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
    if (!isAuthenticated) return;
    let active = true;
    walletService.get().then((wallet) => { if (active) setWalletElx(Number(wallet.balanceElx)); })
      .catch(() => { if (active) setWalletElx(null); });
    return () => { active = false; };
  }, [isAuthenticated, commerceActive]);

  const setSelectedSymbol = (symbol: string) => {
    const sym = symbol.toUpperCase();
    setSelectedSymbolState(sym);
    localStorage.setItem('elementapi:selectedSymbol', sym);
    const url = new URL(window.location.href);
    url.searchParams.set('symbol', sym);
    if (url.pathname + url.search !== window.location.pathname + window.location.search) navigate(url.pathname + url.search);
  };

  useEffect(() => {
    if (!commerceActive) return;
    const connection = new signalR.HubConnectionBuilder()
      .withUrl(HUB_URL)
      .withAutomaticReconnect()
      .build();

    connection.on('PriceUpdated', (data: { symbol?: string; price?: number }) => {
      if (!data?.symbol || typeof data.price !== 'number' || !Number.isFinite(data.price) || data.price <= 0) return;
      setElements((prev) => prev.map((e) =>
        e.symbol.toLowerCase() === data.symbol!.toLowerCase()
          ? { ...e, currentPrice: data.price, pricePerGram: data.price }
          : e
      ));
    });

    let disposed = false;
    const started = connection.start().catch((err) => {
      if (!disposed) console.error('SignalR Connection Error: ', err);
    });
    return () => {
      disposed = true;
      // Finish negotiation before stopping, including React StrictMode cleanup.
      void started.then(() => connection.stop());
    };
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
    localStorage.removeItem('token');
    localStorage.removeItem('apiKey');
    setIsAuthenticated(false);
    navigate('/');
  };

  const page = location.pathname.replace('/', '').split('/')[0] || 'home';
  const navPage = page === 'element' ? 'periodic' : page;
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
        <Link to={`/periodic?symbol=${selectedSymbol}`} className={navPage === 'periodic' ? 'active' : ''}>Tablo</Link>
        <Link to="/compounds" className={page === 'compounds' || page === 'compound' ? 'active' : ''}>Bileşikler</Link>
        <Link to={`/market?symbol=${selectedSymbol}`} className={page === 'market' ? 'active' : ''}>Piyasa</Link>
        <Link to={`/shop?symbol=${selectedSymbol}`} className={page === 'shop' ? 'active' : ''}>Mağaza</Link>
        <Link to={`/docs?symbol=${selectedSymbol}`} className={page === 'docs' ? 'active' : ''}>API</Link>
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
          <Link to="/stack">Altyapı</Link>
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
        <Route path="/stack" element={<Stack />} />
        <Route path="/hakkinda" element={<About />} />
        <Route path="/nasil" element={<Guide />} />
        <Route path="/sozluk" element={<Glossary />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="*" element={<main className="page"><h1>Sayfa bulunamadı</h1><p>Bu bağlantı artık geçerli olmayabilir.</p><Link className="btn primary" to="/">Ana sayfaya dön</Link></main>} />
      </Routes>
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
