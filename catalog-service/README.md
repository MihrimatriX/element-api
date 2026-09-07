# catalog-service

Periyodik tablo element kataloğu — arama, filtreleme, karşılaştırma, fiyat geçmişi, stok saga (.NET 9).

| | |
|--|--|
| **Port** | `5002` |
| **Discovery** | `GET /api/v1` |
| **Swagger** | [localhost:5002/swagger](http://localhost:5002/swagger) |
| **Info** | `GET /info` |

---

## Sorumluluklar

- 118 element kataloğu (fiyat, stok, periyodik tablo metadata)
- **Bilimsel v2** kayıtları (`scientific-elements.json`: PubChem kaynaklı özellikler + atlas `editorial` / `media` / `external_links`)
- Gelişmiş **arama ve filtreleme**
- Saga: `OrderSubmittedEvent` → stok ayırma
- gRPC fiyat sorgusu (internal)
- Redis fiyat önbelleği

---

## API endpoint'leri

### Bilimsel katalog (v2)

| Method | Path | Açıklama |
|--------|------|----------|
| GET | `/api/v2/elements` | Liste — `view`, `include`, `fields`, `q`, `category`, `block`, `group`, `period`, `page`, `pageSize` |
| GET | `/api/v2/elements/{id}` | Tek kayıt — sembol (`fe`), atom no (`26`) veya id (`fe-26`) |

Gateway üzerinden public; ETag + CORS. Plan: [deploy/scientific-catalog.md](../deploy/scientific-catalog.md). Atlas yeniden uygulama: `node deploy/scripts/refresh-atlas.mjs`.

### Keşif

| Method | Path | Açıklama |
|--------|------|----------|
| GET | `/api/v1` | Tüm kaynak linkleri |

### Elementler

| Method | Path | Açıklama |
|--------|------|----------|
| GET | `/api/v1/elements` | Liste — filtre: `category`, `block`, `phase`, `group`, `period`, `minPrice`, `maxPrice`, `inStock`, `sort`, `order`, `page`, `pageSize` |
| GET | `/api/v1/elements/search?q=` | **Arama** — ad, Türkçe ad, sembol, atom numarası |
| GET | `/api/v1/elements/random` | Rastgele element |
| GET | `/api/v1/elements/compare?symbols=au,ag` | Yan yana karşılaştırma (2–6 sembol) |
| GET | `/api/v1/elements/{symbol}` | Tek element |
| GET | `/api/v1/elements/{symbol}/ticker` | Public last/bid/ask, sparkline, 24s Δ (yoksa null) |
| GET | `/api/v1/market/movers` | En büyük \|Δ\| |
| GET | `/api/v1/market/board` | Tüm semboller — heatmap |
| GET | `/api/v1/elements/{symbol}/neighbors` | Periyodik tablo komşuları |
| GET | `/api/v1/elements/{symbol}/related` | Aynı kategori, yakın atom numarası |
| GET | `/api/v1/elements/{symbol}/history` | Fiyat geçmişi (gateway'de API key) |

### Kategoriler & istatistik

| Method | Path | Açıklama |
|--------|------|----------|
| GET | `/api/v1/categories` | Kategori listesi |
| GET | `/api/v1/categories/{slug}` | Kategori detay |
| GET | `/api/v1/categories/{slug}/elements` | Kategorideki elementler |
| GET | `/api/v1/statistics` | Genel istatistikler |
| GET | `/api/v1/statistics/category/{name}` | Kategori bazlı |

### Ops

| Path | Açıklama |
|------|----------|
| `/info`, `/health`, `/health/live`, `/health/ready` | Standart ops |
| `/swagger` | OpenAPI (her zaman açık) |

---

## Arama örnekleri

```bash
# İsimle ara
curl "http://localhost:5002/api/v1/elements/search?q=altin"

# Fiyat aralığı + stokta olanlar
curl "http://localhost:5002/api/v1/elements?minPrice=10&inStock=true&sort=price&order=desc"
```

---

## Bağımlılıklar

| Kaynak | Açıklama |
|--------|----------|
| PostgreSQL `element_market_db` | Element + stok |
| Redis | Fiyat cache |
| RabbitMQ | Saga event'leri |

---

## Çalıştırma

```bash
# Host (tercih) — Postgres/Redis/Rabbit kök compose veya start-local
dotnet run --project Element.Services.Element.API/Element.Services.Element.API.csproj

# İsteğe bağlı lokal compose
cd catalog-service && docker compose up -d --build
```

Atlas JSON değişince stale Release `Data/` için `start-local.ps1 -Restart` (veya rebuild) kullanın; `-NoBuild` eski snapshot bırakabilir.

---

[← Ana README](../README.md)
