import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useCommerce, useSelectedElement } from "../App";
import {
  compoundService,
  elementService,
  walletService,
  apiError,
  type BoardRow,
  type Ticker,
  type Holding,
} from "../services/api";
import { pagePath } from "../config";
import Seo from "../components/Seo";

const fmt = (n: number, digits = 2) =>
  new Intl.NumberFormat("tr-TR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(n);

const elx = (n: number | null | undefined, digits = 2) =>
  n == null || Number.isNaN(n) ? "—" : `${fmt(n, digits)} kredi`;

function deltaClass(pct: number | null | undefined) {
  if (pct == null) return "desk-flat";
  return pct >= 0 ? "desk-up" : "desk-down";
}

type SortKey = "symbol" | "last" | "bid" | "ask" | "change24hPct";

export default function Market() {
  const { selectedSymbol, setSelectedSymbol, isAuthenticated } =
    useSelectedElement();
  const { elements, selectedElement, refreshWallet } = useCommerce();
  const navigate = useNavigate();
  const location = useLocation();
  const [movers, setMovers] = useState<BoardRow[]>([]);
  const [board, setBoard] = useState<BoardRow[]>([]);
  const [ticker, setTicker] = useState<Ticker | null>(null);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [sellSlug, setSellSlug] = useState("elemental");
  const [productMultiplier, setProductMultiplier] = useState<{
    slug: string;
    value: number;
  } | null>(null);
  const [marketError, setMarketError] = useState("");
  const [sellGrams, setSellGrams] = useState("10");
  const [sellMsg, setSellMsg] = useState("");
  const [selling, setSelling] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("symbol");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [filter, setFilter] = useState("");

  useEffect(() => {
    let live = true;
    const load = () => {
      elementService
        .getMovers(16)
        .then((rows) => {
          if (live) setMovers(rows || []);
        })
        .catch(() => {});
      elementService
        .getBoard()
        .then((rows) => {
          if (live) {
            setBoard(rows || []);
            setMarketError("");
          }
        })
        .catch(() => {
          if (live)
            setMarketError(
              "Fiyatlar güncellenemedi. Bağlantı tekrar deneniyor.",
            );
        });
    };
    load();
    const t = setInterval(load, 20000);
    return () => {
      live = false;
      clearInterval(t);
    };
  }, []);

  useEffect(() => {
    let live = true;
    elementService
      .getTicker(selectedSymbol)
      .then((t) => {
        if (live) setTicker(t);
      })
      .catch(() => {
        if (live) setTicker(null);
      });
    const id = setInterval(() => {
      elementService
        .getTicker(selectedSymbol)
        .then((t) => {
          if (live) setTicker(t);
        })
        .catch(() => {});
    }, 12000);
    return () => {
      live = false;
      clearInterval(id);
    };
  }, [selectedSymbol, selectedElement.currentPrice]);

  useEffect(() => {
    if (!isAuthenticated) return;
    let live = true;
    walletService
      .holdings()
      .then((rows) => {
        if (live) setHoldings(rows || []);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [isAuthenticated, selectedElement.currentPrice]);

  useEffect(() => {
    if (sellSlug === "elemental") return;
    let live = true;
    compoundService
      .get(sellSlug)
      .then((sku) => {
        if (live)
          setProductMultiplier({ slug: sellSlug, value: sku.priceMult });
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [sellSlug]);

  const currentTicker =
    ticker?.symbol.toUpperCase() === selectedSymbol ? ticker : null;
  const last = currentTicker?.last;
  const bid = currentTicker?.bid;
  const ask = currentTicker?.ask;
  const chg = ticker?.change24hPct ?? null;

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir(key === "symbol" ? "asc" : "desc");
    }
  };

  const boardRows = useMemo(() => {
    const q = filter.trim().toLowerCase();
    const rows = board.filter(
      (r) =>
        !q ||
        r.symbol.toLowerCase().includes(q) ||
        elements
          .find((e) => e.symbol.toLowerCase() === r.symbol.toLowerCase())
          ?.name.toLocaleLowerCase("tr")
          .includes(q),
    );
    const dir = sortDir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      if (sortKey === "symbol") return dir * a.symbol.localeCompare(b.symbol);
      if (sortKey === "change24hPct") {
        const av = a.change24hPct ?? -Infinity;
        const bv = b.change24hPct ?? -Infinity;
        return dir * (av - bv);
      }
      return dir * ((a[sortKey] ?? 0) - (b[sortKey] ?? 0));
    });
  }, [board, elements, filter, sortKey, sortDir]);

  const selectedHolding = isAuthenticated
    ? holdings.find(
        (h) =>
          h.symbol.toUpperCase() === selectedSymbol &&
          h.compoundSlug === sellSlug,
      )
    : undefined;
  const saleMultiplier =
    sellSlug === "elemental"
      ? 1
      : productMultiplier?.slug === sellSlug
        ? productMultiplier.value
        : null;
  const saleBid =
    bid != null && saleMultiplier != null ? bid * saleMultiplier : null;
  const tapeSource = movers.length
    ? movers
    : board.length
      ? board.slice(0, 16)
      : boardRows.slice(0, 16);
  const tape = tapeSource;

  const handleSell = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      navigate(
        `/login?returnTo=${encodeURIComponent(location.pathname + location.search)}`,
      );
      return;
    }
    const grams = Number(sellGrams);
    if (
      !Number.isFinite(grams) ||
      grams <= 0 ||
      !selectedHolding ||
      grams > selectedHolding.grams ||
      saleBid == null
    ) {
      setSellMsg("Gram girin.");
      return;
    }
    setSelling(true);
    setSellMsg("");
    try {
      const res = await walletService.sell(selectedSymbol, grams, sellSlug);
      setSellMsg(
        `${fmt(grams, 2)} g ${selectedHolding.productLabel} satıldı · ${elx(res.proceedsElx)}`,
      );
      const rows = await walletService.holdings();
      setHoldings(rows || []);
      refreshWallet();
      const t = await elementService.getTicker(selectedSymbol);
      setTicker(t);
    } catch (err: unknown) {
      setSellMsg(apiError(err, "Satış yapılamadı."));
    } finally {
      setSelling(false);
    }
  };

  const sortMark = (key: SortKey) =>
    sortKey === key ? (sortDir === "asc" ? " ↑" : " ↓") : "";

  return (
    <main className="page desk-page">
      <Seo
        title="Piyasa · Element API"
        description={`${selectedElement.name} (${selectedSymbol}) fiyat tablosu: son fiyat, alış, satış.`}
        path={pagePath("/market", selectedSymbol)}
      />

      <header className="firm-head">
        <div>
          <h1>Fiyat tablosu</h1>
        </div>
        <p className="firm-head-note">
          Alış / satış fiyatları sanal KREDI demosudur — gerçek para veya borsa
          değil. Fe satırı eğitim simülasyonu.
        </p>
      </header>
      {marketError && (
        <p className="desk-msg" role="status">
          {marketError}
        </p>
      )}

      <div className="tape" aria-label="Hareketliler">
        <div className="tape-track">
          {tape.map((m, i) => (
            <Button
              variant="plain"
              size="none"
              key={`${m.symbol}-${i}`}
              type="button"
              className={`tape-chip ${deltaClass(m.change24hPct)}`}
              onClick={() => setSelectedSymbol(m.symbol)}
            >
              <span className="mono">{m.symbol}</span>
              <span>{fmt(m.last, 2)}</span>
              <span>
                {m.change24hPct == null
                  ? "—"
                  : `${m.change24hPct >= 0 ? "+" : ""}${fmt(m.change24hPct, 2)}%`}
              </span>
            </Button>
          ))}
        </div>
      </div>

      <div className="desk-terminal">
        <section className="quote-board-wrap" aria-label="Fiyat tablosu">
          <div className="board-toolbar">
            <h2>Fiyatlar</h2>
            <Input
              type="search"
              className="board-filter"
              placeholder="Sembol…"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              aria-label="Tabloda ara"
            />
            <span className="muted mono">{boardRows.length}</span>
          </div>
          <div className="quote-sort" role="group" aria-label="Sırala">
            {(
              [
                ["symbol", "Sembol"],
                ["last", "Son fiyat"],
                ["ask", "Alış"],
                ["bid", "Satış"],
                ["change24hPct", "Değişim"],
              ] as [SortKey, string][]
            ).map(([key, label]) => (
              <Button
                key={key}
                variant="plain"
                size="none"
                type="button"
                aria-pressed={sortKey === key}
                onClick={() => toggleSort(key)}
              >
                {label}
                {sortMark(key)}
              </Button>
            ))}
          </div>
          <div className="quote-board">
            {boardRows.map((row) => {
              const sel = row.symbol.toUpperCase() === selectedSymbol;
              const name =
                elements.find(
                  (e) => e.symbol.toUpperCase() === row.symbol.toUpperCase(),
                )?.name ?? row.symbol;
              return (
                <Button
                  variant="plain"
                  size="none"
                  key={row.symbol}
                  type="button"
                  className={`quote-tile ${sel ? "is-sel" : ""}`}
                  onClick={() => setSelectedSymbol(row.symbol)}
                >
                  <span className="quote-sym">{row.symbol}</span>
                  <span className="quote-name">{name}</span>
                  <strong>{fmt(row.last, 2)}</strong>
                  <em className={deltaClass(row.change24hPct)}>
                    {row.change24hPct == null
                      ? "—"
                      : `${row.change24hPct >= 0 ? "+" : ""}${fmt(row.change24hPct, 2)}%`}
                  </em>
                  <span className="quote-meta">
                    alış {fmt(row.ask, 2)} · satış {fmt(row.bid, 2)}
                  </span>
                </Button>
              );
            })}
          </div>
          {boardRows.length === 0 && (
            <p className="empty-cart">
              {filter ? "Aramanıza uyan element yok." : "Fiyatlar bekleniyor…"}
            </p>
          )}
        </section>

        <aside className="desk-ticket" aria-label="Alış satış">
          <header className="ticket-head">
            <div>
              <p className="science-meta">{selectedSymbol}</p>
              <h2>{selectedElement.name}</h2>
            </div>
            <strong className={`mono ${deltaClass(chg)}`}>
              {chg == null ? "—" : `${chg >= 0 ? "+" : ""}${fmt(chg, 2)}%`}
            </strong>
          </header>
          <dl className="ticket-quotes">
            <div>
              <dt>Son fiyat</dt>
              <dd className="mono">{elx(last, 4)}</dd>
            </div>
            <div>
              <dt>Alış</dt>
              <dd className="mono desk-up">{elx(ask, 4)}</dd>
            </div>
            <div>
              <dt>Satış</dt>
              <dd className="mono desk-down">{elx(bid, 4)}</dd>
            </div>
            <div>
              <dt>Stok</dt>
              <dd className="mono">
                {fmt(
                  ticker?.availableStock ?? selectedElement.availableStock ?? 0,
                  0,
                )}{" "}
                g
              </dd>
            </div>
          </dl>

          <div className="ticket-actions">
            <Button asChild variant="default">
              <Link
                to={`/shop?symbol=${selectedSymbol}`}
                className="btn primary"
              >
                Satın al
              </Link>
            </Button>
            {isAuthenticated ? (
              <form className="desk-sell-inline" onSubmit={handleSell}>
                <Input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={sellGrams}
                  onChange={(e) => setSellGrams(e.target.value)}
                  aria-label="Satış gram"
                />
                <Button
                  variant="outline"
                  className="btn"
                  type="submit"
                  disabled={
                    selling ||
                    !selectedHolding ||
                    saleBid == null ||
                    !Number.isFinite(Number(sellGrams)) ||
                    Number(sellGrams) <= 0 ||
                    Number(sellGrams) > selectedHolding.grams
                  }
                >
                  {selling ? "…" : "Sat"}
                </Button>
              </form>
            ) : (
              <p className="guest-note">
                Satış için{" "}
                <Link
                  to={`/login?returnTo=${encodeURIComponent(location.pathname + location.search)}`}
                >
                  giriş
                </Link>
                .
              </p>
            )}
          </div>
          {isAuthenticated && (
            <p className="desk-vault muted">
              {selectedHolding?.productLabel ?? selectedSymbol}:{" "}
              {selectedHolding ? `${fmt(selectedHolding.grams, 2)} g` : "0 g"} ·
              Tahmini satış{" "}
              {elx(saleBid == null ? null : saleBid * Number(sellGrams))}
            </p>
          )}
          {sellMsg && (
            <p className="desk-msg" role="status">
              {sellMsg}
            </p>
          )}
        </aside>
      </div>
      {isAuthenticated && (
        <Card asChild className="gap-0 py-0 shadow-none">
          <section className="panel" aria-label="Elindeki ürünler">
            <div className="panel-header">
              <h2>Elindeki ürünler</h2>
              <Link to="/shop">Mağazaya git</Link>
            </div>
            <div className="panel-body">
              {holdings.length === 0 && (
                <p className="muted">
                  Kasada ürün yok. <Link to="/shop">Mağazadan 1 g Fe dene</Link>
                  .
                </p>
              )}
              {holdings.map((holding) => (
                <div
                  className="bank-row"
                  key={`${holding.symbol}:${holding.compoundSlug}`}
                >
                  <div>
                    <strong>{holding.productLabel}</strong>
                    <span>
                      {fmt(holding.grams, 4)} g · Ortalama maliyet{" "}
                      {elx(holding.avgCostElx)} / g
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    className="btn mini-btn"
                    onClick={() => {
                      setSelectedSymbol(holding.symbol);
                      setSellSlug(holding.compoundSlug);
                      setSellGrams(String(Math.min(10, holding.grams)));
                    }}
                  >
                    Satış için seç
                  </Button>
                </div>
              ))}
            </div>
          </section>
        </Card>
      )}
    </main>
  );
}
