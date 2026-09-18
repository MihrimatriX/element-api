# Element kataloğu (`catalog-service`)

118 elementin evi. İki yüzü var: **bilim** (kütle, anlatım, foto) ve **piyasa** (sanal fiyat, stok).

> Demir kaydı, ticker, stok ayırma burada. Su molekülü burada değildir — o `compound-service`.

| | |
|--|--|
| **Port** | `5002` |
| **Teknoloji** | .NET 10 |
| **Veri** | JSON bilimsel anlık görüntü + Postgres `element_market_db` + Redis fiyat |

---

## Bu kutu ne yapar?

**Bilim (v2).** `scientific-elements.json` dosyasından okur. PubChem kaynaklı özellikler, Türkçe özet, varsa Commons fotoğraf. Bilinmeyen değer **null** kalır, sıfır uydurulmaz. `fields`, `view`, `include`, ETag desteklenir.

**Piyasa (v1).** Arama, kategori, komşu hücre, sanal last/bid/ask, hareket listesi, fiyat geçmişi. Geçmiş kapıdan API anahtarı ister; ticker herkese açıktır.

**Sipariş yolu.** Kuyruktan “şu sipariş için stok ayır” gelir. Ayırır veya reddeder. Redis fiyatı kısa süre hatırlar.

## Ne yapmaz?

Bileşik formülü ve mağaza SKU’su yok. Öğrenme ilerlemesi yok. Fotoğraf eksiğini rastgele görselle doldurmaz (`media.photo: null` bilinçli olabilir).

## Nasıl açılır?

Tam platform ile. Host (Postgres/Redis/Rabbit ayakta):

```powershell
dotnet run --project catalog-service/Element.Services.Element.API/Element.Services.Element.API.csproj
```

JSON’u değiştirdikten sonra **Release klasöründeki eski kopya** kalabilir; imajı veya host sürecini yeniden derle. `-NoBuild` eski anlık görüntüyü bırakır.

Atlas anlatımını JSON’a basmak: `node deploy/scripts/refresh-atlas.mjs` (ağdan medya: `--fetch`).

## Sık istekler

Kapı: `http://localhost:5000` · doğrudan: `:5002`

```bash
# Bilim — Demir
curl http://localhost:5000/api/v2/elements/fe
curl "http://localhost:5000/api/v2/elements/fe?fields=symbol,names,editorial.summary"

# Piyasa
curl "http://localhost:5002/api/v1/elements/search?q=altin"
curl http://localhost:5000/api/v1/elements/au/ticker
curl http://localhost:5000/api/v1/market/movers
```

Tek kayıt: sembol (`fe`), atom no (`26`) veya id (`fe-26`).

Swagger: http://localhost:5002/swagger (kapı `/swagger` buraya proxy’ler).

### v2 liste parametreleri

`view`, `include`, `fields`, `q`, `category`, `block`, `group`, `period`, `page`, `pageSize`

### v1 liste parametreleri

`category`, `block`, `phase`, `group`, `period`, `minPrice`, `maxPrice`, `inStock`, `sort`, `order`, `page`, `pageSize`

Sözleşme: [deploy/scientific-catalog.md](../deploy/scientific-catalog.md).

## Bozulursa

| Belirti | Muhtemel neden |
|---------|----------------|
| Foto yok, şema var | Çoğu elementte bilinçli boş; lisanslı numune yok |
| Fe 200 ama özet eski | Atlas script çalışmadı veya imaj eski JSON taşıyor |
| Sipariş stokta takılı | Rabbit veya bu servisin saga tüketicisi düşmüş |

[← Ana README](../README.md) · [Servis kılavuzu](../docs/SERVIS-KILAVUZU.md)
