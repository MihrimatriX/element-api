# Bilim hostu (`science-service`)

science-service, Türkçe atlas sitesini ve bilimsel API’yi tek bir konteynerde sunar. Veritabanı, kuyruk, hesap ve mağaza yoktur.

Ticaret yığınını açmadan yalnız tabloyu ve laboratuvarı göstermek istediğinde bunu kullan; tam platforma gerek kalmaz.

| | |
|--|--|
| **Adres** | http://127.0.0.1:5080 |
| **Compose** | `docker-compose.science.yml` |
| **Aç** | `./deploy/scripts/present-local.ps1` |
| **Komşular** | Yok (tek kutu). Tam platformda yerini catalog + compound + web + gateway alır |

## Bu kutu ne yapar?

Açılışta iki JSON dosyasını belleğe alır: 118 element ve bileşik kataloğu. Dosyalardan biri eksik veya boşsa servis hiç başlamaz.

Aynı süreç:

- siteyi statik dosya olarak sunar (web-app derlemesi imaja gömülür),
- `GET /api/v2/elements/…` ve `GET /api/v2/compounds/…` isteklerini yanıtlar (catalog/compound’taki bilimsel denetleyicilerin aynısı),
- `GET /api/v2/coverage` ile kaç kayıt olduğunu ve hangi bölümlerin boş olduğunu bildirir.

Hesaplar kapalıdır (`VITE_ACCOUNTS_ENABLED=false`). Koleksiyon tarayıcıda kalır. Laboratuvar cüzdanı değiştirmez.

## Ne yapmaz?

Postgres’e yazmaz ve sipariş almaz. Gateway değildir; tam platformda bunun yerine catalog, compound, web-app ve gateway çalışır.

`/api/v2/coverage` gateway’de yoktur, yalnız bu hostta vardır.

## Nasıl açılır?

```powershell
./deploy/scripts/present-local.ps1
```

Tarayıcıda http://127.0.0.1:5080 adresini aç. Tarayıcı `localhost` ve `127.0.0.1` için ayrı depolama tutar; koleksiyonu birinden diğerine taşımak için JSON olarak aktar.

İmaj olmadan host’ta denemek için catalog/compound JSON dosyaları yerinde olmalı. Normal kullanımda yine script’i kullan.

## Sık istekler

```bash
curl http://127.0.0.1:5080/health
curl http://127.0.0.1:5080/api/v2/elements/fe
curl http://127.0.0.1:5080/api/v2/compounds/h2o
curl http://127.0.0.1:5080/api/v2/coverage
```

API, IP başına dakikada 300 GET isteğine izin verir. Bilinmeyen `/api/...` yolları JSON 404 döner, site sayfasına düşmez.

## Bozulursa

| Belirti | Muhtemel neden |
|---------|----------------|
| Konteyner hiç kalkmıyor | JSON’da 118 element yok veya bileşik listesi boş |
| Eski bileşik sayısı | İmaj, güncel `scientific-compounds.json` ile yeniden derlenmedi |
| Laboratuvar var, giriş yok | Beklenen durum; bu profil hesap açmaz |

Kod `science-service/Program.cs` ve `Dockerfile` içinde. Denetleyiciler catalog/compound’tan kopyalanır; ikinci bir API yazılmaz.

[← Ana README](../README.md) · [Servis kılavuzu](../docs/SERVIS-KILAVUZU.md)
