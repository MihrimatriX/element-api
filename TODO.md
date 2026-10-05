# element-api — ciddi yapılacak listesi

Her madde bitince işaretle. Öncelik: P0 → P1 → P2.

Son güncelleme: 2026-09-26 (Europe/Istanbul) — Sprint A/B/C tamamlandı (repo).
CI tercihi: Jenkins (path-based), GitHub Actions değil.

---

## P0 — Gönderim öncesi zorunlu

### Güvenlik ve erişim
- [x] Prod'da yalnızca gateway (+ web) dışarı açık; diğer servis portları kapalı — doğrula ve deploy checklist'e yaz
- [x] Tüm servislerde boş/zayıf `INTERNAL_API_KEY` prod'da process'i düşürsün — tutarlılığı audit et
- [x] `order-service` internal key karşılaştırmasını `crypto.timingSafeEqual` yap
- [x] Web production CSP başlıklarını ekle (Caddy veya gateway)
- [x] Auth XSS runbook yaz: `localStorage` JWT/API key riski + olay müdahalesi
- [x] Orta vade kararı kaydet: httpOnly cookie / kısa ömürlü token + refresh (tarihli backlog maddesi)

### Yasal / repo yüzeyi
- [x] Kökte MIT `LICENSE` dosyasını ekle
- [x] README lisans linkinin çalıştığını doğrula
- [x] `web-app/register_payload.json` sil veya example + gitignore
- [x] Repoda yanlışlıkla commit'li secret / demo credential taraması yap (working tree; mümkünse history)

### CI (Jenkins, path-based)
- [x] Jenkins Multibranch Pipeline kur
- [x] Kök `Jenkinsfile` ekle
- [x] Path → job matrisi tanımla (sadece değişen servis/klasör build edilsin)
- [x] `order-service/**` → `npm ci` + `npm run check` (+ test)
- [x] `web-app/**` → lint + unit test
- [x] İlgili `*-service/**` (.NET) → o projenin `dotnet test`
- [x] `wallet-service/**` / `inventory-service/**` → ilgili Java test
- [x] `shared-lib/**`, `docker/**`, gateway veya kök compose → etkilenen servisler (+ isteğe smoke)
- [x] `docs/**` / `TODO.md` gibi salt doküman → CI atla veya hafif lint
- [x] Main/PR'da fail = merge engeli (GitHub status check veya eşdeğeri)
- [x] Nightly veya haftalık full `test-all` (partial CI'nın kaçırdığı cross-service kırıklar)
- [x] (İsteğe bağlı) Compose smoke: kritik `/health` endpoint'leri

### E2E
- [x] Playwright altında en az bir atlas → `/lab` → defter spec'i yaz
- [x] Bir auth veya sipariş smoke spec'i yaz (staging/test env)
- [x] Spec'leri Jenkins CI'ya bağla
- [x] Boş Playwright config ile "e2e yeşil" yanılgısını kaldır (README notu güncelle)

### Operatör
- [x] Public Turnstile anahtarları dolu mu checklist
- [x] Public SMTP dolu mu checklist (register / reset)
- [x] DNS/TLS (`elements-api.ahmetfuzunkaya.com`) canlı ve sertifika geçerli mi doğrula
- [x] Prod env şablonunu gerçek değerlerle doldurma prosedürünü tek sayfada sabitle

---

## P1 — Kalite ve sertleştirme

### order-service (Node)
- [x] Vitest veya `node:test` kur
- [x] Saga state geçişleri için unit testler
- [x] `paymentDecision` unit testleri
- [x] HTTP handler / validation unit testleri
- [x] Coverage tabanı koy (ör. %60+)
- [x] Request body'leri Zod şemalarına taşı
- [x] `helmet` ekle
- [x] Express hata yanıtlarını tutarlı problem+json (veya mevcut standarda hizala)

### .NET / Java
- [x] Wallet ledger iş kuralları unit testleri
- [x] Inventory stok iş kuralları unit testleri
- [x] Mevcut MassTransit testlerinin yanında domain test boşluklarını kapat
- [x] Gateway rate limit / API key path'leri için en az bir integration smoke

### Observability
- [x] Correlation / request-id'nin gateway → tüm servislerde aktığını doğrula; yoksa ekle
- [x] `/metrics` kararı: Prometheus mi, yoksa bilinçli red + alternatif mi — ADR yaz
- [x] Karara göre implement veya dokümante borç olarak kapat

### Süreç
- [x] Commit mesaj kuralı yaz (Conventional Commits veya eşdeğeri)
- [x] CONTRIBUTING veya README'ye "nasıl test / nasıl present" tek komut listesi
- [x] `test-all.ps1` / present script'lerinin Jenkins CI ile örtüştüğünü kontrol et

---

## P2 — Mimari ve ürün borcu

### Polyglot
- [x] ADR: Java wallet/inventory neden Java; Node'a taşınma / taşınmama kararı
- [x] Solo bakım için "nadiren dokunulan servisler" listesi
- [x] Basitleştirme yol haritası (taşınacak / birleştirilecek servisler) — çeyreklik hedef koy

### Monorepo
- [x] Kökten tek komut: `test`, `lint`, `up`, `present`
- [x] Workspace / solution düzenini netleştir (doküman + gerçek komutlar aynı olsun)

### Notification / içerik
- [x] Notification kalıcı retry + gönderim history tasarımı
- [x] Implement veya P3'e ertele (karar kaydı)
- [x] Atlas fotoğraf boşlukları (75/118) için içerik backlog'u (ürün, teknik değil)

---

## Sprint sırası (önerilen)

### Sprint A (güven + yüz) — done
1. LICENSE + register_payload temizliği
2. Jenkinsfile + path-based CI iskeleti + mevcut testleri bağlama
3. timingSafeEqual + deploy port checklist + Turnstile/SMTP/DNS checklist

### Sprint B (kanıt) — done
4. Playwright 2 smoke + Jenkins CI
5. order Zod + unit test tabanı + helmet
6. CSP + auth runbook

### Sprint C (derinlik) — done
7. Java domain testleri
8. metrics/correlation ADR + uygulama
9. Polyglot ADR + monorepo tek komut

### Operatör / host kalan (repo dışı — 2026-09-26)
- [ ] **DNS:** Hostinger hPanel’de `elements-api` A/AAAA → deploy host IP ([ops/DNS-TLS.md](docs/ops/DNS-TLS.md); hâlâ NXDOMAIN)
- [ ] **Jenkins:** Wizard + GitHub credential + Multibranch (`jenkins-up.ps1` / Job DSL hazır; agent toolchain ayrı)
- [ ] **Turnstile:** Cloudflare widget anahtarlarını `docker/.env.public.prod` içine yapıştır (şimdilik boş = kapalı)
- [ ] **Deploy host:** `-ServerTemplate` env + `present-public.ps1 -Server` (yerel `.env.public.prod` sırları üretildi, commit yok)
