import { useEffect, useState } from 'react';
import { Star } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useSelectedElement } from '../App';
import { categoryLabels, categoryTokens, valuationFor, dbCategoryToStaticCategory } from '../services/elementData';
import { elementService } from '../services/api';

interface NeighborDto {
  symbol: string;
  name: string;
  atomicNumber: number;
  category: string;
}

function fmtNum(val: number | undefined, digits = 2) {
  if (val == null || Number.isNaN(val)) return '—';
  return new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  }).format(val);
}

function fmtElx(val: number | undefined) {
  if (val == null) return '—';
  return `${fmtNum(val, 2)} ELX`;
}

export default function ElementDetail() {
  const { symbol = '' } = useParams();
  const navigate = useNavigate();
  const { elements, loading, setSelectedSymbol, isAuthenticated } = useSelectedElement();
  const [neighbors, setNeighbors] = useState<NeighborDto[]>([]);

  const element = elements.find((e) => e.symbol.toLowerCase() === symbol.toLowerCase());
  const valuation = element ? valuationFor(element) : null;
  const peers = element
    ? elements.filter((e) => e.category === element.category && e.symbol !== element.symbol).slice(0, 6)
    : [];

  useEffect(() => {
    if (element) setSelectedSymbol(element.symbol);
  }, [element, setSelectedSymbol]);

  useEffect(() => {
    if (!loading && !element) navigate('/periodic', { replace: true });
  }, [loading, element, navigate]);

  useEffect(() => {
    if (!symbol) return;
    let active = true;
    elementService.getNeighbors(symbol)
      .then((data: NeighborDto[]) => { if (active) setNeighbors(data || []); })
      .catch(() => { if (active) setNeighbors([]); });
    return () => { active = false; };
  }, [symbol]);

  if (!element && loading) {
    return (
      <main className="page element-detail-page">
        <div className="element-loading panel">Element yükleniyor…</div>
      </main>
    );
  }

  if (!element) return null;

  const sym = element.symbol.toLowerCase();
  const catColor = categoryTokens[element.category] || 'var(--accent)';
  const catLabel = categoryLabels[element.category] || element.category;

  return (
    <main className="page element-detail-page">
      <nav className="element-breadcrumb" aria-label="Konum">
        <Link to="/periodic">Periyodik tablo</Link>
        <span aria-hidden="true">/</span>
        <span>{element.name}</span>
      </nav>

      <section className="element-hero panel">
        <div className="element-hero-media">
          {element.imageUrl ? (
            <img src={element.imageUrl} alt={`${element.name} örneği`} className="element-hero-photo" />
          ) : (
            <div
              className="element-hero-fallback"
              style={{ '--selected-cat': catColor } as React.CSSProperties}
            >
              <span className="atomic-number">{element.atomicNumber}</span>
              <span className="big-symbol">{element.symbol}</span>
            </div>
          )}
        </div>

        <div className="element-hero-copy">
          <div className="element-hero-badges">
            <span className="element-cat-pill" style={{ '--chip-color': catColor } as React.CSSProperties}>
              {catLabel}
            </span>
            {element.badge && <span className="element-promo-pill">{element.badge}</span>}
            <span className="element-phase-pill">{element.phase ?? 'katı'}</span>
          </div>

          <p className="kicker">Atom numarası {element.atomicNumber}</p>
          <h1>{element.name}</h1>
          {element.nameEn && element.nameEn !== element.name && (
            <p className="element-name-en">{element.nameEn}</p>
          )}

          <div className="element-hero-rating">
            {element.rating != null && (
              <span className="element-rating">
                <Star size={14} fill="currentColor" aria-hidden="true" />
                {fmtNum(element.rating, 1)}
                {element.reviewCount != null && <small>({element.reviewCount} yorum)</small>}
              </span>
            )}
            {element.sellerName && <span className="element-seller">{element.sellerName}</span>}
          </div>

          <p className="element-summary-lead">{element.summary}</p>

          <div className="element-price-row">
            <strong className="element-price">{fmtElx(element.currentPrice)}</strong>
            <span className="element-price-unit">/ gram</span>
            {valuation && (
              <span className={`element-trend ${valuation.trend >= 0 ? 'price-up' : 'price-down'}`}>
                {valuation.trend >= 0 ? '▲' : '▼'} {Math.abs(valuation.trend).toFixed(1)}%
              </span>
            )}
          </div>

          <div className="inline-actions element-hero-actions">
            <Link to={`/trading?symbol=${element.symbol}`} className="btn primary">
              Mağazadan satın al
            </Link>
            <Link to={`/values?symbol=${element.symbol}`} className="btn">
              Değer analizi
            </Link>
            <Link to="/periodic" className="btn btn-secondary">
              Tabloya dön
            </Link>
          </div>
        </div>
      </section>

      <section className="element-stats-section">
        <article className="panel element-stat-card">
          <h2>Atomik özellikler</h2>
          <dl className="element-dl">
            <div><dt>Sembol</dt><dd className="mono">{element.symbol}</dd></div>
            <div><dt>Atom kütlesi</dt><dd>{element.mass} u</dd></div>
            <div><dt>Periyot</dt><dd>{element.period}</dd></div>
            <div><dt>Grup</dt><dd>{element.group || 'f-blok'}</dd></div>
            <div><dt>Blok</dt><dd>{element.block?.toUpperCase() ?? '—'}</dd></div>
            <div><dt>Elektronegativite</dt><dd>{element.electronegativity ?? '—'}</dd></div>
            <div className="span-2"><dt>Elektron dizilimi</dt><dd className="mono small">{element.electronConfiguration ?? '—'}</dd></div>
          </dl>
        </article>

        <article className="panel element-stat-card">
          <h2>Fiziksel özellikler</h2>
          <dl className="element-dl">
            <div><dt>Faz</dt><dd>{element.phase ?? '—'}</dd></div>
            <div><dt>Yoğunluk</dt><dd>{element.density != null ? `${fmtNum(element.density, 4)} g/cm³` : '—'}</dd></div>
            <div><dt>Erime noktası</dt><dd>{element.meltingPoint != null ? `${fmtNum(element.meltingPoint, 2)} K` : '—'}</dd></div>
            <div><dt>Kaynama noktası</dt><dd>{element.boilingPoint != null ? `${fmtNum(element.boilingPoint, 2)} K` : '—'}</dd></div>
            <div><dt>Keşfeden</dt><dd>{element.discoveredBy ?? '—'}</dd></div>
            <div><dt>Görünüm</dt><dd>{element.appearance ?? '—'}</dd></div>
          </dl>
        </article>

        <article className="panel element-stat-card">
          <h2>Piyasa & kullanım</h2>
          <dl className="element-dl">
            <div><dt>Fiyat</dt><dd className="mono">{fmtElx(element.currentPrice)}</dd></div>
            <div><dt>Stok</dt><dd>{element.availableStock != null ? `${fmtNum(element.availableStock, 0)} g` : '—'}</dd></div>
            <div><dt>Likidite</dt><dd>{valuation?.liquidity ?? '—'}</dd></div>
            <div><dt>Risk</dt><dd>{valuation?.risk ?? '—'}</dd></div>
            <div className="span-2"><dt>Kullanım alanları</dt><dd>{element.uses ?? valuation?.use ?? '—'}</dd></div>
            {element.deliveryNote && (
              <div className="span-2"><dt>Teslimat</dt><dd>{element.deliveryNote}</dd></div>
            )}
          </dl>
        </article>
      </section>

      {peers.length > 0 && (
        <section className="panel element-related">
          <div className="panel-header">
            <div>
              <p className="kicker">Aynı kategori</p>
              <h2>{catLabel} elementleri</h2>
            </div>
          </div>
          <div className="element-related-grid">
            {peers.map((peer) => (
              <Link
                key={peer.symbol}
                to={`/element/${peer.symbol.toLowerCase()}`}
                className="element-related-card"
                style={{ '--cat': categoryTokens[peer.category] } as React.CSSProperties}
              >
                <span className="atomic-number">{peer.atomicNumber}</span>
                <strong>{peer.symbol}</strong>
                <span>{peer.name}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {neighbors.length > 0 && (
        <section className="panel element-related">
          <div className="panel-header">
            <div>
              <p className="kicker">Periyodik komşular</p>
              <h2>Tablodaki yakın hücreler</h2>
            </div>
            <code className="neighbor-endpoint">GET /elements/{sym}/neighbors</code>
          </div>
          <div className="element-related-grid">
            {neighbors.map((n) => {
              const cat = dbCategoryToStaticCategory(n.category);
              return (
                <Link
                  key={n.symbol}
                  to={`/element/${n.symbol.toLowerCase()}`}
                  className="element-related-card"
                  style={{ '--cat': categoryTokens[cat] } as React.CSSProperties}
                >
                  <span className="atomic-number">{n.atomicNumber}</span>
                  <strong>{n.symbol}</strong>
                  <span>{n.name}</span>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      <section className="panel element-api-snippet">
        <div className="panel-header">
          <div>
            <p className="kicker">API</p>
            <h2>Bu elementin endpoint'i</h2>
          </div>
        </div>
        <div className="path-preview">
          <span className="method">GET</span>
          <code>/api/v1/elements/{sym}</code>
        </div>
        {!isAuthenticated && (
          <p className="summary" style={{ marginTop: '12px' }}>
            Fiyat geçmişi ve sipariş için <Link to="/login" style={{ color: 'var(--accent)', fontWeight: 650 }}>giriş yap</Link>.
          </p>
        )}
      </section>
    </main>
  );
}
