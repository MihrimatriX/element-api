import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useSelectedElement } from '../App';
import { apiClient, orderService } from '../services/api';
import { categoryLabels, categoryTokens, valuationFor, type ElementItem } from '../services/elementData';
import { ShoppingCart, Star } from 'lucide-react';
import * as signalR from '@microsoft/signalr';
import { HUB_URL } from '../config';

interface CartItem {
  symbol: string;
  qty: number;
}

export default function Trading() {
  const { elements, selectedSymbol, selectedElement, isAuthenticated } = useSelectedElement();
  const navigate = useNavigate();
  const location = useLocation();

  const requireAuth = () => {
    if (isAuthenticated) return true;
    const returnTo = encodeURIComponent(location.pathname + location.search);
    navigate(`/login?returnTo=${returnTo}`);
    return false;
  };

  // Cart State (loaded/saved to localStorage)
  const [cart, setCart] = useState<CartItem[]>(() => {
    const raw = localStorage.getItem("elementapi:elementalCart");
    if (!raw) return [];
    try {
      return JSON.parse(raw) as CartItem[];
    } catch {
      return [];
    }
  });

  // Shop filters
  const [activeCategory, setActiveCategory] = useState('all');
  const [sortMode, setSortMode] = useState('featured');
  const [searchInput, setSearchInput] = useState('');

  // Orders and Saga Tracking
  const [ordersList, setOrdersList] = useState<any[]>([]);
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [checkoutReceipt, setCheckoutReceipt] = useState<any>(null);

  // Save Cart to LocalStorage
  useEffect(() => {
    localStorage.setItem("elementapi:elementalCart", JSON.stringify(cart));
  }, [cart]);

  // Fetch Order History from backend
  useEffect(() => {
    if (!isAuthenticated) return;
    let active = true;

    async function fetchOrders() {
      try {
        // Find X-User-Id header needs JWT token decoded by gateway
        const res = await apiClient.get('/orders');
        if (active) {
          setOrdersList(res.data || []);
        }
      } catch (err) {
        console.warn("Could not fetch orders history.", err);
      }
    }

    fetchOrders();
    return () => {
      active = false;
    };
  }, [isAuthenticated]);

  // Listen to SignalR OrderStatusUpdated events on window (passed from App.tsx hub connection)
  useEffect(() => {
    if (!isAuthenticated) return;
    
    // We can define a callback that hooks into order updates if we want to listen locally,
    // but since the top-level App.tsx starts SignalR, we can listen for a custom event or setup a local connection if needed.
    // Setting up a dedicated local hub connection for the Saga tracker is very clean.
    const connection = new signalR.HubConnectionBuilder()
      .withUrl(HUB_URL)
      .withAutomaticReconnect()
      .build();

    connection.on("OrderStatusUpdated", (data: any) => {
      setOrdersList(prev => {
        // If order exists, update it. If not, maybe fetch again or add it.
        const exists = prev.some(o => o.id === data.orderId);
        if (exists) {
          return prev.map(o => o.id === data.orderId ? { ...o, status: data.status } : o);
        } else {
          // fetch again to ensure consistency
          apiClient.get('/orders')
            .then(res => setOrdersList(res.data || []))
            .catch(() => {});
          return prev;
        }
      });
    });

    connection.start().catch((err: any) => console.error("SignalR Dashboard Tracker Error: ", err));

    return () => {
      connection.stop();
    };
  }, [isAuthenticated]);

  // Product pricing — prefer DB commerce fields when available
  const productFor = (element: ElementItem) => {
    const val = valuationFor(element);
    const price = element.currentPrice || val.price;
    const discount = 0.08 + (element.atomicNumber % 5) * 0.025;
    return {
      price,
      listPrice: price / (1 - discount),
      rating: element.rating ?? Math.min(4.9, 4.18 + (element.atomicNumber % 8) * 0.08),
      reviews: element.reviewCount ?? 120 + element.atomicNumber * 11,
      seller: element.sellerName ?? `${categoryLabels[element.category] || element.category} deposu`,
      delivery: element.deliveryNote ?? (element.category === "actinide" ? "Kontrollü teslimat" : "Yarın kapında"),
      badge: element.badge ?? (element.atomicNumber % 3 === 0 ? "Çok satan" : "Fırsat"),
      imageUrl: element.imageUrl
    };
  };

  const elementImage = (el: ElementItem) =>
    el.imageUrl || `https://images-of-elements.com/${(el.nameEn || el.name).toLowerCase().replace(/ü/g, 'u').replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ş/g, 's').replace(/ç/g, 'c').replace(/ğ/g, 'g')}.jpg`;

  // Add to Cart
  const handleAddToCart = (symbol: string) => {
    if (!requireAuth()) return;
    setCart(prev => {
      const existing = prev.find(item => item.symbol === symbol);
      let nextCart = [];
      if (existing) {
        nextCart = prev.map(item => item.symbol === symbol ? { ...item, qty: Math.min(99, item.qty + 1) } : item);
      } else {
        nextCart = [{ symbol, qty: 1 }, ...prev];
      }
      return nextCart.slice(0, 8); // Max 8 unique items
    });

    // Flash cart element visual confirmation
    const cartEl = document.getElementById("cartSummary");
    if (cartEl) {
      cartEl.classList.add("cart-pulse");
      setTimeout(() => cartEl.classList.remove("cart-pulse"), 420);
    }

    const toast = document.getElementById("toast");
    if (toast) {
      const el = elements.find(item => item.symbol === symbol);
      toast.textContent = `${el?.name || symbol} sepete eklendi`;
      toast.classList.add("show");
      setTimeout(() => toast.classList.remove("show"), 1500);
    }
  };

  // Remove / Step Cart
  const handleStepCart = (symbol: string, delta: number) => {
    setCart(prev => {
      return prev.map(item => {
        if (item.symbol !== symbol) return item;
        const nextQty = item.qty + delta;
        return nextQty <= 0 ? null : { ...item, qty: Math.min(99, nextQty) };
      }).filter(Boolean) as CartItem[];
    });
  };

  const handleRemoveFromCart = (symbol: string) => {
    setCart(prev => prev.filter(item => item.symbol !== symbol));
  };

  const handleClearCart = () => {
    setCart([]);
    setCheckoutReceipt(null);
  };

  // Checkout sequence submitting single-orders to the backend for each item
  const handleCheckout = async () => {
    if (!requireAuth()) return;
    if (cart.length === 0) return;
    setSubmittingOrder(true);
    setCheckoutReceipt(null);
    try {
      const orderPromises = cart.map(async (item) => {
        return orderService.submitOrder(item.symbol, item.qty);
      });
      const results = await Promise.all(orderPromises);
      
      // Update order history locally immediately
      const newOrders = results.map((res: any, idx) => ({
        id: res.id || res.orderId,
        elementSymbol: cart[idx].symbol.toUpperCase(),
        quantity: cart[idx].qty,
        totalPrice: res.totalPrice,
        status: 'Submitted',
        createdAt: new Date().toISOString()
      }));

      setOrdersList(prev => [...newOrders, ...prev]);
      setCheckoutReceipt({
        id: newOrders[0].id,
        count: cart.length
      });

      // Clear Cart
      setCart([]);
      
      const toast = document.getElementById("toast");
      if (toast) {
        toast.textContent = "Siparişler başarıyla oluşturuldu.";
        toast.classList.add("show");
        setTimeout(() => toast.classList.remove("show"), 1500);
      }
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.error || "Sipariş verilirken hata oluştu.");
    } finally {
      setSubmittingOrder(false);
    }
  };

  // Calculate Totals
  const cartLines = cart.map((item) => {
    const el = elements.find(e => e.symbol === item.symbol);
    if (!el) return null;
    const prod = productFor(el);
    return {
      element: el,
      qty: item.qty,
      unitPrice: prod.price,
      lineTotal: prod.price * item.qty,
      delivery: prod.delivery
    };
  }).filter(Boolean) as any[];

  const subtotal = cartLines.reduce((sum, line) => sum + line.lineTotal, 0);
  const fee = subtotal * 0.018; // 1.8% service fee
  const delivery = subtotal > 1200 || subtotal === 0 ? 0 : 39; // free delivery over 1200 ELX
  const total = subtotal + fee + delivery;

  // Sorting and filtering products
  const query = searchInput.trim().toLowerCase();
  const sortedAndFilteredElements = elements.filter((el) => {
    const matchesCategory = activeCategory === 'all' || el.category === activeCategory;
    const matchesQuery = !query ||
      el.name.toLowerCase().includes(query) ||
      el.symbol.toLowerCase().includes(query) ||
      categoryLabels[el.category]?.toLowerCase().includes(query);
    return matchesCategory && matchesQuery;
  }).sort((a, b) => {
    const pa = productFor(a);
    const pb = productFor(b);
    if (sortMode === "price-asc") return pa.price - pb.price;
    if (sortMode === "price-desc") return pb.price - pa.price;
    if (sortMode === "rating") return pb.rating - pa.rating;
    // Featured / selection defaults
    if (a.symbol === selectedSymbol) return -1;
    if (b.symbol === selectedSymbol) return 1;
    return a.atomicNumber - b.atomicNumber;
  });

  const formatNumber = (val: number, digits = 0) => {
    return new Intl.NumberFormat("tr-TR", {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits
    }).format(val);
  };

  const formatElx = (val: number) => {
    return `${formatNumber(val, 2)} ELX`;
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    const toast = document.getElementById("toast");
    if (toast) {
      toast.textContent = "Kopyalandı";
      toast.classList.add("show");
      setTimeout(() => toast.classList.remove("show"), 1500);
    }
  };

  // API Order payload mock showing draft checkout JSON structure
  const orderApiPayloadJson = JSON.stringify({
    endpoint: "POST /api/v1/orders",
    body: {
      currency: "ELX",
      channel: "elemental-web",
      status: cartLines.length ? "draft" : "empty_cart",
      order_ids: checkoutReceipt ? [checkoutReceipt.id] : null,
      items: cartLines.map((line) => ({
        symbol: line.element.symbol,
        name: line.element.name,
        quantity: line.qty,
        unit_price_elx: Number(line.unitPrice.toFixed(2))
      })),
      service_fee_elx: Number(fee.toFixed(2)),
      delivery_elx: Number(delivery.toFixed(2)),
      total_elx: Number(total.toFixed(2))
    }
  }, null, 2);

  return (
    <main className="page">
      <section className="shop-header">
        <div className="shop-header-copy">
          <p className="kicker">Elemental mağaza</p>
          <h1>Element paketleri</h1>
          <p className="lead shop-lead">
            Gram bazında fiyat, stok durumu ve sepet. Sipariş gövdesi sepetle birlikte oluşur.
          </p>
          {!isAuthenticated && (
            <p className="guest-note">
              Gezmek serbest. Satın almak için{' '}
              <Link to={`/login?returnTo=${encodeURIComponent(location.pathname + location.search)}`}>giriş yap</Link>
              {' '}veya <Link to="/register">kayıt ol</Link>.
            </p>
          )}
        </div>
        <form className="shop-search-bar" role="search" onSubmit={(e) => e.preventDefault()}>
          <input
            id="shopSearchInput"
            type="search"
            placeholder="Sembol, element adı veya kategori…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            autoComplete="off"
          />
          <button className="btn primary" type="submit">Ara</button>
        </form>
        <p className="shop-shipping-note">1200 ELX üzeri siparişlerde teslimat ücretsiz.</p>
      </section>

      {/* Shop Marketplace — Hepsiburada-style layout */}
      <section className="hb-market-layout">
        <aside className="hb-category-sidebar" aria-label="Kategori menüsü">
          <h3>Kategoriler</h3>
          <div className="hb-category-list">
            <button className={`hb-category-btn ${activeCategory === 'all' ? 'active' : ''}`} onClick={() => setActiveCategory('all')}>Tüm ürünler</button>
            {Object.entries(categoryLabels).map(([cat, label]) => (
              <button
                key={cat}
                className={`hb-category-btn ${activeCategory === cat ? 'active' : ''}`}
                onClick={() => setActiveCategory(cat)}
              >
                {label}
              </button>
            ))}
          </div>
        </aside>

        <div className="hb-catalog-panel panel">
          <div className="market-toolbar market-toolbar-slim">
            <p className="catalog-result-count muted">
              {sortedAndFilteredElements.length} ürün
              {activeCategory !== 'all' && ` · ${categoryLabels[activeCategory] || activeCategory}`}
            </p>
            <div className="field sort-field">
              <label htmlFor="shopSort">Sıralama</label>
              <select
                id="shopSort"
                value={sortMode}
                onChange={(e) => setSortMode(e.target.value)}
              >
                <option value="featured">Öne çıkanlar</option>
                <option value="price-asc">Fiyat artan</option>
                <option value="price-desc">Fiyat azalan</option>
                <option value="rating">Puanı yüksek</option>
              </select>
            </div>
          </div>

          {/* Product Grid */}
          <div className="product-grid" id="productGrid">
            {sortedAndFilteredElements.map((el) => {
              const prod = productFor(el);
              const cartLine = cart.find(item => item.symbol === el.symbol);
              return (
                <article 
                  key={el.symbol} 
                  className={`product-card hb-card ${cartLine ? 'in-cart' : ''}`}
                  style={{ '--cat': categoryTokens[el.category] || 'var(--accent)' } as React.CSSProperties}
                >
                  <div className="product-thumb">
                    <img
                      src={elementImage(el)}
                      alt={`${el.name} element görseli`}
                      loading="lazy"
                      onError={(e) => {
                        const img = e.currentTarget;
                        img.style.display = 'none';
                        const fb = img.nextElementSibling as HTMLElement | null;
                        if (fb) fb.style.display = 'grid';
                      }}
                    />
                    <span className="symbol-fallback" style={{ display: 'none' }}>{el.symbol}</span>
                    <span className="product-badge" style={{ position: 'absolute', top: 8, left: 8 }}>{cartLine ? 'Sepette' : prod.badge}</span>
                  </div>
                  <div className="product-title">
                    <h3>{el.name} paketi</h3>
                    <span>{categoryLabels[el.category] || el.category} · atom no {el.atomicNumber}</span>
                  </div>
                  <div className="rating-row hb-stars">
                    <strong className="rating-line">
                      <Star size={13} fill="currentColor" aria-hidden="true" />
                      {formatNumber(prod.rating, 1)}
                    </strong>
                    <span className="seller-note">({formatNumber(prod.reviews)})</span>
                  </div>
                  <div className="price-row">
                    <strong>{formatElx(prod.price)}</strong>
                    <del>{formatElx(prod.listPrice)}</del>
                  </div>
                  <span className="hb-free-shipping">1200 ELX üzeri ücretsiz kargo</span>
                  <span className="hb-seller">{prod.seller}</span>
                  
                  {cartLine ? (
                    <span className="stock-note">Sepette {cartLine.qty} adet</span>
                  ) : (
                    <span className="stock-note">Stokta · Hızlı teslimat</span>
                  )}
                  
                  <p className="delivery-note">{prod.delivery}</p>
                  <button 
                    className="btn primary" 
                    type="button"
                    onClick={() => handleAddToCart(el.symbol)}
                  >
                    {isAuthenticated
                      ? (cartLine ? 'Bir adet daha ekle' : 'Sepete ekle')
                      : 'Giriş yap ve ekle'}
                  </button>
                </article>
              );
            })}
            
            {sortedAndFilteredElements.length === 0 && (
              <div className="empty-cart" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '30px 10px' }}>
                <strong>Ürün bulunamadı</strong>
                <p>Aramayı temizleyip Elemental mağaza raflarına dönebilirsin.</p>
                <button 
                  className="mini-btn" 
                  type="button" 
                  onClick={() => { setSearchInput(''); setActiveCategory('all'); }}
                  style={{ marginTop: '10px' }}
                >
                  Aramayı temizle
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Sidebar details, shopping cart, and Saga Tracker */}
        <aside className="side-stack">
          
          {/* Featured Product */}
          <section className="panel detail-card">
            <div className="product-thumb" style={{ marginBottom: '14px', maxHeight: '180px' }}>
              <img src={elementImage(selectedElement)} alt={selectedElement.name} loading="lazy" />
            </div>
            <div className="element-large">
              <div 
                className="element-badge"
                style={{ '--selected-cat': categoryTokens[selectedElement.category] } as React.CSSProperties}
              >
                <span className="atomic-number">{selectedElement.atomicNumber}</span>
                <span className="big-symbol">{selectedElement.symbol}</span>
                <span className="element-name">{selectedElement.name}</span>
              </div>
              <div>
                <p className="kicker">Bugünün ürünü</p>
                <h3>{selectedElement.name}</h3>
                <div className="category-line">
                  {categoryLabels[selectedElement.category] || selectedElement.category} - {selectedElement.period}. periyot, {selectedElement.group || 'f-blok'} grup
                </div>
              </div>
            </div>
            <p className="summary">{selectedElement.summary}</p>
            {selectedElement.appearance && (
              <p className="summary" style={{ fontSize: '13px', color: 'var(--muted)' }}>
                <strong>Görünüm:</strong> {selectedElement.appearance}
              </p>
            )}
            {selectedElement.uses && (
              <p className="summary" style={{ fontSize: '13px', color: 'var(--muted)' }}>
                <strong>Kullanım:</strong> {selectedElement.uses}
              </p>
            )}
            <div className="inline-actions detail-actions">
              <button 
                className="btn primary" 
                type="button"
                onClick={() => handleAddToCart(selectedSymbol)}
              >
                {isAuthenticated ? 'Sepete ekle' : 'Giriş yap ve ekle'}
              </button>
              <Link to={`/values?symbol=${selectedSymbol}`} className="btn">
                Değerini gör
              </Link>
            </div>
          </section>

          {/* Secure Cart Panel */}
          <section className="panel cart-card" id="cartSummary">
            <div className="panel-header">
              <div>
                <p className="kicker">Güvenli sepet</p>
                <h3 style={{ margin: 0 }}>Sipariş özeti</h3>
              </div>
              <button className="mini-btn" type="button" onClick={handleClearCart} disabled={!isAuthenticated}>Temizle</button>
            </div>
            <div className="panel-body">
              {!isAuthenticated ? (
                <div className="empty-cart" style={{ textAlign: 'center', padding: '20px 10px' }}>
                  <ShoppingCart size={32} style={{ color: 'var(--accent)', marginBottom: '12px' }} />
                  <strong>Satın almak için giriş gerekli</strong>
                  <p style={{ margin: '8px 0 16px', color: 'var(--muted)', fontSize: '13px' }}>
                    Ürünleri inceleyebilirsin; sepete eklemek ve sipariş vermek için hesabınla giriş yapmalısın.
                  </p>
                  <div className="inline-actions" style={{ justifyContent: 'center' }}>
                    <Link to={`/login?returnTo=${encodeURIComponent(location.pathname + location.search)}`} className="btn primary">Giriş yap</Link>
                    <Link to="/register" className="btn">Kayıt ol</Link>
                  </div>
                </div>
              ) : (
              <>
              <div className="cart-items">
                {cartLines.map((line) => (
                  <div key={line.element.symbol} className="cart-row">
                    <div>
                      <h4 style={{ margin: '0 0 4px', fontSize: '15px' }}>{line.element.name} paketi</h4>
                      <p style={{ margin: 0, color: 'var(--muted)', fontSize: '12px' }}>
                        {formatElx(line.unitPrice)}. {line.delivery}
                      </p>
                    </div>
                    <div className="cart-row-actions">
                      <div className="quantity-stepper">
                        <button type="button" onClick={() => handleStepCart(line.element.symbol, -1)}>-</button>
                        <span>{line.qty}</span>
                        <button type="button" onClick={() => handleStepCart(line.element.symbol, 1)}>+</button>
                      </div>
                      <button 
                        className="cart-remove" 
                        type="button"
                        onClick={() => handleRemoveFromCart(line.element.symbol)}
                      >
                        Kaldır
                      </button>
                    </div>
                  </div>
                ))}
                
                {cartLines.length === 0 && (
                  <div className="empty-cart">Sepetin boş. Ürün kartlarından element ekleyebilirsin.</div>
                )}
              </div>

              <div className="cart-totals">
                <div><span>Ara toplam</span><strong>{formatElx(subtotal)}</strong></div>
                <div><span>Hizmet bedeli</span><strong>{formatElx(fee)}</strong></div>
                <div><span>Teslimat</span><strong>{delivery ? formatElx(delivery) : 'Ücretsiz'}</strong></div>
                <div className="grand"><span>Toplam</span><strong>{formatElx(total)}</strong></div>
              </div>

              <button 
                className="btn primary submit-order" 
                type="button" 
                onClick={handleCheckout}
                disabled={cartLines.length === 0 || submittingOrder}
              >
                {submittingOrder ? 'Siparişler İletiliyor...' : (cartLines.length > 0 ? 'Siparişi oluştur' : 'Sepet boş')}
              </button>

              <div className="checkout-status">
                {checkoutReceipt ? (
                  <>
                    <strong>Siparişler Oluşturuldu</strong>
                    <span>Sipariş numaraları hazırlandı. Saga dağıtık işlemleri takip etmek için aşağıdaki tablodan durumu izleyin.</span>
                  </>
                ) : (
                  cartLines.length > 0 ? (
                    `${cartLines.length} ürün seçildi. Sipariş verildiğinde her ürün için ayrı Saga süreci başlayacaktır.`
                  ) : (
                    "Sepete ürün eklediğinde sipariş özeti burada hazırlanır."
                  )
                )}
              </div>
              </>
              )}
            </div>
          </section>

          {/* Saga Order Tracker panel */}
          <section className="panel" style={{ maxHeight: '420px', overflowY: 'auto' }}>
            <div className="panel-header">
              <div>
                <p className="kicker">Sipariş durumu</p>
                <h3 style={{ margin: 0 }}>Saga İşlemleri & Siparişler</h3>
              </div>
            </div>
            <div className="panel-body" style={{ padding: '0 16px 16px' }}>
              <div style={{ display: 'grid', gap: '10px', marginTop: '10px' }}>
                {ordersList.map((order) => {
                  const statusClass = 
                    order.status === 'Completed' ? 'status-success' :
                    order.status === 'Failed' || order.status === 'Compensated' ? 'status-danger' :
                    'status-warning';
                  return (
                    <div 
                      key={order.id} 
                      className="bank-row" 
                      style={{ padding: '10px', borderRadius: 'var(--radius-sm)', background: 'var(--surface)' }}
                    >
                      <div>
                        <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)' }}>ID: {order.id.substring(0, 8)}...</span>
                        <strong>{order.elementSymbol} ({order.quantity} adet)</strong>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span className={`status-badge ${statusClass}`} style={{ fontSize: '11px', padding: '2px 8px' }}>
                          {order.status}
                        </span>
                        <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px', fontFamily: 'var(--font-mono)' }}>
                          {formatElx(order.totalPrice)}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {ordersList.length === 0 && (
                  <p style={{ color: 'var(--muted)', textAlign: 'center', fontSize: '13px', margin: '20px 0' }}>
                    {isAuthenticated
                      ? 'Henüz verilmiş bir sipariş bulunmuyor.'
                      : 'Sipariş takibi için giriş yapmalısın.'}
                  </p>
                )}
              </div>
            </div>
          </section>

          {/* API Order JSON Payload */}
          <section className="panel">
            <div className="panel-header">
              <div>
                <p className="kicker">Checkout API</p>
                <h3 style={{ margin: 0 }}>POST /api/v1/orders</h3>
              </div>
              <button 
                className="mini-btn" 
                type="button" 
                onClick={() => handleCopy(orderApiPayloadJson)}
              >
                Kopyala
              </button>
            </div>
            <div className="playground">
              <div className="inline-code"><pre>{orderApiPayloadJson}</pre></div>
            </div>
          </section>
        </aside>
      </section>

      {/* Toast container */}
      <div className="toast" id="toast" role="status" aria-live="polite"></div>
    </main>
  );
}
