# Servis kılavuzu

Bu belge ElementAPI'nin parçalarını sade bir dille anlatır: hangi servis ne işe yarar, hangi servislerle konuşur, hangisini tek başına çalıştırmak yeter.

Bu sayfa genel resmi verir. Her servisin ayrıntısı (uçlar, mesajlar, yapılandırma, dosya dosya kod haritası) [sistem kılavuzunda](kilavuz/README.md) servis başına bir sayfadadır; aynı sayfalar uygulamada `/kilavuz` adresinde okunur. Bir servisi nasıl çalıştıracağın, klasörünün kendi `README.md` dosyasında yazar.

Ürünü üç dakikada göstermek için: [yerel sunum](LOCAL-PRESENTATION.md).

---

## İki dünya, bir repo

| Dünya | Ne görürsün | Hangi servisler |
|-------|-------------|---------------|
| Atlas ve öğrenme | Periyodik tablo, bileşik kaydı, laboratuvar, rota, koleksiyon | `science-service` *veya* `catalog` + `compound` + `web-app` (+ hesap için `identity`) |
| Sanal ticaret | Piyasa, mağaza, cüzdan, sipariş | `order` + `wallet` + `inventory` + `shipment` + `notification` (+ `catalog` fiyat) |

Laboratuvarda suyu keşfetmek gerçek bir deney tarifi değildir ve cüzdanı değiştirmez. Mağazadan altın almak gerçek para veya kargo içermez; ekranda para birimi KREDI olarak yazar.

Açık bilimsel API (`/api/v2`) herkese açıktır. Cüzdan ve sipariş API anahtarı ister.

---

## Mutfakta kim ne yapar

Tarayıcı neredeyse hiçbir zaman bir servise doğrudan gitmez; istekler gateway üzerinden geçer (`:5000`, YARP).

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

Ayrı bir payment servisi yok. KREDI `wallet-service` (Java, `:5005`), stok `inventory-service` (Java, `:5008`) içinde tutulur. Notification yalnız webhook gönderir (`order.updated`). Sayfa fiyatları periyodik sorguyla (polling) alır.

Bağımsız atlas (`:5080`) bu servisleri başlatmaz. Tek bir servis hem sayfayı hem `GET /api/v2` yanıtını verir. Hesap, mağaza ve sipariş kapalıdır.

---

## Servisler, tek cümle

