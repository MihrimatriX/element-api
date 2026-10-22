# Element kataloğu (`catalog-service`)

catalog-service 118 elementin kaydını tutar. İki iş yapar: bilimsel veriyi (kütle, anlatım, fotoğraf) sunar ve sanal piyasa fiyatını yönetir.

Demir kaydı ve ticker buradadır. Su molekülü burada değil, `compound-service`’tedir. Gram stok artık inventory-service’te tutulur; catalog yalnız fiyat nudge olaylarını dinler.

| | |
|--|--|
| **Port** | `5002` |
| **Teknoloji** | .NET 10 |
| **Veri** | JSON bilimsel anlık görüntü + Postgres `element_market_db` |
| **Redis** | Yok (kasıtlı; gateway/identity hâlâ Redis kullanır) |
| **Komşular** | gateway · inventory (stok) · order (fiyat okur) · wallet/desk, ElementSold ile (fiyat nudge) · compound (ayrı liste) |

## Bu kutu ne yapar?

Bilim uçları (v2) `scientific-elements.json` dosyasını okur. Özellikler PubChem kaynaklıdır; yanında Türkçe özet ve varsa Commons fotoğrafı bulunur. Bilinmeyen değer null kalır, yerine sıfır yazılmaz. `fields`, `view`, `include` ve ETag desteklenir.

Piyasa uçları (v1) arama, kategori, komşu hücre, sanal last/bid/ask, hareket listesi ve fiyat geçmişi sunar. Fiyat geçmişi kapıdan API anahtarı ister; ticker herkese açıktır.

Sipariş tamamlanınca kuyruktan `OrderCompleted` veya `ElementSold` gelir ve catalog fiyatı biraz iter (market maker). Stok ayırma ve düşüm inventory’de yapılır; eski stok consumer dosyaları kayıtlı değildir.

Ticker’daki `availableStock` yalnız gösterim için duran eski (legacy) bir değer olabilir; sipariş ön kontrolü inventory’ye bakar.

## Ne yapmaz?

Bileşik formülü, mağaza SKU’su, öğrenme ilerlemesi ve stok rezervasyonu burada değildir. Eksik fotoğrafı rastgele bir görselle doldurmaz (`media.photo: null` bilinçli olabilir).

## Kimle konuşur?

```
GET bilim/piyasa  → gateway → catalog
order ön-kontrol   → catalog (ask) + inventory (stok) + wallet (bakiye)
OrderCompleted / ElementSold → catalog (yalnız fiyat nudge; stok yok)
```

## Nasıl açılır?

Tam platform: `./deploy/scripts/present-platform.ps1`.

Yalnız bu servis: `docker compose --env-file docker/.env up -d --build catalog-service`

Host’ta (Postgres ve Rabbit ayaktayken):

```powershell
dotnet run --project catalog-service/Element.Services.Element.API/Element.Services.Element.API.csproj
```

JSON’u değiştirdikten sonra Release klasöründe eski kopya kalabilir; imajı veya host sürecini yeniden derle. `-NoBuild` ile açarsan eski anlık görüntü kullanılır.

Atlas anlatımını JSON’a yazmak için `node deploy/scripts/refresh-atlas.mjs` çalıştır (medyayı ağdan indirmek için `--fetch` ekle).

## Sık istekler

İstekler kapıdan (`http://localhost:5000`) ya da doğrudan `:5002` üzerinden gönderilir.

```bash
# Bilim — Demir
curl http://localhost:5000/api/v2/elements/fe
curl "http://localhost:5000/api/v2/elements/fe?fields=symbol,names,editorial.summary"

# Piyasa
curl "http://localhost:5002/api/v1/elements/search?q=altin"
curl http://localhost:5000/api/v1/elements/au/ticker
curl http://localhost:5000/api/v1/market/movers
```

Tek kayıt sembolle (`fe`), atom numarasıyla (`26`) veya id ile (`fe-26`) istenir.

Swagger: http://localhost:5002/swagger (kapıdaki `/swagger` buraya yönlendirir).

### v2 liste parametreleri

`view`, `include`, `fields`, `q`, `category`, `block`, `group`, `period`, `page`, `pageSize`

### v1 liste parametreleri

`category`, `block`, `phase`, `group`, `period`, `minPrice`, `maxPrice`, `inStock`, `sort`, `order`, `page`, `pageSize`

Sözleşme: [deploy/scientific-catalog.md](../deploy/scientific-catalog.md).

## Bozulursa

| Belirti | Muhtemel neden |
|---------|----------------|
| Foto yok, şema var | Çoğu elementte bilinçli boş; lisanslı numune yok |
| Fe 200 ama özet eski | Atlas script’i çalışmadı veya imaj eski JSON taşıyor |
| Sipariş stokta takılı | inventory worker’ı veya Rabbit; catalog stok tutmaz |
| Fiyat hiç oynamıyor | `OrderCompleted` / `ElementSold` consumer’ı veya PriceSimulator |

[← Ana README](../README.md) · [Servis kılavuzu](../docs/SERVIS-KILAVUZU.md)
