# Bileşik (`compound-service`)

Moleküller ve mağaza etiketleri. **İki ayrı liste** vardır; karıştırma.

> Laboratuvarda suyu keşfetmek eğitim kataloğuna bakar. Mağazada “AuCl₃ sat” SKU listesine bakar. 167 eğitim bileşiği otomatik ürün olmaz.

| | |
|--|--|
| **Port** | `5007` |
| **Teknoloji** | .NET 10 |
| **Veri** | `scientific-compounds.json` + Postgres `element_compound_db` |
| **Kuyruk** | Yok |
| **Komşular** | gateway (HTTP) · catalog (element fiyatı; SKU çarpanı burada) · order (tutar hesabı) · web-app lab (eğitim listesi, çoğu zaman yerel JSON) |

Kapı: `GET /api/v2/compounds/**` ve `GET /api/v1/compounds/**` anahtarsız.

---

## Bu kutu ne yapar?

**Eğitim / bilim (v2).** 167 bilinen molekül. 51’inde tam PubChem anlık görüntü ve yapı PNG vardır; yenilerde bazı fiziksel/GHS alanları ve yapı görseli henüz boştur (`media.structure: null`). Allotrop ve preparat bu koleksiyona karışmaz.

**Mağaza (v1).** Kısa SKU: `priceMult`, hangi elemente bağlı, slug (`aucl3`, `elemental-au`). Fiyat = ana element alış × çarpan × gram. Çarpanı bu kutu söyler; tutarı **order** hesaplar.

v2 kimlik: slug (`aspirin`, `h2o`) veya PubChem CID. `fields` / `view` / ETag bilimsel catalog ile aynı aile.

## Ne yapmaz?

Stok **inventory**’dedir. Sanal borsa last/bid/ask **catalog**’dadır. Sipariş yazmaz. İzomerleri (glikoz/fruktoz) ayrı kayıt yapmaz. Rabbit dinlemez.

## Kimle konuşur?

```
tarayıcı → gateway → compound (v1/v2 GET)
order → compound SKU + catalog ask  (fiyat hesabı; stok inventory)
web-app /lab → çoğu zaman bilinen-molekül JSON (bu servis şart değil)
science-service → aynı bilimsel JSON’u tek başına sunar (DB yok)
```

## Nasıl açılır?

Tam platform: `./deploy/scripts/present-platform.ps1`.

Tek servis:

```powershell
docker compose --env-file docker/.env up -d --build compound-service
```

Host (Postgres ayaktayken):

```powershell
dotnet run --project compound-service/Element.Services.Compound.API/Element.Services.Compound.API.csproj
```

JSON 167’ye çıktıysa imajı yeniden derle; aksi halde API hâlâ 51 dönebilir. Ön yüz Vite’de yerel JSON ile kaydı yine açar. Atlas/bilim yenileme: `node deploy/scripts/refresh-compound-properties.mjs` (ve atlas script’leri).

## Sık istekler

```bash
curl http://localhost:5000/api/v2/compounds/h2o
curl "http://localhost:5000/api/v2/compounds?q=tuz"
curl http://localhost:5000/api/v1/compounds/aucl3
curl http://localhost:5000/api/v1/elements/au/compounds
```

Doğrudan: `:5007`. Swagger (Development): http://localhost:5007/swagger

## Bozulursa

| Belirti | Muhtemel neden |
|---------|----------------|
| v2 51 kayıt | Eski compound imajı / Release’de eski JSON |
| Mağazada 167 ürün yok | Beklenen; SKU ayrı dosya |
| Yapı resmi yok | Yeni kayıtta bilinçli null (`media.structure`) |
| 502 mağaza | Gateway cluster veya compound kalkmamış |
| Lab molekül bulamıyor | web-app `known-compounds.json` — bu HTTP değil |

[← Ana README](../README.md) · [Servis kılavuzu](../docs/SERVIS-KILAVUZU.md) · [Catalog](../catalog-service/README.md)
