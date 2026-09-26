# Servis kılavuzu

Bu belge, ElementAPI’nin parçalarını **insan dilinde** anlatır. Hangi kutu ne işe yarar, kiminle konuşur, hangisini tek başına açmak yeter.

Teknik uç listesi her klasörün kendi `README.md` dosyasındadır. Burada önce resmi gör.

Ürünü üç dakikada göstermek için: [yerel sunum](LOCAL-PRESENTATION.md).

---

## İki dünya, bir repo

| Dünya | Ne görürsün | Hangi kutular |
|-------|-------------|---------------|
| **Atlas ve öğrenme** | Periyodik tablo, bileşik kaydı, laboratuvar, rota, koleksiyon | `science-service` *veya* `catalog` + `compound` + `web-app` (+ hesap için `identity`) |
| **Sanal ticaret** | Piyasa, mağaza, cüzdan, sipariş | `order` + `wallet` + `inventory` + `shipment` + `notification` (+ `catalog` fiyat) |

Laboratuvarda suyu keşfetmek **gerçek bir deney tarifi değildir** ve cüzdanı değiştirmez. Mağazadan altın almak **gerçek para veya kargo değildir**; para birimi ekranda **KREDI** yazar.

Açık bilimsel API (`/api/v2`) herkese açıktır. Cüzdan ve sipariş API anahtarı ister.

---

## Mutfakta kim ne yapar

Tarayıcı neredeyse hiçbir zaman bir servise doğrudan gitmez. Kapı **gateway**’dir (`:5000`, YARP).

```
Sen (tarayıcı veya curl)
    → web-app  sayfayı çizer
    → gateway  isteği doğru odaya yollar
         → catalog / compound   “demir nedir, su nedir, fiyat nedir”
         → identity             “bu kim, oturum, API anahtarı”
         → order                “sipariş ver / durum”
         → wallet               “bakiye, holdings, masa satışı”
         → inventory            “kaç gram kaldı”

Sipariş oluşunca kuyruk (RabbitMQ):
    order → inventory (stok ayır)
         → wallet (KREDI çek — PaymentRequested)
         → shipment (takip no)
         → inventory (kalıcı düşüm) + wallet (holdings) + catalog (fiyat nudge)
```

**Ayrı payment kutusu yok.** KREDI `wallet-service` (Java, `:5005`). Stok `inventory-service` (Java, `:5008`). Notification yalnız webhook (`order.updated`). Fiyatlar sayfa anketiyle gelir.

**Bağımsız atlas** (`:5080`) bu mutfağı kurmaz. Tek kutu hem sayfayı hem `GET /api/v2` yanıtını verir. Hesap, mağaza, sipariş kapalıdır.

---

## Servisler, tek cümle

| Klasör | İnsan cümlesi | Port | README |
|--------|---------------|------|--------|
| [web-app](../web-app/README.md) | Ekranda gördüğün uygulama. | 3000 / 5173 | kılavuz orada |
| [science-service](../science-service/README.md) | Atlas’ı tek kutuda gösteren sade host. DB yok. | 5080 | |
| [gateway-service](../gateway-service/README.md) | Resepsiyon (YARP). İsteği doğru odaya verir; kayıt 5/dk, auth 15/dk, genel 60/10sn. | 5000 | |

| [identity-service](../identity-service/README.md) | Hesap, oturum, API anahtarı, öğrenme kaydı. | 5001 | |
| [catalog-service](../catalog-service/README.md) | 118 element: bilimsel kayıt + sanal fiyat (stok inventory’de). | 5002 | |
| [compound-service](../compound-service/README.md) | Bileşikler. Eğitim kataloğu ile mağaza ürünü **aynı liste değildir**. | 5007 | |
| [order-service](../order-service/README.md) | Sipariş saga’sının yönetmeni. KREDI ve stok için event yollar. | 5003 | |
| [wallet-service](../wallet-service/README.md) | KREDI cüzdan, defter, holdings, masa satışı. Java. | 5005 | |
| [inventory-service](../inventory-service/README.md) | Stok ayırma / serbest bırakma / kalıcı düşüm. Java. | 5008 | |
| [shipment-service](../shipment-service/README.md) | Sahte kargo: takip numarası basar, kaydı tutar. | 5004 | |
| [notification-service](../notification-service/README.md) | Sipariş webhook’u (`order.updated`). Canlı fiyat kanalı yok. | 5006 | |
| [shared-lib](../shared-lib/README.md) | Ortak kutu: olay isimleri, sağlık uçları, bilimsel API yardımcısı. Çalışmaz. | — | |

