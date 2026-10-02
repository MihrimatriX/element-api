export const meta = {
  name: 'element-final-fixes',
  description: 'Apply leftover review/e2e/QA fixes in disjoint areas, then cross-cutting consolidation and full verification; refresh docs',
  phases: [
    { title: 'Areas', detail: 'A core · B atlas/lab · C commerce/auth/dev · D docs' },
    { title: 'Cross-cutting', detail: 'one agent: consolidations + full verification' },
  ],
}

const ROOT = 'C:/Users/AFU/Desktop/DEV/element-api'
const SP = 'C:/Users/AFU/AppData/Local/Temp/claude/C--Users-AFU-Desktop-DEV-element-api/376d2695-5235-408c-976f-39ab14ee6526/scratchpad'

const COMMON = `
Repository ${ROOT}, branch "redesign" (latest commit f3f5c7e). The React app in web-app/ was redesigned on the "Mineral" design system
(spec: ${SP}/DESIGN-SPEC.md; components: docs/memory-bank/design-system.md). The owner's requirement: every line clean and understandable, top-tier polish.
The leftover fix list is ${SP}/LEFTOVERS.md (items from a verified adversarial review whose fix agents skipped cross-area parts, bugs found by the e2e agent, and orchestrator QA). Read it fully.
Rules: edit ONLY the files you own (listed below). Other agents work concurrently on other files. If an item needs a file you do not own, do not edit it — list it in "deferred" with the exact change needed. No new dependencies. English JSDoc on exports, Turkish UI copy. Do not commit or run git commands that change state.
Verification you must run from web-app/: npx tsc -p tsconfig.app.json --noEmit (your files clean), npx eslint <your files>, node --experimental-strip-types --test tests/*.test.mjs. For visual changes use: node .shots.mjs ${SP}/shots/final-<area> <1440|390> <url[@y]> (dev server http://127.0.0.1:5173 is running, accounts on, backend platform up) and Read the PNGs.
`
const RESULT = {
  type: 'object',
  properties: {
    done: { type: 'array', items: { type: 'string' } },
    deferred: { type: 'array', items: { type: 'string' } },
    verify: { type: 'array', items: { type: 'object', properties: { command: { type: 'string' }, passed: { type: 'boolean' }, detail: { type: 'string' } }, required: ['command', 'passed', 'detail'] } },
  },
  required: ['done', 'deferred', 'verify'],
}

