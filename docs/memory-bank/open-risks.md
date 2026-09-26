# Açık işler ve sınırlar — 26 Eylül 2026

Kaynak gerçek: kök README **[Eksikler…](../../README.md#eksikler-ve-yapmak-istediklerimiz)** + [TODO.md](../../TODO.md).

## Yayın — operatör kalan (YELLOW)

- **DNS + TLS:** `elements-api.ahmetfuzunkaya.com` hâlâ **NXDOMAIN**. Apex Hostinger (`145.14.158.207`, NS dns-parking). A kaydı hPanel’de; deploy host IP seçilmeli (apex shared hosting ≠ bu stack). Probe: `deploy/scripts/probe-dns.ps1`. Runbook: [ops/DNS-TLS.md](../ops/DNS-TLS.md).
- **Jenkins Multibranch:** Local controller unlocked + wizard done (`:8085`, admin in `docker/.jenkins-local-admin.txt`). Job `element-api` seeded; scan OK but **0 branches** until `Jenkinsfile` is on remote `main` (currently local-only / 404 on GitHub). Still need credential id `github-element-api` (PAT) to avoid anonymous API rate-limit sleeps, plus agent toolchain (Node/.NET/JDK/pwsh) for green builds. [CI-JENKINS.md](../CI-JENKINS.md).
- **Sırlar:** `docker/.env.public.prod` yerelde üretildi (gitignore; JWT/INTERNAL/DB/Rabbit güçlü). SMTP boş (e-postasız beta). Turnstile boş — CF widget anahtarları kullanıcıda. Server şablonu: `fill-public-prod-env.ps1 -ServerTemplate`.
- **Auth XSS residual:** JWT/API key hâlâ `localStorage` — runbook + cookie backlog 2026-12-31.
- **History demo password:** eski `register_payload.json` commit’leri; dosya silindi. Gerçek host’ta kullanıldıysa rotate.

## Bilinçli sınırlar (düzeltme değil)

- **Observability:** `/metrics` `/health-ui` 404 — ADR 0001. Correlation: `X-Request-Id`.
- **Java wallet/inventory:** kalır — ADR 0002. Notification durable retry → **P3**.
- **Fotoğraf:** 75/118; kötü lisansla doldurma yok.
- **v2 açık:** RL + isteğe CF proxy.
- **Playwright:** `e2e/` dolu (atlas-lab + auth smoke); canlı sipariş `e2e-live` stack ister.

## Çalışma ağacı

Uncommitted operator leftover track; kullanıcı istemeden commit/push yok.
