import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { API_ORIGIN, getPublicSiteUrl, pagePath } from '../config';
import Seo from '../components/Seo';

type NodeKind = 'client' | 'edge' | 'http' | 'worker' | 'data' | 'lab';

type ArchNode = {
  id: string;
  label: string;
  port: string;
  runtime: string;
  role: string;
  talks: string;
  kind: NodeKind;
};

const NODES: ArchNode[] = [
  {
    id: 'web',
    label: 'web-app',
    port: ':3000',
    runtime: 'React 19 + Vite',
    role: 'Mağaza, piyasa masası, API sitesi, bu altyapı sayfası.',
    talks: 'HTTP → gateway :5000',
    kind: 'client'
  },
  {
    id: 'clients',
    label: 'REST / GraphQL',
    port: ':5000',
    runtime: 'curl · Swagger · HotChocolate',
    role: 'Aynı gateway. GraphQL şu an elementPrice stub (ticker’a bakıyor).',
    talks: 'HTTP / GraphQL → YARP',
    kind: 'client'
  },
  {
    id: 'gateway',
    label: 'gateway-service',
    port: ':5000',
    runtime: '.NET 9 · YARP',
    role: 'Tek giriş: API key (ele_live_), rate limit, CORS, HealthChecks UI, GraphQL stub.',
    talks: 'HTTP reverse proxy → identity / catalog / compound / order / notification',
    kind: 'edge'
  },
  {
    id: 'identity',
    label: 'identity-service',
    port: ':5001',
    runtime: '.NET 9',
    role: 'JWT, hashed ele_live_ anahtarlar, webhook kaydı. Internal validate: INTERNAL_API_KEY.',
    talks: 'HTTP (gateway). Webhook listesi notification’a internal HTTP.',
    kind: 'http'
  },
  {
    id: 'catalog',
    label: 'catalog-service',
    port: ':5002',
    runtime: '.NET 9',
    role: '118 element, son fiyat / alış / satış, PriceSimulator ±0,4% / 15sn, stok rezervasyonu.',
    talks: 'HTTP + MassTransit. gRPC MapGrpcService var; checkout bunu kullanmaz (HTTP ticker).',
    kind: 'http'
  },
  {
    id: 'compound',
    label: 'compound-service',
    port: ':5007',
    runtime: '.NET 9',
    role: 'Bileşik, allotrop, preparat. Fiyat = ana element alış × çarpan. Rabbit yok.',
    talks: 'HTTP (gateway). Sipariş slug doğrulaması order’dan.',
    kind: 'http'
  },
  {
    id: 'order',
    label: 'order-service',
    port: ':5003',
    runtime: 'Node.js 22',
    role: 'Sipariş saga, transactional outbox, kredi cüzdan / kasa / defter, satış.',
    talks: 'HTTP (gateway) + MassTransit publish/consume. Checkout fiyatı HTTP ticker, gRPC değil.',
    kind: 'http'
  },
  {
    id: 'notification',
    label: 'notification-service',
    port: ':5006',
    runtime: '.NET 9 · SignalR',
    role: 'PriceUpdated / sipariş push. İmzalı webhook fan-out (price.updated, order.updated).',
    talks: 'SignalR /hub/notifications · MassTransit consume · HTTP webhooks',
    kind: 'http'
  },
  {
    id: 'rabbit',
    label: 'RabbitMQ',
    port: ':5672 / :15672',
    runtime: 'MassTransit envelope',
    role: 'Polyglot kuyruk. URN: urn:message:Element.Shared.Events:*',
    talks: 'AMQP. Management UI lab compose’da guest/guest.',
    kind: 'data'
  },
  {
    id: 'payment',
    label: 'payment-service',
    port: ':5005',
    runtime: 'Java 21',
    role: 'kredi debit worker. ProcessPaymentCommand + customerId. Kendi Postgres’i yok.',
    talks: 'Yalnız MassTransit (payment-processing). Gateway üzerinden alış yok.',
    kind: 'worker'
  },
  {
    id: 'shipment',
    label: 'shipment-service',
    port: ':5004',
    runtime: '.NET 9',
    role: 'Simülasyon kargo. Tracking TRK-*. Saga worker + takip sorgusu.',
    talks: 'MassTransit + HTTP track (gateway, sahiplik kontrolü).',
    kind: 'worker'
  },
  {
    id: 'postgres',
    label: 'PostgreSQL',
    port: ':5432',
    runtime: 'Tek instance, 5 DB',
    role: 'identity · catalog · compound · order · shipment. Payment DB’siz.',
    talks: 'TCP. Public overlay host portunu kapatır.',
    kind: 'data'
  },
  {
    id: 'redis',
    label: 'Redis',
    port: ':6379',
    runtime: 'Önbellek + rate limit',
    role: 'Catalog DTO cache, gateway API-key cache, order fiyat fallback.',
    talks: 'TCP. Redis down → gateway health Degraded; rate limit 429.',
    kind: 'data'
  }
];

