# API değişiklik kaydı

v2 kayıt şeması eklemeyle büyür; kırıcı değişiklik yeni sürüm ister.
Web özeti: `/developers`.

## 2026-11-14 — tek hata biçimi, masa satışı, stok takviyesi

Kırıcı değişiklik (yalnız v1 hata gövdeleri). Durum kodları ve v2 kayıt şeması değişmedi.

- Değişti (kırıcı): v1 hata gövdeleri artık her yerde `application/problem+json`
  (RFC 7807: `type`, `title`, `status`, `detail`, `instance`). Catalog, compound ve
  identity uçlarında düz metin dönen hatalar problem gövdesi oldu; cümle `detail` alanında.
- Değişti (kırıcı): kapının 401 ve 429 gövdeleri camelCase ve `instance` istek yolunun
  kendisi. Önceden alanlar PascalCase'ti (`Title`, `Status`) ve `Instance` bir
  `{"Value", "HasValue"}` nesnesiydi.
- Değişti: sipariş servisinde kalan özel biçimli gövdeler de aynı kalıpta; eski
  istemciler için mesaj `error` alanında da durur.
- Göç: hata metnini gövdenin kendisinden ya da `Title` alanından okuyan istemci
  `detail` (yoksa `title`) okumalı.
- Yeni: `POST /api/v1/desk/sell` isteğe bağlı `Idempotency-Key` (UUID) başlığını tanır.
  Aynı anahtarla tekrarlanan istek ikinci kez satmaz, ilk satışın tutarını döner;
  UUID olmayan anahtar 400 alır.
- Düzeltme: masa satışında tutar yuvarlanmamış birim fiyattan hesaplanır ve sonda bir kez
  aşağı kesilir. Önceden birim fiyat önce yuvarlanıyordu; çok ucuz ürünlerde %1,4'e kadar
  fazla ödeme çıkıyordu.
- Yeni: stok her pazartesi 04:00'te (UTC) başlangıç düzeyine tamamlanır; yalnız eksilen
  elementler yükselir. Önceden stoğu yalnız geri satışlar yeniliyordu.

## 2026-11-14 — yayın öncesi düzeltmeler

Kırıcı değişiklik yok; v2 kayıt şeması değişmedi.

- Düzeltme: 429 yanıtları artık `Retry-After` (saniye) başlığını taşır;
  kapıda ve atlas ana bilgisayarında. Belgeler bunu zaten söylüyordu.
- Düzeltme: v2 araması Türkçe `İ` ile başlayan adları buluyor
  (`?q=iyot`, `?q=indiyum`). Önceden yalnız `q=İyot` eşleşiyordu.
- Düzeltme: v1 element araması (`/api/v1/elements/search?q=`) Türkçe adları
  Türkçe harf yazmadan da bulur (`bakir`, `iyot`); v2 ile aynı katlama kuralı.
- Düzeltme: `GET /api/v1/elements/{symbol}/ticker` içindeki `volume24hGrams`
  her zaman 0 dönüyordu; artık son 24 saatin alış ve satışlarını toplar.
- Düzeltme: atlas ana bilgisayarı ters proxy arkasında hız sınırını
  ziyaretçi başına sayar (önceden herkes tek kovayı paylaşıyordu).
- Düzeltme: sipariş ucu bozuk istekte (ör. hatalı URL kaçışı) 503 yerine 4xx
  döner. `quantity` saklanan dört ondalığa yuvarlanır; `0.1 + 0.2` gibi bir
  değerle aynı `Idempotency-Key` tekrarı artık 409 değil, tekrar yanıtı alır.
- Kaldırıldı: `GET /api/v1` keşif belgesindeki `health` ve `info` bağlantıları.
  Proxy arkasında bu yollar web sunucusuna gidiyor, API'nin durumunu göstermiyordu.
- Değişti: simüle fiyatlar artık tohum fiyatının çevresinde kalır (tik başına
  küçük bir geri çekim). Önceden çapasız rastgele yürüyüştü: haftalar içinde
  fiyatlar tohumdan kopuyor, çok ucuz elementler yuvarlamada donuyordu.
- Düzeltme: `GET /api/v1/orders/stats` içindeki `totalSpent` başarısız
  (iade edilmiş) siparişleri artık saymaz.
- Belge düzeltmesi: `price.updated` webhook olayı kabul edilir ama hiç
  gönderilmez; arayüz ve belgeler artık yalnız `order.updated` sunar.

## 2026-09-17 — istemci yüzeyi

- Yeni: `web-app/public/openapi.json`, ScientificCatalog sözleşmesinin
  statik OpenAPI 3.0 çıktısı (`/openapi.json`). Swagger UI kurulmadı;
  `/docs` tezgâhı ve bu dosya yeterli.
- Yeni: `/developers` sayfası (TR gövde + EN özet) ve site haritası girişi.
- Düzeltme: hız sınırı metni artık her ana bilgisayar için doğru:
  atlas (`:5080`) dakikada 300, kapı (`:5000`) 10 saniyede 100.
  Eski metin her yerde 300/dk diyordu.
- Belgelendi: webhook olayları (`price.updated`, `order.updated`),
  imza başlıkları (`X-Element-Signature` HMAC-SHA256 + `X-Element-Event`),
  v1 sipariş arama/istatistik ve `shipments/track` uçları.
- Karar: `GET /api/v2/coverage` kapıya eklenmedi, çünkü kapsam iki odanın
  toplamıdır ve kapı toplama yapmaz. Alternatif: atlas `:5080`'deki uç veya
  liste yanıtlarındaki `info.count`. Ayrıntı: `gateway-service/README.md`.
- Düzeltme: "Web Dashboard Key" çok cihazlı kullanım sorunu giderildi. Ölü
  anahtar 401 alınca otomatik yenilenir; 20 anahtar kotası dolunca en eski pano anahtarı
  emekli edilip tek seferlik yeniden üretilir.
- Yeni: `docs/API-TERMS.md` (toplu çekme kuralı, kaynak gösterme).
- v2 kayıt şeması değişmedi.
