export const meta = {
  name: 'element-web-pages',
  description: 'Rewrite every web-app page on the Mineral design system, fix inventoried bugs, build the in-app system guide',
  phases: [{ title: 'Pages', detail: 'one agent per page group, visual self-check at 1440/390' }],
}

const SP = 'C:/Users/AFU/AppData/Local/Temp/claude/C--Users-AFU-Desktop-DEV-element-api/376d2695-5235-408c-976f-39ab14ee6526/scratchpad'
const WEB = 'C:/Users/AFU/Desktop/DEV/element-api/web-app'

const CONTINUATION = `
CONTINUATION NOTICE: a previous attempt at this exact task was interrupted by a usage limit before any agent could report.
Its partial work is committed as c4d65fe (on top of the foundation commit fdad58d). Start by inspecting your files' current state:
git diff fdad58d -- <your files> and the new folders under src/components/. Status found by the orchestrator:
- landing-about, periodic, detail, reference, lab, notebook-auth: pages already rewritten on the new system and compiling; still needed:
  full visual self-check at 1440 and 390 and polish, feature-parity check against the inventory, and the owned tests.
  Still failing legacy tests: periodic-swatches + museum-preview-dialog (periodic), compounds-grid + guide-cards + product-chrome (reference),
  feedback-void-chrome (notebook-auth). The lab agent already added tests/lab-games.test.mjs.
- commerce, developer, services, system-guide: NOT started (files untouched) — do the full task.
Continue from the current state; do not throw away good work, but fix anything incomplete or below the quality bar.
`

const COMMON = CONTINUATION + `
You are one of 10 agents redesigning the React app in ${WEB} (Vite 8, React 19, TS strict, Tailwind v4, Radix via "radix-ui", framer-motion, lucide-react).
The design-system FOUNDATION is already built and committed (tokens in src/styles.css, primitives + building blocks in src/components/ui/*, shell in src/components/shell/*, contexts in src/context/*, hooks in src/hooks/*, helpers in src/lib/*).
The five legacy CSS files (index.css, science.css, atlas.css, design-system.css, product.css) are NO LONGER IMPORTED: any legacy class name renders unstyled. They stay on disk only so you can read the old layout intent; they will be deleted at the end.

READ FIRST (fully): ${SP}/DESIGN-SPEC.md ; ${WEB}/../docs/memory-bank/design-system.md ; the gallery sources ${WEB}/src/pages/ui-gallery/*.tsx and the component files you use (to learn the real props) ;
the inventory for your pages in ${SP}/web-inventory.json (search it for your file names: every listed feature, data dependency, state, analytics call, SEO prop, localStorage key, query param and test contract must survive).

YOUR JOB: rewrite your files from scratch on the new system so they look like a top-tier product (Linear/Vercel/Stripe polish, mineral identity), preserving every feature, and with every line clean and understandable:
- Pages: <main className="container-page pb-24 pt-10 lg:pt-14"> (the shell already provides #main-content) → PageHeader → sections. Use the ui building blocks; never re-implement them.
- Files over ~300 lines: split into well-named sub-components under src/components/<your-feature>/ (create the folder). One concern per component. English JSDoc on exports. No any, no dead code, no inline style except CSS custom properties, no legacy class names, no raw hex/rgb colors (tokens only).
- Copy: Turkish, plain, specific, sentence case, no exclamation marks, no clichés. Keep existing copy unless it is wrong or clumsy.
- Every data view: loading (Skeleton shaped like content), empty (EmptyState), error (Notice + retry) states. Mobile at 390px with no horizontal page scroll.
- Accessibility: semantic landmarks/headings (one h1 via PageHeader), labels, focus-visible, keyboard paths for every pointer interaction.

OWNERSHIP (other agents edit other files concurrently):
- Edit ONLY the files listed in your scope plus new files you create under src/components/<your-feature>/ and the tests listed for you.
- Do NOT edit src/components/ui/*, src/styles.css, src/App.tsx, src/context/*, src/components/shell/*, src/productNav.ts, package.json, or files owned by others. If you need a shared primitive change, build a local component instead and mention it in openIssues.
- Do not run git commands that change state. Do not commit.

VISUAL SELF-CHECK (mandatory, iterate until it looks premium): a Vite dev server runs at http://127.0.0.1:5173 (do NOT start another). The full Docker platform is up: gateway http://localhost:5000 (real elements, prices, accounts, orders) and science API at 127.0.0.1:5080 (proxied as /api/v2).
From ${WEB} run: node .shots.mjs ${SP}/shots/<your-scope> 1440 <url> [<url@scrollY> ...] and the same with 390, then Read the PNGs. Check spacing, alignment, hierarchy, contrast, empty/loading states, mobile layout. Fix and re-shoot.
If you need a logged-in view, register a throwaway local account with randomly generated test credentials via the UI or POST http://localhost:5000/api/v1/auth/register (local stack only; never print the password in your report).

VERIFY before finishing (from ${WEB}):
- npx tsc -p tsconfig.app.json --noEmit 2>&1 — your files must have zero errors (ignore errors in files owned by others that are mid-edit, but report them).
- npx eslint <your files> — clean.
- node --experimental-strip-types --test tests/<your test files> — pass.
`

