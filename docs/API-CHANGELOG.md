# API değişiklik kaydı

v2 kayıt şeması eklemeyle büyür; kırıcı değişiklik yeni sürüm ister.
Web özeti: `/developers`.

## 2026-09-17 — istemci yüzeyi

- Yeni: `web-app/public/openapi.json` — ScientificCatalog sözleşmesinin
  statik OpenAPI 3.0 çıktısı (`/openapi.json`). Swagger UI kurulmadı;
  `/docs` tezgâhı + bu dosya yeter.
- Yeni: `/developers` sayfası (TR gövde + EN özet) ve site haritası girişi.
- Düzeltme: hız sınırı metni artık ana bilgisayara göre doğru —
  atlas (`:5080`) dakikada 300, kapı (`:5000`) 10 saniyede 100.
  Eski metin her yerde 300/dk diyordu.
- Belgelendi: webhook olayları (`price.updated`, `order.updated`),
  imza başlıkları (`X-Element-Signature` HMAC-SHA256 + `X-Element-Event`),
  v1 sipariş arama/istatistik ve `shipments/track` uçları.
- Karar: `GET /api/v2/coverage` kapıya eklenmedi — kapsam iki odanın
  toplamıdır, kapı toplama yapmaz. Alternatif: atlas `:5080`'deki uç veya
  liste yanıtlarındaki `info.count`. Ayrıntı: `gateway-service/README.md`.
- Düzeltme: “Web Dashboard Key” çok-cihaz pürüzü — ölü anahtar 401'de
  otomatik yenilenir; 20 anahtar kotası dolunca en eski pano anahtarı
  emekli edilip tek seferlik yeniden üretilir.
- Yeni: `docs/API-TERMS.md` (toplu çekme kuralı, kaynak gösterme).
- v2 kayıt şeması değişmedi.