const OBS_NODE: ArchNode = {
  id: 'obs',
  label: 'Observability',
  port: 'lab',
  runtime: 'Prometheus · Grafana · Jaeger · Seq · Loki · ELK',
  role: 'Compose ile ayağa kalkar. Public overlay :8888 / :3001 / :16686 yok. Üretim SLA’sı yok.',
  talks: 'Scrape + UI · hub localhost:8888 yalnız lab host’ta',
  kind: 'lab'
};

const LANES: { id: string; title: string; nodeIds: string[] }[] = [
  { id: 'clients', title: 'İstemciler', nodeIds: ['web', 'clients'] },
  { id: 'edge', title: 'Kenar', nodeIds: ['gateway'] },
  { id: 'http', title: 'Gateway HTTP', nodeIds: ['identity', 'catalog', 'compound', 'order', 'notification'] },
  { id: 'mq', title: 'RabbitMQ workers', nodeIds: ['rabbit', 'payment', 'shipment'] },
  { id: 'data', title: 'Veri', nodeIds: ['postgres', 'redis'] }
];

const OBS = [
  { name: 'Hub', port: ':8888', role: 'Lab link panosu' },
  { name: 'Prometheus', port: ':9090', role: 'Metrik scrape' },
  { name: 'Grafana', port: ':3001', role: 'Dashboard (admin/admin)' },
  { name: 'Jaeger', port: ':16686', role: 'Tracing' },
  { name: 'Seq', port: ':5341', role: '.NET log' },
  { name: 'Loki', port: ':3100', role: 'Log deposu → Grafana' },
  { name: 'Kibana', port: ':5601', role: 'ELK arama' }
];

const SAGA = [
  { n: '01', title: 'Submitted', who: 'order Node', detail: 'POST /api/v1/orders · bakiye ≥ alış×g (402). Aynı TX: sipariş + saga_state + outbox (OrderSubmittedEvent).' },
  { n: '02', title: 'Stok ayır', who: 'catalog .NET', detail: 'StockReserved → outbox ProcessPaymentCommand. Fail: StockReservationFailed, debit yok.' },
  { n: '03', title: 'kredi debit', who: 'payment Java', detail: 'Kuyruk payment-processing. Idempotent internal debit. Fail: PaymentFailed + stok iade + refund.' },
  { n: '04', title: 'Kargo TRK-', who: 'shipment .NET', detail: 'ShipmentRequested → TRK-* · ShipmentDispatched. Fail: stok iade + kredi iade.' },
  { n: '05', title: 'Completed', who: 'order + catalog', detail: 'Kasa += gram. OrderCompletedEvent: stok düş, last yukarı (etki tavanı %3).' }
];

