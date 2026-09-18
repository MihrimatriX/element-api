# Bileşik (`compound-service`)

Moleküller ve mağaza etiketleri. **İki ayrı liste** vardır; karıştırma.

> Laboratuvarda suyu keşfetmek eğitim kataloğuna bakar. Mağazada “AuCl₃ sat” SKU listesine bakar. 167 eğitim bileşiği otomatik ürün olmaz.

| | |
|--|--|
| **Port** | `5007` |
| **Teknoloji** | .NET 10 |
| **Veri** | `scientific-compounds.json` + Postgres `element_compound_db` |
| **Kuyruk** | Yok |

Kapı: `GET /api/v2/compounds/**` ve `GET /api/v1/compounds/**` anahtarsız.

---

## Bu kutu ne yapar?

**Eğitim / bilim (v2).** 167 bilinen molekül. 51’inde tam PubChem anlık görüntü ve yapı PNG vardır; yenilerde bazı fiziksel/GHS alanları ve yapı görseli henüz boştur (`media.structure: null`). Allotrop ve preparat bu koleksiyona karışmaz.

**Mağaza (v1).** Kısa SKU: `priceMult`, hangi elemente bağlı, slug (`aucl3`, `elemental-au`). Fiyat = ana element alış × çarpan × gram. Çarpanı bu kutu söyler; tutarı **order** hesaplar.

## Ne yapmaz?

Stok ve sanal borsa fiyatı catalog’dadır. Sipariş yazmaz. İzomerleri (glikoz/fruktoz) ayrı kayıt yapmaz.

## Nasıl açılır?

```powershell
dotnet run --project compound-service/Element.Services.Compound.API/Element.Services.Compound.API.csproj
```

JSON 167’ye çıktıysa imajı yeniden derle; aksi halde API hâlâ 51 dönebilir. Ön yüz Vite’de yerel JSON ile kaydı yine açar.

## Sık istekler

```bash
curl http://localhost:5000/api/v2/compounds/h2o
curl "http://localhost:5000/api/v2/compounds?q=tuz"
curl http://localhost:5000/api/v1/compounds/aucl3
curl http://localhost:5000/api/v1/elements/au/compounds
```

v2 kimlik: slug (`aspirin`) veya PubChem CID.

## Bozulursa

| Belirti | Muhtemel neden |
|---------|----------------|
| v2 51 kayıt | Eski compound imajı |
| Mağazada 167 ürün yok | Beklenen; SKU ayrı dosya |
| Yapı resmi yok | Yeni kayıtta bilinçli null |

[← Ana README](../README.md) · [Servis kılavuzu](../docs/SERVIS-KILAVUZU.md)
