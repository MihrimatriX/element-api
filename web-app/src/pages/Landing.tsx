import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSelectedElement } from '../App';
import { categoryLabels, categoryTokens } from '../services/elementData';
import { elementService } from '../services/api';
import { API_BASE_URL } from '../config';

interface CatalogStats {
  count: number;
  averagePrice: number;
  medianPrice: number;
  cheapest?: { symbol: string; name: string; value: number };
  mostExpensive?: { symbol: string; name: string; value: number };
  heaviest?: { symbol: string; name: string; value: number };
  totalAvailableStock: number;
  countByPhase: Record<string, number>;
}

export default function Landing() {
  const { selectedSymbol, selectedElement, elements } = useSelectedElement();
  const sampleUrl = `${API_BASE_URL}/elements/${selectedSymbol.toLowerCase()}`;
  const catColor = categoryTokens[selectedElement.category] || 'var(--accent)';
  const catLabel = categoryLabels[selectedElement.category] || selectedElement.category;

  const [stats, setStats] = useState<CatalogStats | null>(null);
  useEffect(() => {
    let active = true;
    elementService.getStatistics()
      .then((data) => { if (active) setStats(data); })
      .catch(() => { /* statistics are optional on the landing page */ });
    return () => { active = false; };
  }, []);

  const fmtElx = (v?: number) =>
    v == null ? '—' : `${new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2 }).format(v)} ELX`;

  return (
    <main className="page landing-page">
      <section className="landing-spotlight">
        <div className="landing-spotlight-copy">
          <p className="kicker">Element veri platformu</p>
          <h1>Periyodik tablodan siparişe tek kaynak.</h1>
          <p className="lead">
            {elements.length} elementin özellikleri, ELX fiyatı ve mağaza stoku aynı veri modelinden gelir.
            Bir element seçtiğinizde tüm sayfalarda o kalır.
          </p>
          <div className="landing-actions">
            <Link to={`/periodic?symbol=${selectedSymbol}`} className="btn primary">
              Tabloyu aç
            </Link>
            <Link to={`/trading?symbol=${selectedSymbol}`} className="btn">
              Mağazaya git
            </Link>
            <Link to={`/docs?symbol=${selectedSymbol}`} className="btn btn-ghost">
              API dokümantasyonu
            </Link>
          </div>
        </div>

        <aside className="specimen-plate panel" aria-label="Şu an seçili element">
          <div className="specimen-plate-head">
            <span className="specimen-id">#{selectedElement.atomicNumber}</span>
            <span className="specimen-cat" style={{ '--chip-color': catColor } as React.CSSProperties}>
              {catLabel}
            </span>
          </div>
          <div
            className="specimen-symbol-block"
            style={{ '--selected-cat': catColor } as React.CSSProperties}
          >
            <span className="specimen-symbol">{selectedElement.symbol}</span>
            <span className="specimen-name">{selectedElement.name}</span>
          </div>
          <dl className="specimen-stats">
            <div>
              <dt>Gram fiyatı</dt>
              <dd>{selectedElement.currentPrice?.toFixed(2) ?? '—'} ELX</dd>
            </div>
            <div>
              <dt>Faz</dt>
              <dd>{selectedElement.phase ?? '—'}</dd>
            </div>
          </dl>
          <Link to={`/element/${selectedSymbol.toLowerCase()}`} className="specimen-link">
            Detay sayfası →
          </Link>
        </aside>
      </section>

      <section className="stat-band" aria-label="Katalog istatistikleri">
        <article className="stat-cell">
          <span className="stat-cell-label">Katalog</span>
          <strong className="stat-cell-value">{stats?.count ?? elements.length}</strong>
          <span className="stat-cell-note">element kaydı</span>
        </article>
        <article className="stat-cell">
          <span className="stat-cell-label">Ortalama gram fiyatı</span>
          <strong className="stat-cell-value">{fmtElx(stats?.averagePrice)}</strong>
          <span className="stat-cell-note">medyan {fmtElx(stats?.medianPrice)}</span>
        </article>
        <article className="stat-cell">
          <span className="stat-cell-label">En pahalı</span>
          <strong className="stat-cell-value">{stats?.mostExpensive?.symbol ?? '—'}</strong>
          <span className="stat-cell-note">{stats?.mostExpensive ? fmtElx(stats.mostExpensive.value) : 'yükleniyor'}</span>
        </article>
        <article className="stat-cell">
          <span className="stat-cell-label">En uygun</span>
          <strong className="stat-cell-value">{stats?.cheapest?.symbol ?? '—'}</strong>
          <span className="stat-cell-note">{stats?.cheapest ? fmtElx(stats.cheapest.value) : 'yükleniyor'}</span>
        </article>
        <article className="stat-cell">
          <span className="stat-cell-label">En ağır</span>
          <strong className="stat-cell-value">{stats?.heaviest?.symbol ?? '—'}</strong>
          <span className="stat-cell-note">{stats?.heaviest ? `${stats.heaviest.value} u` : 'yükleniyor'}</span>
        </article>
        <article className="stat-cell">
          <span className="stat-cell-label">Faz dağılımı</span>
          <strong className="stat-cell-value">
            {stats ? Object.keys(stats.countByPhase).length : '—'}
          </strong>
          <span className="stat-cell-note">
            {stats ? Object.entries(stats.countByPhase).map(([p, n]) => `${p}: ${n}`).join(' · ') : 'yükleniyor'}
          </span>
        </article>
      </section>

      <section className="landing-routes" aria-label="Ana bölümler">
        <article className="route-block">
          <h2>Periyodik tablo</h2>
          <p>Kategori renkleri ve arama ile 118 element. Her birinin ayrı detay sayfası var.</p>
          <Link to={`/periodic?symbol=${selectedSymbol}`}>Tabloyu aç</Link>
        </article>
        <article className="route-block">
          <h2>Değer ekranı</h2>
          <p>Gram fiyatı, geçmiş grafik ve likidite metrikleri. API ile aynı hesaplama.</p>
          <Link to={`/values?symbol=${selectedSymbol}`}>Fiyatları gör</Link>
        </article>
        <article className="route-block">
          <h2>Elemental mağaza</h2>
          <p>Ürün kartları, sepet ve sipariş. Misafir gezebilir; satın almak için giriş gerekir.</p>
          <Link to={`/trading?symbol=${selectedSymbol}`}>Mağazaya git</Link>
        </article>
      </section>

      <section className="panel landing-api">
        <div className="landing-api-head">
          <div>
            <p className="kicker">REST API</p>
            <h2>Her ekran kendi endpoint'ini kullanır</h2>
          </div>
          <div className="landing-curl">
            <span className="method">GET</span>
            <code>{sampleUrl}</code>
          </div>
        </div>
        <div className="table-scroll">
          <table className="api-table">
            <thead>
              <tr>
                <th scope="col">Metot</th>
                <th scope="col">Yol</th>
                <th scope="col">Kullanım</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><span className="method">GET</span></td>
                <td><code>/elements</code></td>
                <td>Tablo listesi, arama ve kategori filtreleri</td>
              </tr>
              <tr>
                <td><span className="method">GET</span></td>
                <td><code>/elements/{"{symbol}"}/history</code></td>
                <td>Fiyat geçmişi — API anahtarı gerekir</td>
              </tr>
              <tr>
                <td><span className="method">POST</span></td>
                <td><code>/orders</code></td>
                <td>Mağaza sepetinden sipariş; stok → ödeme → sevkiyat</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