const POLYGLOT = [
  { svc: 'web-app', lang: 'TypeScript · React 19', role: 'Ürün yüzü', talks: 'HTTP' },
  { svc: 'gateway', lang: '.NET 9 · YARP', role: 'Kenar, key, limit', talks: 'HTTP · GraphQL stub' },
  { svc: 'identity', lang: '.NET 9', role: 'JWT · ele_live_ · webhook CRUD', talks: 'HTTP' },
  { svc: 'catalog', lang: '.NET 9', role: 'Katalog · MM · simülatör', talks: 'HTTP · MassTransit · gRPC (checkout’ta kullanılmaz)' },
  { svc: 'order', lang: 'Node.js 22', role: 'Saga · outbox · cüzdan', talks: 'HTTP · MassTransit' },
  { svc: 'payment', lang: 'Java 21', role: 'kredi debit worker', talks: 'MassTransit' },
  { svc: 'shipment', lang: '.NET 9', role: 'TRK- worker', talks: 'MassTransit · HTTP track' },
  { svc: 'notification', lang: '.NET 9', role: 'Push + webhook fan-out', talks: 'SignalR · MassTransit · HTTP' }
];

const CONTRACT_SNIPPET = `{
  "messageId": "…",
  "messageType": ["urn:message:Element.Shared.Events:ProcessPaymentCommand"],
  "message": {
    "orderId": "00000000-0000-0000-0000-000000000001",
    "amount": 75.25,
    "customerId": "00000000-0000-0000-0000-000000000002"
  }
}`;

type Pulse = {
  info: { ok: boolean; name?: string; note: string };
  health: { ok?: boolean; status?: string; note: string };
  catalog: { ok: boolean; note: string };
};

function pulseNote(kind: 'info' | 'health' | 'catalog', status: number, body: unknown): string {
  if (status === 0) return 'Yanıt yok — compose kapalı veya CORS.';
  if (kind === 'info') {
    const name = (body as { name?: string } | null)?.name;
    return name ? `${name} · HTTP ${status}` : `HTTP ${status}`;
  }
  if (kind === 'health') {
    const st = (body as { status?: string } | null)?.status;
    return st ? `${st} · HTTP ${status}` : `HTTP ${status}`;
  }
  return `HTTP ${status}`;
}

async function readEndpoint(url: string): Promise<{ status: number; body: unknown }> {
  try {
    const res = await fetch(url);
    const body = await res.json().catch(() => null);
    return { status: res.status, body };
  } catch {
    return { status: 0, body: null };
  }
}

function nodeById(id: string) {
  if (id === 'obs') return OBS_NODE;
  return NODES.find((n) => n.id === id) ?? NODES[2];
}

