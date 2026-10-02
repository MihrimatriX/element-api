export const meta = {
  name: 'element-web-review-and-guide',
  description: 'Adversarial review of the redesigned web-app (find → verify → fix) plus the web-app guide page',
  phases: [
    { title: 'Find', detail: '4 lenses over web-app/src' },
    { title: 'Verify', detail: 'skeptic per finding, default refute' },
    { title: 'Fix', detail: 'disjoint file groups' },
    { title: 'Guide', detail: 'docs/kilavuz/web-app.md in parts' },
  ],
}

const ROOT = 'C:/Users/AFU/Desktop/DEV/element-api'
const SP = 'C:/Users/AFU/AppData/Local/Temp/claude/C--Users-AFU-Desktop-DEV-element-api/376d2695-5235-408c-976f-39ab14ee6526/scratchpad'

const FINDINGS = {
  type: 'object',
  properties: {
    findings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          file: { type: 'string', description: 'path relative to web-app/, e.g. src/pages/Shop.tsx' },
          line: { type: 'number' },
          severity: { type: 'string', enum: ['high', 'medium', 'low'] },
          title: { type: 'string' },
          detail: { type: 'string', description: 'concrete failure scenario: input/state -> wrong result' },
          fix: { type: 'string' },
        },
        required: ['file', 'severity', 'title', 'detail', 'fix'],
      },
    },
  },
  required: ['findings'],
}
const VERDICT = {
  type: 'object',
  properties: { isReal: { type: 'boolean' }, severity: { type: 'string', enum: ['high', 'medium', 'low'] }, reason: { type: 'string' } },
  required: ['isReal', 'severity', 'reason'],
}
const FIXED = {
  type: 'object',
  properties: {
    fixed: { type: 'array', items: { type: 'string' } },
    skipped: { type: 'array', items: { type: 'string' } },
    verify: { type: 'array', items: { type: 'object', properties: { command: { type: 'string' }, passed: { type: 'boolean' }, detail: { type: 'string' } }, required: ['command', 'passed', 'detail'] } },
  },
  required: ['fixed', 'skipped', 'verify'],
}

const CONTEXT = `
Repository ${ROOT}, branch "redesign". The React app in web-app/ (Vite, React 19, TS strict, Tailwind v4 tokens, Radix) was just redesigned from scratch.
Pre-redesign code: commit 7fbaa70 (use \`git show 7fbaa70:web-app/<path>\` to read old versions). Current: HEAD.
Design spec: ${SP}/DESIGN-SPEC.md. Feature inventory of the old app: ${SP}/web-inventory.json. Component docs: ${ROOT}/docs/memory-bank/design-system.md.
A Vite dev server runs at http://127.0.0.1:5173 and the full backend platform runs (gateway http://localhost:5000). Screenshot helper: from web-app/, node .shots.mjs <outdir> <width> <url[@scrollY]> ... then Read the PNGs.
`

const LENSES = [
  { key: 'correctness', prompt: 'CORRECTNESS: runtime bugs and regressions. Broken flows, wrong state updates, effects with missing deps or leaks, race conditions in async code, stale closures, wrong API usage (compare request paths/shapes with src/services/api.ts and the backend guides in docs/kilavuz/*.md), broken links/routes/query params, behaviour that silently differs from the old version at 7fbaa70 without reason. Exercise suspicious flows in the running app when useful.' },
  { key: 'parity', prompt: 'FEATURE PARITY: walk the inventory (web-inventory.json) page by page and check each listed feature, state, analytics track() call, SEO prop/noIndex, localStorage key, query param and test contract still exists and works in the new code. Report only things that were LOST or BROKEN without a stated reason (a deliberate, documented improvement is not a finding).' },
  { key: 'a11y-ux', prompt: 'ACCESSIBILITY & UX: semantics (one h1, heading order, landmarks), accessible names for icon buttons/inputs, focus visibility and order, keyboard paths for pointer interactions (lab drag, periodic table, dialogs), aria-live for async status, contrast rule violations (text-brand used as text, text-ink-4 for information), horizontal page overflow at 390px, missing loading/empty/error states. Use the screenshot helper at 390 and 1440 on the main routes.' },
  { key: 'code-quality', prompt: 'CODE QUALITY per spec §7 (the owner explicitly asked that every line be clean and understandable): files over ~300 lines that should be split, `any`, eslint-disable without reason, inline style other than CSS custom properties, raw hex/rgb colours outside src/styles.css, dead/unused code and exports (verify with grep), duplicated logic that an existing helper already covers (lib/*, hooks/*, components/ui/*), unclear names, nested ternaries deeper than one level, missing English JSDoc on exported components/functions, components doing several unrelated jobs.' },
]

