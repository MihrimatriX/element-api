# Son çalışma — 26 Eylül 2026 (Jenkins local unlock + Multibranch seed)

Commit yok. Controller `element-jenkins` :8085 wizard API ile tamamlandı; admin → `docker/.jenkins-local-admin.txt` (gitignored). Multibranch `element-api` Job DSL ile seed; scan SUCCESS ama remote `main`’de henüz `Jenkinsfile` yok → branch yok. PAT/`github-element-api` + agent toolchain hâlâ kullanıcıda. Docs: `CI-JENKINS.md` unlock one-liner.

---

# Son çalışma — 26 Eylül 2026 (operator leftovers: DNS/Jenkins/secrets)

Commit yok. Kullanıcı: kalan operatör işlerini bu makineden yapılabildiği kadar bitir.

- **DNS:** Probe NXDOMAIN doğrulandı; apex `145.14.158.207` Hostinger. API anahtarı yok → DNS yazılamadı. Runbook + `deploy/scripts/probe-dns.ps1`.
- **Jenkins:** `docker-compose.jenkins.yml`, `jenkins-up.ps1`, Job DSL Multibranch/nightly, `CI-JENKINS.md` güncellendi. Controller `:8085` (wizard + PAT + agent toolchain kullanıcıda).
- **Secrets:** `fill-public-prod-env.ps1` → gitignored `docker/.env.public.prod` (JWT/INTERNAL/DB/Rabbit 64-hex); SMTP boş; Turnstile placeholder.
- Docs: DNS-TLS, PROD-ENV, DEPLOY-CHECKLIST, TURNSTILE, SMTP, TODO, open-risks.

---

# Son çalışma — 26 Eylül 2026 (TODO verify follow-up, YELLOW→GREEN)

Commit yok. Kullanıcı: lint exit + eslint + Playwright gaps.

- `scripts/lint.ps1`: `$LASTEXITCODE` sonrası `exit` (eslint fail → non-zero; intentional probe OK).
- web eslint: `useCommerce` disable (provider sibling); captcha config → `lib/captcha.ts`; CaptchaWidget ref in effect; highlightJson escape; `useScience` no sync setState-in-effect.
- E2E: chromium install; atlas selector (no bare `button`); auth-smoke accounts-off chrome. **4/4 passed**.
- Doğrulama: `lint.ps1` 0; `npm --prefix web-app run lint` 0; `test:e2e` 4/4; web `npm test` 21/21.

---

# Son çalışma — 26 Eylül 2026 (TODO Sprint A/B/C)

Commit yok. Kullanıcı: `TODO.md` tam checklist (P0→P2), Jenkins path CI, eksiksiz.

- **P0 güvenlik:** public port checklist; INTERNAL_API_KEY audit + wallet `ProductionSecretsGuard`; order `timingSafeEqual`; Caddy production CSP; AUTH-XSS runbook + cookie backlog (2026-12-31).
- **P0 yasal:** MIT `LICENSE`; `register_payload.json` → example + gitignore; secret-scan script + rapor (history’de demo password).
- **P0 CI:** kök `Jenkinsfile` path matrix; `docs/CI-JENKINS.md` Multibranch + merge gate + nightly `test-all`; optional compose smoke script.
- **P0 E2E:** `e2e/atlas-lab-notebook.spec.ts` + `auth-smoke.spec.ts`; Jenkins Playwright stage; README “boş e2e ≠ yeşil”.
- **P0 ops:** Turnstile/SMTP/DNS-TLS/PROD-ENV checklists; DNS probe **NXDOMAIN** kaydı.
- **P1 order:** `node:test`, Zod create-order, helmet, problem+json, sagaTransitions + paymentDecision + validation tests, coverage script %60.
- **P1 Java/.NET:** `LedgerRules` / `StockRules` + tests; gateway `CorrelationIdMiddleware` + tests (RateLimit/ApiKey tests zaten vardı).
- **P1 obs:** ADR 0001 bilinçli `/metrics` red; `X-Request-Id` gateway + order pino genReqId.
- **P2:** ADR 0002 Java stay; rarely-touched; simplification roadmap; notification → P3 defer; root `scripts/{test,lint,up,present}.ps1`; CONTRIBUTING + WORKSPACE.
- Doğrulama: `npm --prefix order-service ci && npm test && npm run check`; `mvn -f wallet-service test`; `mvn -f inventory-service test`; `dotnet test deploy/tests/Element.Gateway.Tests`; `node deploy/scripts/secret-scan.mjs`.

---

# Son çalışma — 26 Eylül 2026 (Demo vitrin framing)

Commit yok. Kullanıcı: `/demo` DEMO/showcase olsun; fırsat buldukça geliştirme notu.

- **Design read:** commerce/demo vitrin; void mineral + cuprite; dürüst “bu bir demo” + kartlı hiyerarşi. Dials: VARIANCE 5 / MOTION 3 / DENSITY 4.
- **Copy:** kicker `DEMO`; panel “Bu sayfa bir vitrin” + mağaza/sepet/kasa DEMO; “Platform hâlâ şekilleniyor; fırsat buldukça geliştirmeye devam edeceğiz.”
- **Layout:** void-page kartlar; `.demo-frame` cuprite şerit; page-scoped CSS; soft motion + reduced-motion. Akış linkleri (/market /shop /docs#simulation) aynı.
- **Dosyalar:** `Demo.tsx`, `product.css` (`.demo-page …`), `tests/demo-vitrin-chrome.test.mjs`, recent-work.
- **Docker proof:** CSS `index-UOu49ld_.css` · kicker DEMO · `.demo-frame` border-left cuprite `#812f26` · body `#0c0f0e` · no `cursor:url`.
- Doğrulama: `npm test` 21/21; `docker compose ... up -d --no-deps --build web-app`. Ctrl+F5: `/demo`.
