# ElementAPI — ürün özeti

Türkçe kimya atlası ve keşif uygulaması. Ana akış: element bul → kaynağını incele → laboratuvarda bileşik keşfet → öğrenme rotasını tamamla → koleksiyonunu koru.

- 118 element, **214** bileşik (51’i tam PubChem anlık görüntüsü + yapı PNG; yeniler sıkıştırılmış eğitim kaydı, `media.structure: null`); **68/118** element fotoğrafı (Pm/Tc/Hg kasıtlı null).
- Laboratuvar önce **sürükle-bırak sandbox** (palet → tezgâh → Dene; hit/almost/impossible). 214 ulaşılabilir keşif (stoikiometri + bilinen-molekül); **Formülü kur** / **Element dedektifi** opsiyonel. Gerçek deney tarifi değildir.
- Misafir ilerlemesi tarayıcıda; JSON indirme/aktarma desteklenir. Hesaplı kurulumda öğrenme kayıtları sunucuda saklanır ve cihazlar arasında birleştirilir.
- Açık bilimsel v2 API: alan seçimi, özet/tam kayıt, filtreler, şemalar ve ETag.
- Tam platformda ayrı sanal piyasa/mağaza/sipariş/kargo demosu vardır. Gerçek ödeme ve fiziksel teslimat yoktur; para birimi KREDI.

## Kullanıcının güncel tercihleri

Son geri bildirim: Bileşikler ve oyunlar yetersizdi. 17 Eylül 2026: bileşik kataloğu 51 → 167; laboratuvar 18 tariflik eşleşme yerine formül kurma + gerçek stoikiometri. Görseller 68/118. İki ek oyun (Formülü kur / Element dedektifi) ve 6 rota teslim edildi.

Ürün yerelde ve public compose ile sunuma hazır olmalı. Alan adı: **elements-api.ahmetfuzunkaya.com** ([PUBLIC-HOST.md](../PUBLIC-HOST.md)). Yayın kararı: **e-postasız beta** (SMTP boş, kurtarma kapalı); Resend tercihi sonra, henüz anahtar yok.

Arayüz: slogan “Hücreden moleküle.” Kabuk **void mineral** (zemin `#0c0f0e`, plaka `#141a18`, mürekkep `#e8ecea`, vurgu cuprite `#812f26` tek accent, başlık Bricolage Grotesque, gövde Source Sans 3 18px). Marka: orbital-E monogram (`/brand/mark.svg`). Landing + ürün yüzeyleri aynı dark mineral dil; light museum sandwich yok. Periyodik: void chart + muted family swatches + plinth hücre. Bileşik kartı yatay katalog şerit + PubChem 2D yapı PNG (`media.structure`); `media.photo` bileşiklerde null. shadcn/Radix kabuk; ikinci tasarım sistemi yok. `/market` `/shop` `/account` `/demo`: KREDI sanal, gerçek para yok (banner).

## Kaynak dosyalar

- Arayüz: web-app/src; ortak kabuk ProductShell; tasarım sistemi components/ui ve design-system.css.
- Bilimsel JSON: catalog/compound Infrastructure Data; bağımsız servis science-service.
- Laboratuvar kuralları: services/lab.ts; öğrenme rotaları: services/lessons.ts.
- Medya: deploy/data/atlas-media.json ve web-app/public/media/atlas.

[Senaryolar](../PRODUCT-SCENARIOS.md) sunumda yapılabilen işleri ve sınırlarını anlatır.
