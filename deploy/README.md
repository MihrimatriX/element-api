# Deploy — operatör köşesi

Bu klasörde ürün kodu yok. Script'ler, testler, atlas verisi ve Caddy taslağı burada durur. Ürünü başlatmak, durdurmak, smoke testi çalıştırmak ya da bilimsel JSON'u yenilemek için buraya bak.

> Agent notları İngilizce: [AGENTS.md](./AGENTS.md). Servislerin genel turu: [servis kılavuzu](../docs/SERVIS-KILAVUZU.md). Env dosyaları: [docker/](../docker/README.md).

---

## Ne işe yarar?

| Alt klasör / dosya | Ne |
|--------------------|----|
| `scripts/` | Sunum, durdurma, derleme, test, atlas yenileme |
| `tests/` | .NET birim + entegrasyon; gateway testleri; public env self-check |
| `data/` | Atlas medya seçimleri (`atlas-media.json`, editorial) |
| `Caddyfile.elements-api*` | Public host reverse proxy taslağı |
| `scientific-catalog.md` | Bilimsel v2 API sözleşmesi |

Compose dosyaları (`docker-compose.yml` vb.) repo kökünde, sırlar `docker/.env` içinde. Deploy klasörü sistemi çalıştırmak için gereken araçları tutar.

---

## Günlük komutlar (şunu çalıştır)

Docker Desktop açık olsun. Repo kökünden:

Tam platform (varsayılan sunum):

```powershell
./deploy/scripts/present-platform.ps1
```

Web http://localhost:6241 (`WEB_HOST_PORT`), API http://localhost:5000 adresinde açılır.  
`docker/.env` yoksa script onu `docker/.env.example`'dan kopyalar. İmajlar hazırsa `-NoBuild` ekle.

Yalnız atlas (DB / broker yok):

```powershell
./deploy/scripts/present-local.ps1
```

Adres: http://127.0.0.1:5080 (`docker-compose.science.yml`).

Public (Caddy overlay, ortama göre):

```powershell
./deploy/scripts/present-public.ps1 -Environment Dev
# veya -All → yerel :8080 / :8081 / :8082 yan yana
```

Ayrıntı: [PUBLIC-HOST.md](../docs/PUBLIC-HOST.md).

