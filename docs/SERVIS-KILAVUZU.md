# Servis kılavuzu

Bu belge, ElementAPI’nin parçalarını **insan dilinde** anlatır. Hangi kutu ne işe yarar, kiminle konuşur, hangisini tek başına açmak yeter.

Teknik uç listesi her klasörün kendi `README.md` dosyasındadır. Burada önce resmi gör.

Ürünü üç dakikada göstermek için: [yerel sunum](LOCAL-PRESENTATION.md).

---

## İki dünya, bir repo

| Dünya | Ne görürsün | Hangi kutular |
|-------|-------------|---------------|
| **Atlas ve öğrenme** | Periyodik tablo, bileşik kaydı, laboratuvar, rota, koleksiyon | `science-service` *veya* `catalog` + `compound` + `web-app` (+ hesap için `identity`) |
| **Sanal ticaret** | Piyasa, mağaza, cüzdan, sipariş | `order`, `payment`, `shipment`, `catalog` stok, `notification` |

Laboratuvarda suyu keşfetmek **gerçek bir deney tarifi değildir** ve cüzdanı değiştirmez. Mağazadan altın almak **gerçek para veya kargo değildir**; para birimi ekranda **KREDI** yazar.

Açık bilimsel API (`/api/v2`) herkese açıktır. Cüzdan ve sipariş API anahtarı ister.

---

## Mutfakta kim ne yapar

Tarayıcı neredeyse hiçbir zaman bir servise doğrudan gitmez. Kapı **gateway**’dir (`:5000`).

```
Sen (tarayıcı veya curl)
    → web-app  sayfayı çizer
    → gateway  isteği doğru odaya yollar
         → catalog / compound   “demir nedir, su nedir”
         → identity             “bu kim, oturum, API anahtarı”
         → order                “cüzdan, alış, satış”
         → notification         canlı fiyat haberi (SignalR)

Sipariş oluşunca kuyruk (RabbitMQ) devreye girer:
    order → catalog (stok ayır) → payment (KREDI çek) → shipment (takip no) → bitti
```

**Ödeme ve kargo kapıdan görünmez.** Dışarıdan `localhost:5005` ile ödeme almak yok; yalnız kuyruk mesajı yer.

**Bağımsız atlas** (`:5080`) bu mutfağı kurmaz. Tek kutu hem sayfayı hem `GET /api/v2` yanıtını verir. Hesap, mağaza, sipariş kapalıdır.

---

## Servisler, tek cümle

| Klasör | İnsan cümlesi | Port | README |
|--------|---------------|------|--------|
| [web-app](../web-app/README.md) | Ekranda gördüğün uygulama. | 3000 / 5173 | kılavuz orada |
| [science-service](../science-service/README.md) | Atlas’ı tek kutuda gösteren sade host. DB yok. | 5080 | |
| [gateway-service](../gateway-service/README.md) | Resepsiyon. İsteği doğru odaya verir, anahtar ve hız sınırına bakar. | 5000 | |
| [identity-service](../identity-service/README.md) | Hesap, oturum, API anahtarı, öğrenme kaydı. | 5001 | |
| [catalog-service](../catalog-service/README.md) | 118 element: bilimsel kayıt + sanal fiyat/stok. | 5002 | |
| [compound-service](../compound-service/README.md) | Bileşikler. Eğitim kataloğu ile mağaza ürünü **aynı liste değildir**. | 5007 | |
| [order-service](../order-service/README.md) | Cüzdan, alış emri, satış masası, siparişin yönetmeni. | 5003 | |
| [payment-service](../payment-service/README.md) | “Bu siparişin KREDI’sini çek” diyen işçi. Kendi kasası yok. | 5005 | |
| [shipment-service](../shipment-service/README.md) | Sahte kargo: takip numarası basar, kaydı tutar. | 5004 | |
| [notification-service](../notification-service/README.md) | Fiyat ve sipariş haberini canlı iletir; webhook da vurur. | 5006 | |
| [shared-lib](../shared-lib/README.md) | Ortak kutu: olay isimleri, sağlık uçları, bilimsel API yardımcısı. Çalışmaz. | — | |

Altyapı (ayrı “ürün servisi” değil): PostgreSQL, Redis, RabbitMQ. Compose bunları da ayağa kaldırır.

---

## Hangisini açmalıyım?

**Ürünü göstermek (varsayılan):**

```powershell
./deploy/scripts/present-platform.ps1
```

http://localhost:3000 — her servis kendi konteynerinde.

**Yalnız tablo ve laboratuvar (veritabanı istemiyorum):**

