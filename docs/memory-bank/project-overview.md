# ElementAPI — ürün özeti

Türkçe kimya atlası ve keşif uygulaması. Ana akış: element bul → kaynağını incele → laboratuvarda bileşik keşfet → öğrenme rotasını tamamla → koleksiyonunu koru.

- 118 element, **167** bileşik (51’i tam PubChem anlık görüntüsü + yapı PNG; yeniler sıkıştırılmış eğitim kaydı, `media.structure: null`); 53/118 element fotoğrafı.
- Laboratuvarda 167 ulaşılabilir keşif (stoikiometri + bilinen-molekül kontrolü), **Formülü kur** ve **Element dedektifi** oyunları, 6 öğrenme rotası. Kart seçimi gerçek laboratuvar deneyi tarifi değildir.
- Misafir ilerlemesi tarayıcıda; JSON indirme/aktarma desteklenir. Hesaplı kurulumda öğrenme kayıtları sunucuda saklanır ve cihazlar arasında birleştirilir.
- Açık bilimsel v2 API: alan seçimi, özet/tam kayıt, filtreler, şemalar ve ETag.
- Tam platformda ayrı sanal piyasa/mağaza/sipariş/kargo demosu vardır. Gerçek ödeme ve fiziksel teslimat yoktur; para birimi KREDI.

## Kullanıcının güncel tercihleri

Son geri bildirim: Bileşikler ve oyunlar yetersizdi. 17 Eylül 2026: bileşik kataloğu 51 → 167; laboratuvar 18 tariflik eşleşme yerine formül kurma + gerçek stoikiometri. Görseller 53/118. İki ek oyun (Formülü kur / Element dedektifi) ve 6 rota teslim edildi.

Ürün yerelde sunuma hazır olmalı. Alan adı ve barındırma hesabı henüz yok. Gerçek e-posta teslimatı bu çalışmanın dışında; tercih Resend, henüz bağlı değil.

Arayüz: slogan/kicker yok. Periyodik hücreler `categorySwatches` ile dolu (sınıf posteri); zemin krem kâğıt. shadcn/Radix kabuk; ikinci tasarım sistemi yok.

## Kaynak dosyalar

- Arayüz: web-app/src; ortak kabuk ProductShell; tasarım sistemi components/ui ve design-system.css.
- Bilimsel JSON: catalog/compound Infrastructure Data; bağımsız servis science-service.
- Laboratuvar kuralları: services/lab.ts; öğrenme rotaları: services/lessons.ts.
- Medya: deploy/data/atlas-media.json ve web-app/public/media/atlas.

[Senaryolar](../PRODUCT-SCENARIOS.md) sunumda yapılabilen işleri ve sınırlarını anlatır.
