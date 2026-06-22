import { createContext, useContext, useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import * as signalR from '@microsoft/signalr';
import Landing from './pages/Landing';
import PeriodicTable from './pages/PeriodicTable';
import Values from './pages/Values';
import Trading from './pages/Trading';
import ApiDocs from './pages/ApiDocs';
import ElementDetail from './pages/ElementDetail';
import Login from './pages/Login';
import Register from './pages/Register';
import { elementService } from './services/api';
import { HUB_URL } from './config';
import { type ElementItem, STATIC_ELEMENTS, mergeElementData } from './services/elementData';

interface SelectedElementContextType {
  selectedSymbol: string;
  selectedElement: ElementItem;
  setSelectedSymbol: (symbol: string) => void;
  elements: ElementItem[];
  setElements: React.Dispatch<React.SetStateAction<ElementItem[]>>;
  loading: boolean;
  isAuthenticated: boolean;
  setIsAuthenticated: (val: boolean) => void;
}

const SelectedElementContext = createContext<SelectedElementContextType | undefined>(undefined);

export function useSelectedElement() {
  const context = useContext(SelectedElementContext);
  if (!context) throw new Error("useSelectedElement must be used within a SelectedElementProvider");
  return context;
}

export function SelectedElementProvider({ children }: { children: React.ReactNode }) {
  const [selectedSymbol, setSelectedSymbolState] = useState<string>(() => {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get('symbol');
    const fromStore = localStorage.getItem('elementapi:selectedSymbol');
    return (fromUrl || fromStore || 'C').toUpperCase();
  });
  
  const [elements, setElements] = useState<ElementItem[]>(() => mergeElementData([], STATIC_ELEMENTS));
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('token'));

  // Load from API and merge
  useEffect(() => {
    let active = true;
    async function loadElements() {
      try {
        setLoading(true);
        const results = await elementService.getAllElements();
        if (active) {
          const merged = mergeElementData(results, STATIC_ELEMENTS);
          setElements(merged);
        }
      } catch (err) {
        console.warn("Could not fetch elements from database, falling back to static seeds.", err);
      } finally {
        if (active) setLoading(false);
      }
    }
    loadElements();
    return () => {
      active = false;
    };
  }, [isAuthenticated]);

  const setSelectedSymbol = (symbol: string) => {
    const sym = symbol.toUpperCase();
    setSelectedSymbolState(sym);
    localStorage.setItem('elementapi:selectedSymbol', sym);
    
    // Dynamically update URL query param if possible without full reload
    const url = new URL(window.location.href);
    url.searchParams.set('symbol', sym);
    window.history.pushState({}, '', url.pathname + url.search);
  };

  // SignalR Price updates
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(HUB_URL)
      .withAutomaticReconnect()
      .build();

    connection.on("PriceUpdated", (data) => {
      setElements(prev => prev.map(e => 
        e.symbol.toLowerCase() === data.symbol.toLowerCase() 
          ? { ...e, currentPrice: data.price, pricePerGram: data.price } 
          : e
      ));
    });

    connection.start().catch(err => console.error("SignalR Connection Error: ", err));

    return () => {
      connection.stop();
    };
  }, [isAuthenticated]);

  const selectedElement = elements.find(e => e.symbol.toUpperCase() === selectedSymbol) || elements[5]; // defaults to C

  return (
    <SelectedElementContext.Provider value={{
      selectedSymbol,
      selectedElement,
      setSelectedSymbol,
      elements,
      setElements,
      loading,
      isAuthenticated,
      setIsAuthenticated
    }}>
      {children}
    </SelectedElementContext.Provider>
  );
}

function Navbar() {
  const { selectedSymbol, isAuthenticated, setIsAuthenticated, elements } = useSelectedElement();
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

  return (
    <header className="topbar">
      <div className="topbar-start">
        <Link to={`/?symbol=${selectedSymbol}`} className="brand">
          <span className="brand-mark" aria-hidden="true">{selectedSymbol}</span>
          <span className="brand-text">
            <span className="brand-name">ElementAPI</span>
            <span className="brand-sub">Periyodik veri · ELX fiyat · mağaza</span>
          </span>
        </Link>
      </div>
      <nav className="nav" aria-label="Ana menü">
        <Link 
          to={`/periodic?symbol=${selectedSymbol}`} 
          className={navPage === 'periodic' ? 'active' : ''}
        >
          Tablo
        </Link>
        <Link 
          to={`/values?symbol=${selectedSymbol}`} 
          className={page === 'values' ? 'active' : ''}
        >
          Değerler
        </Link>
        <Link 
          to={`/trading?symbol=${selectedSymbol}`} 
          className={page === 'trading' ? 'active' : ''}
        >
          Mağaza
        </Link>
        <Link 
          to={`/docs?symbol=${selectedSymbol}`} 
          className={page === 'docs' ? 'active' : ''}
        >
          API
        </Link>
      </nav>
      <div className="top-actions">
        <span className="catalog-count" title="Yüklü element kaydı">
          {elements.length} kayıt
        </span>
        {isAuthenticated ? (
          <button onClick={handleLogout} className="btn mini-btn">
            Çıkış
          </button>
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
        <span className="footer-brand">ElementAPI</span>
        <span className="footer-sep" aria-hidden="true">·</span>
        <span>118 element · canlı fiyat · Elemental mağaza</span>
      </div>
    </footer>
  );
}

function AppContent() {
  return (
    <div className="app-shell">
      <Navbar />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/periodic" element={<PeriodicTable />} />
        <Route path="/values" element={<Values />} />
        <Route path="/trading" element={<Trading />} />
        <Route path="/element/:symbol" element={<ElementDetail />} />
        <Route path="/docs" element={<ApiDocs />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
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
