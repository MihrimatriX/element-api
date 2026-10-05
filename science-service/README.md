# Bilim hostu (`science-service`)

Tek kutu: Türkçe atlas sitesi + bilimsel API. Veritabanı, kuyruk, hesap, mağaza yok.

> Ne zaman kullan? “Tabloyu ve laboratuvarı göster, ticaret yığınını açma.” Tam platform istemiyorsan bu yeter.

| | |
|--|--|
| **Adres** | http://127.0.0.1:5080 |
| **Compose** | `docker-compose.science.yml` |
| **Aç** | `./deploy/scripts/present-local.ps1` |
| **Komşular** | Yok (tek kutu). Tam platformda yerini catalog + compound + web + gateway alır |

---

## Bu kutu ne yapar?

Açılışta iki JSON’u belleğe alır: 118 element, bileşik kataloğu. Eksik veya boş dosyada **hiç ayağa kalkmaz**.

Aynı süreç:

- siteyi statik dosya olarak sunar (web-app derlemesi imaja gömülür),
- `GET /api/v2/elements/…` ve `GET /api/v2/compounds/…` yanıtlar (catalog/compound’taki bilimsel denetleyicilerin aynısı),
- `GET /api/v2/coverage` ile “kaç kayıt, hangi bölümler boş” der.

Hesap kapalıdır (`VITE_ACCOUNTS_ENABLED=false`). Koleksiyon tarayıcıda kalır. Laboratuvar cüzdanı değiştirmez.

## Ne yapmaz?

Postgres’e yazmaz. Sipariş almaz. Gateway değildir; tam platformda yerine catalog + compound + web-app + gateway geçer.

Gateway’de `/api/v2/coverage` **yok**. O uç yalnız bu hostta vardır.

## Nasıl açılır?

```powershell
./deploy/scripts/present-local.ps1
```

Tarayıcı: **http://127.0.0.1:5080**. `localhost` ile `127.0.0.1` ayrı depolardır; koleksiyonu taşımak için JSON aktar.

Host’ta denemek (imaj yok): catalog/compound JSON’ları yerinde olmalı; günlük yol yine script’tir.

## Sık istekler

```bash
curl http://127.0.0.1:5080/health
curl http://127.0.0.1:5080/api/v2/elements/fe
curl http://127.0.0.1:5080/api/v2/compounds/h2o
curl http://127.0.0.1:5080/api/v2/coverage
```

API dakikada IP başına 300 GET. Bilinmeyen `/api/...` JSON 404 döner; site sayfasına düşmez.

## Bozulursa

| Belirti | Muhtemel neden |
|---------|----------------|
| Konteyner hiç kalkmıyor | JSON 118 element değil veya bileşik listesi boş |
| Eski bileşik sayısı | İmaj, güncel `scientific-compounds.json` ile yeniden derlenmedi |
| Laboratuvar var, giriş yok | Beklenen; bu profil hesap açmaz |

Kod: `science-service/Program.cs`, `Dockerfile`. Denetleyiciler catalog/compound’tan kopyalanır, ikinci bir API yazılmaz.

[← Ana README](../README.md) · [Servis kılavuzu](../docs/SERVIS-KILAVUZU.md)
