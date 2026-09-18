# Bileşikler, oyunlar ve element görselleri — aktif çalışma planı

Tarih: 17 Eylül 2026. Durum: **Görsel 53/118. Bileşik 167. Laboratuvar + Formülü kur + Element dedektifi. 6 rota. Fotoğraf tamamlama ve PubChem anlık görüntü açık.**

Kullanıcı geri bildirimi: Bileşik içeriği ve oyunlar yetersiz; çoğu elementin resmi yok. Önceki arayüz teslimi bu içeriği kapatmaz.

## Fotoğraf paketleri — 15 Eylül 2026

- Paket 1: Al, Si, Ti, Zn, Co, Ni (40 → 46).
- Paket 2 (lab öncelikli, tamamlandı): C, N, P, Sn, Cr, Mn, Pb (46 → **53**; kalan 65). Lab 15 elementinden yalnız H şemada (deşarj tüpü reddedildi).
- Kalıcı seçim: deploy/data/atlas-photo-selections.json. Envanter: [ELEMENT-MEDIA-INVENTORY.md](../ELEMENT-MEDIA-INVENTORY.md).
- Host: 13 birim testi + üretim build geçti. Bileşik/oyun genişlemesi bu paketlerde yok.

## Doğrulanmış başlangıç

| Alan | Mevcut durum | Kaynak |
|---|---|---|
| Elementler | 118 kayıt; 53 fotoğraf, 65 fotoğraf eksiği | catalog Infrastructure/Data/scientific-elements.json |
| Bileşikler | 167 kayıt (51 tam PubChem + yapı; 116 eğitim kaydı) | compound Infrastructure/Data/scientific-compounds.json ve web-app/src/data/known-compounds.json |
| Oyun | Birleştir + Formülü kur + Element dedektifi | chemistry.ts, lab.ts, games.ts |
| Öğrenme | 6 rota; eski üçünde bir, yenilerde iki soru | web-app/src/data/lessons.json |
| Sunucu kaydı | İzinli keşif `known-compounds.json`; rota listesi `lessons.json` | identity-service/.../Controllers/LearningController.cs |

## Hedef ve sınır

Kullanıcıya daha çok okunabilir içerik, farklı biçimlerde oynanabilen oyunlar ve açıklayıcı görseller sunmak. Sadece sayaçları artırmak veya aynı eşleştirme oyununu farklı başlıklarla çoğaltmak yeterli değildir. Yeni shadcn/Radix tasarım dili korunur.

Aşağıdaki sayılar ilk teslim için **çalışma hedefidir**, mevcut özellik veya kullanıcının tek tek onayladığı şart olarak sunulmaz: yaklaşık 100 kaynaklı bileşik, en az 40 keşif, 6 öğrenme rotası ve mevcut laboratuvara ek 2 farklı oyun modu. Kayıtlar kaynak/kalite kontrolünden geçmeden hedef sayıya dahil edilmez. Görsel hedef 118/118 açıklayıcı görsel sunumudur; 118 gerçek numune fotoğrafı vaadi değildir.

## 1. İçerik ve medya envanteri

- [x] 51 bileşiği konu, günlük kullanım, içerik derinliği ve oyun ilişkisi açısından çıkar; yinelenen veya yanlış sınıflandırılmış kayıtları işaretle.
- [x] Fotoğrafı olmayan elementleri listele (güncel: 65 eksik; envanter docs/ELEMENT-MEDIA-INVENTORY.md); mevcut görsellerin dosya kontrolü yazıldı, eski kayıtların yeniden görsel incelemesi açık.
- [x] Yeni bileşik adaylarını gündelik maddeler, karbon bileşikleri, mineraller, malzemeler ve çevre gibi anlaşılır gruplara ayır; ilk ekleme listesini oluştur.
- [x] Mevcut kayıt kimliklerini, keşif ilerlemesini ve API sözleşmelerini koruyacak veri modeli kararlarını yaz.

**Çıktı:** Her aday için kimlik, kaynak, yapılacak iş ve durum içeren içerik/medya listeleri. Önce hedef liste somutlaştırılır, sonra veri eklenir.

