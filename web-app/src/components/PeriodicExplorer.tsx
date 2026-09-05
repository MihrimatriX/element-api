import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, Atom, Braces, Search, X } from 'lucide-react';
import { categoryLabels, STATIC_ELEMENTS } from '../services/elementData';
import { formatScience, phaseLabels, useScience, type ScientificElement } from '../services/science';
import Seo from './Seo';

const colors: Record<string, string> = { alkali: '#fa6d77', alkaline: '#eac35a', transition: '#56c9dd', post: '#50adb8', metalloid: '#ac91e8', nonmetal: '#e5a0db', halogen: '#94bfee', noble: '#eccb68', lanthanide: '#65caae', actinide: '#81d3d3' };
const fold = (s: string) => s.toLocaleLowerCase('tr-TR').replace(/ı/g, 'i').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
function Facts({ element: e }: { element: ScientificElement }) {
  return <dl className="explorer-facts">{[
    ['Atom kütlesi', formatScience(e.atomic_properties.atomic_mass, 'u')],
    ['Elektronegatiflik', formatScience(e.atomic_properties.electronegativity.pauling)],
    ['Yoğunluk', formatScience(e.thermodynamic_properties.density_g_cm3.reported, 'g/cm³')],
    ['Erime noktası', formatScience(e.thermodynamic_properties.melting_point.c, '°C')],
    ['Kaynama noktası', formatScience(e.thermodynamic_properties.boiling_point.c, '°C')],
    ['Elektron dizilimi', e.atomic_properties.electron_configuration.short ?? '—']
  ].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>;
}
export default function PeriodicExplorer({ home = false }: { home?: boolean }) {
  const { data, error, retry } = useScience<ScientificElement[]>('elements');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [selected, setSelected] = useState('Fe');
  const [hover, setHover] = useState<{ symbol: string; x: number; y: number } | null>(null);
  const [view, setView] = useState<'table' | 'list'>('table');
  useEffect(() => {
    const dismiss = (event: globalThis.KeyboardEvent) => { if (event.key === 'Escape') setHover(null); };
    window.addEventListener('keydown', dismiss);
    return () => window.removeEventListener('keydown', dismiss);
  }, []);
  const gridRef = useRef<HTMLDivElement>(null);
  const records = data ?? [];
  const current = records.find(e => e.symbol === (hover?.symbol ?? selected)) ?? records.find(e => e.symbol === 'Fe');
  const matches = (symbol: string, name: string, z: number, cat: string) => (category === 'all' || cat === category) && (!query.trim() || fold(`${symbol} ${name} ${z} ${records.find(e => e.symbol === symbol)?.names.en ?? ''}`).includes(fold(query.trim())));
  const count = STATIC_ELEMENTS.filter(e => matches(e.symbol, e.name, e.atomicNumber, e.category)).length;
  function arrowNavigate(event: KeyboardEvent<HTMLAnchorElement>, row: number, col: number) {
    if (event.key === 'Escape') { setHover(null); return; }
    const h = event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowRight' ? 1 : 0;
    const v = event.key === 'ArrowUp' ? -1 : event.key === 'ArrowDown' ? 1 : 0;
    if (!h && !v) return;
    event.preventDefault();
    const candidates = STATIC_ELEMENTS.filter(e => h ? e.row === row && (e.col - col) * h > 0 : e.col === col && (e.row - row) * v > 0);
    candidates.sort((a, b) => h ? Math.abs(a.col - col) - Math.abs(b.col - col) : Math.abs(a.row - row) - Math.abs(b.row - row));
    if (candidates[0]) gridRef.current?.querySelector<HTMLAnchorElement>(`[data-symbol="${candidates[0].symbol}"]`)?.focus();
  }
  return <main className="science-home">
    <Seo title={home ? 'ElementAPI · Maddenin alfabesi' : 'Periyodik tablo · ElementAPI'} description="118 elementi keşfedin. Atomik özellikler, termodinamik veriler, izotoplar ve kaynaklarıyla herkese açık bilimsel API." path={home ? '/' : '/periodic'} />
    <section className="explorer-heading"><div><p className="science-eyebrow"><span /> BİLİM, HERKESE AÇIK</p><h1>Maddenin alfabesini keşfet<span>.</span></h1><p>118 element. Sayısız bağlantı. Merak ettiğin her şey, bir atomla başlar.</p></div><Link to="/docs" className="science-text-link"><Braces size={17} /> Veriyi projene taşı <ArrowUpRight size={16} /></Link></section>
    <section className="explorer" aria-label="Element keşfi">
      <div className="explorer-toolbar"><label className="explorer-search"><Search size={18} /><span className="sr-only">Element ara</span><input value={query} onChange={e => setQuery(e.target.value)} type="search" placeholder="Ad, sembol veya atom numarası…" /></label><span className="explorer-count" role="status">{count} / 118 element</span><div className="explorer-switch" aria-label="Görünüm"><button aria-pressed={view === 'table'} onClick={() => setView('table')}>Tablo</button><button aria-pressed={view === 'list'} onClick={() => { setView('list'); setHover(null); }}>Liste</button></div></div>
      <div className="explorer-legend" aria-label="Element kategorileri">{Object.entries(categoryLabels).map(([key, label]) => <button key={key} aria-pressed={category === key} onClick={() => setCategory(category === key ? 'all' : key)}><i style={{ background: colors[key] }} />{label}</button>)}{(category !== 'all' || query) && <button className="clear-filter" onClick={() => { setQuery(''); setCategory('all'); }}><X size={13} /> Temizle</button>}</div>
      {error && <p className="science-notice" role="status">Temel tablo gösteriliyor. Ayrıntılı verilere şu an ulaşılamıyor. <button onClick={retry}>Yeniden dene</button></p>}
      {!data && !error && <p className="science-load" role="status">Bilimsel veriler yükleniyor…</p>}
      {count === 0 && <p className="science-notice" role="status">Eşleşen element yok. Farklı bir ad, sembol veya kategori deneyin.</p>}
      <div className={view === 'table' ? 'explorer-scroll' : 'explorer-list-wrap'} tabIndex={view === 'table' ? 0 : undefined} aria-label={view === 'table' ? 'Periyodik tablo; dar ekranlarda yatay kaydırın' : 'Element listesi'} onScroll={() => setHover(null)}>
        <div className={view === 'table' ? 'explorer-grid' : 'explorer-list'} ref={gridRef} onMouseLeave={() => setHover(null)}>
          {view === 'table' && <>
            {Array.from({ length: 18 }, (_, i) => <span className="explorer-group" style={{ gridColumn: i + 1, gridRow: 1 }} key={i}>{i + 1}</span>)}
            <div className="explorer-inset"><div className="explorer-inset-symbol" style={{ '--element-color': colors[current?.classification.category ?? 'transition'] } as CSSProperties}><small>{current?.atomic_number ?? 26}</small><strong>{current?.symbol ?? 'Fe'}</strong><span>{current?.names.tr ?? 'Demir'}</span></div><div className="explorer-inset-copy"><p className="science-eyebrow">BİR ELEMENT, BİR HİKÂYE</p><h2>{current?.names.tr ?? 'Demir'} <span>{current?.names.en ?? 'Iron'}</span></h2><p>{current ? categoryLabels[current.classification.category] : 'Geçiş metali'} · {current?.classification.block ?? 'd'} bloğu · {current ? phaseLabels[current.thermodynamic_properties.standard_state ?? 'unknown'] ?? current.thermodynamic_properties.standard_state : 'Katı'}</p><p className="inset-hint">Bir elementin üzerine gel; özelliklerini keşfet.<br />Ayrıntılar için elemente tıkla.</p></div><div className="inset-numbers"><span>ATOM KÜTLESİ<strong>{formatScience(current?.atomic_properties.atomic_mass, 'u')}</strong></span><span>ELEKTRON DİZİLİMİ<strong>{current?.atomic_properties.electron_configuration.short ?? '—'}</strong></span></div></div>
            <span className="explorer-series" style={{ gridRow: 7, gridColumn: 3 }}>57–71<small>Lantanitler</small></span><span className="explorer-series" style={{ gridRow: 8, gridColumn: 3 }}>89–103<small>Aktinitler</small></span><span className="explorer-series-label" style={{ gridRow: 9, gridColumn: '1 / 3' }}>Lantanitler <ArrowRight size={13} /></span><span className="explorer-series-label" style={{ gridRow: 10, gridColumn: '1 / 3' }}>Aktinitler <ArrowRight size={13} /></span>
          </>}
          {STATIC_ELEMENTS.map(el => {
            const record = records.find(e => e.symbol === el.symbol);
            const match = matches(el.symbol, el.name, el.atomicNumber, el.category);
            if (view === 'list' && !match) return null;
            return <Link key={el.symbol} data-symbol={el.symbol} to={`/element/${el.symbol.toLowerCase()}`} className={`science-tile ${match ? '' : 'is-dimmed'} ${hover?.symbol === el.symbol ? 'is-previewed' : ''}`} style={{ gridColumn: view === 'table' ? el.col : undefined, gridRow: view === 'table' ? el.row + 1 : undefined, '--element-color': colors[el.category] } as CSSProperties} aria-label={`${el.name}, ${el.symbol}, atom numarası ${el.atomicNumber}`} onFocus={() => { setSelected(el.symbol); setHover(null); }} onKeyDown={e => arrowNavigate(e, el.row, el.col)} onMouseEnter={e => { if (view !== 'table' || window.innerWidth < 900) return; const rect = e.currentTarget.getBoundingClientRect(); setHover({ symbol: el.symbol, x: Math.max(12, Math.min(rect.right + 12, window.innerWidth - 316)), y: Math.max(80, Math.min(rect.top, window.innerHeight - 386)) }); }}><small>{el.atomicNumber}</small><strong>{el.symbol}</strong><span>{el.name}</span><em>{formatScience(record?.atomic_properties.atomic_mass)}</em>{view === 'list' && <ArrowUpRight size={18} />}</Link>;
          })}
          {hover && current && view === 'table' && <aside className="explorer-popover" style={{ left: hover.x, top: hover.y, '--element-color': colors[current.classification.category] } as CSSProperties}><header><strong>{current.symbol}</strong><div><h2>{current.names.tr}</h2><span>{current.names.en} · #{current.atomic_number}</span></div></header><p>{categoryLabels[current.classification.category]} · {current.classification.block} bloğu</p><Facts element={current} /><Link to={`/element/${current.symbol.toLowerCase()}`}>Tüm özellikleri keşfet <ArrowUpRight size={15} /></Link></aside>}
        </div>
      </div>
      <div className="explorer-footnote"><span><Atom size={14} /> Kütle: u · Kaynaklar: PubChem, RSC, NIST</span><span className="desktop-hint">Ok tuşlarıyla gezin · Enter ile keşfedin</span><span className="mobile-hint">Tabloyu yana kaydırın veya listeyi açın <ArrowRight size={13} /></span></div>
    </section>
    {home && <section className="science-paths"><Link to="/compounds"><span className="science-path-icon">H₂O</span><div><p className="science-eyebrow">ATOMLAR BİR ARAYA GELİNCE</p><h2>Bileşiklerin dünyası</h2><p>Moleküler yapılar, fiziksel özellikler ve kaynaklı güvenlik verileri.</p></div><ArrowUpRight /></Link><Link to="/docs"><span className="science-path-icon"><Braces size={29} /></span><div><p className="science-eyebrow">MERAKTAN ÜRETİME</p><h2>Açık veri, yeni olasılıklar</h2><p>İhtiyacın olan alanları seç. Bilimsel veriyi kendi projende kullan.</p></div><ArrowUpRight /></Link></section>}
    <div className="science-bottom-note"><span>Bilgiyi keşfetmek için hesap gerekmez.</span><Link to="/hakkinda">ElementAPI hakkında <ArrowUpRight size={13} /></Link></div>
  </main>;
}
