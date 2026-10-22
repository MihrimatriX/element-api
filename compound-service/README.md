# Bileşik (`compound-service`)

compound-service iki ayrı liste sunar: eğitim amaçlı moleküller ve mağaza SKU’ları. Bu iki liste birbirine karıştırılmamalı.

Laboratuvarda suyu keşfetmek eğitim kataloğunu kullanır; mağazada AuCl₃ satmak SKU listesini. 214 eğitim bileşiği kendiliğinden mağaza ürünü olmaz.

| | |
|--|--|
| **Port** | `5007` |
| **Teknoloji** | .NET 10 |
| **Veri** | `scientific-compounds.json` + Postgres `element_compound_db` |
| **Kuyruk** | Yok |
| **Komşular** | gateway (HTTP) · catalog (element fiyatı; SKU çarpanı burada) · order (tutar hesabı) · web-app lab (eğitim listesi, çoğu zaman yerel JSON) |

Kapıda `GET /api/v2/compounds/**` ve `GET /api/v1/compounds/**` API anahtarı istemez.

## Bu kutu ne yapar?

Eğitim ve bilim listesinde (v2) 214 bilinen molekül var. 51’inde tam PubChem anlık görüntüsü ve yapı PNG’si bulunur; yeni kayıtlarda bazı fiziksel/GHS alanları ve yapı görseli henüz boştur (`media.structure: null`). Allotrop ve preparatlar bu koleksiyona girmez.

Mağaza listesi (v1) kısa SKU kayıtlarından oluşur: `priceMult`, bağlı olduğu element ve slug (`aucl3`, `elemental-au`). Fiyat = ana elementin alış fiyatı × çarpan × gram. Çarpanı bu servis verir, tutarı order hesaplar.

v2’de kayıt slug (`aspirin`, `h2o`) veya PubChem CID ile istenir. `fields`, `view` ve ETag, bilimsel catalog’daki gibi çalışır.

## Ne yapmaz?

Stok inventory’de, sanal borsa last/bid/ask değerleri catalog’dadır. Bu servis sipariş yazmaz, izomerleri (glikoz/fruktoz) ayrı kayıt olarak tutmaz ve Rabbit dinlemez.

## Kimle konuşur?

```
tarayıcı → gateway → compound (v1/v2 GET)
order → compound SKU + catalog ask  (fiyat hesabı; stok inventory)
web-app /lab → çoğu zaman bilinen-molekül JSON (bu servis şart değil)
science-service → aynı bilimsel JSON’u tek başına sunar (DB yok)
```

## Nasıl açılır?

Tam platform: `./deploy/scripts/present-platform.ps1`.

Yalnız bu servis:

```powershell
docker compose --env-file docker/.env up -d --build compound-service
```

Host’ta (Postgres ayaktayken):

```powershell
dotnet run --project compound-service/Element.Services.Compound.API/Element.Services.Compound.API.csproj
```

JSON 214 kayda çıktıysa imajı yeniden derle; yoksa API hâlâ 51 kayıt dönebilir. Vite’deki ön yüz kaydı yerel JSON’dan yine açar. Atlas ve bilim verisini yenilemek için `node deploy/scripts/refresh-compound-properties.mjs` (ve atlas script’leri).

## Sık istekler

```bash
curl http://localhost:5000/api/v2/compounds/h2o
curl "http://localhost:5000/api/v2/compounds?q=tuz"
curl http://localhost:5000/api/v1/compounds/aucl3
curl http://localhost:5000/api/v1/elements/au/compounds
```

Doğrudan erişim `:5007` üzerinden. Swagger (Development): http://localhost:5007/swagger

## Bozulursa

| Belirti | Muhtemel neden |
|---------|----------------|
| v2 51 kayıt | Eski compound imajı / Release’de eski JSON |
| Mağazada 214 ürün yok | Beklenen durum; SKU’lar ayrı dosyada |
| Yapı resmi yok | Yeni kayıtta bilinçli null (`media.structure`) |
| 502 mağaza | Gateway cluster’ı sorunlu veya compound ayağa kalkmamış |
| Lab molekül bulamıyor | web-app `known-compounds.json` dosyasına bakar, bu servise HTTP isteği atmaz |

[← Ana README](../README.md) · [Servis kılavuzu](../docs/SERVIS-KILAVUZU.md) · [Catalog](../catalog-service/README.md)
