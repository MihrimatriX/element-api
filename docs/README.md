# Docs — nereye bakayım?

Bu klasör **ikinci bir bellek sistemi değil**. İnsan dili giriş buradan; güncel bağlam `memory-bank/` altında.

---

## İlk duraklar

| Belge | Ne zaman |
|-------|----------|
| [SERVIS-KILAVUZU.md](./SERVIS-KILAVUZU.md) | Hangi kutu ne işe yarar, hangisini açayım |
| [memory-bank/](./memory-bank/README.md) | Ürün özeti, mimari, son işler, riskler, tasarım |
| [LOCAL-PRESENTATION.md](./LOCAL-PRESENTATION.md) | Üç dakikalık sunum |
| [PUBLIC-HOST.md](./PUBLIC-HOST.md) | Domain / Caddy / public compose |
| [DEPLOY-CHECKLIST.md](./DEPLOY-CHECKLIST.md) | Prod port + secret gate |
| [CI-JENKINS.md](./CI-JENKINS.md) | Jenkins Multibranch path CI |
| [CONTRIBUTING.md](../CONTRIBUTING.md) | Commits + test/present commands |
| [WORKSPACE.md](./WORKSPACE.md) | Monorepo layout |
| [adr/](./adr/) | Metrics, Java wallet, simplification |

Operatör script’leri: [deploy/README.md](../deploy/README.md). Env dosyaları: [docker/README.md](../docker/README.md). Her servisin kendi `README.md`’si o kutunun kullanım kılavuzu.

Ops checklists: [ops/PROD-ENV.md](./ops/PROD-ENV.md) · [ops/TURNSTILE.md](./ops/TURNSTILE.md) · [ops/SMTP.md](./ops/SMTP.md) · [ops/DNS-TLS.md](./ops/DNS-TLS.md) · [ops/INTERNAL-API-KEY.md](./ops/INTERNAL-API-KEY.md) · [ops/SECRET-SCAN.md](./ops/SECRET-SCAN.md)

Runbooks: [runbooks/AUTH-XSS.md](./runbooks/AUTH-XSS.md) · [runbooks/AUTH-COOKIE-BACKLOG.md](./runbooks/AUTH-COOKIE-BACKLOG.md)

---

## Ürün ve doğrulama

| Belge | İçerik |
|-------|--------|
| [PRODUCT-SCENARIOS.md](./PRODUCT-SCENARIOS.md) | Sunumda yapılabilen işler ve sınırları |
| [PRODUCT-DELIVERY.md](./PRODUCT-DELIVERY.md) | Teslim / doğrulama kaydı |
| [PRODUCT-ROADMAP.md](./PRODUCT-ROADMAP.md) | Yol haritası |
| [LOCAL-VERIFICATION.md](./LOCAL-VERIFICATION.md) | Yerel doğrulama (hesap, yedek, …) |
| [WHAT-WAS-DONE.md](./WHAT-WAS-DONE.md) | Atlas / lab / infra Türkçe anlatım |

## API ve medya

| Belge | İçerik |
|-------|--------|
| [../deploy/scientific-catalog.md](../deploy/scientific-catalog.md) | Bilimsel v2 sözleşme |
| [API-CHANGELOG.md](./API-CHANGELOG.md) | API değişiklik günlüğü |
| [API-TERMS.md](./API-TERMS.md) | Kullanım şartları taslağı |
| [ELEMENT-MEDIA-INVENTORY.md](./ELEMENT-MEDIA-INVENTORY.md) | Element fotoğraf envanteri |

---

## Memory bank (kısa)

Skim hepsi; işine uyanı derin oku:

- `project-overview.md` — ürün
- `architecture.md` — portlar, profiller
- `recent-work.md` — son değişiklik
- `local-dev.md` — komutlar
- `decisions.md` / `open-risks.md` — kilit kararlar ve riskler
- `design-system.md` — kabuk / tema

Paralel “ikinci canvas / skill bank” uydurma; burayı güncelle.

[← Ana README](../README.md)