const SCHEMA = {
  type: 'object',
  properties: {
    scope: { type: 'string' },
    filesChanged: { type: 'array', items: { type: 'string' } },
    featureChanges: { type: 'array', items: { type: 'object', properties: { feature: { type: 'string' }, status: { type: 'string', enum: ['changed', 'removed'] }, reason: { type: 'string' } }, required: ['feature', 'status', 'reason'] } },
    featuresPreservedCount: { type: 'number' },
    bugsFixed: { type: 'array', items: { type: 'string' } },
    testsChanged: { type: 'array', items: { type: 'string' } },
    verify: { type: 'array', items: { type: 'object', properties: { command: { type: 'string' }, passed: { type: 'boolean' }, detail: { type: 'string' } }, required: ['command', 'passed', 'detail'] } },
    screenshotsReviewed: { type: 'array', items: { type: 'string' } },
    openIssues: { type: 'array', items: { type: 'string' } },
  },
  required: ['scope', 'filesChanged', 'featureChanges', 'featuresPreservedCount', 'bugsFixed', 'testsChanged', 'verify', 'screenshotsReviewed', 'openIssues'],
}

const TEST_RULE = 'Tests that only grep legacy CSS/class names are obsolete: replace each with a meaningful test of the same intent against the new code (behaviour of pure logic, or a source contract that matters, e.g. the page uses PageHeader/SEO noIndex), or delete it if nothing meaningful remains and say so in testsChanged.'