export default function Stack() {
  const [selected, setSelected] = useState('gateway');
  const [hover, setHover] = useState<string | null>(null);
  const [pulse, setPulse] = useState<Pulse | null>(null);
  const shown = nodeById(hover ?? selected);
  const origin = getPublicSiteUrl();
  const desc = 'YARP gateway, polyglot checkout saga (outbox + Java kredi debit + TRK-), ev piyasa yapıcısı, lab observability.';

  useEffect(() => {
    let live = true;
    const tick = async () => {
      const [info, health, catalog] = await Promise.all([
        readEndpoint(`${API_ORIGIN}/info`),
        readEndpoint(`${API_ORIGIN}/health`),
        readEndpoint(`${API_ORIGIN}/api/v1`)
      ]);
      if (!live) return;
      const healthStatus = (health.body as { status?: string } | null)?.status;
      const infoName = (info.body as { name?: string } | null)?.name;
      const healthOk =
        health.status === 0 || healthStatus === 'Unhealthy' ? false
          : healthStatus === 'Degraded' ? undefined
            : health.status >= 200 && health.status < 300;
      setPulse({
        info: {
          ok: info.status >= 200 && info.status < 300,
          name: infoName,
          note: pulseNote('info', info.status, info.body)
        },
        health: {
          ok: healthOk,
          status: healthStatus,
          note: pulseNote('health', health.status, health.body)
        },
        catalog: {
          ok: catalog.status >= 200 && catalog.status < 300,
          note: pulseNote('catalog', catalog.status, catalog.body)
        }
      });
    };
    tick();
    const id = setInterval(tick, 20000);
    return () => { live = false; clearInterval(id); };
  }, []);

  return (
    <main className="page stack-page">
      <Seo
        title="Altyapı · ElementAPI"
        description={desc}
        path={pagePath('/stack')}
        jsonLd={{
          '@type': 'TechArticle',
          headline: 'ElementAPI altyapı — polyglot saga ve metal evi',
          url: `${origin}/stack`,
          description: desc,
          inLanguage: 'tr-TR',
          about: 'YARP, MassTransit outbox saga, market maker'
        }}
      />

      <section className="stack-head">
        <div>
          <p className="kicker">Altyapı · polyglot</p>
          <h1>Polyglot yazı, dürüst sınır.</h1>
          <p className="lead">
            İstemci YARP’a gider. Identity, catalog, order, notification HTTP. Payment ve shipment yalnız RabbitMQ.
            Checkout bir saga: stok → Java kredi debit → TRK- → Completed. Outbox aynı transaction’da.
            Gözlem yığını lab compose; public overlay yalnızca :3000 ve :5000.
          </p>
        </div>
        <p className="stack-head-note muted">
          Ürün döngüsü mağazada. Bu sayfa dağıtık yazıyı anlatır. Helm/K8s <code>deploy/</code> taslak — production-ready değil.
        </p>
      </section>

      <section className="pulse-row" aria-label="Canlı nabız">
        <PulseChip label="GET /info" ok={pulse?.info.ok} note={pulse ? pulse.info.note : '…'} href={`${API_ORIGIN}/info`} />
        <PulseChip label="GET /health" ok={pulse?.health.ok} note={pulse ? pulse.health.note : '…'} href={`${API_ORIGIN}/health`} />
        <PulseChip label="GET /api/v1" ok={pulse?.catalog.ok} note={pulse ? pulse.catalog.note : '…'} href={`${API_ORIGIN}/api/v1`} />
        <a className="pulse-chip pulse-link" href={`${API_ORIGIN}/health-ui`} target="_blank" rel="noreferrer">
          <span className="pulse-label">/health-ui</span>
          <span className="pulse-note">Gateway :5000 — mesh’i sunucu tarafında yoklar</span>
        </a>
      </section>
      <p className="muted stack-fine">
        Nabız tarayıcıdan <code>{API_ORIGIN}</code> adresine gider. Gateway kapalıysa üçü de düşer — uydurma uptime yok.
        <code>/health</code> gateway Redis’idir, tüm worker’lar değil.
      </p>

      <section className="stack-block" aria-labelledby="arch-title">
        <header className="stack-block-head">
          <div>
            <p className="kicker">A · Levha</p>
            <h2 id="arch-title">Mimari harita</h2>
          </div>
          <p className="muted">Kutu seç → analiz fişi. Kesik çizgi = lab-only.</p>
        </header>

        <div className="arch-blotter">
          <svg className="arch-traces" viewBox="0 0 920 36" aria-hidden="true">
            <path d="M80 28 H840" fill="none" stroke="currentColor" strokeWidth="1.25" />
            <path d="M200 8 V28 M460 8 V28 M720 8 V28" fill="none" stroke="currentColor" strokeWidth="1.25" />
          </svg>

          {LANES.map((lane) => (
            <div key={lane.id} className={`arch-lane arch-lane-${lane.id}`}>
              <span className="arch-lane-label">{lane.title}</span>
              <div className="arch-lane-nodes">
                {lane.nodeIds.map((id) => {
                  const n = nodeById(id);
                  const on = (hover ?? selected) === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      className={`arch-node kind-${n.kind}${on ? ' is-on' : ''}`}
                      aria-pressed={selected === id}
                      onMouseEnter={() => setHover(id)}
                      onMouseLeave={() => setHover(null)}
                      onFocus={() => setHover(id)}
                      onBlur={() => setHover(null)}
                      onClick={() => setSelected(id)}
                    >
                      <span className="arch-node-id">{n.label}</span>
                      <span className="arch-node-port">{n.port}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          <div className="arch-lane arch-lane-lab">
            <span className="arch-lane-label">Gözlem · lab</span>
            <div className="arch-lane-nodes">
              <button
                type="button"
                className={`arch-node kind-lab${(hover ?? selected) === 'obs' ? ' is-on' : ''}`}
                aria-pressed={selected === 'obs'}
                onMouseEnter={() => setHover('obs')}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover('obs')}
                onBlur={() => setHover(null)}
                onClick={() => setSelected('obs')}
              >
                <span className="arch-node-id">Prometheus → Grafana · Jaeger · Seq · Loki · ELK · hub</span>
                <span className="arch-node-port">host portları public’te kapalı</span>
              </button>
            </div>
          </div>
        </div>

        <aside className="assay-ticket" aria-live="polite">
          <div className="assay-ticket-head">
            <span className="specimen-id">{shown.port}</span>
            <span className="kicker" style={{ margin: 0 }}>{shown.runtime}</span>
          </div>
          <h3>{shown.label}</h3>
          <p>{shown.role}</p>
          <p className="mono assay-talks">{shown.talks}</p>
        </aside>
      </section>

      <section className="stack-block" aria-labelledby="poly-title">
        <header className="stack-block-head">
          <div>
            <p className="kicker">B · Dil</p>
            <h2 id="poly-title">Polyglot tablo</h2>
          </div>
        </header>
        <div className="table-scroll">
          <table className="api-table stack-table">
            <thead>
              <tr>
                <th>Servis</th>
                <th>Dil / runtime</th>
                <th>Rol</th>
                <th>Konuşma</th>
              </tr>
            </thead>
            <tbody>
              {POLYGLOT.map((row) => (
                <tr key={row.svc}>
                  <td><code>{row.svc}</code></td>
                  <td>{row.lang}</td>
                  <td>{row.role}</td>
                  <td>{row.talks}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="stack-block" aria-labelledby="saga-title">
        <header className="stack-block-head">
          <div>
            <p className="kicker">C · Para yazısı</p>
            <h2 id="saga-title">Checkout saga</h2>
          </div>
          <p className="muted">Sıra bilgi taşır. Outbox: durum + mesaj aynı Postgres TX, sonra publish.</p>
        </header>
        <ol className="saga-track">
          {SAGA.map((step, i) => (
            <li key={step.n} className="saga-step">
              <span className="saga-n">{step.n}</span>
              <strong>{step.title}</strong>
              <span className="saga-who">{step.who}</span>
              <p>{step.detail}</p>
              {i < SAGA.length - 1 && <span className="saga-arrow" aria-hidden="true">→</span>}
            </li>
          ))}
        </ol>
        <div className="saga-comp">
          <svg viewBox="0 0 640 48" className="saga-comp-svg" aria-hidden="true">
            <path d="M560 8 Q320 44 80 8" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="5 4" />
            <polygon points="80,8 92,4 92,12" fill="currentColor" />
          </svg>
          <p>
            <strong>Tazminat ← </strong>
            PaymentFailed veya ShipmentFailed: <code>OrderStockReleaseEvent</code> + (debit olduysa) kredi iade.
            StockReservationFailed: Failed, cüzdan dokunulmaz. Timeout sweeper aynı çıkışları outbox’tan üretir.
          </p>
        </div>
      </section>

      <section className="stack-block" aria-labelledby="mm-title">
        <header className="stack-block-head">
          <div>
            <p className="kicker">D · Ev</p>
            <h2 id="mm-title">Piyasa yapıcı</h2>
          </div>
        </header>
        <div className="mm-copy">
          <p>
            Son fiyat ortaya yakındır. Alış = son × 1,008, satış = son × 0,992 (fark %0,8). Mağaza alıştan alır; piyasa satıştan satar. Emir defteri yok — karşı taraf uygulamadır.
          </p>
          <p>
            Hacim, ticker’da <code>volume24hGrams</code>: son 24 saatte fulfilled gram. Alış last’i yukarı, satış aşağı iter (k ≈ 0,04, tek işlem tavanı %3). Simulator 15 sn’de ±0,4% jitter — evi kapatmaz, ticareti de yutmaz.
          </p>
          <p>
            Piyasa satışı saga değildir: kasa düşer, kredi iade, catalog stok + last. 10.000 grant ilk cüzdan GET’inde.
          </p>
        </div>
      </section>

      <section className="stack-block" aria-labelledby="sec-title">
        <header className="stack-block-head">
          <div>
            <p className="kicker">E · Duruş</p>
            <h2 id="sec-title">Güvenlik / public</h2>
          </div>
        </header>
        <ul className="stack-list">
          <li>Sipariş, kasa, satış: gateway’de <code>X-API-Key</code> (<code>ele_live_</code> + 32). Ticker ve board public.</li>
          <li>IDOR kapalı: <code>GET /orders/:id</code> ve kargo takibi kendi <code>customerId</code> değilse 404.</li>
          <li>Internal debit / key validate: <code>INTERNAL_API_KEY</code> header. Public compose host’ta yalnız :3000 + :5000.</li>
          <li>JWT <code>localStorage</code> — origin-scoped, HttpOnly cookie yok. Kâğıt para. Production-hardened değil; XSS = cüzdan anahtarı.</li>
        </ul>
      </section>

      <section className="stack-block" aria-labelledby="obs-title">
        <header className="stack-block-head">
          <div>
            <p className="kicker">F · Lab</p>
            <h2 id="obs-title">Observability</h2>
          </div>
          <p className="muted">Hepsi lab compose. Public overlay bu portları host’tan siler.</p>
        </header>
        <div className="obs-row">
          {OBS.map((tool) => (
            <article key={tool.name} className="obs-cell">
              <span className="obs-name">{tool.name}</span>
              <span className="mono obs-port">{tool.port}</span>
              <span className="obs-role">{tool.role}</span>
              <span className="obs-tag">lab compose</span>
            </article>
          ))}
        </div>
        <p className="muted stack-fine">
          Hub <a href="http://localhost:8888" rel="noreferrer">localhost:8888</a> yalnız lab compose’da dinler.
          Public overlay’de açılmaz — o yüzden burası dış link değil, etiket. Mesh UI için gateway <a href={`${API_ORIGIN}/health-ui`} target="_blank" rel="noreferrer">/health-ui</a> (:5000 açıksa).
        </p>
      </section>

      <section className="stack-block" aria-labelledby="contract-title">
        <header className="stack-block-head">
          <div>
            <p className="kicker">G · Sözleşme</p>
            <h2 id="contract-title">MassTransit URN</h2>
          </div>
        </header>
        <p className="muted">
          Kaynak: <code>contracts/messages</code> ve <code>shared-lib/Events</code>. Tip adı <code>urn:message:Element.Shared.Events:*</code>.
          Java worker aynı envelope’u parse eder; <code>customerId</code> yoksa komut reddedilir.
        </p>
        <pre className="code-window"><code>{CONTRACT_SNIPPET}</code></pre>
      </section>

      <p className="stack-back">
        <Link to="/">Ürün kapısı</Link>
        <span aria-hidden="true"> · </span>
        <Link to="/docs">API</Link>
        <span aria-hidden="true"> · </span>
        <Link to="/shop">Mağaza döngüsü</Link>
      </p>
    </main>
  );
}

function PulseChip({
  label,
  ok,
  note,
  href
}: {
  label: string;
  ok?: boolean;
  note: string;
  href: string;
}) {
  const cls = ok == null ? 'unknown' : ok ? 'up' : 'down';
  return (
    <a className={`pulse-chip is-${cls}`} href={href} target="_blank" rel="noreferrer">
      <span className="pulse-dot" aria-hidden="true" />
      <span className="pulse-label">{label}</span>
      <span className="pulse-note">{note}</span>
    </a>
  );
}