Durdurmak için (volume'lar kalır):

```powershell
./deploy/scripts/stop-local.ps1
# Public yığın: -Public veya -Environment Dev
```

Her şeyi silmek için (veri gider): `docker compose --env-file docker/.env down -v`.

Eski `start-local.ps1` hâlâ repoda, ama günlük kullanım için `present-platform` / `present-local` kullan.

---

## Script haritası

### Sunum

| Script | Ne yapar |
|--------|----------|
| `present-platform.ps1` | Tam `docker compose up -d [--build]` |
| `present-local.ps1` | Science compose'u `:5080` üzerinde başlatır |
| `present-public.ps1` | Public overlay + env matrisi |
| `stop-local.ps1` | Yerel + public + science stop |

### Derleme / migrate

| Script | Ne yapar |
|--------|----------|
| `build-all.ps1` | .NET + order + Java wallet/inventory derleme |
| `migrate-all.ps1` | EF migrate (host) |

### Test / doğrulama

| Script | Ne yapar |
|--------|----------|
| `test-unit.ps1` | Birim testleri |
| `test-all.ps1` | Derleme + birim + isteğe bağlı `-Integration` `-Live` `-Browser` `-Recovery` |
| `test-smoke.ps1` | Çalışan yığına karşı smoke |
| `test-saga.ps1` | Order saga (çift ödeme, iade, timeout) |
| `test-platform.mjs` | Sağlık + web sayfaları + ticker |
| `test-e2e.mjs` | API e2e (hesap / alışveriş) |
| `test-scientific-api.mjs` | v2 sözleşme spotları |
| `test-backup-restore.mjs` | DB yedek provası |
| `public-env-matrix.test.mjs` | Public port/proje çakışması |

Örnek: `./deploy/scripts/test-all.ps1 -Integration -Live`. Bu komut imajları yeniden derlemez; JDK/Maven/npm kurulu olmalı.

### Atlas / bilimsel veri

| Script | Ne yapar |
|--------|----------|
| `refresh-atlas.mjs` | Anlatım ve medya URL'lerini JSON'a yazar; `--fetch` ağdan indirir |
| `refresh-element-properties.mjs` | Element PubChem özellikleri |
| `refresh-compound-properties.mjs` | Bileşik özellikleri (`--force`) |
| `refresh-scientific-catalog.mjs` | Katalog yenileme orkestrasyonu |
| `apply-known-compounds.mjs` | Lab bilinen-molekül listesi |
| `fix-element-photos.mjs` / `write-media-inventory.mjs` | Fotoğraf / envanter |

JSON değişince ilgili Docker imajını yeniden derle; `-NoBuild` eski anlık görüntüyü bırakır.

---

## Operatör notları

- Tek satırlık bir UI değişikliği için bütün stack'i `--build` etme. Gateway `:5000` ayaktaysa `npm --prefix web-app run dev` çalıştır (`:5173`).
- Bu makinede Redis host'ta genelde 6380'dedir; `6379` başka bir uygulamaya ait olabilir. Postgres `POSTGRES_HOST_PORT` (varsayılan 5432; doluysa `5434`).
- Observability yığını yok; `/metrics` ve `/health-ui` 404 döner.
- Lab rotası `/lab`. `/stack` eski bir yönlendirmedir.
- FAL, Commons için izinli lisans. `media.photo: null` çoğu zaman bilinçli.

---

## Reboot — her şey kendiliğinden kalkar

Compose'taki her servis `restart: unless-stopped` kullanır. Açılışta Docker hepsini aynı anda başlatır ve `depends_on` sırasını uygulamaz. Postgres/Rabbit hazır değilse servisler bekler ya da non-zero kodla çıkar ve Docker onları yeniden başlatır. 1-2 dk içinde hepsi `healthy` olur.

Tek seferlik kurulum:

1. Docker'ı açılışta başlayacak şekilde ayarla. Linux: `sudo systemctl enable --now docker containerd`. Windows/Docker Desktop: *Settings → General → Start Docker Desktop when you sign in*. Desktop ancak bir kullanıcı oturum açınca başlar; gözetimsiz bir sunucuda otomatik oturum açma ya da Linux + Docker Engine gerekir.
2. Yeni policy'yi mevcut container'lara uygula. Restart policy container oluşturulurken yazılır, eski container'lar eski ayarla kalır. Bir kez `up -d` çalıştır (değişen servisleri yeniden oluşturur):

```powershell
docker compose --env-file docker/.env up -d --build
# public: ./deploy/scripts/present-public.ps1 -Server
```

Doğrula (hepsi `unless-stopped` olmalı):

```powershell
docker inspect -f "{{.Name}} {{.HostConfig.RestartPolicy.Name}} {{.State.Health.Status}}" $(docker ps -aq)
```

Notlar:

- `stop-local.ps1` / `docker compose stop` ile durdurulan servis reboot'ta kalkmaz (unless-stopped bunu ifade eder). Yeniden `up -d` gerekir.
- RabbitMQ artık sabit `hostname: rabbitmq` kullanır. İlk geçişte eski (container-id adlı) node dizini yetim kalır; kuyruklar servisler bağlanınca yeniden açılır. Geçişi kuyrukta sipariş yokken yap.
- Altyapı ve iç servis portları yalnız `127.0.0.1`'e bağlı (Postgres, Redis, Rabbit, 5001–5008). Dışarıdan açık olanlar: gateway `:5000`, web `WEB_HOST_PORT` (varsayılan `6241`).
- Container log'ları `json-file` ile 3×10 MB sınırında döner, bu yüzden disk dolmaz.
- Kaynak limitleri: her uygulama servisi `APP_MEM_LIMIT` (512m) / `APP_CPUS` (1.0), Java servisleri `JAVA_MEM_LIMIT` (640m, heap = %50), Postgres `POSTGRES_MEM_LIMIT` (1g), RabbitMQ `RABBITMQ_MEM_LIMIT` (512m). Limit yoksa runtime heap'ini host RAM'ine göre boyutlar ve servisler birlikte sunucunun belleğini tüketir. `.env`'de değiştir, `up -d` ile uygula. Kontrol: `docker stats --no-stream`.
- Java servisleri Postgres'i 2 dk bekler (kapanıp restart döngüsüne girmez). Restart/OOM teşhisi: `docker inspect -f "{{.Name}} {{.RestartCount}} {{.State.OOMKilled}} {{.State.ExitCode}}" $(docker ps -aq)`. `137`/`true` görürsen bellek limiti dar demektir.
- `present-public.ps1 -All` gerçek sunucuda çalıştırılmaz, çünkü tüm stack'i 3 kez kaldırır (6 JVM, 3 Postgres, 3 RabbitMQ). Sunucuda yalnız `-Server` kullan. Jenkins aynı makinedeyse derlemeler (Maven/.NET SDK) ayrıca CPU/RAM yer.

---

## Bozulursa nereye bak

| Belirti | İlk bakılacak yer |
|---------|-------------------|
| `present-platform` patladı | Docker Desktop; `docker/.env`; port çakışması (3000 / 5432 / 6379) |
| Site açılır API 502 | Gateway log; arka oda `GET :500x/health` |
| Atlas `:5080` kalkmıyor | Science imajı / JSON 118 element + bileşik listesi |
| Public TLS / domain | `docs/PUBLIC-HOST.md` + `Caddyfile` + `.env.public.*` |
| Sipariş saga takılı | order outbox + Rabbit + wallet `:5005` + inventory `:5008` |

[← Ana README](../README.md) · [Docker env](../docker/README.md) · [Servis kılavuzu](../docs/SERVIS-KILAVUZU.md)