| Klasör | Kısaca | Port | İçi |
|--------|---------------|------|-----|
| [web-app](../web-app/README.md) | Ekranda gördüğün uygulama. | 6241 / 5173 | [kılavuz](kilavuz/web-app.md) |
| [science-service](../science-service/README.md) | Atlas'ı tek serviste sunan sade host. DB yok. | 5080 | [kılavuz](kilavuz/science.md) |
| [gateway-service](../gateway-service/README.md) | Giriş noktası (YARP). İsteği doğru servise yönlendirir; kayıt 5/dk, auth 15/dk, genel 60/10sn. | 5000 | [kılavuz](kilavuz/gateway.md) |
| [identity-service](../identity-service/README.md) | Hesap, oturum, API anahtarı, öğrenme kaydı. | 5001 | [kılavuz](kilavuz/identity.md) |
| [catalog-service](../catalog-service/README.md) | 118 element: bilimsel kayıt + sanal fiyat (stok inventory'de). | 5002 | [kılavuz](kilavuz/catalog.md) |
| [compound-service](../compound-service/README.md) | Bileşikler. Eğitim kataloğu ile mağaza ürünleri ayrı listelerdir. | 5007 | [kılavuz](kilavuz/compound.md) |
| [order-service](../order-service/README.md) | Sipariş saga'sını yönetir. KREDI ve stok için event yollar. | 5003 | [kılavuz](kilavuz/order.md) |
| [wallet-service](../wallet-service/README.md) | KREDI cüzdan, defter, holdings, masa satışı. Java. | 5005 | [kılavuz](kilavuz/wallet.md) |
| [inventory-service](../inventory-service/README.md) | Stok ayırma / serbest bırakma / kalıcı düşüm. Java. | 5008 | [kılavuz](kilavuz/inventory.md) |
| [shipment-service](../shipment-service/README.md) | Sahte kargo: takip numarası basar, kaydı tutar. | 5004 | [kılavuz](kilavuz/shipment.md) |
| [notification-service](../notification-service/README.md) | Sipariş webhook'u (`order.updated`). Canlı fiyat kanalı yok. | 5006 | [kılavuz](kilavuz/notification.md) |
| [shared-lib](../shared-lib/README.md) | Ortak kütüphane: olay isimleri, sağlık uçları, bilimsel API yardımcısı. Kendi başına çalışmaz. | — | [kılavuz](kilavuz/shared-lib.md) |

Altyapı (ayrı bir "ürün servisi" değil): PostgreSQL, Redis, RabbitMQ. Compose bunları da başlatır.

### Operatör klasörleri (ürün servisi değil)

| Klasör | Kısaca | İçi |
|--------|---------------|-----|
| [deploy/](../deploy/README.md) | Script'ler, testler, atlas verisi, Caddy taslağı. Çalıştırma komutları burada. | [altyapı kılavuzu](kilavuz/altyapi.md) |
| [docker/](../docker/README.md) | Env örnekleri, Postgres init. Compose dosyaları kökte; sırlar burada. | [altyapı kılavuzu](kilavuz/altyapi.md) |
| [docs/](./README.md) | Belge indeksi: bu tur, sistem kılavuzu, memory bank. Paralel ikinci bir belge sistemi yok. | giriş |

Agent notları (İngilizce, kısa): [deploy/AGENTS.md](../deploy/AGENTS.md).

---

## Hangisini açmalıyım?

Ürünü göstermek için (varsayılan):

```powershell
./deploy/scripts/present-platform.ps1
```

Adres: http://localhost:6241. Her servis kendi konteynerinde çalışır.

Yalnız tablo ve laboratuvar için (veritabanı olmadan):

```powershell
./deploy/scripts/present-local.ps1
```

http://127.0.0.1:5080

Tek satır CSS ya da tek bir React dosyası değiştiriyorsan Docker web imajını yeniden derleme. Gateway zaten `:5000`'de çalışıyorsa:

```powershell
npm --prefix web-app run dev -- --host 127.0.0.1 --port 5173 --strictPort
```

http://127.0.0.1:5173

Tek bir .NET / Java / Node servisi için o klasörün README'sindeki `dotnet run` / `mvn` / `npm start` komutunu kullan. Bir UI satırı için tüm imajları `up --build` etmek gerekmez.

Durdurmak için: `./deploy/scripts/stop-local.ps1` (volume'lar kalır). Silmek için: `docker compose --env-file docker/.env down -v`.

---

## “Çalışıyor mu?” diye bakmak

Her backend servisinde aynı üç uç vardır:

| Adres | Anlamı |
|-------|--------|
| `/health/live` | Süreç ayakta. |
| `/health/ready` | İşini yapmak için gerekenler (DB, kuyruk…) hazır. |
| `/info` | Ad, sürüm, birkaç link. |

Örnek: `http://localhost:5000/info` (gateway). Wallet/inventory Spring `/actuator/health` de sunar; Docker `wget /health` kullanır.

`/metrics` ve `/health-ui` bilinçli olarak yok; 404 döner.

---

## Karışmaması gerekenler

**KREDI yazısı, Elx alanı.** Ekranda para birimi KREDI'dir. API'deki bazı alanlar hâlâ `balanceElx`, `INSUFFICIENT_ELX` gibi eski isimler taşır. Bu isimleri "düzeltmeye" çalışıp sözleşmeyi kırma; kök README'deki sözleşme geçerlidir.

**İki bileşik listesi.** Laboratuvar ve `/compound/h2o` 214 eğitim kaydına bakar. Mağaza rafları ayrı, kısa bir SKU listesidir. 214 molekülün hepsi satılık ürün olmaz.

**Stok vs fiyat.** Gram stok `inventory-service`'tedir. Catalog ticker'daki `availableStock` yalnız gösterim için ya da eski (legacy) olabilir; sipariş ön kontrolü inventory'ye bakar. Catalog kuyrukta yalnız fiyat nudge dinler.

**Saga sırası.** Stok ayırma, `PaymentRequested`, wallet debit, shipment, Completed (+ holdings + kalıcı stok). Ayrı payment JVM yok.

**Öğrenme kaydı.** Hesaplı ilerleme hâlâ identity token'larında tutulur; ayrı Learning Progress servisi yok.

**Yayın öncesi.** Yayın için neyin yeterli olduğu, neyin engel olduğu ve neyin sonraya kaldığı: kök [README — Eksikler ve yapmak istediğimizler](../README.md#eksikler-ve-yapmak-istediklerimiz).

---

## Belge haritası (kısa)

| Ne arıyorsun | Nereye |
|--------------|--------|
| Bu tur (sade anlatım) | bu dosya |
| Her servisin içi, fonksiyon fonksiyon | [kilavuz/](./kilavuz/README.md) · uygulamada `/kilavuz` |
| Docs indeksi | [README.md](./README.md) |
| Ürün / mimari / son iş | [memory-bank/](./memory-bank/README.md) |
| Üç dakikalık sunum | [LOCAL-PRESENTATION.md](./LOCAL-PRESENTATION.md) |
| Script / test / atlas | [deploy/README.md](../deploy/README.md) |
| `.env` / port / init | [docker/README.md](../docker/README.md) |
| Public domain | [PUBLIC-HOST.md](./PUBLIC-HOST.md) |
| Bilimsel v2 sözleşme | [deploy/scientific-catalog.md](../deploy/scientific-catalog.md) |
