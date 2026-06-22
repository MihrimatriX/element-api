import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelectedElement } from '../App';
import { categoryLabels, categoryTokens } from '../services/elementData';

export default function PeriodicTable() {
  const { elements, selectedSymbol } = useSelectedElement();
  const navigate = useNavigate();

  const [searchInput, setSearchInput] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [hoverSymbol, setHoverSymbol] = useState<string | null>(null);

  const query = searchInput.trim().toLowerCase();

  const matchedSymbols = new Set<string>();
  elements.forEach((el) => {
    const matchesCategory = activeFilter === 'all' || el.category === activeFilter;
    const matchesQuery = !query ||
      el.name.toLowerCase().includes(query) ||
      el.symbol.toLowerCase().includes(query) ||
      el.atomicNumber.toString().includes(query);
    if (matchesCategory && matchesQuery) matchedSymbols.add(el.symbol);
  });

  const hoverElement = hoverSymbol
    ? elements.find((e) => e.symbol === hoverSymbol)
    : elements.find((e) => e.symbol.toUpperCase() === selectedSymbol);

  const openElement = (symbol: string) => {
    navigate(`/element/${symbol.toLowerCase()}`);
  };

  return (
    <main className="page pt-page">
      <section className="pt-hero">
        <div className="pt-hero-copy">
          <p className="kicker">Periyodik sistem</p>
          <h1>118 element</h1>
          <p className="lead">
            Kategori renkleriyle gezin. Bir hücreye tıklayınca detay sayfası açılır.
          </p>
        </div>
        <div className="pt-hero-stats">
          <article className="pt-stat">
            <strong>{elements.length}</strong>
            <span>Element</span>
          </article>
          <article className="pt-stat">
            <strong>{matchedSymbols.size}</strong>
            <span>Eşleşen</span>
          </article>
          <article className="pt-stat">
            <strong>10</strong>
            <span>Kategori</span>
          </article>
        </div>
      </section>

      <section className="pt-toolbar panel">
        <label className="searchbox pt-search">
          <span className="sr-only">Element ara</span>
          <input
            type="search"
            placeholder="Sembol, Türkçe ad veya atom numarası…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            autoComplete="off"
          />
        </label>

        <div className="pt-legend" aria-label="Kategori renkleri">
          {Object.entries(categoryLabels).map(([cat, label]) => (
            <button
              key={cat}
              type="button"
              className={`pt-legend-item ${activeFilter === cat ? 'active' : ''}`}
              onClick={() => setActiveFilter(activeFilter === cat ? 'all' : cat)}
              style={{ '--chip-color': categoryTokens[cat] } as React.CSSProperties}
            >
              <span className="pt-legend-swatch" />
              {label}
            </button>
          ))}
          {activeFilter !== 'all' && (
            <button type="button" className="chip" onClick={() => setActiveFilter('all')}>
              Filtreyi temizle
            </button>
          )}
        </div>
      </section>

      {hoverElement && (
        <aside className="pt-preview panel" aria-live="polite">
          <div
            className="pt-preview-badge"
            style={{ '--selected-cat': categoryTokens[hoverElement.category] } as React.CSSProperties}
          >
            <span className="atomic-number">{hoverElement.atomicNumber}</span>
            <span className="big-symbol">{hoverElement.symbol}</span>
          </div>
          <div>
            <h2>{hoverElement.name}</h2>
            <p className="category-line">
              {categoryLabels[hoverElement.category]} · {hoverElement.period}. periyot
            </p>
            <p className="summary">{hoverElement.summary}</p>
            <Link to={`/element/${hoverElement.symbol.toLowerCase()}`} className="btn primary mini-btn">
              Detay sayfası
            </Link>
          </div>
        </aside>
      )}

      <section className="pt-board panel">
        <div className="periodic-wrap pt-board-scroll" aria-label="Periyodik tablo">
          <div className="periodic-grid pt-grid">
            {/* Lantanit / aktinit serisi köprü hücreleri */}
            <div className="pt-series-marker" style={{ gridRow: 6, gridColumn: 3 }} aria-hidden="true">
              <span>57–71</span>
              <small>Lantanitler</small>
            </div>
            <div className="pt-series-marker" style={{ gridRow: 7, gridColumn: 3 }} aria-hidden="true">
              <span>89–103</span>
              <small>Aktinitler</small>
            </div>

            {elements.map((el) => {
              const isSelected = el.symbol.toUpperCase() === selectedSymbol;
              const isDimmed = !matchedSymbols.has(el.symbol);
              const isHovered = hoverSymbol === el.symbol;

              return (
                <button
                  key={el.atomicNumber}
                  className={`element-tile pt-tile ${isSelected ? 'selected' : ''} ${isDimmed ? 'dimmed' : ''} ${isHovered ? 'hovered' : ''}`}
                  type="button"
                  onClick={() => openElement(el.symbol)}
                  onMouseEnter={() => setHoverSymbol(el.symbol)}
                  onMouseLeave={() => setHoverSymbol(null)}
                  onFocus={() => setHoverSymbol(el.symbol)}
                  onBlur={() => setHoverSymbol(null)}
                  style={{
                    '--row': el.row,
                    '--col': el.col,
                    '--cat': categoryTokens[el.category] || 'var(--accent)'
                  } as React.CSSProperties}
                  aria-label={`${el.name}, atom numarası ${el.atomicNumber}, detay için tıkla`}
                >
                  <span className="atomic-number">{el.atomicNumber}</span>
                  <span className="symbol">{el.symbol}</span>
                  <span className="element-name">{el.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section className="pt-footer-hint">
        <p>
          Element seçmek için kutuya tıkla veya klavye ile odaklan.
          {' '}
          <Link to={`/values?symbol=${selectedSymbol}`}>Değerler</Link>
          {' · '}
          <Link to={`/trading?symbol=${selectedSymbol}`}>Mağaza</Link>
        </p>
      </section>
    </main>
  );
}
