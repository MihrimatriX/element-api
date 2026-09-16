# ElementAPI — ürün ve sunum senaryoları

15 Eylül 2026. Ürün anlatımı: **Elementleri kaynaklarıyla incele, bileşikleri keşfet, öğrendiklerini bir koleksiyonda biriktir.**

Bu dosya mevcut yetenekleri anlatır. Planlanan bir özelliği yapılmış gibi sunmaz. Test kanıtları [LOCAL-VERIFICATION.md](LOCAL-VERIFICATION.md), çalıştırma adımları [LOCAL-PRESENTATION.md](LOCAL-PRESENTATION.md) içinde.

| Kurulum | Adres | Neler gösterilir? |
|---|---|---|
| Bağımsız atlas | http://127.0.0.1:5080 | Atlas, bilimsel API, laboratuvar, misafir koleksiyonu ve rotalar |
| Tam platform | http://localhost:3000 | Bunlara ek hesap, eşitleme, API anahtarı ve sanal ticaret |

## 1. “Demir nerelerde kullanılır, bu bilgi nereden geliyor?”

**Kişi:** Kimyayı merak eden ziyaretçi. **Gereken:** Hesap gerekmez; iki kurulumda da çalışır.

1. Element atlasında “Demir” ara; Fe kartını aç.
2. Önizlemeden “Elementi keşfet” ile ayrıntıya git.
3. Kullanım alanları, atom kütlesi ve elektron dizilimini incele. Fotoğraf/atom şeması arasında geçiş yap.
4. “Atomik özellikler” bölümünü aç, ardından kaynak bağlantılarına bak.

**Sonuç:** Türkçe anlatımı, sayısal özellikleri ve kaynağını aynı kayıtta görür. Eksik değerler varsayılan olarak gizlidir; “Eksik alanları göster” ile açılır. Eksik değer sıfır değildir. Fotoğraf olmayan elementlerde şema kullanılır.

## 2. “Suyun hangi elementlerden oluştuğunu keşfetmek istiyorum.”

**Kişi:** İlk kez kullanan öğrenci. **Gereken:** Hesap gerekmez.

1. Ana sayfada “İlk keşfini yap” bağlantısını aç.
2. Laboratuvarda Hidrojen ve Oksijen kartlarını seç, “Birleştir”e bas.
3. Su keşfini ve H₂O formülünü incele; bileşik ayrıntısına geç.

**Sonuç:** Koleksiyona bir keşif eklenir. Aynı eşleşmeyi tekrarlamak sayacı artırmaz. Bu kart tabanlı eğitim oyunudur; kart adedi stokiyometrik miktar veya uygulanabilir deney tarifi değildir.

## 3. “Başladığım konuyu tamamlayıp anladığımı kontrol etmek istiyorum.”

**Kişi:** Kısa, hedefli öğrenme isteyen kullanıcı. **Gereken:** Koleksiyon → Günlük maddeler rotası.

1. H + O ile suyu; C + O ile karbondioksiti; N + H ile amonyağı keşfet. Her eşleşmeden önce alanı temizle.
2. Koleksiyonda Günlük maddeler kartına dön.
3. Açılan formül sorusunu yanıtla. Yanlış yanıttaki açıklamayı gör, doğru yanıtla rotayı tamamla.

**Sonuç:** 3/18 keşif ve 1/3 tamamlanmış rota görünür; yeni malzemeler açılır. Tuzlar ve Oksitler diğer iki rotadır. Rota tamamlama sertifika veya ölçülmüş öğrenme başarısı iddiası taşımaz.

## 4. “Hesap açmadan çalışmamı saklamak istiyorum.”

**Kişi:** Misafir kullanıcı. **Gereken:** Tarayıcı depolaması veya indirilebilir dosya.

1. Koleksiyondan “Kaydımı indir” ile JSON dosyasını al.
2. Başka tarayıcıda koleksiyondaki “Koleksiyon dosyası aktar” bölümünü aç.
3. İndirdiğin dosyayı seç.

**Sonuç:** Geçerli keşifler mevcut kayıtla birleşir; mevcut keşifler kaybolmaz ve tekrar sayılmaz. Geçersiz dosya anlaşılır hata verir. Depolama engellenirse keşif o oturumda yapılabilir, yenilemeden sonra kalıcılık vaat edilmez.

## 5. “Bilgisayarda başladım, telefonda devam edeceğim.”

**Kişi:** Düzenli kullanıcı. **Gereken:** Tam platform, aynı hesapla iki tarayıcı oturumu.

1. Hesap oluştur, giriş yap ve bir bileşik keşfet.
2. Başka tarayıcı/cihaz oturumunda aynı hesapla giriş yap.
3. Koleksiyonda keşfin göründüğünü doğrula.
4. Önceden misafir keşifleri varsa koleksiyonda sunulan aktarım seçeneğini kullan.

**Sonuç:** Hesap ilerlemesi sunucuda saklanır; cihazlardaki keşifler birleştirilir. Misafir kayıtları kendiliğinden hesaba eklenmez. Yerel test iki bağımsız Chromium oturumuyla yapıldı; internette farklı fiziksel cihazlardan kullanım henüz doğrulanmadı.

## 6. “Hesabımı ve verilerimi kontrol etmek istiyorum.”

**Kişi:** Hesap sahibi. **Gereken:** Tam platform → Hesabım → Hesap ayarları.

1. Profilini incele ve “Hesap ve öğrenme verilerimi indir”i kullan.
2. Mevcut şifreni ve yeni şifreni girerek şifreyi değiştir; yeniden giriş yap.
3. Silme akışını sunumda yalnız geçici bir test hesabında göster: şifre ve “HESABIMI SİL” onayını gir.

