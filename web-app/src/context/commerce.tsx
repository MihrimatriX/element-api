import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { usePolling } from "../hooks/usePolling";
import { readStorage } from "../lib/storage";
import {
  type ElementItem,
  STATIC_ELEMENTS,
  mergeElementData,
} from "../services/elementData";
import { useSelectedElement } from "./selection";

const ELEMENTS_POLL_MS = 30_000;

interface CommerceContextValue {
  /** Static element seeds merged with the latest live prices and stock. */
  elements: ElementItem[];
  selectedElement: ElementItem;
  /** True until the first live price request settles. */
  loading: boolean;
  /** False when the last live price request failed (static seeds are shown). */
  dataAvailable: boolean;
  /** Virtual KREDI balance; `null` for guests or when the wallet is unreachable. */
  walletElx: number | null;
  refreshWallet: () => void;
}

const CommerceContext = createContext<CommerceContextValue | undefined>(
  undefined,
);

async function fetchWalletBalance(): Promise<number | null> {
  const { walletService } = await import("../services/api");
  const wallet = await walletService.get().catch(() => null);
  return wallet ? Number(wallet.balanceElx) : null;
}

/**
 * Live element prices and the wallet balance for the KREDI demo pages
 * (/market, /shop, /account). Mount it only where those pages render:
 * it polls the element service while the tab is visible.
 */
export function CommerceProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, selectedSymbol } = useSelectedElement();
  const [elements, setElements] = useState(() =>
    mergeElementData([], STATIC_ELEMENTS),
  );
  const [loading, setLoading] = useState(true);
  const [dataAvailable, setDataAvailable] = useState(false);
  const [walletElx, setWalletElx] = useState<number | null>(null);

  usePolling(async () => {
    try {
      const { elementService } = await import("../services/api");
      const live = await elementService.getAllElements();
      setElements(mergeElementData(live, STATIC_ELEMENTS));
      setDataAvailable(true);
    } catch (error) {
      console.warn("Live element prices unavailable; showing static seeds.", error);
      setDataAvailable(false);
    } finally {
      setLoading(false);
    }
  }, ELEMENTS_POLL_MS);

  useEffect(() => {
    if (!isAuthenticated) return;
    let active = true;
    void fetchWalletBalance().then((balance) => {
      if (active) setWalletElx(balance);
    });
    return () => {
      active = false;
    };
  }, [isAuthenticated]);

  const refreshWallet = useCallback(async () => {
    const token = readStorage("token");
    const balance =
      token && readStorage("apiKey") ? await fetchWalletBalance() : null;
    // A login or logout during the request makes this balance stale.
    if (token === readStorage("token")) setWalletElx(balance);
  }, []);

  // selectedSymbol is validated against the static list, so the lookup only misses if live data drops it.
  const selectedElement =
    elements.find((element) => element.symbol.toUpperCase() === selectedSymbol) ??
    elements[0];

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

/** Commerce data for the KREDI demo pages. Throws outside `CommerceProvider`. */
export function useCommerce(): CommerceContextValue {
  const context = useContext(CommerceContext);
  if (!context)
    throw new Error("useCommerce must be used within a CommerceProvider");
  return context;
}