## 2. Element görselleri — ilk görünür iyileştirme

- [x] Önce mevcut laboratuvar malzemeleri ve sık açılan/gündelik örneklerdeki eksikleri tamamla (lab: 14/15 fotoğraf; H şema); ardından kalan elementlere geç.
- [ ] Kaynak ve lisansı doğrulanmış gerçek numune görsellerini manifest üzerinden ekle. Küçük, ilgisiz, tekrar eden veya yanlış element görsellerini değiştir.
- [ ] Numune fotoğrafı bulunamadığında iyi çizilmiş element/atom şeması kullan; görselin türünü açıkça belirt. Kullanım örneği veya başka bir bağlam görseli varsa numune fotoğrafı alanından ayrı tut.
- [ ] Gaz tüpü, mineral, ürün veya temsili çizim saf element fotoğrafı gibi etiketlenmez. AI üretimi görsel bilimsel fotoğraf yerine kullanılmaz.
- [ ] Fotoğraf/şema/bağlam görseli türlerini, açıklama, üretici, kaynak URL ve lisans bilgileriyle modelle; mevcut istemciler için photo alanını uyumlu tut.
- [ ] Liste, önizleme ve ayrıntıda uygun kadraj, alt metin, yükleme durumu ve kırık görsel alternatifi sağla. Mobilde okunamayacak küçük görselleri sırf boşluğu doldurmak için kullanma.

**Bitti ölçütü:** 118 kaydın hiçbirinde boş veya kırık görsel alanı yok; gerçek fotoğraf, şema ve bağlam görseli sayıları ayrı raporlanıyor. Fotoğrafı hâlâ eksik olanlar ve nedenleri kayıtlı; lisans bilgisi görünür. Gerçek fotoğraf sayısındaki artış envanterle kanıtlanıyor.

## 3. Bileşik kütüphanesini genişlet ve derinleştir

- [x] İlk aday listesinden kaynaklı, öğrenme açısından farklı örnekleri ekle; yaklaşık 100 kayıt hedefle. Teslim: 167 bilinen molekül.
- [ ] Her kayıtta Türkçe ad, formül, doğru kimlik, bileşen oranları, kısa açıklama, kullanım bağlamı ve kaynak bulunmasını sağla. Yapı görselini yalnız anlamlı ve doğrulanmışsa ekle.
- [ ] Karışım, çözelti, mineral, element biçimi ve saf bileşik ayrımlarını incele; yanlış türü bileşik sayısını artırmak için kullanma.
- [x] Kategori ve kullanım alanı filtreleri, ilişkili element/bileşik bağlantıları ve içerikten oyuna geçiş ekle.
- [ ] Uzun formüller, iyon yükleri, hidratlar ve formül birimlerini doğru göster; JSON şema, kapsam üretimi ve sitemap'i güncelle.
- [ ] Bilimsel kayıt eklenmesini sanal mağazaya otomatik ürün/stok/fiyat eklemekle eşitleme. Ticaret kataloğu ayrı sözleşmedir.

**Bitti ölçütü:** Yeni kayıtlar API, arama, filtre ve ayrıntı sayfasında açılıyor; kaynakları izlenebilir; bozuk bağlantı/şema hatası yok. Katalog büyümesi yanında mevcut 51 kaydın kalite eksikleri de ele alınmış.

## 4. Mevcut laboratuvarı derinleştir

- [x] Mevcut laboratuvarı stoikiometri + katalog bakışıyla derinleştir (18 tarif yerine 167 formül). Kademeli ipucu / 6 rota / iki ayrı oyun modu teslim.
- [x] Tekrarlayan oksit eşleşmelerine ek farklı kavramlar ve bileşik ilişkileri seç; her keşfin öğrenme gerekçesini yaz.
- [x] Kademeli ipuçları, yanlış denemeye açıklayıcı geri bildirim, rotada bir sonraki hedef ve keşif sonrası kısa soru ekle.
- [x] Yeni rotalarda tek soruyu ezberleme yerine birden fazla soru/örnek kullan; doğru cevabın gerekçesini göster.
- [x] Keşif eşleştirmesi ile gerçek kimyasal reaksiyonu ayır. Gerçek denklem gösteriliyorsa kaynak ve atom/yük dengesi doğrulaması yap; tehlikeli uygulama tarifi üretme.

