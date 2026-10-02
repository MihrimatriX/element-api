import { useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { Section } from "@/components/ui/section";
import { Stat } from "@/components/ui/stat";
import { useHoldings, useTicker, type HoldingRow, type HoldingsState } from "../components/commerce/data";
import { HoldingsTable } from "../components/commerce/HoldingsTable";
import { MoversStrip } from "../components/commerce/MoversStrip";
import { QuoteBoard } from "../components/commerce/QuoteBoard";
import { QuoteTicket } from "../components/commerce/QuoteTicket";
import { SellForm, type SaleDraft } from "../components/commerce/SellForm";
import Seo from "../components/Seo";
import { useCommerce } from "../context/commerce";
import { useSelectedElement } from "../context/selection";
import { usePolling } from "../hooks/usePolling";
import { formatFixed } from "../lib/format";
import { elementService, type BoardRow } from "../services/api";

const BOARD_POLL_MS = 20_000;
const MOVERS_LIMIT = 16;

/** Holdings of one element for the sell form: `null` while loading, empty when the vault failed to load. */
function holdingsOf(state: HoldingsState, symbol: string): HoldingRow[] | null {
  if (state.status === "loading") return null;
  if (state.status === "error") return [];
  return state.rows.filter((row) => row.symbol.toUpperCase() === symbol);
}

/**
 * /market: the virtual-KREDI price desk. A movers strip and a sortable quote board pick the
 * element; its ticket shows live prices with a buy link and a sell form; the vault lists holdings.
 */
export default function Market() {
  const { selectedSymbol, setSelectedSymbol, isAuthenticated } = useSelectedElement();
  const { elements, selectedElement, walletElx, refreshWallet } = useCommerce();
  const location = useLocation();
  const ticketRef = useRef<HTMLDivElement>(null);

  const [board, setBoard] = useState<BoardRow[]>([]);
  const [movers, setMovers] = useState<BoardRow[]>([]);
  const [boardStatus, setBoardStatus] = useState<"loading" | "ready" | "error">("loading");
  const [draft, setDraft] = useState<SaleDraft>({ slug: "elemental", grams: "" });
  const { ticker, reload: reloadTicker } = useTicker(selectedSymbol);
  const holdings = useHoldings(isAuthenticated);

  const loadBoard = () => {
    elementService.getMovers(MOVERS_LIMIT).then((rows) => setMovers(rows ?? []), () => undefined);
    elementService.getBoard().then(
      (rows) => {
        setBoard(rows ?? []);
        setBoardStatus("ready");
      },
      () => setBoardStatus("error"),
    );
  };
  usePolling(loadBoard, BOARD_POLL_MS);

  const bidBySymbol = useMemo(
    () => new Map(board.map((row) => [row.symbol.toUpperCase(), row.bid])),
    [board],
  );
  const bidOf = (symbol: string) => bidBySymbol.get(symbol.toUpperCase());
  const loginHref = `/login?returnTo=${encodeURIComponent(location.pathname + location.search)}`;

  const selectForSale = (row: HoldingRow) => {
    setSelectedSymbol(row.symbol);
    setDraft({ slug: row.compoundSlug, grams: String(Math.min(10, row.grams)) });
    ticketRef.current?.scrollIntoView({ block: "nearest" });
  };

  const handleSold = () => {
    void holdings.reload();
    refreshWallet();
    void reloadTicker();
  };

  return (
    <main className="container-page pb-24 pt-10 lg:pt-14">
      <Seo
        title="Piyasa · ElementAPI"
        description={`${selectedElement.name} (${selectedSymbol}) fiyat tablosu: son fiyat, alış, satış.`}
        path="/market"
      />
      <PageHeader
        eyebrow="Piyasa · sanal KREDI"
        title="Fiyat tablosu"
        lead="Alış ve satış fiyatları sanal KREDI demosudur; gerçek para veya borsa değil. Fe satırı eğitim simülasyonu."
        aside={
          isAuthenticated && (
            <Stat
              label="Cüzdan"
              value={walletElx == null ? "—" : formatFixed(walletElx, 2)}
              unit="kredi"
              className="min-w-56"
            />
          )
        }
      />

      <div className="mt-10">
        <MoversStrip
          rows={movers.length > 0 ? movers : board.slice(0, MOVERS_LIMIT)}
          selectedSymbol={selectedSymbol}
          onSelect={setSelectedSymbol}
        />
      </div>

      <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
        <QuoteBoard
          rows={board}
          elements={elements}
          loading={boardStatus === "loading"}
          failed={boardStatus === "error"}
          selectedSymbol={selectedSymbol}
          onSelect={setSelectedSymbol}
          onRetry={loadBoard}
        />
        <div ref={ticketRef} className="scroll-mt-20">
          <QuoteTicket element={selectedElement} ticker={ticker}>
            {isAuthenticated ? (
              <SellForm
                symbol={selectedSymbol}
                elementName={selectedElement.name}
                elements={elements}
                holdings={holdingsOf(holdings.state, selectedSymbol)}
                bid={ticker?.bid ?? bidOf(selectedSymbol)}
                draft={draft}
                onDraftChange={setDraft}
                onSold={handleSold}
              />
            ) : (
              <>
                <h3 className="text-sm font-semibold text-ink">Sat</h3>
                <p className="mt-1.5 text-sm leading-6 text-ink-2">
                  Satış için{" "}
                  <Link to={loginHref} className="text-link">
                    giriş yap
                  </Link>
                  . Kayıt olunca hesabına 10.000 kredi yüklenir.
                </p>
              </>
            )}
          </QuoteTicket>
        </div>
      </div>

      {isAuthenticated && (
        <Section
          title="Elindeki ürünler"
          description="Değer, bugünkü satış fiyatı ile ürün çarpanından hesaplanır."
          actions={
            <Button asChild variant="outline" size="sm">
              <Link to="/shop">Mağazaya git</Link>
            </Button>
          }
        >
          <HoldingsTable
            state={holdings.state}
            elements={elements}
            bidOf={bidOf}
            onRetry={holdings.retry}
            action={(row) => (
              <Button variant="ghost" size="sm" onClick={() => selectForSale(row)}>
                Satış için seç
              </Button>
            )}
          />
        </Section>
      )}
    </main>
  );
}
