# Sipariş ve kasa (`order-service`)

Sanal ticaretin yönetmeni: cüzdan, alış, satış, siparişin adım adım yürümesi.

> “10 000 KREDI ile altın al, sonra masadan sat” burada başlar. Kimya laboratuvarı buraya uğramaz.

| | |
|--|--|
| **Port** | `5003` |
| **Teknoloji** | Node.js 22, TypeScript, Express |
| **Veri** | Postgres `element_order_db` (sipariş, saga, cüzdan, pozisyon, defter) · Redis · RabbitMQ |

Kapı: `http://localhost:5000/api/v1/orders` — **API anahtarı** (`X-API-Key`). Gateway kullanıcıyı `X-User-Id` ile ekler.

---

## Bu kutu ne yapar?

- İlk cüzdan okumasında **10 000 KREDI** bağışlar (simülasyon).
- Alış: `POST /orders` — fiyat **ask**, gram (en fazla dört ondalık). Aynı `Idempotency-Key` ile aynı gövde bir kez ücretlenir; içerik değişirse 409.
- Bakiye yetmezse **402** (reason kabloda `INSUFFICIENT_ELX`; değer KREDI).
- Satış masası: `POST /desk/sell` — `symbol` + `grams` (+ bileşikte `compoundSlug`). NaCl, saf Na gibi satılmaz.
- Siparişi kuyruğa bırakır: stok → ödeme → kargo. Outbox ile mesaj kaybolmasın diye Postgres’te tutar.
- İç uçlar: payment’ın `debit` / `credit` / `refund` çağrıları (`INTERNAL_API_KEY`).

Ekranda para **KREDI**. Kablodaki `balanceElx` vb. bilinçli eski isimlerdir — kök README sözleşmesi.

## Ne yapmaz?

Gerçek tahsilat yok. Katalog fiyatını uydurmaz; catalog HTTP’ye sorar. SKU çarpanını compound’dan alır.

## Nasıl açılır?

Tam platform (payment + shipment + Rabbit olmadan saga yarıda kalır):

```powershell
cd order-service
npm ci
npm run build
npm start
```

Kontrol: `npm run check` (tsc).

## Sık uçlar

| Ne | Yol | Not |
|----|-----|-----|
| Cüzdan | `GET /api/v1/me/wallet` | ilk çağrı grant |
| Pozisyonlar | `GET /api/v1/me/holdings` | gram |
| Al | `POST /api/v1/orders` | 202 |
| Sat | `POST /api/v1/desk/sell` | bid |
| Liste / ara | `GET /api/v1/orders`, `/orders/search` | `q`, `status`, `elementSymbol` |
| İstatistik | `GET /api/v1/orders/stats` | |
| Başkasının siparişi | `GET /orders/{id}` | 404 |

```bash
curl -H "X-API-Key: ele_live_…" http://localhost:5000/api/v1/me/wallet
```

Doğrudan `:5003` deniyorsan `X-User-Id` zorunlu (kapı bunu anahtardan doldurur).

## Ortam

| Değişken | Ne işe yarar |
|----------|----------------|
| `PORT` | varsayılan 8080 (host yayın 5003) |
| `DATABASE_URL` | Postgres |
| `REDIS_URL` | fiyat önbelleği |
| `RABBITMQ_HOST` | saga |
| `CATALOG_SERVICE_URL` | canlı fiyat |
| `COMPOUND_SERVICE_URL` | SKU çarpanı |
| `INTERNAL_API_KEY` | cüzdan iç çağrı |

## Bozulursa

| Belirti | Muhtemel neden |
|---------|----------------|
| Sipariş Submitted’ta kalır | payment veya catalog worker / Rabbit |
| Production’da kısa key reddi | `INTERNAL_API_KEY` compose’ta development kısa; prod’da uzun olmalı |
| Çift çekim | Idempotency-Key yok; aynı siparişi iki UUID ile gönderme |

[← Ana README](../README.md) · [Servis kılavuzu](../docs/SERVIS-KILAVUZU.md)