const AREAS = [
  { key: 'A-core', own: 'web-app/src/App.tsx, main.tsx, styles.css, productNav.ts, config.ts, src/components/ui/*, src/components/shell/*, src/components/{ErrorBoundary,Seo,RouteFallback,CommerceLayout}.tsx, src/context/*, src/lib/*, src/hooks/*, src/services/{api,session,diagnostics,apiDocs}.ts, src/components/commerce/ApiKeysPanel.tsx (only for the DASHBOARD_KEY_DESCRIPTION/credential constant item), docs/memory-bank/design-system.md, tests/{product-nav,ui-lib,captcha-config,seo-static,safe-return-to}.test.mjs, web-app/e2e-auth/*',
    items: 'B1 (apiError + Turkish Identity error mapping + tighten e2e-auth register test), B2 (MobileNav self-closing), error boundary per route in App.tsx and role=alert placement, html scroll-padding-top in styles.css for focus-not-obscured under the sticky header, ElementTile atomic number contrast (use ink-2 or a darker tint so it passes 4.5:1) and the `pressed` prop semantics, export SESSION_EVENT (or an onSessionChange helper) from session.ts and use it in context/selection.tsx, dead exports in your files (productNav isCommerceDemoPath/isPrimaryProductPath + their tests only if truly unused outside tests — if the shell or tests are the only users, delete both function and test assertions; authService.logout; session readStorage re-export; api.ts addToCart/MAX_CART_LINES if unused), DASHBOARD_KEY_DESCRIPTION export + use in ApiKeysPanel, missing JSDoc in your files, the design-system.md Card/Separator line, dropdown-menu navigation focus/scroll gap in shell (DesktopNav/AccountMenu) together with RouteFocus in App.tsx.' },
  { key: 'B-atlas-lab', own: 'src/components/{periodic,detail,reference,lab,landing,notebook}/*, src/components/{AtlasVisual,GeometryFigure,WorkshopMarks,ScientificDetail,CompoundCard,LabModes,PeriodicExplorer}.tsx, src/pages/{Landing,About,Compounds,Glossary,Guide,DataCoverage,Laboratory,LabFormula,LabDetective,Collection,Feedback}.tsx, src/services/{science,scienceCatalog,elementData,chemistry,lab,games,lessons,useLearning}.ts, tests for those areas (periodic-swatches, museum-preview-dialog, compounds-grid, guide-cards, product-chrome, lab-*, record-detail, notebook-backup, element-photos, about-page, product-landing-css)',
    items: 'C1 (periodic "–" placeholders + family tint), C2 for eyebrows inside your files, Bohr shell diagram / figure duplication (make periodic/ElementVisual + ShellDiagram reuse AtlasVisual or one shared component), WorkshopMarks import paths in DataCoverage/Glossary/Guide, ScientificDetail 404 detection: expose an HTTP status/notFound flag from services/science.ts instead of comparing UI text, drawingFocus duplicate pixel-scan modules (merge into one), Laboratory "Temizle" button disabling itself while focused + visible focus style on the bench section, LabFormula "Kontrol et" focus loss (move focus to the result/"Sonraki"), ExplorerTile label matching both actions, single-letter names in lab.ts/elementInfo.ts/ElementPalette/DiscoveryNotebook/Laboratory, lenses.ts phase labels duplication if solvable without breaking the node test runner, add a unit test for periodic model tabStopSymbol, centralize familyOf/family colour in services/elementData.ts and use it from detail/record.ts, periodic/model.ts, lab/elementInfo.ts (leave commerce for the cross-cutting step), ElementTile callers in your area that are real toggles must pass `pressed`, dead export lab.mixOutcome and others listed for your files.' },
  { key: 'C-commerce-auth-dev', own: 'src/pages/{Market,Shop,Account,Demo,Login,Register,Recovery,Settings,Developers,ApiDocs,SystemGuide}.tsx, src/components/{commerce,auth,developer,system-guide}/* (except commerce/ApiKeysPanel.tsx), tests/{commerce-model,docs-auth-chrome,demo-vitrin-chrome,system-guide}.test.mjs',
    items: 'B3 (duplicate accessible name on SKU add buttons), C2 for eyebrows in your files (market ticket "SEÇİLİ ELEMENT · AU" must keep the symbol as "Au"), Market must read the product slug passed from Account "Sat" (location.state or a query param) so the sell form preselects the right holding — and make the default draft slug match real slugs, useApiRequest.ts AbortSignal.any replacement (same controller+setTimeout+abort-listener pattern accountApi.ts now uses; share one helper if both are in your area), Register.tsx swallowing the auto-login error, ElementPicker must pass `pressed` to ElementTile, stale JSDoc of GuideBrowser in SystemGuide.tsx, any other skipped item whose files you own.' },
  { key: 'D-docs', own: 'README.md (root), CONTRIBUTING.md, docs/README.md, docs/SERVIS-KILAVUZU.md, docs/WHAT-WAS-DONE.md, docs/memory-bank/{project-overview,recent-work,open-risks,architecture,local-dev,decisions}.md, web-app/README.md',
    items: `Not code: bring the documentation in line with the finished state. Facts to reflect (verify each in the repo before writing):
- New front end on the Mineral design system (dark, cuprite accent, Bricolage Grotesque + Geist + Geist Mono); legacy CSS removed; /_ui dev gallery; design rules in docs/memory-bank/design-system.md.
- Backend readability cleanup across every service (behaviour-preserving) and Turkish system guide: docs/kilavuz/README.md + one page per service + web-app.md; browsable in the app at /kilavuz (generated by web-app/scripts/write-guide.mjs into src/data/guide.json, which is git-ignored and regenerated on dev/build/test).
- Tests: unit (dotnet Gateway 20 + Services 115, order-service node tests, Java wallet/inventory via Maven), integration 18 (Testcontainers incl. a real wallet-service container), web unit tests (npm --prefix web-app test), Playwright suites e2e/ (accounts off), e2e-auth/ (mocked identity API), e2e-live/ (full Docker platform at :6241) with their npm scripts; live scripts (test-scientific-api, test-e2e, test-saga, test-smoke, test-platform). Note: Playwright needs \`npx playwright install chromium\` once.
- Root README: keep it accurate and concise; add a clear "Kılavuz" pointer (docs/kilavuz + /kilavuz) and the test matrix; remove claims that are no longer true (e.g. old design notes, "boş e2e" warnings if now obsolete).
- docs/SERVIS-KILAVUZU.md: keep its friendly tour but link each service to its docs/kilavuz page.
- memory-bank: update project-overview (design line), recent-work (add a dated 2 Ekim 2026 entry summarising this redesign + cleanup + guide + tests, branch "redesign"), open-risks (remove fixed items such as the stale integration tests / missing e2e folders; keep real ones: DNS, Jenkins, Turnstile, localStorage JWT, /kilavuz ships local-default secrets documented in altyapi.md — flag it as a decision for the owner).
Turkish, plain and precise, no marketing.` },
]

