import { useState } from 'react';
import axios from 'axios';
import { API_ORIGIN } from '../config';

type Language = 'curl' | 'javascript' | 'python';

export default function ApiDocs() {
  const [activeLang, setActiveLang] = useState<Language>('curl');
  const [tryItEndpoint, setTryItEndpoint] = useState('/api/v1/elements/au');
  const [apiResponse, setApiResponse] = useState<any>({
    "id": "0a2b56e4-4a4b-4b13-b5bb-76226f3cbca1",
    "symbol": "Au",
    "name": "Gold",
    "atomicNumber": 79,
    "atomicMass": 196.9665,
    "category": "transition metal",
    "phase": "Solid",
    "color": "yellow",
    "density": 19.3,
    "meltingPoint": 1337.33,
    "boilingPoint": 3243,
    "discoveredBy": "Known since antiquity",
    "yearDiscovered": null,
    "electronConfiguration": "[Xe] 4f14 5d10 6s1",
    "period": 6,
    "group": 11,
    "market": {
      "pricePerGram": 75.25,
      "stockWeightGrams": 1000,
      "availableStock": 1000,
      "currency": "ELX"
    },
    "links": {
      "self": `${API_ORIGIN}/api/v1/elements/au`,
      "history": `${API_ORIGIN}/api/v1/elements/au/history`,
      "category": `${API_ORIGIN}/api/v1/categories/transition-metal`
    }
  });
  const [isLoading, setIsLoading] = useState(false);

  const getCodeSnippet = (lang: Language, endpoint: string) => {
    const fullUrl = `${API_ORIGIN}${endpoint}`;
    switch (lang) {
      case 'curl':
        return `curl -X GET "${fullUrl}"`;
      case 'javascript':
        return `fetch("${fullUrl}")\n  .then(res => res.json())\n  .then(data => console.log(data));`;
      case 'python':
        return `import requests\n\nresponse = requests.get("${fullUrl}")\nprint(response.json())`;
    }
  };

  const handleTryIt = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get(`${API_ORIGIN}${tryItEndpoint}`);
      setApiResponse(response.data);
    } catch (error: any) {
      setApiResponse({
        error: error.response?.data?.detail || error.message || 'An error occurred fetching data.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    const toast = document.getElementById("toast");
    if (toast) {
      toast.textContent = "Kopyalandı";
      toast.classList.add("show");
      setTimeout(() => toast.classList.remove("show"), 1500);
    }
  };

  return (
    <main className="page">
      {/* Hero Section */}
      <section className="hero compact" style={{ marginBottom: '34px' }}>
        <div>
          <p className="kicker">Geliştirici</p>
          <h1>API referansı</h1>
          <p className="lead">
            Element listesi, detay, fiyat geçmişi ve sipariş endpoint’leri. GET istekleri herkese açık; yazma ve sipariş için API anahtarı gerekir.
          </p>
        </div>
      </section>

      {/* Grid workspace */}
      <section className="screen-grid">
        {/* Left: Documentation */}
        <div className="panel padded">
          <p className="kicker">Kılavuz</p>
          <h2>Hızlı Başlangıç</h2>
          <p>
            Element API, kimya ve finansal simülasyon verilerini getiren açık bir RESTful API sunar. Okuma işlemleri (GET) tamamen auth-sızdır, sipariş ve yazma işlemleri için API anahtarı gereklidir.
          </p>
          
          <div className="panel padded" style={{ margin: '18px 0', background: 'var(--surface-2)' }}>
            <strong style={{ display: 'block', marginBottom: '8px' }}>API Anahtarı Politikası</strong>
            <ul style={{ margin: 0, paddingLeft: '20px', color: 'var(--muted)', fontSize: '14px', lineHeight: '1.6' }}>
              <li>GET istekleri API Key olmadan çağrılabilir.</li>
              <li>POST sipariş isteklerinde <code>X-API-Key</code> başlığı (header) zorunludur.</li>
              <li>Hesabınıza giriş yaparak Elemental mağazadaki Saga takipçisinden canlı durumları izleyebilirsiniz.</li>
            </ul>
          </div>

          <h3 style={{ marginTop: '24px' }}>API Endpoint Listesi</h3>
          <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', marginTop: '12px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '10px' }}>Metot</th>
                  <th style={{ padding: '10px' }}>Endpoint</th>
                  <th style={{ padding: '10px' }}>Kimlik</th>
                  <th style={{ padding: '10px' }}>Açıklama</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '10px', color: 'var(--success)', fontWeight: 'bold' }}>GET</td>
                  <td style={{ padding: '10px' }}><code>/api/v1</code></td>
                  <td style={{ padding: '10px', color: 'var(--muted)' }}>Yok</td>
                  <td style={{ padding: '10px', color: 'var(--muted)' }}>Kök servis keşfi</td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '10px', color: 'var(--success)', fontWeight: 'bold' }}>GET</td>
                  <td style={{ padding: '10px' }}><code>/api/v1/elements</code></td>
                  <td style={{ padding: '10px', color: 'var(--muted)' }}>Yok</td>
                  <td style={{ padding: '10px', color: 'var(--muted)' }}>Element listesi (sayfalı)</td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '10px', color: 'var(--success)', fontWeight: 'bold' }}>GET</td>
                  <td style={{ padding: '10px' }}><code>/api/v1/elements/{"{symbol}"}</code></td>
                  <td style={{ padding: '10px', color: 'var(--muted)' }}>Yok</td>
                  <td style={{ padding: '10px', color: 'var(--muted)' }}>Element detayı</td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '10px', color: 'var(--success)', fontWeight: 'bold' }}>GET</td>
                  <td style={{ padding: '10px' }}><code>/api/v1/elements/search?q=gold</code></td>
                  <td style={{ padding: '10px', color: 'var(--muted)' }}>Yok</td>
                  <td style={{ padding: '10px', color: 'var(--muted)' }}>Arama filtrelemesi</td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '10px', color: 'var(--success)', fontWeight: 'bold' }}>GET</td>
                  <td style={{ padding: '10px' }}><code>/api/v1/elements?category=&sort=price&order=desc</code></td>
                  <td style={{ padding: '10px', color: 'var(--muted)' }}>Yok</td>
                  <td style={{ padding: '10px', color: 'var(--muted)' }}>Filtreleme + sıralama</td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '10px', color: 'var(--success)', fontWeight: 'bold' }}>GET</td>
                  <td style={{ padding: '10px' }}><code>/api/v1/elements/compare?symbols=au,ag,cu</code></td>
                  <td style={{ padding: '10px', color: 'var(--muted)' }}>Yok</td>
                  <td style={{ padding: '10px', color: 'var(--muted)' }}>Element karşılaştırma</td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '10px', color: 'var(--success)', fontWeight: 'bold' }}>GET</td>
                  <td style={{ padding: '10px' }}><code>/api/v1/elements/{"{symbol}"}/neighbors</code></td>
                  <td style={{ padding: '10px', color: 'var(--muted)' }}>Yok</td>
                  <td style={{ padding: '10px', color: 'var(--muted)' }}>Periyodik komşular</td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '10px', color: 'var(--success)', fontWeight: 'bold' }}>GET</td>
                  <td style={{ padding: '10px' }}><code>/api/v1/elements/{"{symbol}"}/related</code></td>
                  <td style={{ padding: '10px', color: 'var(--muted)' }}>Yok</td>
                  <td style={{ padding: '10px', color: 'var(--muted)' }}>İlgili elementler</td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '10px', color: 'var(--success)', fontWeight: 'bold' }}>GET</td>
                  <td style={{ padding: '10px' }}><code>/api/v1/categories</code></td>
                  <td style={{ padding: '10px', color: 'var(--muted)' }}>Yok</td>
                  <td style={{ padding: '10px', color: 'var(--muted)' }}>Tüm kategoriler</td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '10px', color: 'var(--success)', fontWeight: 'bold' }}>GET</td>
                  <td style={{ padding: '10px' }}><code>/api/v1/categories/{"{slug}"}/elements</code></td>
                  <td style={{ padding: '10px', color: 'var(--muted)' }}>Yok</td>
                  <td style={{ padding: '10px', color: 'var(--muted)' }}>Kategoriye göre listeleme</td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '10px', color: 'var(--success)', fontWeight: 'bold' }}>GET</td>
                  <td style={{ padding: '10px' }}><code>/api/v1/statistics</code></td>
                  <td style={{ padding: '10px', color: 'var(--muted)' }}>Yok</td>
                  <td style={{ padding: '10px', color: 'var(--muted)' }}>Katalog istatistikleri</td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '10px', color: 'var(--success)', fontWeight: 'bold' }}>GET</td>
                  <td style={{ padding: '10px' }}><code>/api/v1/elements/{"{symbol}"}/history</code></td>
                  <td style={{ padding: '10px', color: 'var(--warn)', fontWeight: 'bold' }}>Gerekli</td>
                  <td style={{ padding: '10px', color: 'var(--muted)' }}>Model fiyat geçmişi</td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '10px', color: 'var(--danger)', fontWeight: 'bold' }}>POST</td>
                  <td style={{ padding: '10px' }}><code>/api/v1/orders</code></td>
                  <td style={{ padding: '10px', color: 'var(--warn)', fontWeight: 'bold' }}>Gerekli</td>
                  <td style={{ padding: '10px', color: 'var(--muted)' }}>Saga siparişi iletme</td>
                </tr>
                <tr>
                  <td style={{ padding: '10px', color: 'var(--success)', fontWeight: 'bold' }}>GET</td>
                  <td style={{ padding: '10px' }}><code>/api/v1/orders/stats</code></td>
                  <td style={{ padding: '10px', color: 'var(--warn)', fontWeight: 'bold' }}>Gerekli</td>
                  <td style={{ padding: '10px', color: 'var(--muted)' }}>Sipariş özeti (duruma göre)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Sandbox Playground */}
        <aside className="side-stack">
          <div className="panel">
            <div className="panel-header">
              <div>
                <p className="kicker">Sandbox</p>
                <h3 style={{ margin: 0 }}>Canlı Oyun Alanı</h3>
              </div>
            </div>
            
            <div className="playground">
              <div className="fields">
                <div className="field">
                  <label htmlFor="tryItSelect">Endpoint Seçin</label>
                  <select
                    id="tryItSelect"
                    value={tryItEndpoint}
                    onChange={(e) => setTryItEndpoint(e.target.value)}
                  >
                    <option value="/api/v1">GET /api/v1 (Kök keşif)</option>
                    <option value="/api/v1/elements">GET /api/v1/elements</option>
                    <option value="/api/v1/elements?category=noble&sort=price&order=desc">GET /elements (filtre + sıralama)</option>
                    <option value="/api/v1/elements/au">GET /api/v1/elements/au (Altın)</option>
                    <option value="/api/v1/elements/compare?symbols=au,ag,cu">GET /elements/compare</option>
                    <option value="/api/v1/elements/au/neighbors">GET /elements/au/neighbors</option>
                    <option value="/api/v1/elements/au/related">GET /elements/au/related</option>
                    <option value="/api/v1/elements/random">GET /api/v1/elements/random</option>
                    <option value="/api/v1/categories">GET /api/v1/categories</option>
                    <option value="/api/v1/statistics">GET /api/v1/statistics</option>
                  </select>
                </div>
              </div>

              <div className="path-preview" style={{ marginTop: '10px' }}>
                <span className="method">GET</span>
                <code>{tryItEndpoint}</code>
              </div>

              <button
                onClick={handleTryIt}
                disabled={isLoading}
                className="btn primary"
                style={{ width: '100%', marginTop: '10px' }}
              >
                {isLoading ? 'İstek Gönderiliyor...' : 'İsteği Gönder'}
              </button>

              {/* Languages tabs */}
              <div style={{ display: 'flex', gap: '4px', borderBottom: '1px solid var(--border)', marginTop: '18px' }}>
                {(['curl', 'javascript', 'python'] as Language[]).map((lang) => (
                  <button
                    key={lang}
                    onClick={() => setActiveLang(lang)}
                    className={`mini-btn ${activeLang === lang ? 'active' : ''}`}
                    style={{ borderBottomLeftRadius: 0, borderBottomRightRadius: 0, borderBottom: 'none' }}
                  >
                    {lang.toUpperCase()}
                  </button>
                ))}
              </div>

              {/* Code Snippet Window */}
              <div style={{ position: 'relative' }}>
                <pre className="code-window" style={{ padding: '12px', fontSize: '12px' }}>
                  <code>{getCodeSnippet(activeLang, tryItEndpoint)}</code>
                </pre>
                <button
                  onClick={() => copyToClipboard(getCodeSnippet(activeLang, tryItEndpoint))}
                  className="mini-btn"
                  style={{ position: 'absolute', top: '8px', right: '8px', fontSize: '11px' }}
                >
                  Kopyala
                </button>
              </div>

              {/* Response output */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '18px' }}>
                <strong style={{ fontSize: '13px' }}>JSON Yanıtı</strong>
                <button 
                  className="mini-btn" 
                  type="button" 
                  onClick={() => copyToClipboard(JSON.stringify(apiResponse, null, 2))}
                >
                  Kopyala
                </button>
              </div>
              <div className="inline-code">
                <pre style={{ maxHeight: '280px', fontSize: '12px' }}>
                  <code>{JSON.stringify(apiResponse, null, 2)}</code>
                </pre>
              </div>
            </div>
          </div>
        </aside>
      </section>

      {/* Toast container */}
      <div className="toast" id="toast" role="status" aria-live="polite"></div>
    </main>
  );
}