```powershell
./deploy/scripts/present-local.ps1
```

http://127.0.0.1:5080

**Bir satır CSS / bir React dosyası:** Docker web’i yeniden derleme. Gateway zaten `:5000` ise:

```powershell
npm --prefix web-app run dev -- --host 127.0.0.1 --port 5173 --strictPort
```

http://127.0.0.1:5173

**Tek .NET servisi:** o klasörün README’sindeki `dotnet run`. Tüm imajları `up --build` etmek bir UI satırı için gerekmez.

**İsteğe bağlı host döngüsü (varsayılan değil):** `./deploy/scripts/start-local.ps1` — Docker yerine host .NET/Node; smoke `test-smoke.ps1` bunu anar. Günlük yol `present-platform.ps1`.

Durdur: `./deploy/scripts/stop-local.ps1` (volume kalır). Sil: `docker compose --env-file docker/.env down -v`.

---

## “Çalışıyor mu?” diye bakmak

Her backend kutusunda aynı üç kapı vardır:

| Adres | Anlamı |
|-------|--------|
| `/health/live` | Süreç ayakta. |
| `/health/ready` | İşini yapmak için gerekenler (DB, kuyruk…) hazır. |
| `/info` | Ad, sürüm, birkaç link. |

Örnek: `http://localhost:5000/info` (gateway). Ödeme ayrıca Spring `/actuator/health/liveness` kullanır.

`/metrics` ve `/health-ui` **bilinçli olarak yok**; 404 beklenir.

---

## Karışmaması gerekenler

**KREDI yazısı, Elx alanı.** Ekranda para **KREDI**’dir. Kablodaki bazı alanlar hâlâ `balanceElx`, `INSUFFICIENT_ELX` gibi eski isimler taşır. Bu isimleri “düzeltmek” istemeden kırma; kök README’deki sözleşme geçerlidir.

**İki bileşik listesi.** Laboratuvar ve `/compound/h2o` **167 eğitim kaydına** bakar. Mağaza rafları ayrı, kısa bir SKU listesidir. 167 molekülün hepsi satılık ürün olmaz.

**v1 ve v2.** ` /api/v2/elements/fe` bilimsel kayıttır (kütle, özet, foto). `/api/v1/elements/fe` piyasa yüzüdür (fiyat, stok). İkisi aynı demir, farklı iş.

**Kapsam ucu.** `GET /api/v2/coverage` bağımsız atlas’ta (`:5080`) vardır. Gateway tam platformda bu ucu **yok** sayar; uydurma rota eklenmedi.

**E-posta.** Şifre sıfırlama ve adres doğrulama kodu SMTP bekler. Tercih Resend; henüz bağlı değil. Kapalıyken “mail gitti” diye gösterme.

**Laboratuvar.** Kart tıklamak atom seçmektir. Cam tüp, miktar tarifi, tehlikeli madde tarifi yok.

---

## Veriler nerede durur?

Tam platformda tek Postgres, **ayrı veritabanları**:

| Veritabanı | Kim kullanır |
|------------|----------------|
| `element_identity_db` | hesap, anahtar, öğrenme jetonları |
| `element_market_db` | element fiyat/stok |
| `element_compound_db` | mağaza SKU |
| `element_order_db` | sipariş, cüzdan, defter |
| `element_shipment_db` | kargo kaydı |

Bilimsel 118 + 167 kayıt **JSON dosyasıdır** (catalog/compound `Data/`). Atlas fotoğrafları `web-app/public/media/atlas/`. JSON değişince ilgili Docker imajını yeniden derle; eski imaj eski sayıyı döner.

---

## Mesajlaşma (sipariş yolu)

Sipariş bir REST `POST` ile doğar, sonra kuyrukta yürür:

1. Sipariş **Submitted**
2. Katalog stok ayırır → **StockReserved**
3. Ödeme KREDI çeker → **PaymentProcessed** (yetmezse fail + iade)
4. Kargo takip no basar → **ShipmentDispatched**
5. Sipariş **Completed**

Olay isimleri `shared-lib/Events/` içindedir. Node ve Java aynı zarfı kullanır: `Element.Shared.Events:…`

---

## Daha fazla

- [Yerel geliştirme](memory-bank/local-dev.md)
- [Mimari not](memory-bank/architecture.md)
- [İnternet yayını](PUBLIC-HOST.md)
- [Bilimsel katalog sözleşmesi](../deploy/scientific-catalog.md)
- [Ürün senaryoları](PRODUCT-SCENARIOS.md)