**Sonuç:** Şifre değişimi eski oturum/anahtar erişimini iptal eder. Silme profil, öğrenme, API anahtarları ve webhook aboneliklerini kaldırır. Diğer servislerdeki simülasyon işlemleri, günlükler ve eski yedekler bu işlemin kapsamı dışındadır. E-posta gönderimi mevcut yerel kurulumda kapalıdır.

## 7. “Bu bilimsel veriyi kendi projemde kullanacağım.”

**Kişi:** Geliştirici. **Gereken:** API dokümanları; bilimsel API için hesap/anahtar gerekmez.

1. /docs üzerindeki istek alanından Fe kaydına gerçek istek gönder.
2. fields=symbol,names ile yalnız iki alan iste.
3. JSON Schema bağlantısını aç; tam kayıt ile alan seçilmiş yanıtın farkını incele.
4. API istemcisinde dönen ETag ile If-None-Match isteği yap.

**Sonuç:** Alan seçimi küçük JSON yanıtı üretir; değişmeyen kaynak 304 döndürür. Geçersiz alan seçimi 400 verir. Kaynak/tarih/birim koşulları tam kayıtta korunur.

## 8. “Bir elementin hangi bileşiklerde yer aldığını görmek istiyorum.”

**Kişi:** Araştıran ziyaretçi. **Gereken:** Atlas veya Bileşikler sayfası.

1. Bir elementin ayrıntısından ilgili bileşiklere geç veya 51 kayıt içeren bileşik kütüphanesinde ara.
2. Bileşik kaydında formül, yapı görseli, kullanım alanları ve bileşen elementlerini incele.
3. Bileşen element bağlantısıyla tekrar element kaydına dön.

**Sonuç:** Element–bileşik ilişkisi çift yönlü keşfedilir. Kütüphane 51 kayıttır; laboratuvardaki 18 keşifle aynı kapsam değildir. Formül oranı her zaman ayrı bir molekül anlamına gelmez.

## 9. “Sipariş sisteminin baştan sona çalıştığını göstermek istiyorum.”

**Kişi:** Teknik demo izleyicisi. **Gereken:** Tam platform, geçici demo hesabı, çalışan kuyruk/servisler.

1. Simülasyon demosundan mağazaya git. İlk kasa 10.000 KREDI ile başlar.
2. Bir ürünün gram paketini sepete ekle ve sipariş ver.
3. Siparişin ödeme, sevkiyat ve teslim durumlarını izle; varlıklarını kontrol et.
4. Piyasa ekranında bir varlığın sanal satış akışını göster.

**Sonuç:** Stok, bakiye, sipariş ve sevkiyat birlikte ilerler; başarısız senaryolar telafi akışıyla ele alınır. Gerçek para ve fiziksel kargo yoktur. Bağımsız atlas bu işlemleri açmaz. Başarısız saga varyantlarının kanıtı otomatik servis testleridir; hepsi UI üzerinden tetiklenmez.

## 10. “Kendi API istemcimle hesabımın verilerine erişeceğim.”

**Kişi:** Geliştirici/demo hesabı sahibi. **Gereken:** Tam platform → Hesabım → API anahtarları ve kasa.

1. Anahtar ekranını aç; mevcut anahtarların durumunu incele.
2. Dokümanlardaki özel v1 isteklerini X-API-Key ile çalıştır.
3. İkinci oturumda hesabı aç; ilk cihazın anahtarının kendiliğinden iptal edilmediğini doğrula.

**Sonuç:** Bilimsel herkese açık API ile hesap erişimi gerektiren ticaret API'sinin sınırı görünür. Sunum ekranında gerçek anahtar paylaşma; yalnız geçici demo anahtarı kullan.

## 11. “İlk kullanımda nerede zorlandığımı kaydetmek istiyorum.”

**Kişi:** Pilot katılımcı. **Gereken:** Geri bildirim sayfası.

1. İstersen “Bu cihazda deneme olaylarını kaydet”i aç.
2. Bir keşif yap; geri dönüp gözlem notunu yaz.
3. Notları ve olay kaydını JSON indir. Kaydı kapat.

**Sonuç:** İzin sonrası son 200 sınırlı olay yerelde tutulur. Kapatmak olayları siler. Dosya otomatik gönderilmez; bu ekran merkezi analitik veya e-posta gönderimi değildir.

## 12. “Bilimsel API geçici olarak erişilemiyorsa?”

**Kişi:** Bağlantı sorunu yaşayan ziyaretçi. **Gereken:** Tarayıcıda yüklenmiş uygulama; testte bilimsel API isteğini engelle.

1. Atlasın temel tabloya döndüğünü ve bağlantı durumunu açıkladığını gör.
2. Laboratuvarda H + O keşfini yap.
3. API geri geldiğinde “Yeniden dene” ile ayrıntıları yükle.

**Sonuç:** Temel tablo ve keşif mantığı servis arızasında çalışır. Bu tam çevrimdışı/PWA desteği değildir; ilk sayfa ve varlıkların yüklenmesi gerekir.

## Beş dakikalık sunum sırası

1. **0:00–1:00:** Atlas → Demir → fotoğraf/özellik/kaynak.
2. **1:00–2:30:** İlk keşif → H + O → su kaydı.
3. **2:30–3:30:** Koleksiyon → öğrenme rotası → kayıt indirme.
4. **3:30–4:30:** API dokümanında gerçek istek ve alan seçimi.
5. **4:30–5:00:** Tam platformda hesap eşitlemesi ve ayrı sanal ticaret kapsamını göster.

Sonraki aşama: öğrenci/öğretmen pilotu ve içerik değerlendirmesi; barındırma/domain hazır olunca yayın ve Resend teslimat doğrulaması. Bunlar mevcut yerel otomasyonla tamamlanmış sayılmaz.
