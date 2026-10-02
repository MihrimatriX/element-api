# Altyapı ve operasyon (deploy, docker, scripts)

> Platformu yerelde, üç ortamlı public yığında ve Jenkins'te ayağa kaldıran, durduran, test eden ve bilimsel veri snapshot'larını yenileyen dosya ve script'lerin tamamı.

| Özellik | Değer |
|---|---|
| Teknoloji | PowerShell 7 (pwsh) script'leri, Node.js ESM (`.mjs`) script'leri, Docker Compose, Caddy 2.9, Jenkins (Groovy pipeline), .NET 10 + xUnit + Testcontainers |
| Port | gateway 5000 · identity 5001 · catalog 5002 · order 5003 · shipment 5004 · wallet 5005 · notification 5006 · compound 5007 · inventory 5008 · web 6241 (`WEB_HOST_PORT`) · atlas 5080 · public Dev/Test/Prod 8080/8081/8082 · Jenkins 8085 · Postgres 5432 · Redis 6380 · RabbitMQ 5672/15672 (gateway ve web dışındakiler yalnız 127.0.0.1'e bağlı) |
| Klasör | `deploy/scripts/`, `scripts/`, `docker/`, `deploy/tests/`, kökte `docker-compose*.yml`, `Jenkinsfile`, `deploy/Caddyfile*` |
| Veri | Postgres 16 (tek sunucu, servis başına veritabanı), Redis 7, RabbitMQ 3; Docker volume'ları; script'lerin yazdığı JSON snapshot'lar ve `artifacts/local/` raporları |
| Mesajlaşma | yok (RabbitMQ'yu yalnız ayağa kaldırır) · yalnız entegrasyon testi yayınlar: PaymentProcessedEvent |

## Ne işe yarar?

Bu alan ürünün kendisi değil, ürünü çalıştıran "makine dairesi"dir. `docker-compose.yml` bütün platformu (Postgres, Redis, RabbitMQ, altı .NET servisi, Node sipariş servisi, iki Java servisi ve web uygulaması) tek komutla kurar. `docker-compose.public.yml` aynı yığını Caddy arkasına alır: dışarıya yalnız Caddy açılır, diğer bütün portlar kapanır. `docker-compose.science.yml` ise veritabanı ve broker olmadan sadece bilim atlasını açar.

Günlük kullanım `deploy/scripts/` altındaki PowerShell script'leriyle olur: `present-*.ps1` başlatır, `stop-local.ps1` durdurur (verileri silmez), `test-*.ps1` ve `test-*.mjs` çalışan sistemi kontrol eder. Kökteki `scripts/` klasörü bunların kısa yollarıdır. Jenkins `Jenkinsfile` ile hangi klasörün değiştiğine bakar ve yalnız etkilenen kısımları derler/test eder.

Bilimsel veri (118 element, bileşikler, fotoğraflar) API çalışırken internetten çekilmez. `refresh-*.mjs` script'leri PubChem, RSC, NIST, Wikipedia ve Wikimedia Commons'tan veriyi bir kez indirip depoya JSON olarak yazar; servisler sadece bu dosyaları okur. Böylece canlı sistem dış kaynak kesintisinden etkilenmez.

Bu alan bilinçli olarak iş kuralı içermez: fiyat, sipariş, cüzdan mantığı servislerdedir. Script'ler sırları hiçbir zaman ekrana yazmaz, gerçek sunucu modunda (`-Server`) yer tutucu sırlarla açılmayı reddeder ve hiçbir komut volume silmez (bunu yalnız `down -v` ile sen yaparsın).

Reboot'a dayanıklılık: compose'taki her servis `restart: unless-stopped` ile çalışır, log'ları `json-file` 3×10 MB ile döner, uygulama servisleri `init: true` (tini) ile SIGTERM'i düzgün alır. Docker açılışta `depends_on` sırasını uygulamadığı için uygulama servisleri yalnız altyapının (Postgres, Redis, RabbitMQ) "healthy" olmasını, birbirlerinin ise yalnız "başladı" olmasını bekler; gateway arka servis açılana kadar 502 döner, sonra kendiliğinden bağlanır. `stop-local.ps1` / `docker compose stop` ile durdurulan servis reboot'ta kalkmaz (bilinçli).

Web portu `WEB_HOST_PORT` (varsayılan 6241) ile değişir; compose'taki CORS listesi ve `PUBLIC_WEB_ORIGIN` / `VITE_PUBLIC_SITE_URL` varsayılanları bu değeri izler, `present-platform.ps1` mesajı ile `test-all.ps1` / `test-platform.mjs` varsayılanları 6241'dir. `docker/.env` içindeki iki origin'i portla aynı tut. Yalnız konteynersiz eski yol (`start-local.ps1 -WebOrigin`) ve `Caddyfile.elements-api.example` hâlâ 3000 varsayar.

## Uç noktalar

Bu alanın kendi HTTP uç noktası yoktur. Script'lerin çağırdığı adresler aşağıdaki "Komutlar" ve "Kod haritası" bölümlerinde, ilgili servisin uçları o servisin kılavuzunda anlatılır.

## Mesajlar

| Yön | Olay | Ne zaman | Ne yapar |
|---|---|---|---|
| Yayınlar | StockReservedEvent | Yalnız `SagaFlowIntegrationTests` içinde, sipariş Submitted durumundayken | Testte çalışmayan inventory servisinin yerine geçer; saga StockReserved'a ilerleyebilsin diye MassTransit zarfıyla RabbitMQ'ya yazar |
| Yayınlar | PaymentProcessedEvent | Yalnız `SagaFlowIntegrationTests` içinde, sipariş StockReserved durumundayken | Testte çalışmayan wallet servisinin yerine geçer; satın alma saga'sı Completed'a ilerleyebilsin diye MassTransit zarfıyla RabbitMQ'ya yazar |
| Yayınlar | PaymentRequestedEvent | Yalnız `WalletServiceIntegrationTests` içinde, aynı sipariş için iki kez | Çalışmayan sipariş saga'sının yerine geçer; gerçek wallet servisinin aynı siparişi tek kez borçlandırdığını doğrulamak için |

## Komutlar

| Komut | Ne yapar |
|---|---|
| `./deploy/scripts/present-platform.ps1` | Tam platformu Docker ile derleyip başlatır; `docker/.env` yoksa örnekten oluşturur |
| `./deploy/scripts/present-platform.ps1 -NoBuild` | Aynısı, imajları yeniden derlemeden |
| `./scripts/present.ps1` | `present-platform.ps1` kısa yolu (parametreleri aynen geçirir) |
| `./scripts/up.ps1` | `docker compose --env-file docker/.env up -d --build` kısa yolu |
| `./deploy/scripts/present-local.ps1` | Yalnız bilim atlasını açar: http://127.0.0.1:5080 |
| `./deploy/scripts/present-public.ps1 -Environment Dev` | Caddy arkasında public Dev yığını: http://localhost:8080 (Test 8081, Prod 8082) |
| `./deploy/scripts/present-public.ps1 -All` | Dev, Test ve Prod'u yan yana başlatır |
| `./deploy/scripts/present-public.ps1 -Server` | Gerçek alan adıyla Prod'u 80/443'te açar; ayarlar eksikse durur |
| `./deploy/scripts/stop-local.ps1` | Yerel platformu, public projeleri ve atlası durdurur; veriler kalır |
| `./deploy/scripts/stop-local.ps1 -Public` | Yalnız public projeleri durdurur (`-Environment Prod` ile tek ortam) |
| `docker compose --env-file docker/.env down -v` | Yerel platformu verileriyle birlikte siler (sıfırdan başlamak için) |
| `./deploy/scripts/start-local.ps1` | Eski yol: .NET servislerini ve sipariş servisini konteynersiz, doğrudan makinede başlatır |
| `./deploy/scripts/build-all.ps1` | Bütün .NET projelerini ve test projelerini derler |
| `./deploy/scripts/test-unit.ps1` | .NET birim testlerini çalıştırır (Docker gerekmez) |
| `./scripts/test.ps1` | Tam kalite kapısı (`test-all.ps1 -Configuration Review`); `-Integration`, `-Live`, `-Browser` eklenebilir |
| `./deploy/scripts/test-all.ps1 -Recovery` | Kalite kapısına yedekten geri yükleme provasını da ekler |
| `./scripts/lint.ps1` | Web ESLint + sipariş servisi TypeScript derlemesi |
| `./deploy/scripts/test-smoke.ps1 -WebBase http://localhost:6241` | Çalışan sisteme hızlı duman testi (katalog, yetki, satın alma, satış) |
| `node deploy/scripts/test-e2e.mjs` | Uçtan uca regresyon: idempotent sipariş, saga, holding, eşzamanlı satış |
| `node deploy/scripts/test-platform.mjs` | Her servisin health/info uçları, SPA sayfaları ve gateway üzerinden iki rota |
| `node deploy/scripts/test-scientific-api.mjs` | Açık bilim API'si (v2) sözleşme kontrolü |
| `./deploy/scripts/test-saga.ps1` | Sipariş servisinin saga regresyon kontrolü (yerel Postgres ile) |
| `node deploy/scripts/test-backup-restore.mjs` | Her veritabanını yedekleyip geçici veritabanına geri yükler ve içerik eşitliğini doğrular |
| `node --test deploy/tests/public-env-matrix.test.mjs` | Public ortam şablonlarının port/sır kurallarını kontrol eder |
| `dotnet test deploy/tests/Element.Services.IntegrationTests --filter "Category=Integration"` | Docker'da gerçek Postgres/Redis/RabbitMQ ve Dockerfile'dan derlenen wallet-service konteyneriyle entegrasyon testleri |
| `node deploy/scripts/secret-scan.mjs` | Çalışma ağacında sızmış anahtar/demo şifre arar |
| `./deploy/scripts/fill-public-prod-env.ps1` | `docker/.env.public.prod` dosyasını yeni rastgele sırlarla üretir (`-ServerTemplate` gerçek host için) |
| `./deploy/scripts/probe-dns.ps1` | Alan adının DNS kayıtlarını ve HTTPS cevabını gösterir |
| `./deploy/scripts/jenkins-up.ps1` | Yerel Jenkins'i http://127.0.0.1:8085 adresinde başlatır (`-Down` durdurur) |
| `node deploy/scripts/refresh-scientific-catalog.mjs` | Element ve bileşik bilim snapshot'larını kaynaklardan yeniden üretir |
| `node deploy/scripts/refresh-atlas.mjs` | Editoryal metin, fotoğraf ve linkleri snapshot'lara yeniden uygular (`--fetch` ile indirir) |
| `node deploy/scripts/write-media-inventory.mjs` | `docs/ELEMENT-MEDIA-INVENTORY.md` raporunu yeniden yazar |
| `./deploy/scripts/migrate-all.ps1` | Migration klasörü olmayan servislere ilk EF Core migration'ını ekler |

## Kod haritası

### `deploy/scripts/build-all.ps1`
Depoda `.sln` olmadığı için bütün .NET projelerini tek tek derleyen liste.

| Fonksiyon | Ne yapar |
|---|---|
| `-Configuration` | Parametre: derleme yapılandırması (varsayılan `Release`). |
| (ana akış) | 11 projeyi sırayla `dotnet build` eder; biri hata verirse proje adıyla durur. |

### `deploy/scripts/fill-public-prod-env.ps1`
`docker/.env.public.prod` dosyasını örnekten, sırları yeni üreterek oluşturur; sırları asla ekrana yazmaz.

| Fonksiyon | Ne yapar |
|---|---|
| `-Force` | Parametre: dosya zaten varsa üzerine yazar (yoksa dokunmadan çıkar). |
| `-ServerTemplate` | Parametre: CADDY_SITE, 80/443 ve https origin'lerini gerçek alan adına göre yazar. |
| `-DeployHostIp` | Parametre: dosyanın sonuna beklenen DNS A kaydı IP'sini not olarak ekler. |
| `New-HexSecret(byteCount)` | Kriptografik rastgele bayt üretip küçük harfli hex metne çevirir (32 bayt = 64 karakter). |
| `Get-ReplacementLine(Line, Values)` | Satır verilen anahtarlardan birini atıyorsa `ANAHTAR=yeni değer` döndürür, değilse boş döner. |
| (ana akış) | Örneği satır satır kopyalar, dört sırrı (ve istenirse sunucu ayarlarını) değiştirir, operatöre kalan işleri dipnot olarak ekler. |

### `deploy/scripts/jenkins-compose-smoke.ps1`
Jenkins'te isteğe bağlı (RUN_COMPOSE_SMOKE=1) gateway sağlık kontrolü.

| Fonksiyon | Ne yapar |
|---|---|
| (ana akış) | Gateway `/health` cevap vermiyorsa platformu `-NoBuild` ile başlatır, sonra `/health`, `/health/live`, `/health/ready` uçlarının 200 döndüğünü doğrular. |

### `deploy/scripts/jenkins-up.ps1`
Yerel Jenkins kontrolcüsünü `docker-compose.jenkins.yml` ile başlatır veya durdurur.

| Fonksiyon | Ne yapar |
|---|---|
| `-Down` | Parametre: Jenkins projesini kapatır ve çıkar. |
| `-Detach` | Parametre: geriye uyumluluk için duruyor; Jenkins her zaman arka planda (`-d`) başlar. |
| `-PrintAdminPassword` | Parametre: geriye uyumluluk için duruyor; ilk kurulum şifresi varsa her zaman yazdırılır. |
| (ana akış) | Konteyneri başlatır, `/login` cevap verene kadar (en çok 60 deneme) bekler, ilk yönetici şifresini gösterir. |

### `deploy/scripts/migrate-all.ps1`
Migration klasörü olmayan Identity, Element (catalog) ve Shipment servislerine `InitialCreate` migration'ı ekler; var olanlara dokunmaz.

| Fonksiyon | Ne yapar |
|---|---|
| (ana akış) | Her hedef için migration klasörü yoksa `dotnet ef migrations add InitialCreate` çalıştırır (dotnet-ef aracı gerekir). |

### `deploy/scripts/present-local.ps1`
Yalnız bilim atlasını (`docker-compose.science.yml`) http://127.0.0.1:5080 adresinde açar.

| Fonksiyon | Ne yapar |
|---|---|
| `-NoBuild` | Parametre: imajı yeniden derlemeden başlatır. |
| (ana akış) | `docker compose -f docker-compose.science.yml up -d [--build]` çalıştırır. |

### `deploy/scripts/present-platform.ps1`
Tam yerel platformu `docker/.env` ile başlatır.

| Fonksiyon | Ne yapar |
|---|---|
| `-NoBuild` | Parametre: imajları yeniden derlemeden başlatır. |
| (ana akış) | `docker/.env` yoksa örnekten kopyalar, sonra `docker compose --env-file docker/.env up -d [--build]` çalıştırır ve http://localhost:6241 (API http://localhost:5000) adresini yazdırır. |

### `deploy/scripts/present-public.ps1`
Public tek-host yığınını (compose + public overlay + Caddy) Dev/Test/Prod olarak başlatır.

| Fonksiyon | Ne yapar |
|---|---|
| `-Environment` | Parametre: `Dev`, `Test` veya `Prod` (varsayılan Dev). |
| `-All` | Parametre: üç ortamı yan yana başlatır (8080/8081/8082). |
| `-NoBuild` | Parametre: imajları yeniden derlemez. |
| `-Server` | Parametre: gerçek sunucu modu; yalnız Prod, 80/443 ve gerçek sırlar şart. |
| `Assert-PublicEnvMatrix()` | İki ortamın aynı portu veya aynı compose proje adını kullanmadığını doğrular. |
| `Ensure-EnvFile(EnvFile, Example)` | Ortam dosyası yoksa örneğinden kopyalar. |
| `Read-DotEnv(EnvFile)` | `.env` dosyasındaki ANAHTAR=DEĞER satırlarını sözlüğe çevirir (yorum ve boş satırları atlar). |
| `Assert-ServerProdEnv(EnvFile)` | `-Server` için CADDY_SITE'ın gerçek alan adı, portların 80/443 ve JWT_SECRET/INTERNAL_API_KEY'in en az 32 karakterlik gerçek sır olduğunu kontrol eder. |
| `Start-PublicEnv(Name, EnvFile, Example)` | Bir ortamı `element-<ad>` compose projesi olarak başlatır. |
| (ana akış) | Matrisi kontrol eder, mod seçimine göre bir veya üç ortamı başlatır ve adresleri yazdırır. |

### `deploy/scripts/probe-dns.ps1`
Public alan adının DNS kayıtlarını ve HTTPS başlıklarını gösteren salt-okunur kontrol.

| Fonksiyon | Ne yapar |
|---|---|
| `-Name` / `-Apex` / `-DnsServer` | Parametreler: sorgulanan host, kök alan adı ve kullanılacak DNS sunucusu (varsayılan 8.8.8.8). |
| `Show-Dns(QueryName, RecordType)` | Bir adın (isteğe bağlı kayıt tipiyle) DNS cevabını tablo olarak ekrana basar, çözüldüyse `$true` döner. |
| (ana akış) | Host, kök ve NS kayıtlarını gösterir; host çözülüyorsa `curl -sI` ile HTTPS başlıklarını alır. |

### `deploy/scripts/start-local.ps1`
Eski yöntem: .NET servislerini ve Node sipariş servisini konteyner kullanmadan doğrudan makinede başlatır (altyapı konteynerleri çalışıyor olmalı).

| Fonksiyon | Ne yapar |
|---|---|
| `-NoBuild` | Parametre: derlemeden mevcut çıktıyı başlatır. |
| `-Restart` | Parametre: önce bu projenin çalışan süreçlerini durdurur. |
| `-WebOrigin` | Parametre: servislerin güvendiği web adresi (varsayılan http://localhost:3000). |
| `-Configuration` | Parametre: `Debug`, `Release` (varsayılan) veya `Science`. |
| `Get-Setting(name, fallback)` | `docker/.env` değerini, yoksa varsayılanı döndürür. |
| `Test-PortListening(port)` | Makinede o TCP portu dinleniyor mu söyler. |
| `Find-ProjectProcess(processName, path)` | Komut satırında bu projenin dosya yolu geçen süreçleri bulur (başka projelere dokunmamak için). |
| `Stop-LocalProcess(processName, path, port)` | Bu projenin sürecini durdurur ve port boşalana kadar bekler. |
| `Wait-LocalService(process, port, name)` | Yeni başlayan servis portu dinleyene kadar bekler (en çok 90 sn); süreç ölürse log yolunu söyleyerek durur. |
| `Save-LocalProcesses()` | Başlatılan/benimsenen süreçleri `artifacts/local/processes.json` dosyasına yazar. |
| (ana akış) | `.env` okur, ortak ortam değişkenlerini ayarlar, her servisi sırayla derler/başlatır, en son sipariş servisini `npm run build` + `node dist/index.js` ile açar. |

### `deploy/scripts/stop-local.ps1`
`present-*.ps1` ile açılan Docker yığınlarını durdurur; volume'lar (veriler) korunur.

| Fonksiyon | Ne yapar |
|---|---|
| `-Environment` | Parametre: yalnız o public ortamı durdurur. |
| `-Public` / `-All` | Parametre: yalnız public projeleri (element-dev/test/prod) durdurur. |
| `Stop-PublicProject(Project)` | Bir public compose projesini, env dosyası varsa onunla birlikte durdurur. |
| (ana akış) | Parametre yoksa yerel platformu, kalan public projeleri ve atlası durdurur. |

### `deploy/scripts/test-all.ps1`
Tam kalite kapısı: her zaman çalışan kontroller + isteğe bağlı ağır test grupları.

| Fonksiyon | Ne yapar |
|---|---|
| `-Configuration` | Parametre: .NET yapılandırması (varsayılan `Review`). |
| `-Integration` / `-Live` / `-Browser` / `-Recovery` | Parametreler: Docker entegrasyon testleri, çalışan sisteme karşı canlı testler, Playwright tarayıcı testleri, yedekten geri yükleme provası. |
| `-WebBase` | Parametre: canlı testlerde web adresi (varsayılan http://localhost:6241). |
| `Invoke-Checked(Command, Arguments)` | Harici komutu çalıştırır, sıfır olmayan çıkış kodunda hata fırlatır. |
| (ana akış) | Git'te izlenen bin/obj/.env dosyası olmadığını kontrol eder; web lint/test/build, sipariş build/check, .NET build + birim test, npm audit ve seçilen ek grupları çalıştırır; değiştirdiği ortam değişkenlerini geri yükler. |

### `deploy/scripts/test-saga.ps1`
Sipariş servisinin saga regresyon kontrolünü (`src/saga.integration.check.ts`) yerel Postgres'e karşı çalıştırır.

| Fonksiyon | Ne yapar |
|---|---|
| (ana akış) | `docker/.env`'den veritabanı bilgisini okur, geçici DATABASE_URL ile `npx tsx` çalıştırır, sonra eski DATABASE_URL'i geri koyar. |

### `deploy/scripts/test-smoke.ps1`
Çalışan sisteme karşı duman testi; en sonda başarısız kontrol varsa hata verir.

| Fonksiyon | Ne yapar |
|---|---|
| `-WebBase` / `-ApiBase` | Parametreler: web adresi (varsayılan http://localhost:5173) ve gateway adresi (varsayılan http://localhost:5000). |
| `Write-Pass(Message)` | Yeşil `[OK]` satırı yazar ve başarı sayacını artırır. |
| `Write-Fail(Message)` | Kırmızı `[FAIL]` satırı yazar ve hata sayacını artırır. |
| `Assert-Status(Name, Url, Expected, Headers)` | Adrese GET atar, HTTP kodunun beklenenlerden biri olduğunu kontrol eder. |
| `Wait-OrderStatus(OrderId, ApiKey, TargetStatuses, TimeoutSec)` | Sipariş hedef durumlardan birine gelene kadar 2 sn arayla sorar, son görülen durumu döndürür. |
| `Wait-GoldHolding(ApiKey)` | Saga bittikten sonra Au holding satırı görünene kadar (en çok 30 deneme) bekler. |
| `Test-OrderLifecycle(ApiKey)` | 1 g altın alır, saga'nın tamamlandığını, holding'in geldiğini ve masada 1 g satışın gelir getirdiğini kontrol eder. |
| (ana akış) | Açık katalog uçlarını, yetkisiz erişim reddini, kayıt → giriş → API anahtarı, 10000 Kredi hoş geldin bakiyesini ve sipariş yaşam döngüsünü sırayla dener. |

### `deploy/scripts/test-unit.ps1`
Docker gerektirmeyen .NET birim test projelerini çalıştırır (Integration kategorisi hariç).

| Fonksiyon | Ne yapar |
|---|---|
| `-Configuration` | Parametre: yapılandırma (varsayılan `Debug`). |
| (ana akış) | `artifacts/dotnet` varsa onu DOTNET_ROOT yapar, Gateway ve Services birim testlerini `dotnet test` ile çalıştırır. |

### `deploy/scripts/apply-known-compounds.mjs`
`web-app/src/data/known-compounds.json` içinde olup bileşik snapshot'ında olmayan her bileşik için kompakt bilim kaydı ekler.

| Fonksiyon | Ne yapar |
|---|---|
| `molecularWeight(parts)` | Atom kütleleri tablosundan molekül ağırlığını 3 ondalığa yuvarlar; bilinmeyen sembolde hata verir. |
| `compactRecord(compound)` | Ad, formül, ağırlık ve PubChem linkiyle şema 2.0 kaydı kurar; bilinmeyen alanları null bırakır. |
| (ana akış) | Eksik slug'ları snapshot'a ekler, dosyayı yazar ve kaç kayıt eklendiğini söyler. |

### `deploy/scripts/fix-element-photos.mjs`
Yanıltıcı element fotoğraflarını küratörlü Commons dosyalarıyla değiştirir veya bilerek boşaltır.

| Fonksiyon | Ne yapar |
|---|---|
| `commonsInfo(file)` | Commons'tan dosyanın URL ve lisans bilgisini alır; hız sınırında artan aralıklarla 5 kez dener. |
| `downloadPhoto(symbol, file, caption)` | Açık lisanslı ve izinli MIME türündeki fotoğrafı indirir, manifest kaydını döndürür; uygun değilse hata verir. |
| `removeAtlasFile(photoUrl)` | Eski fotoğraf dosyasını siler (zaten yoksa sorun etmez). |
| `tryDownload(symbol, spec)` | Önce tercih edilen dosyayı, sonra yedekleri dener; ilk başarılıyı döndürür. |
| `main()` | `NULL_OUT` listesindeki fotoğrafları kaldırır, `REPLACE` listesini indirir, iki atlas JSON dosyasını ve `artifacts/local/photo-fix-report.json` raporunu yazar. |

### `deploy/scripts/refresh-atlas.mjs`
Editoryal metin, medya ve dış linklerden oluşan "atlas katmanını" element ve bileşik snapshot'larına uygular; `--fetch` ile önce medyayı indirir.

| Fonksiyon | Ne yapar |
|---|---|
| `--fetch` / `--only=Fe,Au,...` / `--structures-only` | CLI bayrakları: medyayı indir, yalnız verilen sembol/slug'larla sınırla, yalnız eksik yapı görsellerini indir. |
| `today()` | Bugünün tarihini `YYYY-AA-GG` olarak verir. |
| `pause(ms)` | Verilen milisaniye kadar bekler. |
| `emptyManifestEntry()` | Boş manifest kaydı (photo, structure, wikipedia = null) üretir. |
| `cleanMetadataText(value)` | Wikimedia meta verisinden HTML etiketlerini ve `&amp;` kodunu temizler (dışa açık). |
| `imageExtension(mime)` | MIME türünü dosya uzantısına çevirir: png, webp, aksi halde jpg (dışa açık). |
| `writeSnapshot(path, records)` | JSON'u yalnız içerik değiştiyse geçici dosya + yeniden adlandırma ile yazar; Windows kilidine karşı 5 kez dener. |
| `retryDelayMs(response)` | Başarısız HTTP cevabında bekleme süresini hesaplar (429'da Retry-After, en az 10 sn). |
| `fetchWithRetry(url)` | User-Agent ve zaman aşımıyla istek atar, en çok 3 kez dener. |
| `fetchJson(url)` | `fetchWithRetry` cevabını JSON olarak döndürür. |
| `composition(formula)` | `Ca(OH)2` gibi formülü `[{symbol, count}]` listesine çevirir; iç içe parantezi destekler (dışa açık). |
| `escapeRegExp(text)` | Metni düzenli ifadede güvenle kullanılacak hale getirir. |
| `specimenPhotoFile(record, page, selection)` | Element için kullanılacak numune fotoğrafını seçer; küratör seçimi önceliklidir, aksi halde yanıltıcı görselleri eler. |
| `downloadSpecimenPhoto(key, record, sample, selection)` | Açık lisanslı Commons fotoğrafını indirip manifest kaydını döndürür; uygun değilse boş döner. |
| `wikipediaBatchUrl(titles)` | En çok 5 başlık için Wikipedia sorgu adresini (yönlendirme, sayfa görseli, Türkçe link) kurar. |
| `resolvedTitle(query, requestedTitle)` | Wikipedia'nın bildirdiği normalleştirme/yönlendirme adımlarını izleyip son başlığı bulur. |
| `refreshWikipediaAndPhotos(records, manifest, photoSelections)` | Kayıtlar için Wikipedia linklerini ve element fotoğraflarını 5'erli gruplar halinde çeker, her grupta manifesti kaydeder. |
| `refreshStructures(compounds, manifest)` | Yapı görseli olmayan bileşikler için PubChem 2D PNG'sini indirir. |
| `bySymbol(left, right)` | Atom listelerini sembole göre sıralamak için karşılaştırıcı. |
| `applyAtlasLayer(record, manifest, knownEditorial)` | Bir kayda editoryal metin, medya ve linkleri yazar; bileşikte gösterim formülünün PubChem formülüyle aynı atomları içerdiğini doğrular. |
| `refreshAtlas(fetchMedia, only, structuresOnly)` | Ana iş: verileri okur, istenirse medyayı indirir, atlas katmanını uygular ve iki snapshot'ı yazar (dışa açık; bilim kataloğu script'i de çağırır). |

### `deploy/scripts/refresh-compound-properties.mjs`
`compound-properties.json` dosyasını (formül, ağırlık, IUPAC adı, InChIKey, CID) PubChem'den yeniler.

| Fonksiyon | Ne yapar |
|---|---|
| `--force` | CLI bayrağı: kaydı olan satırları da yeniden çeker. |
| (ana akış) | Her bileşik ürününü adla (demir oksitlerde sabit CID ile) arar, 404'te formülle tekrar dener, her satırdan sonra dosyayı kaydeder; hata varsa çıkış kodu 1 olur. |

### `deploy/scripts/refresh-element-properties.mjs`
`element-properties.json` dosyasını PubChem periyodik tablosundan yeniden üretir; tam 118 element gelmezse yazmaz.

| Fonksiyon | Ne yapar |
|---|---|
| `numericValue(row, column)` | Bir PubChem hücresini sayıya çevirir, boşsa null döner, sayı değilse hata verir. |
| (ana akış) | Tabloyu indirir, sütunları satırlarla eşler, her element için sayısal alanları, elektron dizilimini ve keşif yılını yazar. |

### `deploy/scripts/refresh-scientific-catalog.mjs`
Açık bilim API'sinin sunduğu `scientific-elements.json` ve `scientific-compounds.json` snapshot'larını PubChem, RSC, NIST ve UniProt'tan yeniden kurar, sonra atlas katmanını uygular.

| Fonksiyon | Ne yapar |
|---|---|
| `--force` | CLI bayrağı: `artifacts/science-cache/` önbelleğini yok sayıp her şeyi yeniden indirir. |
| `download(url, name, json)` | Önbellekte varsa oradan, yoksa 3 denemeyle internetten okur; edinme tarihini kaynak bilgisi için saklar. |
| `number(value)` | Sonlu sayıya çevirir; boş/geçersizse null döner. |
| `rounded(n)` | Birim dönüşümündeki kayan nokta gürültüsünü 10 anlamlı basamağa yuvarlayarak temizler. |
| `evToKj(value)` | eV/parçacık değerini kJ/mol'e çevirir. |
| `temperature(value)` | Kelvin değerinden `{k, c}` çifti üretir. |
| `clean(s)` | HTML tablo hücresini düz metne çevirir. |
| `source(id, name, url, fields)` | Kaynak kaydı kurar; tarih olarak gerçekten indirilen adresin edinme tarihini kullanır. |
| `expandConfiguration(config, seen)` | `[Ne] 3s2` gibi soy gaz çekirdeklerini açarak tam elektron dizilimini üretir. |
| `fact(label)` / `strictFact(label)` | RSC sayfasındaki etiketin yanındaki hücreyi metin / sayı olarak verir. |
| `walk(items)` | PubChem kayıt ağacını düz bölüm listesine çevirir. |
| `info(heading)` / `strings(value)` | Başlığa göre bilgi bloklarını ve içlerindeki metinleri toplar. |
| `evidence(heading)` | Bir bölümden en çok 4 kısa ölçümü kaynak linkiyle alır. |
| `links(heading)` | Bir bölümün en çok 4 farklı kaynağını (URL'ye göre tekilleştirerek) listeler. |
| (ana akış) | 118 elementi ve tüm bileşikleri kurar, aspirin örneğine editoryal özet ve UniProt hedeflerini ekler, dosyaları yazar ve `refreshAtlas()` çağırır. |

### `deploy/scripts/secret-scan.mjs`
Çalışma ağacında sızmış anahtar ve demo şifre arayan hafif tarayıcı; JSON rapor basar.

| Fonksiyon | Ne yapar |
|---|---|
| `isAllowlistedPath(path)` | Görsel, kilit dosyası, tarama belgeleri ve script'in kendisi gibi gürültü kaynaklarını atlar. |
| `walk(dir)` | Klasörü özyineli dolaşır, 1,5 MB altındaki metin dosyalarında desenleri arar. |
| (ana akış) | Git geçmişinde eski demo şifresini arar, raporu yazar; docs/ dışında özel anahtar, AWS anahtarı veya demo şifre bulursa çıkış kodu 1 olur. |

### `deploy/scripts/test-backup-restore.mjs`
Yerel PostgreSQL kurtarma provası: her veritabanını yedekler, geçici veritabanına geri yükler ve içeriğin birebir aynı olduğunu doğrular.

| Fonksiyon | Ne yapar |
|---|---|
| `quote(value)` | SQL tanımlayıcısını (tablo/veritabanı adı) güvenle tırnaklar. |
| `dockerExec(...args)` | Postgres konteynerinde komut çalıştırır (pg_dump, pg_restore, rm). |
| `fingerprint(client)` | Her tablonun satır sayısını ve tüm satırların MD5 özetini çıkarır. |
| (ana akış) | Aynı anlık görüntüden parmak izi + yedek alır, geri yükler, karşılaştırır; geçici veritabanını ve dosyayı her durumda siler, raporu `artifacts/local/` altına yazar. |

### `deploy/scripts/test-e2e.mjs`
Çalışan yerel sisteme karşı uçtan uca regresyon; yalnız simülasyonu kullanır, gerçek ödeme yapmaz.

| Fonksiyon | Ne yapar |
|---|---|
| `check(name, test)` | Senkron doğrulamaları çalıştırır, başarılıysa `PASS` yazar ve sayar. |
| `pause(ms)` | Bekler. |
| `call(path, options)` | API'yi çağırır, HTTP kodunu doğrular, 429'da biraz bekleyip tekrar dener; JSON/metin döndürür. |
| `createAccount()` | Yeni hesap açar, giriş yapar ve API anahtarı üretir. |
| `waitForCompletedOrder(id, key)` | Sipariş Completed olana kadar bekler; Failed görürse hemen hata verir. |
| `waitForHoldings(key, isReady, label)` | Holding listesi koşulu sağlayana kadar bekler. |
| `fetchAllPages(firstPath)` | Sayfalı listenin `next` linklerini izleyerek bütün sonuçları toplar. |
| (ana akış) | Katalog, geçersiz girdi, idempotent ödeme, saga, hesaplar arası yalıtım, bileşik siparişi, satış ve eşzamanlı satış kontrollerini sırayla yapar. |

### `deploy/scripts/test-platform.mjs`
Her servisin health/info uçlarını, derlenmiş SPA sayfalarını ve gateway üzerinden iki rotayı kontrol eder.

| Fonksiyon | Ne yapar |
|---|---|
| `check(name, run)` | Bir kontrolü çalıştırır, sonucu kaydeder; hata fırlatmaz, bütün kontroller çalışır. |
| `request(url, options)` | 15 sn içinde HTTP 200 dönmesini şart koşan istek atar. |
| `json(url, options)` | `request` cevabını JSON olarak döndürür. |
| (ana akış) | 9 servis portunu, 7 web sayfasını ve varlık dosyalarını, ticker ve stok rotalarını dener; JSON özet basar. |

### `deploy/scripts/test-scientific-api.mjs`
Açık bilim API'si (v2) için sözleşme kontrolü.

| Fonksiyon | Ne yapar |
|---|---|
| `check(path, status, headers)` | GET atar ve HTTP kodunu doğrular. |
| (ana akış) | Demir verisi, alan seçimi, sayfalama, 400/404, ETag 304, açık CORS, gzip, aspirin kaydı, v1 uyumu ve özel rotaların yalıtımını kontrol eder. |

### `deploy/scripts/write-media-inventory.mjs`
`docs/ELEMENT-MEDIA-INVENTORY.md` raporunu (element başına fotoğraf/şema, lisans, inceleme durumu) yeniden üretir.

| Fonksiyon | Ne yapar |
|---|---|
| `reviewStatus(symbol, photo)` | Son sütundaki Türkçe inceleme durumunu seçer. |
| (ana akış) | Fotoğraf yolunun güvenli ve dosyanın dolu olduğunu kontrol eder, tabloyu ve özet satırını yazar. |

### `scripts/lint.ps1`
Hızlı statik kapı: web ESLint + sipariş servisi TypeScript derlemesi.

| Fonksiyon | Ne yapar |
|---|---|
| (ana akış) | `npm --prefix web-app run lint` ve `npm --prefix order-service run build` çalıştırır; hata varsa aynı kodla çıkar. |

### `scripts/present.ps1`
`deploy/scripts/present-platform.ps1` kısa yolu; bütün argümanları aynen geçirir.

| Fonksiyon | Ne yapar |
|---|---|
| (ana akış) | `present-platform.ps1 @args` çağırır. |

### `scripts/test.ps1`
`deploy/scripts/test-all.ps1` kısa yolu (`-Configuration Review` ile).

| Fonksiyon | Ne yapar |
|---|---|
| `-Integration` / `-Live` / `-Browser` | Parametreler: `test-all.ps1`'e aynı adla geçirilir. |
| (ana akış) | Argüman listesini kurup `test-all.ps1` çağırır. |

### `scripts/up.ps1`
Tam platformu `docker/.env` ile derleyip başlatan tek satırlık kısa yol (`.env` önceden var olmalı).

| Fonksiyon | Ne yapar |
|---|---|
| (ana akış) | `docker compose --env-file docker/.env up -d --build` çalıştırır. |

### `Jenkinsfile`
Değişen yollara göre çalışan Multibranch pipeline (Windows ajan, `bat`).

| Fonksiyon | Ne yapar |
|---|---|
| `changedFiles()` | PR hedef dalına (yoksa HEAD~1'e) göre değişen dosyaları bulur; bulamazsa `FORCE_ALL` döndürür. |
| `touchesAny(files, prefixes...)` | Değişen bir dosya verilen öneklerden biriyle başlıyor mu söyler (`FORCE_ALL`'da hep evet). |
| `isDocsOnly(files)` | Değişiklik yalnız belge mi (docs/, .md, TODO, LICENSE) söyler. |
| (aşamalar) | Detect paths → RUN_* bayraklarını kurar; order-service, web-app, dotnet unit, wallet-service, inventory-service, Playwright smoke ve isteğe bağlı compose sağlık kontrolü aşamaları bu bayraklarla açılır. |

### `docker-compose.yml`
Tam yerel platform: postgres, redis, rabbitmq, identity, catalog, compound, order, wallet, inventory, shipment, notification, gateway ve web-app servisleri; volume'lar identity_keys, postgres_data, redis_data, rabbitmq_data. Ortak ayarlar iki YAML çapasında: `x-base` (`restart: unless-stopped`, `element-network`, 3×10 MB log döndürme) ve uygulama servisleri için `x-app` (`x-base` + `init: true`). Altyapı ve iç servis portları `127.0.0.1`'e bağlı; gateway `5000` ve web `WEB_HOST_PORT` dışarıya açık. Postgres ve RabbitMQ'ya temiz kapanış için 30 sn `stop_grace_period` verilir; Postgres sağlık kontrolü `pg_isready -h 127.0.0.1` (ilk init'teki geçici sunucuyu hazır saymaz), RabbitMQ'nunki `check_port_connectivity` (AMQP dinleyicisi açık mı) kullanır. RabbitMQ sabit `hostname: rabbitmq` ile çalışır ki yeniden oluşturmada kalıcı kuyruklar kaybolmasın. `ASPNETCORE_ENVIRONMENT` / `NODE_ENV` env dosyasından ezilebilir. Shipment servisine `INTERNAL_API_KEY` verilir (takip/arama/getir uçları ister); identity ve order artık Redis kullanmaz.

### `docker-compose.public.yml`
Public overlay: bütün host portlarını kapatır, Production ayarlarını ve zorunlu sırları (`${VAR:?}`; `INTERNAL_API_KEY` shipment'a da verilir) ister, wallet'a `ELEMENT_ENV` geçirir (zayıf sır korumasının prod'u tanıması için), yalnız Caddy'yi (80/443 veya CADDY_HTTP_PORT/CADDY_HTTPS_PORT) yayınlar. Caddy web-app ve gateway'in yalnız "başladı" olmasını bekler, log'ları 3×10 MB ile döner; volume'lar caddy_data, caddy_config.

### `docker-compose.science.yml`
Yalnız `science-service` imajını salt-okunur dosya sistemiyle 127.0.0.1:5080'de çalıştıran bağımsız atlas yığını (`restart: unless-stopped`, 3×10 MB log döndürme).

### `docker-compose.jenkins.yml`
Yerel Jenkins LTS kontrolcüsü (8085 arayüz, 50000 ajan portu, `element-jenkins-home` volume'u).

### `deploy/Caddyfile.elements-api`
Compose içindeki Caddy ayarı: HSTS dahil güvenlik başlıkları, inline script'e izin vermeyen CSP (`form-action 'self'`; stil için `'unsafe-inline'` kalır), 1 MB gövde sınırı, `/api*` ve `/swagger*` → gateway, geri kalan her şey → web-app.

### `deploy/Caddyfile.elements-api.example`
Caddy'nin konteyner yerine host üzerinde çalıştığı eski düzen için örnek (gateway 127.0.0.1:5000, web 127.0.0.1:3000).

### `docker/Dockerfile.postgres`
`postgres:16-alpine` imajına `init-scripts/` klasörünü gömen Postgres imajı.

### `docker/init-scripts/init.sql`
Boş volume ile ilk açılışta yedi servis veritabanını (identity, market, order, wallet, inventory, shipment, compound) oluşturur.

### `docker/.env.example`
Yerel tam platform için örnek ortam dosyası; `docker/.env` olarak kopyalanır, public sunucuda kullanılmaz.

### `docker/.env.public.example`
Eski tek dosyalık public şablon; Prod yerel duman ayarlarının kopyası.

### `docker/.env.public.dev.example`
Public Dev ortamının şablonu (Caddy 8080, Development ayarları); `docker/.env.public.dev` olarak kopyalanır.

### `docker/.env.public.test.example`
Public Test ortamının şablonu (Caddy 8081, Staging ayarları); `docker/.env.public.test` olarak kopyalanır.

### `docker/.env.public.prod.example`
Public Prod ortamının şablonu (yerelde Caddy 8082); gerçek sunucuya geçiş adımlarını da anlatır, `fill-public-prod-env.ps1` bundan üretir.

### `docker/README.md`
Docker klasörünün, ortam değişkenlerinin, portların ve sık sorunların Türkçe açıklaması.

### `deploy/tests/public-env-matrix.test.mjs`
Fonksiyon içermeyen test dosyası: public şablonların port, proje adı ve sır kurallarını ve `present-public.ps1` ile uyumunu doğrular.

### `deploy/tests/Element.Services.IntegrationTests/Element.Services.IntegrationTests.csproj`
Entegrasyon test projesi: xUnit, Testcontainers (Postgres, Redis, RabbitMQ), MassTransit ve gateway/catalog/identity/shipment proje referansları.

### `deploy/tests/Element.Services.IntegrationTests/Properties/AssemblyInfo.cs`
Testlerin paralel çalışmasını kapatan tek satırlık assembly ayarı.

### `deploy/tests/Element.Services.IntegrationTests/Infrastructure/IntegrationTestContainers.cs`
Test sınıfı başına geçici Postgres, Redis ve RabbitMQ konteynerlerini açan xUnit fixture'ı. Postgres ve RabbitMQ ayrıca sınıfa özel bir Docker ağına katılır; konteynerde çalışan servis (wallet-service) onlara compose'taki adlarıyla (`postgres`, `rabbitmq`) ulaşır.

| Fonksiyon | Ne yapar |
|---|---|
| `Network` | Postgres, RabbitMQ ve testin açtığı servis konteynerlerinin ortak Docker ağı. |
| `InitializeAsync()` | Konteynerleri başlatır ve testlerin kullandığı veritabanlarını (wallet'ınki dahil) oluşturur. |
| `EnsureDatabasesExistAsync(databases)` | Veritabanlarını oluşturur; zaten varsa sessizce geçer. |
| `DisposeAsync()` | Konteynerleri ve ağı durdurup siler. |
| `RedisConnection` / `RabbitHost` / `RabbitPort` | Test makinesinden erişilen Redis bağlantı metni ve RabbitMQ adres/port bilgisi. |

### `deploy/tests/Element.Services.IntegrationTests/Infrastructure/IntegrationTestSettings.cs`
Test edilen servisleri konteynerlere bağlayan ortak ayar yardımcıları.

| Fonksiyon | Ne yapar |
|---|---|
| `BuildPostgresConnection(containers, database)` | Ortak Postgres konteynerinde istenen veritabanı için bağlantı metni üretir. |
| `RabbitMqSettings(containers)` | Bir .NET servisini RabbitMQ konteynerine bağlayan host ayarlarını döndürür. |

### `deploy/tests/Element.Services.IntegrationTests/Infrastructure/OrderApiModels.cs`
Yalnız kayıt (record) tipleri: `CreateOrderRequest` (sipariş isteği) ve `OrderApiResponse` (testlerin okuduğu sipariş alanları).

### `deploy/tests/Element.Services.IntegrationTests/Infrastructure/OrderNodeTestHost.cs`
Node sipariş servisini test konteynerlerine bağlı ayrı bir süreç olarak çalıştırır (`order-service` önceden derlenmiş olmalı).

| Fonksiyon | Ne yapar |
|---|---|
| `StartAsync(containers, catalogBaseUrl)` | `node dist/index.js`'i boş bir portta ortam değişkenleriyle başlatır ve `/health` cevap verene kadar bekler. |
| `CreateClient()` | İç API anahtarı eklenmiş HttpClient döndürür. |
| `CaptureOutput(sender, args)` | Servis çıktısının son 100 satırını hata mesajı için saklar. |
| `WaitForHealthyAsync()` | 30 sn içinde sağlıklı olmasını bekler; süreç erken ölürse çıktısıyla birlikte hata verir. |
| `GetFreePort()` | İşletim sisteminden boş bir loopback portu alır. |
| `FindRepoRoot()` | Test dosyalarından yukarı çıkarak `order-service` klasörünü içeren depo kökünü bulur (wallet fixture'ı da Dockerfile'ı bununla bulur). |
| `DisposeAsync()` | Node süreç ağacını öldürür. |

### `deploy/tests/Element.Services.IntegrationTests/Infrastructure/SagaEventPublisher.cs`
Testin, çalışmayan bir servisin yerine MassTransit uyumlu olay yayınlamasını sağlar.

| Fonksiyon | Ne yapar |
|---|---|
| `PublishAsync(containers, typeName, message)` | Mesajı MassTransit zarfına koyup olay tipinin fanout exchange'ine yayınlar. |
| `PublishStockReservedAsync(containers, orderId)` | Bir sipariş için "stok ayrıldı" olayını yayınlar (inventory'nin yerine). |
| `PublishPaymentProcessedAsync(containers, orderId)` | Bir sipariş için "ödeme tamamlandı" olayını yayınlar (wallet'ın yerine). |

### `deploy/tests/Element.Services.IntegrationTests/Infrastructure/TestHttpBridge.cs`
Bellek içi test sunucusunu gerçek bir loopback portuna açar ki ayrı çalışan Node servisi ona ulaşabilsin.

| Fonksiyon | Ne yapar |
|---|---|
| `StartAsync(client)` | Gelen her GET isteğini verilen test istemcisine aktaran küçük bir web uygulaması başlatır. |
| `BaseUrl` | Köprünün dinlediği adres. |
| `DisposeAsync()` | Köprüyü kapatır. |

### `deploy/tests/Element.Services.IntegrationTests/Infrastructure/WalletServiceContainers.cs`
Gerçek Java wallet-service'i `wallet-service/Dockerfile`'dan derleyip ortak Postgres/RabbitMQ ağında çalıştıran xUnit fixture'ı. Yanında sabit alış fiyatı (gram başına 100) dönen küçük bir nginx catalog taklidi açılır ki masaya satış fiyatı bulabilsin. İmaj `element-wallet-service-it` adıyla bilerek silinmez: sonraki derleme Docker katman önbelleğinden hızlı geçer (compose'un `element-wallet-service` imajına dokunulmaz). İlk çalıştırma Maven bağımlılıklarını indirdiği için birkaç dakika sürer. Testcontainers bağlamdaki dosyaları 1970 tarihiyle gönderdiği için Dockerfile derlemeden önce dosya zamanlarını yeniler; yoksa jar `schema.sql`'siz çıkar ve cüzdan tabloları oluşmaz.

| Fonksiyon | Ne yapar |
|---|---|
| `WelcomeGrant` | Servise `WALLET_WELCOME_GRANT` olarak verilen hoş geldin Kredisi (10000). |
| `Infrastructure` | Ortak Postgres, Redis ve RabbitMQ fixture'ı (`element_wallet_db` diğer veritabanlarıyla birlikte oluşur). |
| `InitializeAsync()` | Altyapı açılırken imajı derler, sonra catalog taklidini ve wallet'ı başlatıp `/health` 200 dönene kadar (en çok 2 dk) bekler. |
| `CreateClient(userId)` | Gateway gibi `INTERNAL_API_KEY` ve `X-User-Id` başlıklarını ekleyen HttpClient döndürür. |
| `DisposeAsync()` | Konteynerleri siler; imaj önbellek için kalır. |

### `deploy/tests/Element.Services.IntegrationTests/GatewayApiKeyIntegrationTests.cs`
Gateway + gerçek identity: açık rotalar anonim kalır, korumalı rotalar geçerli X-API-Key ister.

| Fonksiyon | Ne yapar |
|---|---|
| `ElementsRoute_AllowsAnonymousGet()` | Anahtarsız element isteğinin 401 almadığını doğrular. |
| `HistoryRoute_Returns401_WithoutApiKey()` | Fiyat geçmişinin anahtarsız 401 döndüğünü doğrular. |
| `ElementsRoute_PassesApiKeyValidation_WithValidKey()` | Geçerli anahtarın gateway doğrulamasından geçtiğini doğrular. |
| `CreateApiKeyAsync()` | Kullanıcı açıp API anahtarı üretir. |
| `CreateIdentityFactory()` / `CreateGatewayFactory(identityBase)` | Konteynerlere bağlı identity ve gateway test sunucularını kurar. |

### `deploy/tests/Element.Services.IntegrationTests/IdentityServiceIntegrationTests.cs`
Identity servisinin gerçek veritabanında kayıt → giriş → anahtar → iç doğrulama ve webhook CRUD akışı.

| Fonksiyon | Ne yapar |
|---|---|
| `CreateFactory()` | Konteynerlere bağlı identity test sunucusunu kurar. |
| `Register_Login_GenerateKey_ValidateKey_Succeeds()` | Anahtar biçimini (`ele_live_` + 32), iç doğrulama sonucunu ve webhook ekle/listele/sil akışını kontrol eder; silinmiş webhook'u tekrar silmenin 404, tek etiketli (konteyner içi) host'un 400 döndüğünü, 11 eşzamanlı kayıtta tam 10'unun kabul edilip birinin 409 aldığını, iç webhook listesinin yanlış anahtarla 401 verip doğru anahtarla 10 kayıt döndürdüğünü doğrular. |

### `deploy/tests/Element.Services.IntegrationTests/LearningIntegrationTests.cs`
Hesap özellikleri: öğrenme ilerlemesi, kilitleme, şifre değiştirme/sıfırlama, e-posta doğrulama, dışa aktarma, hesap silme, anahtar sınırı ve iptal edilmiş anahtar geçmişinin sınırı.

| Fonksiyon | Ne yapar |
|---|---|
| `Factory(mailer)` | Identity test sunucusunu kurar; verilirse gerçek e-posta göndericisinin yerine test göndericisini koyar. |
| `Register(client)` | Yeni öğrenci hesabı açıp giriş yapar, e-posta ve JWT döndürür. |
| `Concurrent_devices_merge_progress_and_other_accounts_cannot_read_it()` | İki cihazın eşzamanlı kaydının birleştiğini ve başka hesabın göremediğini doğrular. |
| `Repeated_wrong_passwords_lock_the_account()` | 4 yanlış şifrenin 401, 5.'sinin hesabı kilitleyip 429 aldığını ve sonra doğru şifrenin de 429 aldığını doğrular. |
| `Password_confirmed_actions_share_the_login_lockout()` | Hesap silme ve şifre değiştirmedeki yanlış şifrelerin giriş kilidini paylaştığını (4 hatadan sonra 429) doğrular. |
| `Password_change_revokes_old_sessions_and_all_device_keys()` | Şifre değişince eski oturumun ve bütün API anahtarlarının iptal olduğunu doğrular. |
| `Mail_links_verify_email_and_reset_password_only_once()` | E-posta doğrulamayı, sıfırlama linkinin tek kullanımlık olduğunu ve pencere içindeki ikinci sıfırlama isteğinin aynı cevabı (202) verip yeni e-posta göndermediğini doğrular. |
| `Export_excludes_secrets_and_deletion_closes_account_and_learning()` | Dışa aktarmada sır olmadığını ve silmenin hesabı kapattığını doğrular. |
| `Concurrent_key_issuance_respects_account_limit()` | 21 eşzamanlı istekte tam 20 anahtar verildiğini, birinin 409 aldığını doğrular. |
| `Revoked_key_history_is_bounded()` | 23 anahtar üretip iptal ettikten sonra yalnız son 20 iptal kaydının tutulduğunu (en eskisinin silindiğini) doğrular. |
| `CapturingMailer.SendAsync(...)` / `CapturingMailer.Token` / `CapturingMailer.Count` | Son e-postayı saklar, gönderim sayısını tutar ve içindeki linkten token'ı çıkarır. |

### `deploy/tests/Element.Services.IntegrationTests/OrderServiceIntegrationTests.cs`
Gerçek Node sipariş servisi: sahiplik, yetki ve sağlık. Cüzdan davranışı wallet-service'te olduğu için `WalletServiceIntegrationTests` içinde test edilir.

| Fonksiyon | Ne yapar |
|---|---|
| `GetUserOrders_ReturnsEmptyList_WhenNoOrders()` | Siparişi olmayan kullanıcıya boş liste döndüğünü doğrular. |
| `PostOrder_WithoutUser_Returns401()` | Kullanıcısız siparişin 401 aldığını doğrular. |
| `GetOrder_WrongUser_Returns404()` | Başkasının siparişinin 404, kendi siparişinin 200 döndüğünü doğrular. |
| `Health_ReturnsHealthy_WhenDependenciesUp()` | `/health` ucunun sağlıklı cevap verdiğini doğrular. |
| `InsertOrderAsync(orderId, customerId, status)` | API'yi atlayıp sipariş tablosuna 1 g altın siparişi yazar. |

### `deploy/tests/Element.Services.IntegrationTests/SagaFlowIntegrationTests.cs`
Gerçek Node sipariş, catalog ve shipment servisleriyle satın alma saga'sının Completed'a ulaştığını doğrular; Java inventory ve wallet servisleri açılmadığı için stok ve ödeme olaylarını test verir.

| Fonksiyon | Ne yapar |
|---|---|
| `CreateOrder_CompletesSaga_WhenStockAndPaymentSucceed()` | Sipariş açar ve 90 sn içinde Completed olduğunu doğrular. |
| `PollAndAdvanceSagaAsync(orderClient, orderId, timeout)` | Siparişi 2 sn arayla sorar, gerektiğinde stok ya da ödeme olayını yayınlar, son durumu döndürür. |
| `TryAdvanceSagaAsync(orderId, status)` | Durum Submitted ise "stok ayrıldı", StockReserved ise "ödeme tamamlandı" olayını yayınlar (saga tekrarlanan olayı yok sayar). |
| `GetSagaStateAsync(orderId)` | Hata mesajı için saga durumunu veritabanından okur. |
| `CreateElementFactory()` / `CreateShipmentFactory()` | Konteynerlere bağlı catalog ve shipment test sunucularını kurar. |

### `deploy/tests/Element.Services.IntegrationTests/WalletServiceIntegrationTests.cs`
Konteynerdeki gerçek Java wallet-service: hoş geldin Kredisi, sipariş başına tek borç ve masaya satış sınırı. Sipariş saga'sı çalışmadığı için `PaymentRequestedEvent`'i test yayınlar.

| Fonksiyon | Ne yapar |
|---|---|
| `WalletDebit_IsIdempotent_AndSellRejectsOverHolding()` | İlk cüzdan okumasının 10000 Kredi verdiğini, aynı sipariş için iki kez gelen ödeme isteğinin yalnız bir kez kesildiğini (bakiye 9990) ve elde olmayan 50 g altının satışının `no_holding` sebebiyle 400 aldığını doğrular. |
| `GetBalanceAsync(client)` | `/api/v1/me/wallet` ucundan bakiyeyi okur. |
| `WaitForProcessedDeliveriesAsync(orderId, expected)` | Wallet'ın `processed_messages` tablosunda sipariş için beklenen sayıda teslimat işlenene kadar (en çok 30 sn) bekler. |

Kapsam dışı ama ilgili veri dosyaları: `deploy/data/atlas-editorial.mjs` (editoryal metinler), `deploy/data/atlas-media.json` (medya manifesti) ve `deploy/data/atlas-photo-selections.json` (küratör fotoğraf seçimleri) yukarıdaki atlas script'lerinin girdi/çıktısıdır; `deploy/jenkins/` gece işi ve Job DSL tanımlarını tutar.

## Yapılandırma

Şifre ve anahtarların yerel geliştirme değerleri bu kılavuzda `<yerel-varsayılan>` olarak gösterilir; gerçek değerler `docker/.env.example` dosyasındadır. Production modunda servisler bu varsayılanlarla açılmayı reddeder.

| Değişken | Varsayılan | Ne işe yarar |
|---|---|---|
| `POSTGRES_USER` / `POSTGRES_PASSWORD` | `postgres` / `<yerel-varsayılan>` | Bütün servis veritabanlarının kullanıcı adı ve şifresi. |
| `POSTGRES_HOST_PORT` | `5432` | Postgres'in host'ta yayınlandığı port (dolu ise ör. 5434). |
| `JWT_SECRET` | yerelde `<yerel-varsayılan>`; public'te zorunlu | Identity'nin JWT imza anahtarı. |
| `INTERNAL_API_KEY` | yerelde `<yerel-varsayılan>`; public'te zorunlu | Servisler arası iç uçların anahtarı. |
| `WEB_HOST_PORT` | `6241` | Web uygulamasının host portu; compose'taki CORS listesi ve origin varsayılanları bunu izler. |
| `PUBLIC_WEB_ORIGIN` | `http://localhost:${WEB_HOST_PORT:-6241}` | Identity ve gateway'in CORS ve e-posta linklerinde kullandığı web adresi. |
| `VITE_PUBLIC_SITE_URL` | `http://localhost:${WEB_HOST_PORT:-6241}` | Web paketine gömülen canonical/OG/sitemap adresi (değişince web imajı yeniden derlenir). |
| `VITE_API_BASE_URL` | yerelde `http://localhost:5000/api/v1`, public'te `/api/v1` | Tarayıcının çağırdığı API kökü (derleme anında gömülür). |
| `VITE_CAPTCHA_SITE_KEY` / `CAPTCHA_SECRET_KEY` | boş | Cloudflare Turnstile anahtarları; boşsa captcha kapalı. |
| `PUBLIC_API_BASE` | `http://localhost:5000` | Catalog/compound HATEOAS ve swagger linklerinin kökü. |
| `TRUSTED_PROXY_CIDRS` | yerelde boş, public'te `10.0.0.0/8,172.16.0.0/12,192.168.0.0/16` | Gateway'in istemci IP'si için güvendiği proxy ağları. |
| `RABBITMQ_DEFAULT_USER` / `RABBITMQ_DEFAULT_PASS` | `guest` / `<yerel-varsayılan>` | Broker kullanıcı bilgileri (servislere de aktarılır). |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_FROM` / `SMTP_USER` / `SMTP_PASSWORD` / `SMTP_ENABLE_SSL` | boş / `587` / boş / boş / boş / `true` | E-posta gönderimi; host boşsa şifre kurtarma bilinçli olarak kapalı. |
| `ELEMENT_ENV` | `prod` | Public yığında konteyner adlarının ön eki (`element-<env>-...`). |
| `ASPNETCORE_ENVIRONMENT` / `NODE_ENV` | yerelde `Development` / `development`, public'te `Production` / `production` | Servislerin çalışma ortamı (env dosyasından ezilebilir). |
| `CADDY_SITE` | public'te zorunlu (yerel `http://:80`) | Caddy'nin site adresi; gerçek sunucuda yalnız alan adı. |
| `CADDY_HTTP_PORT` / `CADDY_HTTPS_PORT` | `80` / `443` | Caddy'nin host portları (yerel şablonlar 8080-8082 / 8443-8445). |
| `WALLET_WELCOME_GRANT` | public'te `1000` (servis varsayılanı 10000) | Yeni cüzdana verilen hoş geldin Kredisi. |
| `SAGA_TIMEOUT_SUBMITTED_SEC` / `SAGA_TIMEOUT_STOCK_RESERVED_SEC` / `SAGA_TIMEOUT_SHIPPING_SEC` | `120` / `120` / `180` (compose'ta sabit) | Satın alma saga'sının durum başına zaman aşımı. |
| `DEFAULT_STOCK_GRAMS` | `100000` (compose'ta sabit) | Inventory servisinde element başına başlangıç stoğu. |
| `Shipment__FailQuantityGte` | `0` (kapalı) | Test kancası: bu gramdan büyük/eşit kargoları reddeder. |
| `Market__SpreadPct` | `0.008` (compose'ta sabit) | Catalog'un alış/satış makası (%0,8). |
| `API_BASE` | `http://localhost:5000` | `test-e2e.mjs` ve `test-platform.mjs` için gateway adresi (yalnız localhost). |
| `WEB_BASE` | `http://localhost:6241` | `test-platform.mjs` için web adresi (`test-all.ps1 -Live` bunu `-WebBase` ile doldurur). |
| `SCIENCE_API_BASE` | `http://localhost:5000` | `test-scientific-api.mjs` için API adresi. |
| `RUN_COMPOSE_SMOKE` | yok | Jenkins'te `1` ise compose sağlık aşaması çalışır. |
| `CHANGE_TARGET` | `main` | Jenkins'in değişiklikleri karşılaştırdığı hedef dal (PR'larda Jenkins doldurur). |

## Testler

- `deploy/tests/public-env-matrix.test.mjs`: public Dev/Test/Prod şablonlarının portlarının ve compose proje adlarının çakışmadığını, her şablonun yerel duman düzenini koruduğunu, `ChangeMe` veya `<yerel-varsayılan>` taşımadığını, INTERNAL_API_KEY'in en az 32 karakter olduğunu ve `present-public.ps1`'in sunucu korumasını içerdiğini kontrol eder. Çalıştır: `node --test deploy/tests/public-env-matrix.test.mjs`
- `deploy/tests/Element.Services.IntegrationTests/`: gateway API anahtarı, identity hesap akışları, Node sipariş servisi, satın alma saga'sı ve Java wallet servisi gerçek Postgres/Redis/RabbitMQ konteynerleriyle test edilir. Docker çalışıyor ve `order-service` derlenmiş olmalı (`cd order-service && npm ci && npm run build`); wallet imajını test kendisi `wallet-service/Dockerfile`'dan derler (ilk seferde Maven indirmesi yüzünden birkaç dakika). Çalıştır: `dotnet test deploy/tests/Element.Services.IntegrationTests --filter "Category=Integration"` (yalnız derleme kontrolü: `dotnet build deploy/tests/Element.Services.IntegrationTests`)
- Canlı sistem kontrolleri (platform açıkken): `./deploy/scripts/test-smoke.ps1`, `node deploy/scripts/test-e2e.mjs`, `node deploy/scripts/test-platform.mjs`, `node deploy/scripts/test-scientific-api.mjs`, `./deploy/scripts/test-saga.ps1`, `node deploy/scripts/test-backup-restore.mjs`. Hepsini sırayla çalıştırmak için: `./deploy/scripts/test-all.ps1 -Live -Recovery`
- Script sözdizimi: her `.ps1` için `pwsh -NoProfile -Command "$null = [System.Management.Automation.Language.Parser]::ParseFile('<yol>', [ref]$null, [ref]$errs); $errs"` hiçbir şey yazmamalı; her `.mjs` için `node --check <dosya>`; compose için `docker compose -f docker-compose.yml --env-file docker/.env.example config -q`.