const SCOPES = [
  {
    key: 'landing-about',
    files: 'src/pages/Landing.tsx, src/pages/About.tsx (+ new src/components/landing/*)',
    urls: 'http://127.0.0.1:5173/ , http://127.0.0.1:5173/hakkinda',
    tests: 'tests/about-page.test.mjs, tests/product-landing-css.test.mjs, tests/void-chrome-cursor.test.mjs (legacy-only: delete)',
    extra: `Landing is the first impression of a "big project": make it exceptional but honest.
- Hero: asymmetric split. Left: eyebrow, the slogan "Atomdan bileşiğe." in text-display-lg, one specific sub-line (118 element, 214 bileşik, laboratuvar, açık API), primary CTA "Tabloyu aç" (/periodic) + secondary "Laboratuvar" (/lab). Right: the crystal image public/brand/elementapi-hero-void-cuprite.jpg (or elementapi-hero-cuprite.jpg) as a large rounded-2xl media with a soft radial mask into the canvas and a subtle shadow-glow; no stretched backgrounds.
- A real numbers band (read counts from src/data/coverage.json: elements, compounds, photos, structures) in mono tabular.
- Feature sections in a zig-zag/asymmetric rhythm (never three identical cards): Periyodik tablo (a live mini row of ElementTile linking to /element/*), Laboratuvar (public/brand/elementapi-lab-glass.jpg + 3 concrete steps: sürükle, oranı ayarla, Dene), Defter ve rotalar (/collection, /nasil), Açık API (CodeBlock with GET /api/v2/elements/fe?fields=symbol,name,mass sample + link /developers).
- Closing CTA band. Keep JSON-LD/SEO behaviour that Landing has today. Motion: subtle staggered reveal with framer-motion, reduced-motion safe.
About (/hakkinda): what the project is, data sources, honest limits (simulation, no real money), stack overview linking to /kilavuz (Sistem kılavuzu) and GitHub-free.`,
  },
  {
    key: 'periodic',
    files: 'src/components/PeriodicExplorer.tsx (+ new src/components/periodic/*), src/services/elementData.ts (you own it; keep `const rawElements = "` exactly as the first token pattern because scripts parse it; keep all exports)',
    urls: 'http://127.0.0.1:5173/periodic',
    tests: 'tests/periodic-swatches.test.mjs, tests/museum-preview-dialog.test.mjs',
    extra: `- elementData.ts categoryTokens must now map to var(--color-family-<key>) (legacy --cat-* vars no longer exist); categorySwatches may become the same tokens or be removed if unused (check all usages across src with grep; keep the export if anything imports it). tileInk may become unnecessary — keep exports that others import.
- The table: a crisp 18-column grid of ElementTile (family colours), lanthanide/actinide rows with a clear gap and labels, group/period axis labels in mono, a sticky toolbar with SearchField (live count, Turkish fold search), lens ChipGroup (single-select property heat lenses with a numeric ColorScale legend + missing-data hatch), family legend ChipGroup (multi-select filter + clear), Segmented "Tablo / Kartlar" view switch (cards = mobile-friendly list).
- Selected element preview panel (beside or below the table) + the preview dialog behaviour from the inventory.
- Bugs to fix: Enter in search must use react-router navigate (no full reload); card view must show element names.
- [data-symbol] must stay on tiles (e2e). On 390px the table view must scroll horizontally inside its own container, never the page.`,
  },
  {
    key: 'detail',
    files: 'src/components/ScientificDetail.tsx, src/components/AtlasVisual.tsx, src/components/GeometryFigure.tsx (+ new src/components/detail/*)',
    urls: 'http://127.0.0.1:5173/element/fe , /element/og , /element/hg , /compound/h2o , /compound/nacl , /element/zz (not found state)',
    tests: 'tests/element-photos.test.mjs (keep passing)',
    extra: `- Detail hero: Breadcrumb, big symbol tile + name + family Badge, KeyValue key facts, actions (Wikipedia/PubChem ExternalLink, "Laboratuvarda dene" → /lab?material=Sym, JSON download), AtlasVisual media (photo / structure / atom-shell toggle via Segmented, credit + licence caption).
- Property sections as Disclosure groups with counts and an expand-all; sticky in-page TOC on desktop; section filter SearchField.
- JSON viewer must use CodeBlock with language json (lib/highlightJson inside) — keep jsonSource usage.
- GeometryFigure: theme strokes/fills/captions from tokens (bug: caption was invisible). It is also used by other pages — keep its props API stable.
- Prev/next element navigation if it exists today; compound pages show Formula, structure image on a light-neutral plate (PubChem PNGs are dark-on-white: put them on a bg-ink/95 rounded plate so they read), composition links as ElementTile chips.
- Not-found: EmptyState with links.`,
  },
  {
    key: 'reference',
    files: 'src/pages/Compounds.tsx, src/components/CompoundCard.tsx, src/pages/Glossary.tsx, src/pages/Guide.tsx, src/pages/DataCoverage.tsx (+ new src/components/reference/*)',
    urls: 'http://127.0.0.1:5173/compounds , /sozluk , /nasil , /data',
    tests: 'tests/compounds-grid.test.mjs, tests/guide-cards.test.mjs, tests/product-chrome.test.mjs (it also asserted the demo banner in App.tsx: the banner now lives in src/components/CommerceLayout.tsx — assert there or drop that part)',
    extra: `- Compounds: SearchField + group ChipGroup + result count; responsive card grid (CompoundCard: Formula prominent, name, molar mass in mono, structure thumbnail on a light plate when present); empty/error/loading states.
- Glossary (/sozluk): alphabet jump nav (sticky), term rows with definitions/examples, GeometryFigure where used.
- Guide (/nasil, "El kitabı"): step-by-step how-to cards, FAQ as progressive disclosure, curl examples via CodeBlock. Fix copy drift: the lab button is "Dene" (not "Birleştir"), materials are dragged and adjusted with +/− (not "kartı iki kez bas"). Accounts-off: don't push /register, /market, /shop as main CTAs (link /demo only as secondary).
- DataCoverage (/data): Stat grid from coverage.json, source list with ExternalLink, honest gaps (photos missing etc.).`,
  },
  {
    key: 'lab',
    files: 'src/pages/Laboratory.tsx, src/pages/LabFormula.tsx, src/pages/LabDetective.tsx, src/components/LabModes.tsx, src/services/lab.ts, src/services/games.ts (+ new src/components/lab/*)',
    urls: 'http://127.0.0.1:5173/lab , /lab?material=Fe , /lab/formula , /lab/detective?element=fe',
    tests: 'tests/lab-void-chrome.test.mjs (replace), tests/lab-sandbox-outcome.test.mjs (keep passing), add tests/lab-games.test.mjs covering the game fixes',
    extra: `- The lab is the product's signature: palette (ElementTile-based, searchable, scrollable on touch) → bench drop zone (chips with +/− counts, reorder, remove) → "Dene" → outcome panel (hit / almost / impossible / unknown with distinct Notice tones, Formula, GeometryFigure, link to compound record), progress Stat (x / 214 discoveries) + ProgressRing, mode switcher (LabModes as Segmented-like nav to /lab, /lab/formula, /lab/detective), lesson banner (?lesson=), reset with ConfirmDialog.
- Keyboard alternative for every drag action (e.g. Enter on palette item adds it to the bench). Keep data-lab-drop / data-lab-drag attributes only if tests or logic use them.
- Bugs to fix (with tests): (1) games.pickFormula/pickDetective must skip the current item so "Başka kayıt" / "Pas geç" move on; (2) /lab/detective?element=fe must resolve case-insensitively to Fe; (3) formula/detective chips readable (new styles); (5) palette must scroll on touch: apply touch-action:none only on a drag handle, not the whole item.
- Keep analytics track('lab_started'), track('discovery_completed') and learning progress writes exactly.`,
  },
  {
    key: 'notebook-auth',
    files: 'src/pages/Collection.tsx, src/pages/Feedback.tsx, src/pages/Login.tsx, src/pages/Register.tsx, src/pages/Recovery.tsx, src/pages/Settings.tsx, src/components/CaptchaWidget.tsx, src/services/useLearning.ts, src/services/lessons.ts (+ new src/components/notebook/* and src/components/auth/*). Do not move src/data/lessons.json (identity-service Dockerfile copies it).',
    urls: 'http://127.0.0.1:5173/collection , /feedback , /login , /register , /reset-password , /settings (logged in)',
    tests: 'tests/feedback-void-chrome.test.mjs, tests/captcha-config.test.mjs (update to new markup but keep the captcha config contract), tests/safe-return-to.test.mjs (keep passing)',
    extra: `- Collection ("Defter"): progress hero (ProgressRing + Stat), discovered compounds grid, learning routes as cards with progress, lesson questions (shared QuizQuestion component in src/components/notebook/), JSON export/import backup, guest vs account sync notices, locked/empty states.
- Auth pages: one AuthLayout (src/components/auth/) — centered panel, brand mark, title, Field-based forms (label/hint/error wired), password visibility toggle, CaptchaWidget slot, inline Notice errors, links between login/register/recovery. Use hooks/useAuthCapabilities instead of the duplicated fetches. Keep returnTo/safeReturnTo behaviour, session events and localStorage keys exactly.
- Settings: sections (profil, güvenlik/parola, e-posta doğrulama, API anahtarları if present, veri dışa aktarma, hesabı sil with ConfirmDialog tone danger). Feedback: form + local stats + JSON download.`,
  },
  {
    key: 'commerce',
    files: 'src/pages/Market.tsx, src/pages/Shop.tsx, src/pages/Account.tsx, src/pages/Demo.tsx (+ new src/components/commerce/*)',
    urls: 'http://127.0.0.1:5173/demo , /market , /shop?symbol=Au , /account (logged in; buy something small in the shop first so holdings/orders render)',
    tests: 'tests/demo-vitrin-chrome.test.mjs',
    extra: `- This is a clearly-labelled virtual-KREDI demo. Keep the demo banner (rendered by CommerceLayout) and honest copy.
- Market: quote board as a dense, sortable data table (symbol, name, bid/ask/last in mono tabular, change coloured success/danger with sign, sparkline only if data exists), filter SearchField, selected-element ticket panel (buy link → /shop?symbol=, sell form with grams input + compound select + proceeds preview), holdings list. Polling via hooks/usePolling with the same intervals.
- Shop: element picker (ElementTile chips), compound/SKU selection, pack-size Segmented/ChipGroup, quantity stepper, price summary with formatKredi, cart (localStorage cart helpers from services/api.ts unchanged), checkout with Idempotency-Key behaviour unchanged, order status timeline with StatusBadge colours, toast() feedback.
- Account: wallet Stat cards (bakiye, varlık değeri), holdings table, orders table with status badges, API key panel (reveal + CopyButton + revoke ConfirmDialog), webhooks if present.
- Demo (/demo): an honest showcase page explaining the simulated flow (order → stock → payment → shipment saga) with a step diagram and CTAs into /market and /shop.`,
  },
  {
    key: 'developer',
    files: 'src/pages/ApiDocs.tsx, src/pages/Developers.tsx, src/services/apiDocs.ts (+ new src/components/developer/*)',
    urls: 'http://127.0.0.1:5173/developers , /docs , /docs#etag',
    tests: 'tests/docs-auth-chrome.test.mjs (rewrite: e.g. highlightJson emits text-syntax-* classes and escapes HTML, ApiDocs/Developers use CodeBlock)',
    extra: `- Developers (/developers, the top-nav "API"): a Stripe-docs-quality landing for the open v2 API: hero with a live request CodeBlock (curl / JavaScript / Python tabs) and a "Çalıştır" live fetch showing status, ETag and highlighted JSON; key facts (no key needed for v2, rate limit, CORS, ETag); endpoint quick list (Table with GET badges); links to /docs and /kilavuz; API terms link if present.
- ApiDocs (/docs): two-column docs layout — sticky left TOC (scrollspy, anchors like #etag, #simulation must keep working incl. opening the right Disclosure from the hash), right content with parameter tables, examples in CodeBlock, interactive playground (keep track('api_example_run') and playgroundView 304 handling), v1 (account-based) endpoints section with auth notes. toast() for copy feedback.`,
  },
  {
    key: 'services',
    files: 'src/services/api.ts, src/services/chemistry.ts, src/services/science.ts, src/services/scienceCatalog.ts, src/services/session.ts, src/services/diagnostics.ts, src/components/Seo.tsx, web-app/scripts/*.mjs (write-coverage, write-schema, write-sitemap, finalize-static)',
    urls: 'none required (non-visual), but spot-check http://127.0.0.1:5173/ still loads',
    tests: 'tests/seo-static.test.mjs, tests/product-nav.test.mjs, tests/ui-lib.test.mjs (all must pass; update seo-static only if you change the theme-color: set Seo.tsx and index.html theme-color consistently to #080b09)',
    extra: `- BEHAVIOUR-PRESERVING readability cleanup only: keep every exported name, signature, return shape, request URL, header, timeout, retry rule, localStorage key and event name exactly (pages import them concurrently). Split long functions into named helpers, descriptive names, English JSDoc on every export, remove dead code. session.ts may delegate to lib/storage.ts helpers (keep its exports).
- Scripts: write-sitemap.mjs and deploy/scripts parse 'const rawElements = "' from src/services/elementData.ts — keep that parsing working (elementData.ts itself is owned by the periodic agent; do not edit it).
- After your cleanup run: npm run build must still succeed only if other agents' files compile — instead verify with: node scripts/write-coverage.mjs && node scripts/write-sitemap.mjs && node scripts/write-schema.mjs (outputs unchanged vs git: git diff --stat on src/data and public/ should be empty or explained).`,
  },
  {
    key: 'system-guide',
    files: 'src/pages/SystemGuide.tsx (replace placeholder; + new src/components/system-guide/*), new web-app/scripts/write-guide.mjs, web-app/package.json (you are the ONLY agent allowed to edit it: add write-guide to predev, build and pretest), src/App.tsx (ONLY the /kilavuz route lines: add /kilavuz/:slug), web-app/Dockerfile and science-service/Dockerfile (copy docs/kilavuz into the build stage so write-guide works in Docker), new docs/kilavuz/README.md',
    urls: 'http://127.0.0.1:5173/kilavuz , /kilavuz/order , /kilavuz/gateway , /kilavuz/altyapi',
    tests: 'add tests/system-guide.test.mjs (parser: headings, tables, escaped pipes, every docs/kilavuz/*.md parses, every service has summary + code map)',
    extra: `Build the in-app "Sistem kılavuzu" so the owner can browse what every application and every function does.
- docs/kilavuz/*.md (12 service pages already exist, all using one template: H1 title, > summary, facts table, ## sections "Ne işe yarar?", "Uç noktalar", "Mesajlar", "Komutlar", "Kod haritası" with ### \`file\` + one-line purpose + | Fonksiyon | Ne yapar | tables, "Yapılandırma", "Testler"). Read several to learn the shape.
- First write docs/kilavuz/README.md (Turkish): "ElementAPI sistem kılavuzu" overview — what the product is, the architecture (a mermaid flowchart of web → gateway → services → postgres/redis/rabbitmq), the order saga step by step, how to run locally (present-platform.ps1, ports table), how to test, and an index table linking every service page (| Bölüm | Ne işe yarar |). Also leave a row for "web-app" (Arayüz) pointing to web-app.md which another agent writes later — the parser must not fail if it is missing.
- scripts/write-guide.mjs: parse every docs/kilavuz/*.md into src/data/guide.json: [{slug, title, summary, facts:[{key,value}], sections:[{heading, blocks:[{type:'paragraph'|'table'|'code'|'list'|'file', ...}]}]}] keeping inline code/bold/links as a tiny inline token list (no markdown dependency; small hand-written parser, well commented). Mermaid code blocks are kept as code. Add it to predev/build/pretest scripts in package.json. Commit-free: generated JSON is fine to keep in src/data like coverage.json.
- /kilavuz page: docs layout — left sidebar grouped (Genel bakış; Kapı ve ortak: gateway, shared-lib; Bilim: science, catalog, compound; Hesap: identity; Ticaret demosu: order, wallet, inventory, shipment, notification; Altyapı: altyapi; Arayüz: web-app if present), a global SearchField that searches across every function name and description and jumps to it, the selected page rendered with PageHeader (title, summary), facts as KeyValue, sections with proper typography, tables as styled Table (method badges for GET/POST/PUT/DELETE), code map files as Disclosure per file with a count badge, deep links /kilavuz/:slug#file-anchor. Mobile: sidebar becomes a Sheet or select.`,
  },
]

phase('Pages')
const results = await parallel(SCOPES.map((s) => () =>
  agent(
    `${COMMON}\n\nSCOPE: ${s.key}\nFiles you own: ${s.files}\nURLs to screenshot: ${s.urls}\nTests you own: ${s.tests}\n${TEST_RULE}\n\nSPECIFIC DIRECTION:\n${s.extra}`,
    { label: `page:${s.key}`, phase: 'Pages', schema: SCHEMA },
  )))
return results
