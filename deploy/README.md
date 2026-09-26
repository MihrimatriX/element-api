# Deploy — operatör köşesi

Bu klasör **ürün kodu değil**. Script’ler, testler, atlas verisi ve Caddy taslağı burada durur. Ürünü ayağa kaldırmak, durdurmak, smoke atmak, bilimsel JSON’u yenilemek için buraya bak.

> Agent notları İngilizce: [AGENTS.md](./AGENTS.md). İnsan turu: [servis kılavuzu](../docs/SERVIS-KILAVUZU.md). Env dosyaları: [docker/](../docker/README.md).

---

## Ne işe yarar?

| Alt klasör / dosya | Ne |
|--------------------|----|
| `scripts/` | Sunum, durdurma, derleme, test, atlas yenileme |
| `tests/` | .NET birim + entegrasyon; gateway testleri; public env self-check |
| `data/` | Atlas medya seçimleri (`atlas-media.json`, editorial) |
| `Caddyfile.elements-api*` | Public host reverse proxy taslağı |
| `scientific-catalog.md` | Bilimsel v2 API sözleşmesi |

Compose dosyaları repo **kökünde** (`docker-compose.yml` vb.). Sırlar `docker/.env` içinde. Deploy klasörü “nasıl çalıştırırım”ın eli.

---

## Günlük komutlar (şunu çalıştır)

Docker Desktop açık olsun. Repo kökünden:

**Tam platform (varsayılan sunum):**

```powershell
./deploy/scripts/present-platform.ps1
```

→ http://localhost:3000 · API http://localhost:5000  
`docker/.env` yoksa script `docker/.env.example`’dan kopyalar. Hazır imajlarla: `-NoBuild`.

**Yalnız atlas (DB / broker yok):**

```powershell
./deploy/scripts/present-local.ps1
```

→ http://127.0.0.1:5080 (`docker-compose.science.yml`)

**Public (Caddy overlay, ortama göre):**

```powershell
./deploy/scripts/present-public.ps1 -Environment Dev
# veya -All → yerel :8080 / :8081 / :8082 yan yana
```

Ayrıntı: [PUBLIC-HOST.md](../docs/PUBLIC-HOST.md).

**Durdur (volume kalır):**

```powershell
./deploy/scripts/stop-local.ps1
# Public yığın: -Public veya -Environment Dev
```

Silmek (veri gider): `docker compose --env-file docker/.env down -v`.

Eski `start-local.ps1` hâlâ duruyor; günlük yol `present-platform` / `present-local`.

---

## Script haritası

### Sunum

| Script | Ne yapar |
|--------|----------|
| `present-platform.ps1` | Tam `docker compose up -d [--build]` |
| `present-local.ps1` | Science compose → `:5080` |
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

Örnek: `./deploy/scripts/test-all.ps1 -Integration -Live` — imaj yeniden derlemez; JDK/Maven/npm kurulu olmalı.

### Atlas / bilimsel veri

| Script | Ne yapar |
|--------|----------|
| `refresh-atlas.mjs` | Anlatım + medya URL’lerini JSON’a basar; `--fetch` ağdan indirir |
| `refresh-element-properties.mjs` | Element PubChem özellikleri |
| `refresh-compound-properties.mjs` | Bileşik özellikleri (`--force`) |
| `refresh-scientific-catalog.mjs` | Katalog yenileme orkestrasyonu |
| `apply-known-compounds.mjs` | Lab bilinen-molekül listesi |
| `fix-element-photos.mjs` / `write-media-inventory.mjs` | Fotoğraf / envanter |

JSON değişince ilgili Docker imajını yeniden derle; `-NoBuild` eski anlık görüntüyü bırakır.

---

## Operatör notları

- **Tek satır UI** için bütün stack’i `--build` etme. Gateway `:5000` ayaktaysa: `npm --prefix web-app run dev` → `:5173`.
- Bu makinede Redis host’ta genelde **6380**; `6379` başka uygulamaya ait olabilir. Postgres `POSTGRES_HOST_PORT` (varsayılan 5432; doluysa `5434`).
- Observability yığını **yok**. `/metrics` ve `/health-ui` 404 beklenir.
- Lab rotası **`/lab`**. `/stack` eski yönlendirme.
- FAL, Commons için izinli lisans. `media.photo: null` çoğu zaman bilinçli.

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