phase('Areas')
const areaResults = await parallel(AREAS.map((area) => () =>
  agent(`${COMMON}\nAREA ${area.key}. You own: ${area.own}\nYour items: ${area.items}`, { label: `fix:${area.key}`, phase: 'Areas', schema: RESULT })))

const deferred = areaResults.filter(Boolean).flatMap((r, i) => r.deferred.map((d) => `[${AREAS[i].key}] ${d}`))
log(`${deferred.length} deferred items go to the cross-cutting step`)

phase('Cross-cutting')
const cross = await agent(`${COMMON}
You are the FINAL cross-cutting agent; nobody else is editing now, so you may edit any file in web-app/ (and docs if a doc statement became wrong).
1) Apply these deferred items from the area agents:\n${deferred.map((d) => '- ' + d).join('\n') || '- (none)'}
2) Consolidate duplicated HTTP plumbing: services/api.ts request core vs useLearning.ts, hooks/useAuthCapabilities.ts, components/auth/accountApi.ts, developer/useApiRequest.ts — one small, well-documented core (timeout + abort + JSON + ApiHttpError) used by all, without changing request URLs, headers, timeouts or error semantics. Keep it readable; do not over-abstract.
3) familyOf/family colour: commerce and any remaining copies must use the single helper in services/elementData.ts.
4) Run the full verification from web-app/ and fix anything red:
   - npx tsc -b ; npm run lint ; npm test ; npm run build
   - Playwright with the system Chrome (no browser downloads): scratch configs exist: .pw-local.config.ts (e2e/, needs an accounts-off dev server: start npx vite --host 127.0.0.1 --port 5174 --strictPort with env VITE_ACCOUNTS_ENABLED=false and VITE_SCIENCE_API_BASE_URL=http://127.0.0.1:5080/api/v2, run with PLAYWRIGHT_BASE_URL=http://127.0.0.1:5174, then stop it), .pw-local.auth.config.ts (e2e-auth/, starts nothing: run the auth config's Vite on 5174 yourself with VITE_API_BASE_URL=/api/v1 VITE_ACCOUNTS_ENABLED=true, then stop it). Never stop the dev server on 5173. All e2e and e2e-auth tests must pass on desktop and mobile.
   - A final legacy/hex scan: no raw hex/rgb colours in src outside styles.css, no inline style other than CSS custom properties, no eslint-disable without a reason, no console.log outside code samples.
Return done/deferred/verify with exact pass lines.`, { label: 'cross-cutting', phase: 'Cross-cutting', schema: RESULT })

return { areaResults, cross }