Altyapı (ayrı “ürün servisi” değil): PostgreSQL, Redis, RabbitMQ. Compose bunları da ayağa kaldırır.

### Operatör klasörleri (ürün servisi değil)

| Klasör | İnsan cümlesi | README |
|--------|---------------|--------|
| [deploy/](../deploy/README.md) | Script’ler, testler, atlas verisi, Caddy taslağı. “Şunu çalıştır” burada. | kullanım kılavuzu |
| [docker/](../docker/README.md) | Env örnekleri, Postgres init. Compose dosyaları kökte; sırlar burada. | kullanım kılavuzu |
| [docs/](./README.md) | İnsan belgeleri indeksi. Memory bank + bu kılavuz. İkinci paralel sistem yok. | giriş |

Agent notları (İngilizce, kısa): [deploy/AGENTS.md](../deploy/AGENTS.md).

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

**Tek .NET / Java / Node servisi:** o klasörün README’sindeki `dotnet run` / `mvn` / `npm start`. Tüm imajları `up --build` etmek bir UI satırı için gerekmez.

Durdur: `./deploy/scripts/stop-local.ps1` (volume kalır). Sil: `docker compose --env-file docker/.env down -v`.

---

## “Çalışıyor mu?” diye bakmak

Her backend kutusunda aynı üç kapı vardır:

| Adres | Anlamı |
|-------|--------|
| `/health/live` | Süreç ayakta. |
| `/health/ready` | İşini yapmak için gerekenler (DB, kuyruk…) hazır. |
| `/info` | Ad, sürüm, birkaç link. |

Örnek: `http://localhost:5000/info` (gateway). Wallet/inventory Spring `/actuator/health` de sunar; Docker `wget /health` kullanır.

`/metrics` ve `/health-ui` **bilinçli olarak yok**; 404 beklenir.

---

## Karışmaması gerekenler

**KREDI yazısı, Elx alanı.** Ekranda para **KREDI**’dir. Kablodaki bazı alanlar hâlâ `balanceElx`, `INSUFFICIENT_ELX` gibi eski isimler taşır. Bu isimleri “düzeltmek” istemeden kırma; kök README’deki sözleşme geçerlidir.

**İki bileşik listesi.** Laboratuvar ve `/compound/h2o` **167 eğitim kaydına** bakar. Mağaza rafları ayrı, kısa bir SKU listesidir. 167 molekülün hepsi satılık ürün olmaz.

**Stok vs fiyat.** Gram stok `inventory-service`’tedir. Catalog ticker’daki `availableStock` gösterim/legacy olabilir; sipariş ön-kontrolü inventory’ye bakar. Catalog kuyrukta yalnız fiyat nudge dinler.

**Saga sırası.** Stok ayır → `PaymentRequested` → wallet debit → shipment → Completed (+ holdings + kalıcı stok). Ayrı payment JVM yok.

**Öğrenme kaydı.** Hesaplı ilerleme hâlâ identity token’larında; ayrı Learning Progress servisi yok.

**Yayın öncesi.** Ne ship’e yeter, ne engel, ne sonra: kök [README — Eksikler ve yapmak istediğimizler](../README.md#eksikler-ve-yapmak-istediklerimiz).

---

## Belge haritası (kısa)

| Ne arıyorsun | Nereye |
|--------------|--------|
| Bu tur (insan dili) | bu dosya |
| Docs indeksi | [README.md](./README.md) |
| Ürün / mimari / son iş | [memory-bank/](./memory-bank/README.md) |
| Üç dakikalık sunum | [LOCAL-PRESENTATION.md](./LOCAL-PRESENTATION.md) |
| Script / test / atlas | [deploy/README.md](../deploy/README.md) |
| `.env` / port / init | [docker/README.md](../docker/README.md) |
| Public domain | [PUBLIC-HOST.md](./PUBLIC-HOST.md) |
| Bilimsel v2 sözleşme | [deploy/scientific-catalog.md](../deploy/scientific-catalog.md) |