const fileGroupKey = (file) => {
  const parts = file.replace(/^web-app\//, '').split('/')
  if (parts[0] === 'src' && parts[1] === 'components' && parts.length > 3) return parts.slice(0, 3).join('/')
  if (parts[0] === 'src' && parts[1] === 'components' && parts[2] === 'ui') return 'src/components/ui'
  return parts.slice(0, 3).join('/')
}

phase('Find')
const verified = await pipeline(
  LENSES,
  (lens) => agent(`${CONTEXT}\nYou are a REVIEWER (read-only: do not edit files). Lens: ${lens.prompt}\nCover all of web-app/src (pages, components incl. feature folders, services, hooks, lib, context). Report concrete, verifiable findings only, each with a failure scenario. Prefer fewer real findings over many speculative ones. Max 25 findings, most severe first.`,
    { label: `find:${lens.key}`, phase: 'Find', schema: FINDINGS }),
  (found, lens) => parallel((found?.findings ?? []).map((f) => () =>
    agent(`${CONTEXT}\nAdversarially VERIFY this ${lens.key} finding in web-app (read the code; reproduce in the running app or with a quick node check when possible). Try hard to REFUTE it. If uncertain, isReal=false.\nFinding: ${JSON.stringify(f)}`,
      { label: `verify:${lens.key}:${f.file.split('/').pop()}`, phase: 'Verify', schema: VERDICT })
      .then((v) => (v && v.isReal ? { ...f, severity: v.severity, lens: lens.key, verdict: v.reason } : null)))),
)
const confirmed = verified.flat().filter(Boolean)
log(`${confirmed.length} confirmed findings`)

// Group confirmed findings by file area so fix agents never edit the same file.
const groups = {}
for (const f of confirmed) (groups[fileGroupKey(f.file)] ??= []).push(f)
const bins = [[], [], [], [], [], []]
for (const [key, items] of Object.entries(groups).sort((a, b) => b[1].length - a[1].length)) {
  bins.sort((a, b) => a.reduce((n, g) => n + g.items.length, 0) - b.reduce((n, g) => n + g.items.length, 0))
  bins[0].push({ key, items })
}

phase('Fix')
const fixPromise = parallel(bins.filter((b) => b.length).map((bin, index) => () =>
  agent(`${CONTEXT}\nFIX these confirmed review findings. You own ONLY these file areas: ${bin.map((g) => g.key).join(', ')} (other agents fix other areas concurrently — do not edit files outside them; if a fix truly needs another area, skip it and say why).\nFindings:\n${JSON.stringify(bin.flatMap((g) => g.items), null, 2)}\nKeep the design spec and code-quality rules. After fixing: from web-app/ run npx tsc -p tsconfig.app.json --noEmit, npx eslint <your files>, node --experimental-strip-types --test tests/*.test.mjs (report failures caused by your files; ignore ones in areas owned by others mid-edit), and re-screenshot affected pages. Do not commit.`,
    { label: `fix:${index + 1}`, phase: 'Fix', schema: FIXED })))

phase('Guide')
const GUIDE_PARTS = [
  { key: 'intro', scope: 'Write the HEAD of the page: "# Arayüz (web-app)", the > summary line, the facts table (Teknoloji, Port, Klasör, Veri, Mesajlaşma), "## Ne işe yarar?" (what the web app is, how routing/providers/shell/design system fit together, data sources: science v2 API with static fallback, gateway v1 for accounts/commerce, localStorage learning), "## Rotalar" as a table | Yol | Sayfa | Ne yapar | listing EVERY route from src/App.tsx (incl. redirects, accounts-only guards, dev-only /_ui), "## Tasarım sistemi" (short: tokens in src/styles.css, ui building blocks, rules; link docs/memory-bank/design-system.md), and at the very end "## Yapılandırma" (VITE_* env vars the code reads, with defaults) and "## Testler" (unit tests in tests/*.test.mjs grouped by topic with what they check, Playwright e2e specs and configs, exact commands).' },
  { key: 'pages', scope: '"## Kod haritası — sayfalar ve uygulama" covering: src/main.tsx, src/App.tsx, src/config.ts, src/productNav.ts, src/context/*, src/hooks/*, src/lib/*, src/services/*, src/pages/** (every page and src/pages/ui-gallery/*), src/components/*.tsx at the top level (ProductShell, Seo, ErrorBoundary, CaptchaWidget, AtlasVisual, GeometryFigure, CompoundCard, LabModes, PeriodicExplorer, ScientificDetail, CommerceLayout, RouteFallback), src/components/shell/*.' },
  { key: 'components', scope: '"## Kod haritası — bileşenler" covering every file in src/components/ui/* and every feature folder: src/components/{landing,periodic,detail,reference,lab,notebook,auth,commerce,developer,system-guide}/*, plus web-app/scripts/*.mjs.' },
]
const guidePromise = parallel(GUIDE_PARTS.map((part) => () =>
  agent(`Write PART "${part.key}" of the Turkish guide page docs/kilavuz/web-app.md for the redesigned React app in ${ROOT}/web-app (it documents for the owner what every page, component, hook and function does).
Read docs/kilavuz/README.md and two existing pages (e.g. docs/kilavuz/order.md, docs/kilavuz/gateway.md) to copy the exact template and tone, and web-app/scripts/write-guide.mjs to learn what the parser accepts (it is strict: no text before the first ##, no #### headings, close every code fence, single-line table cells with \\| escaped).
Your scope: ${part.scope}
For "Kod haritası" parts use exactly: "### \`web-app/<path>\`" + one Turkish sentence on the file's purpose + a table "| Fonksiyon | Ne yapar |" listing EVERY function/component/hook/exported constant-with-logic in that file (including private helpers) with signature-style names like \`useBench(initial)\` and one Turkish sentence each. Data-only files: one line instead of a table. Read every file fully; do not guess.
Write your part to ${SP}/guide-parts/web-app.${part.key}.md (create the folder) — NOT into docs/. Do not edit any other file. Return the path and the number of files documented.`,
    { label: `guide:${part.key}`, phase: 'Guide' })))

const [fixes, guide] = await Promise.all([fixPromise, guidePromise])
return { confirmed, fixes, guide }
