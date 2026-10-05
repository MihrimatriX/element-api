# Son çalışma — 2 Ekim 2026 (Mineral arayüzü, okunabilirlik turu, sistem kılavuzu, testler)

Dal `redesign` (çıkış: `main` üzerindeki 1 Ekim kontrol noktası `7fbaa70`). Kullanıcı: her satır temiz ve anlaşılır olsun, üst düzey cila.

- **Backend okunabilirlik turu:** her serviste davranışı değiştirmeyen okunabilirlik düzenlemesi — gateway/shared-lib/science, catalog/compound, wallet/inventory, order, identity, shipment/notification, deploy/altyapı; birleştirme commit’i `b115c63`.
- **Sistem kılavuzu:** `docs/kilavuz/README.md` + servis başına bir sayfa + `altyapi.md` + `web-app.md`; her sayfa aynı kalıpta (özet, özellik tablosu, uçlar, mesajlar, dosya dosya kod haritası, yapılandırma, testler). Uygulamada `/kilavuz` (arama + bölüm bağlantıları). `web-app/scripts/write-guide.mjs` sayfaları `src/data/guide.json` dosyasına çevirir; dosya git’e girmez, `predev` / `build` / `pretest` yeniden üretir; web ve science Dockerfile’ları `docs/kilavuz/` klasörünü kopyalar.
- **Mineral arayüzü:** jetonlar `web-app/src/styles.css`, bileşenler `src/components/ui/`, kabuk `components/shell/`; yalnız koyu tema, tek kuprit vurgu, Bricolage Grotesque + Geist + Geist Mono. Bütün sayfalar yeniden kuruldu; beş eski CSS dosyası (~12 bin satır) ve onları grep’leyen testler silindi. Vitrin `/_ui` (yalnız dev). Kurallar: [design-system.md](design-system.md).
- **Testler:** entegrasyon 18/18 — saga testi inventory işçisini de oynuyor, cüzdan testi Testcontainers ile gerçek wallet-service konteynerine karşı (`727fb72`). Yeni Playwright paketleri: `e2e/` (tablo, kayıt, laboratuvar, kılavuz, hesaplar kapalı ekranlar), `e2e-auth/` (taklit identity API ile kayıt/giriş/çıkış), `e2e-live/` (tam platformda kayıt → Au al → teslim → sat). Birim: Gateway 20, Services 115, web birim testleri yeşil.
- **İnceleme:** çekişmeli kod incelemesinin doğrulanan bulguları uygulandı (`f3f5c7e`). Çapraz alan kalan maddeler ve e2e’nin bulduğu hatalar (kayıt hata mesajı, mobil menünün kendini kapatması, aynı adlı iki mağaza düğmesi) aynı gün ayrı turda ele alındı; bu not yazılırken tur sürüyordu, durum için `git log`.
- **Belgeler:** kök README’ye kılavuz işaretçisi ve test matrisi; servis kılavuzu her kutuyu kendi kılavuz sayfasına bağlar; open-risks güncellendi (`/kilavuz` yerel sırları gösteriyor — sahip kararı).
- Doğrulama: `./deploy/scripts/test-unit.ps1`, `dotnet test deploy/tests/Element.Services.IntegrationTests --filter "Category=Integration"`, `npm --prefix web-app test`, `npm --prefix web-app run test:e2e`, `test:e2e:auth`, `test:e2e:live` (platform `:6241` ayaktayken).

---

# Son çalışma — 26 Eylül 2026 (slogan: Atomdan bileşiğe.)

Commit yok. Kullanıcı: “Hücreden moleküle.” ürün için yanlış ölçek (biyoloji); atom/molekül/bileşik istiyor.

- Tek slogan: **Atomdan bileşiğe.** — Landing h1 + ProductShell footer + `docs/brand` + memory-bank.
- Eski satır geri gelmesin: hücre→molekül biyoloji; ürün periyodik + bileşik + lab.
- Doğrulama: `npm --prefix web-app test` (+ build).

---

# Son çalışma — 26 Eylül 2026 (web-app AI-fluff copy pass)

Commit yok. Kullanıcı: web’de anlamsız/AI duran metinleri bul ve düzelt.

- Landing: “Karıştır. Dene. Gör.” / “Atlası aç.” / “uygulamana hazır” → somut tezgâh + API + sayı dili; hero/ölçüm satırları sadeleşti.
- Demo vitrin evolve cümlesi dürüst sınır; `demo-vitrin-chrome` assert güncellendi.
- Compounds/Collection/Lab/API/auth SEO + empty/CTA: “keşfet/hazır/şimdi dene” klişeleri yerine tablo/tezgâh/defter dili.
- Bilinçli bırakılanlar (o turda): Guide/Glossary/About somut metin; Market/Shop demo uyarıları. Slogan sonradan “Atomdan bileşiğe.” oldu.
- Doğrulama: `npm test` 22/22; `npm run build` yeşil.

---

# Son çalışma — 26 Eylül 2026 (web-app SEO / OpenGraph)

Commit yok. Kullanıcı: production-ready SEO/OG (SPA).

- Zaten vardı: `Seo.tsx`, `index.html` OG/Twitter, `og.png`, `robots.txt` + `write-sitemap.mjs` (347 URL), `finalize-static` / Docker `__SITE_URL__` ↔ `VITE_PUBLIC_SITE_URL` / `PUBLIC_SITE_URL`.
- Eklendi/sıkılaştırıldı: landing Organization+WebSite JSON-LD (static + client); auth/private `noIndex` (login/register/account + mevcut settings/recovery/collection/feedback); 404 + FeatureUnavailable noindex; robots Disallow private paths; theme-color void `#0E1110`; twitter/og image:alt; market/shop/docs clean canonical (query yok); marka “ElementAPI”.
- Test: `tests/seo-static.test.mjs`. Doğrulama: `npm test` 22/22; `npm run build` yeşil.
- Bilinçli sınır: SPA — JS çalıştırmayan crawler’lar derin rota meta’sı yerine `index.html` varsayılanını görür.

---

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
