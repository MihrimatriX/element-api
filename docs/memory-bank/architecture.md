# Mimari

İnsan dili tur: [servis kılavuzu](../SERVIS-KILAVUZU.md). Her kutu kendi `README.md`.

## Çalışma profilleri

| Profil | Giriş | Bağımlılık |
|---|---|---|
| Tam platform (varsayılan yerel) | http://localhost:3000 | `docker compose` / `present-platform.ps1` |
| Public host | yerel :8080/:8081/:8082 veya https://elements-api.ahmetfuzunkaya.com | `present-public.ps1 -Environment Dev|Test|Prod` (`-All` yan yana); [PUBLIC-HOST.md](../PUBLIC-HOST.md) |
| Bağımsız atlas | http://127.0.0.1:5080 | `docker-compose.science.yml` — tek science imajı; DB/broker yok |
| Ön yüz geliştirme | http://localhost:5173 | Vite host; çalışan gateway'e bağlanır |

Tam platform: tarayıcı → web :3000 / gateway :5000 → identity :5001, catalog :5002, order :5003, wallet :5005, shipment :5004, notification :5006, compound :5007, inventory :5008. Sipariş saga’sı: Inventory stok ayırır → Wallet KREDI çeker (tavan 50.000) → Shipment. Servis veritabanları ayrıdır. Katalog Redis kullanmaz; Redis gateway ve identity’de durur.

Bu makinede ElementAPI PostgreSQL 5432 (veya `POSTGRES_HOST_PORT`), Redis 6380 kullanıyor. 3000, 5433 ve 6379 başka uygulamaya ait olabilir; sahiplik kontrolü yapmadan durdurma.

## Ön yüz

React 19, TypeScript, Vite, Tailwind 4; gerçek shadcn/ui bileşen kaynakları ve Radix primitives. ProductShell tüm rotalarda yan menü/üst çubuk sağlar. Mobil gezinme Sheet, hesap menüsü DropdownMenu, element önizlemesi Dialog, görünüm seçimi Tabs, açılır kayıt bölümleri Collapsible tabanlı Disclosure kullanır.

Tema ve bileşen sözleşmesi: [design-system.md](design-system.md). Bilimsel grafikler ve periyodik yerleşim özel alan bileşenleri olarak korunur.

## Öğrenme verisi

Lab kuralları tarayıcıda çalışır (`chemistry.ts` + `known-compounds.json`), cüzdanı değiştirmez. Formülü kur / Element dedektifi skorları ayrı `elementapi:games:v1` anahtarındadır. Mağaza SKU listesi (`compounds.json`) bilimsel katalogdan ayrıdır; 167 eğitim bileşiği otomatik ürün olmaz. useLearning + lessons modülü misafir kaydını, kullanıcı başına yerel kopyayı ve sunucu birleştirmesini yönetir. Hesaplı kayıt identity /auth/learning üzerinden PostgreSQL'e gider. Misafir kayıtları kullanıcı aktarımı seçmeden hesaba eklenmez. Şifre değişimi ve hesap silme oturum/anahtar erişimini iptal eder.

## Bilimsel veri ve medya

GET /api/v2/elements/{symbol}, /compounds/{slug}; fields, view, include, filtre/sayfalama ve ETag sözleşmeleri korunur. Özelliklerde birim, belirsizlik ve kaynak koşulları vardır. Eksik alan null kalır, sıfır yapılmaz.

Atlas: editöryel manifest + lisanslı Commons örnek fotoğrafları + PubChem yapıları. refresh-atlas.mjs çevrimdışı yeniden uygular; --fetch çevrimiçi günceller. Veri değişiminden sonra Release çıktısını yeniden üret.

## İşletim

/info, /health, /health/live, /health/ready mevcut. Eski observability yığını, GraphQL ve catalog gRPC kaldırıldı. Bütün platformu Docker ile yeniden derlemek günlük doğrulama yöntemi değildir.
