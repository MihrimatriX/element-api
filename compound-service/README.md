# compound-service

Bileşik / allotrop / preparat kataloğu (.NET 9). Fiyat ve stok catalog-service’te kalır.

| | |
|--|--|
| **Port** | `5007` |
| **Discovery** | `GET /api/v1` |
| **Swagger** | [localhost:5007/swagger](http://localhost:5007/swagger) |
| **Info** | `GET /info` |

RabbitMQ yok. Gateway: `GET /api/v1/compounds/**` (anahtarsız).

---

## API

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

Yerel Postgres: `element_compound_db`. Compose portu `5007:8080`.

---

[← Ana README](../README.md)
