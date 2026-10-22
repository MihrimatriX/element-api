import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ACCOUNTS_ENABLED } from "../config";
import { usePolling } from "../hooks/usePolling";
import { readStorage, writeStorage } from "../lib/storage";
import { STATIC_ELEMENTS } from "../services/elementData";
import { onSessionChange, tokenUser } from "../services/session";

const SELECTED_SYMBOL_KEY = "elementapi:selectedSymbol";
const FALLBACK_SYMBOL = "AU";
/** Re-checks the JWT so an expired session signs out without a reload. */
const SESSION_CHECK_MS = 15_000;

interface SelectedElementContextValue {
  /** Upper-case symbol of the element the commerce demo is focused on. */
  selectedSymbol: string;
  setSelectedSymbol: (symbol: string) => void;
  isAuthenticated: boolean;
  setIsAuthenticated: (authenticated: boolean) => void;
}

const SelectedElementContext = createContext<
  SelectedElementContextValue | undefined
>(undefined);

function isKnownSymbol(symbol: string): boolean {
  return STATIC_ELEMENTS.some(
    (element) => element.symbol.toUpperCase() === symbol,
  );
}

function hasSession(): boolean {
  return ACCOUNTS_ENABLED && tokenUser() !== null;
}

/**
 * Holds the globally selected element (`?symbol=` wins, then localStorage, then gold)
 * and the client-side session flag shared by the shell and account pages.
 */
export function SelectedElementProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [storedSymbol, setStoredSymbol] = useState(() =>
    (
      new URLSearchParams(window.location.search).get("symbol") ||
      readStorage(SELECTED_SYMBOL_KEY) ||
      FALLBACK_SYMBOL
    ).toUpperCase(),
  );
  const candidate = (
    new URLSearchParams(location.search).get("symbol") || storedSymbol
  ).toUpperCase();
  const selectedSymbol = isKnownSymbol(candidate) ? candidate : FALLBACK_SYMBOL;

  const [isAuthenticated, setIsAuthenticated] = useState(hasSession);
  usePolling(() => setIsAuthenticated(hasSession()), SESSION_CHECK_MS);
  useEffect(() => onSessionChange(() => setIsAuthenticated(hasSession())), []);

  const setSelectedSymbol = (symbol: string) => {
    const next = symbol.toUpperCase();
    setStoredSymbol(next);
    writeStorage(SELECTED_SYMBOL_KEY, next);
    const params = new URLSearchParams(location.search);
    if (params.get("symbol") === next) return;
    params.set("symbol", next);
    navigate(`${location.pathname}?${params}`);
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

/** Selected element + session flag. Throws outside `SelectedElementProvider`. */
export function useSelectedElement(): SelectedElementContextValue {
  const context = useContext(SelectedElementContext);
  if (!context)
    throw new Error(
      "useSelectedElement must be used within a SelectedElementProvider",
    );
  return context;
}
