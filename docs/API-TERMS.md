# API kullanım şartları (v2 bilimsel + v1 simülasyon)

Kısa tüketici metni; repo lisansının yerini tutmaz. Web özeti: `/developers`.

## Açık olan

- `GET /api/v2/**` herkese açıktır; hesap ve anahtar istemez.
- Ticari olmayan ve ticari istemcilerde kullanılabilir.

## Hız sınırları (ana bilgisayara göre)

- Bağımsız atlas (`:5080`): IP başına dakikada 300.
- Kapı (`:5000`, tam platform / public Caddy arkasında):
  - `POST /api/v1/auth/register` → IP başına **5 / dk**
  - diğer `POST /api/v1/auth/*` → IP başına **15 / dk** (identity: 5 hatalı giriş → 15 dk kilit)
  - kalan istekler → IP başına **60 / 10 sn**
- Anahtarlı v1 uçları: anahtar başına saniyede 1–10 (anahtar kaydındaki değer;
  yanıt başlıkları `X-RateLimit-Limit` / `X-RateLimit-Remaining`).
- 429 alınca geri çekil; `Retry-After` varsa uy.
- Stock Caddy imajında `rate_limit` eklentisi yok; kenar sınırı gateway’de + Caddy security headers.
- Kayıt/giriş: isteğe Turnstile (`CAPTCHA_SECRET_KEY`); boşsa kapalı.
- Kayıt/giriş: isteğe Turnstile (`CAPTCHA_SECRET_KEY`); boşsa kapalı.

## Toplu çekme kuralı

1. Listeleri sayfala (`page`, `pageSize` en fazla 100); aynı sayfayı döngüyle sorma.
2. ETag gönder (`If-None-Match`), 304'ü normal karşıla.
3. Başarılı yanıtı en az 1 saat önbelleğe al (`max-age=3600`).
4. Paralel istek sağanağı yapma; toplu ihtiyacın için önce `/api/v2/coverage`
   (yalnız `:5080`) veya `info.count` ile boyutu öğren.

## Kaynak gösterme

- Uygulamada, sayfada veya çıktı veride görünür şekilde: “Veri: ElementAPI”
  + `https://github.com/MihrimatriX/element-api` bağlantısı.
- Türkçe editoryal cümleleri alıntılarken aynı kaynak satırı şart.
- Fotoğraf ve yapı görselleri kendi lisansını taşır; görselin yanındaki
  üretici/lisans satırını koru.

## Yasak

- Sınırı delmek için IP/anahtar döndürmek, servisi kilitlemek.
- API anahtarını istemci kodunda, herkese açık depoda veya URL'de paylaşmak.
- v1 cüzdan/sipariş simülasyonunu gerçek para, yatırım veya teslimat gibi sunmak
  (para birimi KREDI; `*Elx` alan adları tarihsel uyumluluktur).
- `null` alanları sıfır gibi doldurup “ölçüm” diye sunmak.

## Değişiklik politikası

- v2 kayıt şeması eklemeyle büyür; alan silme veya anlam değiştirme yeni
  sürüm ister. Kırıcı değişiklikler `docs/API-CHANGELOG.md`'de duyurulur.
- SLA yok; kesinti ve veri düzeltmesi önceden haber verilmeden yapılabilir.

## English summary

v2 reads are open, no key. Respect per-host rate limits (300/min atlas `:5080`,
gateway: register 5/min, other auth POST 15/min, else 60/10s), page bulk pulls,
honor ETag/304, cache one hour, attribute visibly (“Data: ElementAPI” + repo link),
keep image licenses, never expose API keys, never present v1 KREDI simulation as
real money. Null means “not in this snapshot”, not zero.
