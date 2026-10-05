# ElementAPI — ürün özeti

Türkçe kimya atlası ve keşif uygulaması. Ana akış: element bul → kaynağını incele → laboratuvarda bileşik keşfet → öğrenme rotasını tamamla → koleksiyonunu koru.

- 118 element, **214** bileşik (hepsinde PubChem CID + 2D yapı PNG; 51’i tam PubChem anlık görüntüsü, 163’ü kısa eğitim kaydı, fiziksel/GHS alanları `null`); **75/118** element fotoğrafı (lisanslı numunesi olmayanlar, ör. Pm ve Tc, kasıtlı null).
- Laboratuvar önce **serbest tezgâh** (palet → tezgâh → Dene; tıklama, klavye veya sürükleme). 214 ulaşılabilir keşif (stoikiometri + bilinen-molekül); **Formülü kur** / **Element dedektifi** opsiyonel. Gerçek deney tarifi değildir.
- Misafir ilerlemesi tarayıcıda; JSON indirme/aktarma desteklenir. Hesaplı kurulumda öğrenme kayıtları sunucuda saklanır ve cihazlar arasında birleştirilir.
- Açık bilimsel v2 API: alan seçimi, özet/tam kayıt, filtreler, şemalar ve ETag.
- Tam platformda ayrı sanal piyasa/mağaza/sipariş/kargo demosu vardır. Gerçek ödeme ve fiziksel teslimat yoktur; para birimi KREDI.
- Sistem kılavuzu: `docs/kilavuz/` (servis başına bir sayfa + altyapı + arayüz), uygulamada `/kilavuz`.

## Kullanıcının güncel tercihleri

Son geri bildirim: Bileşikler ve oyunlar yetersizdi. 17 Eylül 2026: bileşik kataloğu 51 → 167, sonra 214; laboratuvar 18 tariflik eşleşme yerine formül kurma + gerçek stoikiometri. İki ek oyun (Formülü kur / Element dedektifi) ve 6 rota teslim edildi.

2 Ekim 2026: "her satır temiz ve anlaşılır, üst düzey cila" — arayüz Mineral sistemiyle sıfırdan kuruldu, servislerde okunabilirlik turu yapıldı, her dosyayı anlatan Türkçe kılavuz yazıldı ([recent-work.md](recent-work.md)).

Ürün yerelde ve public compose ile sunuma hazır olmalı. Alan adı: **elements-api.ahmetfuzunkaya.com** ([PUBLIC-HOST.md](../PUBLIC-HOST.md)). Yayın kararı: **e-postasız beta** (SMTP boş, kurtarma kapalı); Resend tercihi sonra, henüz anahtar yok.

Arayüz: slogan “Atomdan bileşiğe.” (atom → molekül → bileşik; biyoloji/hücre değil). Tasarım sistemi **Mineral**: yalnız koyu tema, yeşil tonlu mineral yüzeyler (tuval `#080b09`), tek vurgu kuprit (pas kırmızısı), periyodik tablo için aile renkleri; yazı tipleri Bricolage Grotesque (başlık), Geist (gövde), Geist Mono (sembol, formül, kod). Jetonlar `web-app/src/styles.css`, bileşenler `web-app/src/components/ui/`, vitrin `/_ui` (yalnız dev). Eski CSS dosyaları silindi; ikinci tasarım sistemi yok. Marka: orbital-E monogram (`/brand/mark.svg`). `/market` `/shop` `/account` `/demo`: KREDI sanal, gerçek para yok (şerit). Ayrıntı: [design-system.md](design-system.md).

## Kaynak dosyalar

- Arayüz: `web-app/src`; kabuk `components/ProductShell.tsx` + `components/shell/`; tasarım sistemi `styles.css` + `components/ui/`.
- Bilimsel JSON: catalog/compound `Infrastructure/Data`; bağımsız servis `science-service`.
- Laboratuvar kuralları: `services/lab.ts`, `services/chemistry.ts`; öğrenme rotaları: `services/lessons.ts`.
- Medya: `deploy/data/atlas-media.json` ve `web-app/public/media/atlas`.
- Kılavuz: `docs/kilavuz/*.md` → `web-app/scripts/write-guide.mjs` → `web-app/src/data/guide.json` (git’e girmez).

[Senaryolar](../PRODUCT-SCENARIOS.md) sunumda yapılabilen işleri ve sınırlarını anlatır.
