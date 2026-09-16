# ElementAPI — ürün özeti

Türkçe kimya atlası ve keşif uygulaması. Ana akış: element bul → kaynağını incele → laboratuvarda bileşik keşfet → öğrenme rotasını tamamla → koleksiyonunu koru.

- 118 element, 51 bileşik ve kaynakları; 169 Türkçe editöryel anlatım; 53/118 element fotoğrafı.
- Laboratuvarda 18 ulaşılabilir keşif ve 3 öğrenme rotası. Kart seçimi gerçek laboratuvar deneyi veya kimyasal reaksiyon koşulu değildir.
- Misafir ilerlemesi tarayıcıda; JSON indirme/aktarma desteklenir. Hesaplı kurulumda öğrenme kayıtları sunucuda saklanır ve cihazlar arasında birleştirilir.
- Açık bilimsel v2 API: alan seçimi, özet/tam kayıt, filtreler, şemalar ve ETag.
- Tam platformda ayrı sanal piyasa/mağaza/sipariş/kargo demosu vardır. Gerçek ödeme ve fiziksel teslimat yoktur; para birimi KREDI.

## Kullanıcının güncel tercihleri

Son geri bildirim: Bileşikler ve oyunlar yetersiz; element görselleri artırılmalı. [Aktif genişletme planı](content-and-games-plan.md) sürüyor; görseller 53/118, bileşik/oyun sayıları henüz genişletilmedi.

Ürün yerelde sunuma hazır olmalı. Alan adı ve barındırma hesabı henüz yok. Gerçek e-posta teslimatı bu çalışmanın dışında; tercih Resend, henüz bağlı değil.

Arayüz için açık talep: AI üretimi gibi duran sloganlı tasarımı bırak; shadcn/ui ve Radix temelli, sade ve cilalı bir çalışma alanı oluştur. Az sayıda vurgu rengi, tutarlı form/menü/tablo bileşenleri ve açık işlev adları kullan.

## Kaynak dosyalar

- Arayüz: web-app/src; ortak kabuk ProductShell; tasarım sistemi components/ui ve design-system.css.
- Bilimsel JSON: catalog/compound Infrastructure Data; bağımsız servis science-service.
- Laboratuvar kuralları: services/lab.ts; öğrenme rotaları: services/lessons.ts.
- Medya: deploy/data/atlas-media.json ve web-app/public/media/atlas.

[Senaryolar](../PRODUCT-SCENARIOS.md) sunumda yapılabilen işleri ve sınırlarını anlatır.
