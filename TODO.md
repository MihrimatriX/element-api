# element-api — ciddi yapılacak listesi

Her madde bitince işaretle. Öncelik sırası P0, P1, P2.

Son güncelleme: 2026-09-26 (Europe/Istanbul). Sprint A/B/C repo tarafında tamamlandı.
CI için Jenkins (path-based) kullanılıyor, GitHub Actions kullanılmıyor.

---

## P0 — Gönderim öncesi zorunlu

### Güvenlik ve erişim
- [x] Prod'da yalnızca gateway (+ web) dışarı açık; diğer servis portları kapalı. Doğrula ve deploy checklist'e yaz
- [x] Tüm servislerde boş/zayıf `INTERNAL_API_KEY` prod'da process'i düşürsün; tutarlılığı audit et
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
- [x] Path'e göre job matrisi tanımla (sadece değişen servis/klasör build edilsin)
- [x] `order-service/**`: `npm ci` + `npm run check` (+ test)
- [x] `web-app/**`: lint + unit test
- [x] İlgili `*-service/**` (.NET): o projenin `dotnet test`
- [x] `wallet-service/**` / `inventory-service/**`: ilgili Java test
- [x] `shared-lib/**`, `docker/**`, gateway veya kök compose: etkilenen servisler (+ isteğe bağlı smoke)
- [x] `docs/**` / `TODO.md` gibi salt doküman: CI atla veya hafif lint
- [x] Main/PR'da fail = merge engeli (GitHub status check veya eşdeğeri)
- [x] Nightly veya haftalık full `test-all` (partial CI'nın kaçırdığı cross-service kırıklar)
- [x] (İsteğe bağlı) Compose smoke: kritik `/health` endpoint'leri

### E2E
- [x] Playwright altında atlas, `/lab` ve defter akışını izleyen en az bir spec yaz
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
- [x] Correlation / request-id'nin gateway'den tüm servislere aktığını doğrula; yoksa ekle
- [x] `/metrics` kararı (Prometheus mu, yoksa bilinçli red + alternatif mi) için ADR yaz
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
- [x] Basitleştirme yol haritası (taşınacak / birleştirilecek servisler); çeyreklik hedef koy

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

---

## Yayın planı (2026-11-14)

Tüm servisler bağımsız gözle incelendi, bulgular kodda doğrulanıp düzeltildi ve Production yığını
yerelde uçtan uca sınandı. Kalan iş koddan değil, sunucudan ibaret.

### Senin yapacakların (sırayla, toplam yaklaşık bir saat)

- [ ] 0. Önce push: değişiklikler `release/go-live-prep` dalında commit'li ama GitHub'a gönderilmedi.
      Dalı `main`'e birleştirip push et; sunucu repoyu GitHub'dan klonlar, push edilmeden 3. adım eski kodu alır.
- [ ] 1. Sunucu al: 4 GB RAM / 2 vCPU, Ubuntu 24.04. Yığın boşta yaklaşık 1,2 GB kullanıyor (ölçüldü);
      8 GB rahat eder. Paylaşımlı hosting olmaz, Docker çalıştıran bir VPS gerekir.
- [ ] 2. DNS: Hostinger hPanel'de `elements-api` için yalnız A kaydı aç (AAAA ekleme, bkz. PUBLIC-HOST.md).
- [ ] 3. Sunucuda: `curl -fsSL https://get.docker.com | sh`, repoyu klonla,
      `./deploy/scripts/server-up.sh elements-api.ahmetfuzunkaya.com`. İlk derleme 20-40 dakika sürer.
- [ ] 4. Üretilen `docker/.env.public.prod` dosyasını güvenli bir yere kopyala (sırların tek kopyası).
- [ ] 5. Doğrula: `node deploy/scripts/test-public.mjs https://elements-api.ahmetfuzunkaya.com --rate-limit`.
- [ ] 6. Yedek: PUBLIC-HOST.md'deki tek satırlık cron'u `/etc/cron.d/element-backup` olarak ekle.
- [ ] 7. Turnstile: Cloudflare'de widget aç, iki anahtarı env dosyasına yaz, `server-up.sh`'ı yeniden çalıştır.
      Bot kayıtlarını ve kredi çiftçiliğini asıl durduran bu.
- [ ] 8. Çalışma süresi izleme: UptimeRobot benzeri ücretsiz bir serviste `GET /api/v2/elements/fe` (HEAD değil).
- [ ] 9. Yayına çıkınca README'nin başına canlı adresi ekle (ekran görüntüleri ve özet eklendi).

### Bu turda yapılanlar

- [x] Yayın yolu: `deploy/scripts/server-up.sh` (PowerShell'siz, sıralı derleme, sağlık bekleme) ve
      `deploy/scripts/test-public.mjs` (yayındaki siteye salt-okunur duman testi).
- [x] Güvenlik: girişten sonra açık yönlendirme (`/.//evil.com`), Production'da örnek dosyadaki
      `replace-with-…` sırlarının kabul edilmesi, belgelerdeki ev IP adresi, Node ve Java bağımlılık
      güncellemeleri (Express zinciri, zod 4, Spring Boot 3.5.16).
- [x] Canlıda görünecek hatalar: Türkçe `İ` ile arama, hep 0 dönen 24 saatlik hacim, 429'da eksik
      `Retry-After`, Swagger'da `localhost` bağlantısı, keşif belgesinde yanlış yere giden `health`,
      arayüzde 10.000 yazıp 1.000 veren hoş geldin kredisi, hiç gönderilmeyen `price.updated` vaadi.
- [x] Dayanıklılık: veritabanı kesintisinde para ve stok mesajlarının `_failed` kuyruğuna park edilmesi,
      bağımsız atlasın proxy arkasında herkesi tek hız sınırı kovasına koyması, Turnstile açıkken ilk
      hatalı denemeden sonra formun kilitlenmesi, ok tuşunu basılı tutunca hız sınırının dolması.
- [x] Kalite kapısı yeniden yeşil: `npm audit` artık yayına giden bağımlılıkları denetliyor.

### Bilinçli olarak sonraya bırakılanlar (yayın engeli değil)

- [x] Fiyat simülasyonu çapasız rastgele yürüyüştü (günde yaklaşık %17 sapma). Artık her tik tohum
      fiyatına doğru küçük bir çekim ekliyor; çapa `HasData` tohumlarından okunuyor, yeni sütun ya da
      migration yok. Çekim gücü `PriceSimulator.ReversionPerTick` (0 yaparsan eski davranış).
- [x] Stok artık kendiliğinden yenileniyor: inventory her pazartesi 04:00'te (UTC) eksilen elementleri
      başlangıç düzeyine tamamlar (`STOCK_RESTOCK_CRON`, `-` kapatır). Host cron'una gerek kalmadı; bot
      kaydına karşı asıl fren yine Turnstile.
- [x] v1 hata gövdeleri tek biçimde: her yerde `application/problem+json`, camelCase. İstemcileri etkileyen
      bir sözleşme değişikliği olduğu için API-CHANGELOG'da kırıcı olarak duyuruldu.
- [x] v1 araması da Türkçe karakterleri katlıyor (`bakir` → `Bakır`, `iyot` → `İyot`); v2 ile aynı kural.
- [x] Her servis Postgres'e kendi rolü ve kendi şifresiyle bağlanıyor; başka servisin veritabanına giremiyor
      (`node deploy/scripts/test-db-roles.mjs`). Süper kullanıcı yalnız ilk kurulum, yedek ve bakım için.
      Eski bir veri volume'unda bu roller yoktur; `down -v` ile boş volume'dan başlat.
- [ ] Servisler arası çağrılar hâlâ tek ortak iç anahtarla (`INTERNAL_API_KEY`) korunuyor (savunma derinliği).
- [x] Spring Boot 4.1.2'ye geçildi (Jackson 3, Testcontainers 2; cüzdan ve stok testleri 32 + 32 yeşil).
      Geçişte sessiz bir tuzak vardı: `retry.max-attempts` hata vermeden yok sayılıyor, yeniden deneme sayısı
      varsayılana düşüyordu. Yeni adı `max-retries`; `ListenerRetryConfigTest` bu kaymayı artık yakalıyor.
- [x] Masa satışı yuvarlanmamış birim fiyattan ödüyor (fazla ödeme yok) ve isteğe bağlı `Idempotency-Key`
      ile tekrar gönderim ikinci kez satmıyor.
- [x] Sosyal önizleme görseli: 1,5 MB'lık eski `og.png` (eski "ELX / piyasa" kimliği) yerine bugünkü
      açılış sayfasının 93 KB'lık görüntüsü (`web-app/public/og.jpg`). Beğenmezsen aynı adla değiştir.
- [x] README başına ekran görüntüleri, kısa İngilizce özet ve "Mühendislik tarafında neler var" eklendi.
- [x] `.cursor/skills/` (üçüncü taraf ajan talimatları, 28 dosya) artık depoda izlenmiyor; dosyalar diskte
      duruyor, projenin kendi kuralları (`.cursor/rules/`) izlenmeye devam ediyor.
- [x] Actuator kalıyor: incelenince kullanılmayan bir bağımlılık olmadığı görüldü. `/actuator/health` beş
      belgede geçen bir sağlık ucu ve public yığında dışarıya kapalı.
- [ ] İstersen sadeleştir (ürün kararı, senin): `/kilavuz` (1,2 MB) ve üç kopya kimya verisi. İkisi de
      çalışan özelliklerin girdisi; silmek ya da birleştirmek davranışı değiştirir.

### İsteğe bağlı (yayın engeli değil)
- [ ] Jenkins: kurulum sihirbazı, GitHub credential ve Multibranch (`jenkins-up.ps1` / Job DSL hazır; agent toolchain ayrı)
