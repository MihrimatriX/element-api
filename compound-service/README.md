# compound-service

Bileşik / allotrop / preparat kataloğu (.NET 9). Fiyat ve stok catalog-service’te kalır.

| | |
|--|--|
| **Port** | `5007` |
| **Discovery** | `GET /api/v1` |
| **Swagger** | [localhost:5007/swagger](http://localhost:5007/swagger) |
| **Info** | `GET /info` |

RabbitMQ yok. Gateway: `GET /api/v1/compounds/**` ve `GET /api/v2/compounds/**` (anahtarsız).

---

## API

### Bilimsel katalog (v2)

| Method | Path | Açıklama |
|--------|------|----------|
| GET | `/api/v2/compounds` | Liste — `q`, `view`, `include`, `fields`, `page`, `pageSize` |
| GET | `/api/v2/compounds/{id}` | Tek kayıt — slug (`aspirin`) veya PubChem CID |

Saf bileşikler; preparat/allotrop bu koleksiyona karışmaz. Atlas alanları + PubChem yapı görselleri `refresh-atlas.mjs` ile uygulanır.

### Mağaza / SKU (v1)

| Method | Path | Açıklama |
|--------|------|----------|
| GET | `/api/v1/compounds` | Liste — `element`, `kind`, `q`, `page`, `pageSize` |
| GET | `/api/v1/compounds/{slug}` | Tek kayıt (`aucl3`, `elemental-au`) |
| GET | `/api/v1/elements/{symbol}/compounds` | Kolaylık: o elementin ürünleri |

Fiyat = ana element alış × `priceMult` × gram. Bu servis çarpanı döner; sipariş fiyatını order-service hesaplar.

---

## Ops

`/info`, `/health`, `/health/live`, `/health/ready`

---

## Bağımlılıklar

| Kaynak | Açıklama |
|--------|----------|
| PostgreSQL `element_compound_db` | Compounds tablosu |

---

## Çalıştırma

```bash
dotnet run --project Element.Services.Compound.API/Element.Services.Compound.API.csproj
```

Yerel Postgres: `element_compound_db`. Compose portu `5007:8080`. Günlük yol: kök `start-local.ps1`.

---

[← Ana README](../README.md)
