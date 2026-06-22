import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSelectedElement } from '../App';
import { apiClient } from '../services/api';
import { categoryLabels, categoryTokens, valuationFor } from '../services/elementData';

export default function Values() {
  const { elements, selectedSymbol, selectedElement, setSelectedSymbol } = useSelectedElement();
  const [activeRange, setActiveRange] = useState<number>(12);
  const [dbHistory, setDbHistory] = useState<any[]>([]);

  // Fetch actual price history from database
  useEffect(() => {
    let active = true;
    async function fetchHistory() {
      try {
        const res = await apiClient.get(`/elements/${selectedSymbol.toLowerCase()}/history?limit=${activeRange}`);
        if (active) {
          setDbHistory(res.data || []);
        }
      } catch (err) {
        console.warn("Could not fetch price history from database, using model calculation.", err);
        if (active) setDbHistory([]);
      }
    }
    fetchHistory();
    return () => {
      active = false;
    };
  }, [selectedSymbol, activeRange]);

  const handleSelectChange = (symbol: string) => {
    setSelectedSymbol(symbol);
  };

  // Calculations
  const valuation = valuationFor(selectedElement, activeRange);
  
  // Decide chart points: Use DB history if available, fallback to model calculation
  let chartPoints: number[] = [];
  if (dbHistory.length > 0) {
    // DB history is returned ordered by descending timestamp. Reverse it for chronological order.
    chartPoints = [...dbHistory].reverse().map(h => Number(h.price || h.Price || 0));
  } else {
    chartPoints = valuation.history;
  }

  const maxPoint = Math.max(...chartPoints, 1);

  const formatNumber = (val: number, digits = 0) => {
    return new Intl.NumberFormat("tr-TR", {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits
    }).format(val);
  };

  const formatElx = (val: number) => {
    return `${formatNumber(val, 2)} ELX`;
  };

  const categoryLabel = categoryLabels[selectedElement.category] || selectedElement.category;

  // Filter peers (same category, different symbol)
  const peers = elements
    .filter(e => e.category === selectedElement.category && e.symbol !== selectedElement.symbol)
    .slice(0, 5);

  // Copy helper
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    const toast = document.getElementById("toast");
    if (toast) {
      toast.textContent = "Kopyalandı";
      toast.classList.add("show");
      setTimeout(() => toast.classList.remove("show"), 1500);
    }
  };

  const apiResponseJson = JSON.stringify({
    data: {
      symbol: selectedElement.symbol,
      name: selectedElement.name,
      model: "element-asset-v1",
      price_elx: selectedElement.currentPrice,
      change_24h_pct: valuation.trend,
      index: valuation.index,
      liquidity: valuation.liquidity,
      collateral_pct: valuation.collateral,
      supply_units: valuation.supply,
      use_case: valuation.use,
      risk_profile: valuation.risk,
      history: chartPoints
    }
  }, null, 2);

  return (
    <main className="page">
      {/* Hero */}
      <section className="hero compact">
        <div>
          <p className="kicker">Fiyat modeli</p>
          <h1>Element değerleri</h1>
          <p className="lead">
            ELX cinsinden gram fiyatı, geçmiş grafik ve likidite metrikleri. Simülasyon amaçlıdır; gerçek piyasa fiyatı değildir.
          </p>
        </div>
        <div className="field selector-field">
          <label htmlFor="elementSelect">Değerlenecek element</label>
          <select 
            id="elementSelect"
            value={selectedSymbol}
            onChange={(e) => handleSelectChange(e.target.value)}
          >
            {elements.map((el) => (
              <option key={el.symbol} value={el.symbol}>
                {el.symbol} - {el.name}
              </option>
            ))}
          </select>
        </div>
      </section>

      {/* Main Grid workspace */}
      <section className="market-grid">
        {/* Left Side: Chart and metrics */}
        <div className="panel">
          <div className="panel-header">
            <div>
              <p className="kicker">Değer paneli</p>
              <h2>Model fiyat, likidite ve teminat</h2>
              <p>Atom numarası, kategori ve kullanım profiline göre tutarlı bir değer modeli hesaplanır.</p>
            </div>
            <div className="chips" aria-label="Grafik aralığı">
              {[12, 24, 36].map((rangeVal) => (
                <button
                  key={rangeVal}
                  className={`range-button ${activeRange === rangeVal ? 'active' : ''}`}
                  onClick={() => setActiveRange(rangeVal)}
                  type="button"
                >
                  {rangeVal} dönem
                </button>
              ))}
            </div>
          </div>

          <div className="metric-strip">
            <div className="metric-card">
              <span>Model fiyat</span>
              <strong>{formatElx(selectedElement.currentPrice || valuation.price)}</strong>
              <em className={valuation.trend >= 0 ? 'price-up' : 'price-down'}>
                {valuation.trend >= 0 ? '+' : ''}{valuation.trend}% bugün
              </em>
            </div>
            <div className="metric-card">
              <span>Değer endeksi</span>
              <strong>{valuation.index}/100</strong>
              <em style={{ fontStyle: 'normal' }}>nadirlik + kullanım</em>
            </div>
            <div className="metric-card">
              <span>Likidite</span>
              <strong>{valuation.liquidity}</strong>
              <em style={{ fontStyle: 'normal' }}>işlem derinliği</em>
            </div>
            <div className="metric-card">
              <span>Teminat oranı</span>
              <strong>{valuation.collateral}%</strong>
              <em style={{ fontStyle: 'normal' }}>portföy kredisi</em>
            </div>
          </div>

          {/* Mini Chart */}
          <div className="mini-chart" aria-label="Seçili elementin değer geçmişi">
            {chartPoints.map((point, index) => {
              const height = Math.max(18, Math.round((point / maxPoint) * 100));
              return (
                <span 
                  key={index} 
                  className="chart-bar" 
                  style={{ height: `${height}%` }}
                ></span>
              );
            })}
          </div>

          <div className="panel-body">
            <div className="bank-list">
              <div className="bank-row">
                <div>
                  <span>Dolaşımdaki arz</span>
                  <strong>{formatNumber(valuation.supply)} birim</strong>
                </div>
                <div className="change">
                  {valuation.trend >= 0 ? '+' : ''}{formatNumber(Math.max(-3.4, valuation.trend / 2), 1)}%
                </div>
              </div>
              <div className="bank-row">
                <div>
                  <span>Kullanım alanı</span>
                  <strong>{valuation.use}</strong>
                </div>
                <div className="change" style={{ color: 'var(--accent)' }}>
                  {valuation.useScore}
                </div>
              </div>
              <div className="bank-row">
                <div>
                  <span>Risk profili</span>
                  <strong>{valuation.risk}</strong>
                </div>
                <div className="change" style={{ color: 'var(--muted)' }}>
                  {valuation.volatility}
                </div>
              </div>
            </div>
            <p className="valuation-note">
              Model; atomik konum, kategori sınıfı ve kullanım türünü birleştirir. Gerçek emtia fiyatı veya yatırım tavsiyesi değildir.
            </p>
          </div>
        </div>

        {/* Right Side: details and categories peer comparison */}
        <aside className="side-stack">
          {/* Valued Asset */}
          <section className="panel detail-card">
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
                <p className="kicker">Değerlenen varlık</p>
                <h3>{selectedElement.name}</h3>
                <div className="category-line">{categoryLabel} portföy sınıfı</div>
              </div>
            </div>
            
            <p className="summary" style={{ marginTop: '16px' }}>
              {selectedElement.symbol} ({selectedElement.name}), geniş kullanım alanı nedeniyle model portföylerde temel varlık gibi davranır.
            </p>
            
            <div className="inline-actions detail-actions">
              <Link to={`/periodic?symbol=${selectedSymbol}`} className="btn">
                Tablodaki konumu
              </Link>
              <Link to={`/trading?symbol=${selectedSymbol}`} className="btn primary">
                Satın al
              </Link>
            </div>
          </section>

          {/* Category Peer List */}
          <section className="panel">
            <div className="panel-header">
              <div>
                <p className="kicker">Karşılaştırma</p>
                <h3 style={{ margin: 0 }}>Kategori içi değerler</h3>
              </div>
            </div>
            <div className="playground">
              <div className="bank-list">
                {peers.length > 0 ? peers.map((p) => {
                  const peerVal = valuationFor(p);
                  return (
                    <div key={p.symbol} className="bank-row">
                      <div>
                        <span>{p.symbol} / {categoryLabels[p.category] || p.category}</span>
                        <strong>{p.name}</strong>
                      </div>
                      <div className="change">{formatElx(p.currentPrice || peerVal.price)}</div>
                    </div>
                  );
                }) : (
                  <p style={{ color: 'var(--muted)', margin: 0, fontSize: '13px' }}>
                    Aynı kategoride başka element bulunamadı.
                  </p>
                )}
              </div>
            </div>
          </section>

          {/* API Response JSON */}
          <section className="panel">
            <div className="panel-header">
              <div>
                <p className="kicker">API yanıtı</p>
                <h3 style={{ margin: 0 }}>GET /elements/{"{symbol}"}/history</h3>
              </div>
              <button 
                className="mini-btn" 
                type="button" 
                onClick={() => handleCopy(apiResponseJson)}
              >
                Kopyala
              </button>
            </div>
            <div className="playground">
              <div className="inline-code"><pre>{apiResponseJson}</pre></div>
            </div>
          </section>
        </aside>
      </section>

      {/* Toast container */}
      <div className="toast" id="toast" role="status" aria-live="polite"></div>
    </main>
  );
}