**Bitti ölçütü:** Tüm keşifler başlangıçtan ulaşılabilir, tekrarlar sayılmaz, kilitler atlanamaz; rota soruları ve ipuçları doğru kayıtlarla bağlantılı. Eski 18 keşif ve 3 rota ilerlemesi kaybolmaz.

## 5. İki farklı oyun modu

### Formülü kur

- [x] Kullanıcı verilen bileşiğin atom sayılarını/formül birimi oranını seçerek formülü oluşturur.
- [x] Yanlış sayıya özgü açıklama ve aşamalı zorluk vardır; molekül ile iyonik formül birimi ayrımı korunur.
- [x] Mobilde dokunma ve klavyeyle oynanır; sürükleme tek etkileşim yöntemi değildir.

### Element dedektifi

- [x] Kullanıcı kullanım alanı, periyodik konum ve kaynaklı özellik ipuçlarından elementi bulur.
- [x] İpuçları kademeli açılır; cevap sonrası element kaydı ve açıklama gösterilir. Eksik veri üzerinden kesin soru sorulmaz.
- [x] Soru havuzu tekrarları azaltır; her sorunun kaynak kaydı ve beklenen cevabı bellidir.

**Ortak bitti ölçütü:** Başlangıç, kurallar, oynama, geri bildirim, sonuç ve tekrar oynama akışı tamamlanmış iki ayrı mekanik. Oyunlar ortak bir giriş sayfasından bulunabiliyor. Süre baskısı zorunlu değil; ses veya renk tek bilgi taşıyıcısı değil. Oyun sonuçlarının saklanma biçimi açık.

## 6. Kayıt altyapısı ve regresyon

- [x] Keşif/rota kimlikleri ve üst sınırlarını yalnız ön yüzde değiştirme; LearningController doğrulamasını yeni katalogla birlikte güncelle.
- [x] İçerik tanımları için tek kaynak/üretilen manifest yaklaşımı kur; ön yüz ile sunucu izinli listelerinin ayrışmasını önle.
- [x] Yeni oyun sonuçları için puan/deneme kayıt modelini belirle; mevcut discoveries/lessons alanlarına sahte kimlikler sıkıştırma. Sunucuda geçersiz veya kazanılmamış sonuçları kabul etme.
- [x] Eski misafir ve hesap kayıtlarını koru; sürümlü JSON indirme/aktarma ve iki cihaz birleştirmesini doğrula.
- [x] Keşif erişilebilirliği, soru cevabı doğruluğu, denklem dengesi, görsel dosyaları/lisans metadata, API şemaları ve kayıt geçişlerine uygun otomatik kontroller ekle.
- [x] Her oyun modunu masaüstü/mobil, klavye, yenileme, API hatası ve depolama kısıtı altında doğrula; anlamlı bitiş/yeniden oynama akışını çalıştır.
- [ ] 3000 tam platform ve 5080 bağımsız sunumu güncelle; senaryoları, ekran görüntülerini, kapsam raporunu ve memory bankı gerçek sonuçlarla yenile.

## Uygulama sırası

1. Envanter ve kaynak listeleri; ardından ilk eksik görsel grubu.
2. Bileşik kayıt modelini/kaynağını genişlet; katalog ve filtreleri teslim et.
3. Öğrenme kayıt uyumluluğunu hazırlayarak laboratuvar ve rotaları genişlet.
4. Formülü kur; ardından Element dedektifi modunu tamamla.
5. Birleşik oyun girişi, tüm kayıt akışları, yerel sunum ve doğrulama.

Her aşamada çalışan bir sonuç gösterilir. Gerçek öğrenci/öğretmen değerlendirmesi ayrıca yapılır; otomatik testler içerik veya öğrenme etkisi onayı gibi sunulmaz. Resend ve internet yayını bu içerik/oyun çalışmasının dışında kalır.
