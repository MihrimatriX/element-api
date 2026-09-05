import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useSelectedElement } from '../App';
import { pagePath } from '../config';
import Seo from '../components/Seo';
import {
  addToCart,
  cartLineKey,
  compoundService,
  elementService,
  orderService,
  orderStatusLabel,
  readCart,
  writeCart,
  type BoardRow,
  type CartItem,
  type CompoundSku
} from '../services/api';
import { type ElementItem } from '../services/elementData';

const PICKS = ['Au', 'Ag', 'Cu', 'Fe', 'C', 'Na', 'Al', 'Pt'];
const PACKS = [1, 10, 100];

const KIND_TR: Record<string, string> = {
  allotrope: 'başka biçim',
  compound: 'bileşik',
  preparation: 'preparat'
};

const fmt = (n: number, digits = 2) =>
  new Intl.NumberFormat('tr-TR', { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(n);

const elx = (n: number) => `${fmt(n, 2)} kredi`;

function toast(text: string) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = text;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 1600);
}

interface ShopOrder {
  id: string;
  elementSymbol: string;
  quantity: number;
  totalPrice: number;
  status: string;
  trackingNumber?: string | null;
  productLabel?: string | null;
  compoundFormula?: string | null;
}

export default function Shop() {
  const { elements, selectedSymbol, setSelectedSymbol, isAuthenticated, walletElx, refreshWallet } = useSelectedElement();
  const navigate = useNavigate();
  const location = useLocation();
  const [board, setBoard] = useState<BoardRow[]>([]);
  const [cart, setCart] = useState<CartItem[]>(() => readCart());
  const [compounds, setCompounds] = useState<CompoundSku[]>([]);
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(true);
  const [onlySelected, setOnlySelected] = useState(() => new URLSearchParams(location.search).has('symbol'));
  const [searchInput, setSearchInput] = useState('');
  const [pack, setPack] = useState(10);
  const [ordersList, setOrdersList] = useState<ShopOrder[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [checkoutNote, setCheckoutNote] = useState('');

  useEffect(() => { writeCart(cart); }, [cart]);

  useEffect(() => {
    let live = true;
    const load = () => elementService.getBoard().then((rows) => { if (live) setBoard(rows || []); }).catch(() => { if (live) setBoard([]); });
    void load();
    const timer = setInterval(load, 15000);
    return () => { live = false; clearInterval(timer); };
  }, []);

  useEffect(() => {
    let live = true;
    compoundService.all({ element: onlySelected ? selectedSymbol : undefined }).then((data) => {
      if (!live) return;
      setCompounds(data);
      setLoadError('');
      setLoading(false);
    }).catch(() => {
      if (!live) return;
      setCompounds([]);
      setLoadError('Ürünler şu anda yüklenemiyor. Biraz sonra yeniden deneyin.');
      setLoading(false);
    });
    return () => { live = false; };
  }, [selectedSymbol, onlySelected]);

  useEffect(() => {
    if (!isAuthenticated) return;
    let live = true;
    const load = () => orderService.list().then((rows) => {
      if (live) { setOrdersList(rows || []); refreshWallet(); }
    }).catch(() => {});
    void load();
    const timer = setInterval(load, 4000);
    return () => { live = false; clearInterval(timer); };
  }, [isAuthenticated, refreshWallet]);

  const quote = (symbol: string) => {
    const row = board.find((b) => b.symbol.toUpperCase() === symbol.toUpperCase());
    const el = elements.find((e) => e.symbol.toUpperCase() === symbol.toUpperCase());
    const last = row?.last ?? 0;
    const ask = row?.ask ?? 0;
    const stock = row ? (row.availableStock ?? el?.availableStock ?? 0) : 0;
    return { last, ask, stock };
  };

  const addSku = (sku: CompoundSku, grams: number) => {
    const { stock } = quote(sku.elementSymbol);
    setCart(addToCart(sku.elementSymbol, grams, stock, {
      slug: sku.slug,
      formula: sku.formula,
      label: sku.nameTr || sku.name,
      priceMult: sku.priceMult
    }).filter((i) => i.qty > 0));
    toast(`${sku.formula} · +${grams} g`);
  };

  const handleStepCart = (item: CartItem, delta: number) => {
    const { stock } = quote(item.symbol);
    const key = cartLineKey(item.symbol, item.slug);
    setCart((prev) =>
      prev
        .map((line) => {
          if (cartLineKey(line.symbol, line.slug) !== key) return line;
          return { ...line, requestId: crypto.randomUUID(), qty: Math.min(stock, Math.max(0, line.qty + delta)) };
        })
        .filter((line) => line.qty > 0)
    );
  };

  const cartLines = cart.map((item) => {
    const el = elements.find((e) => e.symbol.toUpperCase() === item.symbol.toUpperCase());
    if (!el) return null;
    const q = quote(item.symbol);
    const qty = item.qty;
    const unitAsk = q.ask * (item.priceMult || 1);
    return { item, element: el, qty, unitAsk, lineTotal: unitAsk * qty, stock: q.stock };
  }).filter(Boolean) as { item: CartItem; element: ElementItem; qty: number; unitAsk: number; lineTotal: number; stock: number }[];

  const subtotal = cartLines.reduce((s, l) => s + l.lineTotal, 0);
  const overStock = cartLines.some((line) =>
    cartLines.filter((other) => other.item.symbol.toUpperCase() === line.item.symbol.toUpperCase())
      .reduce((sum, other) => sum + other.qty, 0) > line.stock);
  const walletShort = isAuthenticated && walletElx != null && subtotal > walletElx;

  const handleCheckout = async () => {
    if (!isAuthenticated) {
      navigate(`/login?returnTo=${encodeURIComponent(location.pathname + location.search)}`);
      return;
    }
    if (cartLines.length === 0 || overStock || walletShort) return;
    setSubmitting(true);
    setCheckoutNote('');
    try {
      let remaining = cart;
      let accepted = 0;
      for (const line of cartLines) {
        const res = await orderService.submitOrder(line.element.symbol, line.qty, line.item.slug, line.item.requestId);
        setOrdersList((prev) => [res, ...prev.filter((order) => order.id !== res.id)]);
        remaining = remaining.filter((item) => cartLineKey(item.symbol, item.slug) !== cartLineKey(line.item.symbol, line.item.slug));
        writeCart(remaining);
        setCart(remaining);
        accepted++;
        setCheckoutNote(`${accepted} sipariş iletildi.`);
      }
      refreshWallet();
      toast('Sipariş iletildi');
    } catch (err: unknown) {
      const ax = err as { response?: { status?: number; data?: { error?: string } } };
      setCheckoutNote((ax.response?.status === 402
        ? 'Cüzdanda yeterli kredi yok.'
        : (ax.response?.data?.error || 'Sipariş iletilemedi.')) + ' Kalan ürünler sepette. Güvenle tekrar deneyebilirsiniz.');
    } finally {
      setSubmitting(false);
    }
  };

  const visible = useMemo(() => {
    const q = searchInput.trim().toLowerCase();
    if (!q) return compounds;
    return compounds.filter((c) =>
      c.formula.toLowerCase().includes(q)
      || c.name.toLowerCase().includes(q)
      || c.nameTr.toLowerCase().includes(q)
      || c.slug.toLowerCase().includes(q)
      || c.elementSymbol.toLowerCase().includes(q)
    );
  }, [compounds, searchInput]);

  const orderLabel = (order: ShopOrder) => {
    if (order.productLabel) return `${order.productLabel} · ${fmt(order.quantity, 0)} g`;
    if (order.compoundFormula) return `${order.compoundFormula} · ${fmt(order.quantity, 0)} g`;
    return `${order.elementSymbol} · ${fmt(order.quantity, 0)} g`;
  };

  const skuInCart = (sku: CompoundSku) =>
    cart.find((c) => cartLineKey(c.symbol, c.slug) === cartLineKey(sku.elementSymbol, sku.slug));

  return (
    <main className="page shop-page">
      <Seo
        title="Mağaza · Element API"
        description="Bileşik, allotrop ve preparat. Fiyat, ana element alış × çarpan."
        path={pagePath('/shop', selectedSymbol)}
      />
      <section className="shop-header">
        <div className="shop-header-copy">
          <p className="kicker">Mağaza</p>
          <h1>Elementler ve bileşikler</h1>
          <p className="lead shop-lead">
            Gram seç, sepete ekle. Alışverişler uygulamanın para birimi Kredi ile simüle edilir.
          </p>
          {!isAuthenticated && (
            <p className="guest-note">
              Gezmek serbest.{' '}
              <Link to="/register">Kayıt olunca hesabına 10.000 kredi yüklenir.</Link>
            </p>
          )}
        </div>
        <form className="shop-search-bar" role="search" onSubmit={(e) => e.preventDefault()}>
          <input
            type="search"
            aria-label="Ürünlerde ara"
            placeholder="Formül, ad, sembol…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            autoComplete="off"
          />
        </form>
        <div className="shop-filters">
          <button
            type="button"
            className={`chip ${!onlySelected ? 'active' : ''}`}
            onClick={() => setOnlySelected(false)}
          >
            Tümü
          </button>
          {PICKS.map((sym) => (
            <button
              key={sym}
              type="button"
              className={`chip ${onlySelected && selectedSymbol === sym.toUpperCase() ? 'active' : ''}`}
              onClick={() => {
                setSelectedSymbol(sym);
                setOnlySelected(true);
              }}
            >
              {sym}
            </button>
          ))}
        </div>
        <div className="pack-row" role="group" aria-label="Paket gram">
          {PACKS.map((g) => (
            <button
              key={g}
              type="button"
              className={`chip ${pack === g ? 'active' : ''}`}
              onClick={() => setPack(g)}
            >
              {g} g
            </button>
          ))}
        </div>
      </section>

      <section className="shop-layout">
        <div className="shop-catalog">
          {loading && <p className="muted">Ürünler yükleniyor…</p>}
          {!loading && loadError && <p className="desk-msg">{loadError}</p>}
          {!loading && !loadError && visible.length === 0 && (
            <p className="empty-cart">
              {onlySelected
                ? `${selectedSymbol} için ürün yok. Tümü’ne geç veya başka element seç.`
                : 'Aramaya uyan ürün yok.'}
            </p>
          )}
          <div className="compound-grid">
            {visible.map((sku) => {
              const q = quote(sku.elementSymbol);
              const line = skuInCart(sku);
              const unit = q.ask * sku.priceMult;
              return (
                <article key={sku.slug} className={`compound-card ${line ? 'in-cart' : ''}`}>
                  <div className="sku-card-head">
                    <h3 className="mono">{sku.formula}</h3>
                    <span className="sku-kind">{KIND_TR[sku.kind] || sku.kind}</span>
                  </div>
                  <p className="sku-name">{sku.nameTr || sku.name}</p>
                  {sku.properties && <details className="sku-properties">
                    <summary>Kimyasal özellikler</summary>
                    <dl>
                      <div><dt>Molar kütle</dt><dd>{fmt(sku.properties.molecularWeight, 3)} g/mol</dd></div>
                      <div><dt>IUPAC adı</dt><dd>{sku.properties.iupacName}</dd></div>
                    </dl>
                    <a href={sku.properties.sourceUrl} target="_blank" rel="noreferrer">PubChem kaynağı ↗</a>
                  </details>}
                  <p className="muted shop-parent">
                    {sku.elementSymbol}
                    {' · '}
                    <button type="button" className="text-link" onClick={() => { setSelectedSymbol(sku.elementSymbol); setOnlySelected(true); }}>
                      {elements.find((e) => e.symbol.toUpperCase() === sku.elementSymbol.toUpperCase())?.name || sku.elementSymbol}
                    </button>
                  </p>
                  <div className="price-row">
                    <strong>{q.ask > 0 ? elx(unit) : '—'}</strong>
                    <span className="muted">/ g</span>
                  </div>
                  <span className="stock-note">{line ? `Sepette ${fmt(line.qty, 0)} g` : `${fmt(q.stock, 0)} g stok`}</span>
                  <button
                    className="btn primary"
                    type="button"
                    disabled={submitting || q.stock < pack || q.ask <= 0}
                    onClick={() => addSku(sku, pack)}
                  >
                    +{pack} g
                  </button>
                </article>
              );
            })}
          </div>
        </div>

        <aside className="side-stack">
          <section className="panel cart-card" id="cartSummary">
            <div className="panel-header">
              <div>
                <p className="kicker">Sepet</p>
                <h3 style={{ margin: 0 }}>Gramlar</h3>
              </div>
              <button className="mini-btn" type="button" disabled={submitting} onClick={() => { setCart([]); writeCart([]); }}>Temizle</button>
            </div>
            <div className="panel-body">
              {cartLines.map((line) => (
                <div key={cartLineKey(line.item.symbol, line.item.slug)} className="cart-row">
                  <div>
                    <h4 style={{ margin: '0 0 4px', fontSize: '15px' }}>{line.item.formula}</h4>
                    <p style={{ margin: 0, color: 'var(--muted)', fontSize: '12px' }}>
                      {line.item.label} · {elx(line.unitAsk)} / g
                    </p>
                  </div>
                  <div className="cart-row-actions">
                    <div className="quantity-stepper">
                      <button type="button" disabled={submitting} aria-label={`${line.item.formula} miktarını azalt`} onClick={() => handleStepCart(line.item, -1)}>−</button>
                      <span>{fmt(line.qty, 0)} g</span>
                      <button type="button" disabled={submitting} aria-label={`${line.item.formula} miktarını artır`} onClick={() => handleStepCart(line.item, 1)}>+</button>
                    </div>
                    <button
                      className="cart-remove"
                      disabled={submitting}
                      type="button"
                      onClick={() => setCart((c) => c.filter((i) => cartLineKey(i.symbol, i.slug) !== cartLineKey(line.item.symbol, line.item.slug)))}
                    >
                      Kaldır
                    </button>
                  </div>
                </div>
              ))}
              {cartLines.length === 0 && <div className="empty-cart">Sepet boş. Üründen gram ekle.</div>}
              <div className="cart-totals">
                <div className="grand"><span>Toplam</span><strong>{elx(subtotal)}</strong></div>
                {isAuthenticated && walletElx != null && (
                  <div><span>Cüzdan</span><strong>{elx(walletElx)}</strong></div>
                )}
              </div>
              {walletShort && <p className="desk-msg">Cüzdanda yeterli kredi yok.</p>}
              {overStock && <p className="desk-msg">Sepette stoktan fazla gram var.</p>}
              <button
                className="btn primary submit-order"
                type="button"
                onClick={handleCheckout}
                disabled={cartLines.length === 0 || submitting || overStock || walletShort}
              >
                {submitting ? 'İletiliyor…' : isAuthenticated ? 'Sipariş ver' : 'Giriş yap ve sipariş ver'}
              </button>
              {checkoutNote && <p className="checkout-status" role="status">{checkoutNote}</p>}
            </div>
          </section>

          <section className="panel">
            <div className="panel-header">
              <div>
                <p className="kicker">Siparişler</p>
                <h3 style={{ margin: 0 }}>Durum</h3>
              </div>
            </div>
            <div className="panel-body">
              {(isAuthenticated ? ordersList : []).map((order) => {
                const label = orderStatusLabel[order.status] || order.status;
                const klass = order.status === 'Completed' ? 'status-success'
                  : order.status === 'Failed' || order.status === 'Compensated' ? 'status-danger'
                  : 'status-warning';
                return (
                  <div key={order.id} className="bank-row" style={{ padding: '10px' }}>
                    <div>
                      <span className="mono" style={{ fontSize: 11 }}>{order.id.slice(0, 8)}</span>
                      <strong>{orderLabel(order)}</strong>
                      {order.trackingNumber && <p className="muted" style={{ margin: 0, fontSize: 12 }}>Kargo {order.trackingNumber}</p>}
                    </div>
                    <span className={`status-badge ${klass}`}>{label}</span>
                  </div>
                );
              })}
              {ordersList.length === 0 && (
                <p className="muted">{isAuthenticated ? 'Henüz sipariş yok.' : 'Takip için giriş.'}</p>
              )}
            </div>
          </section>
        </aside>
      </section>
    </main>
  );
}
