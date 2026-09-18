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
2. Önizlemeden “Tam kayıt” ile ayrıntıya git.
3. Kullanım alanları, atom kütlesi ve elektron dizilimini incele. Fotoğraf/atom şeması arasında geçiş yap.
4. “Atomik özellikler” bölümünü aç, ardından kaynak bağlantılarına bak.

**Sonuç:** Türkçe anlatımı, sayısal özellikleri ve kaynağını aynı kayıtta görür. Eksik değerler varsayılan olarak gizlidir; “Eksik alanları göster” ile açılır. Eksik değer sıfır değildir. Fotoğraf olmayan elementlerde şema kullanılır.

## 2. “Suyun hangi elementlerden oluştuğunu keşfetmek istiyorum.”

**Kişi:** İlk kez kullanan öğrenci. **Gereken:** Hesap gerekmez.

1. Ana sayfada “Laboratuvar” bağlantısını aç.
2. Laboratuvarda hidrojeni iki kez, oksijeni bir kez seç; “Birleştir”e bas.
3. Su keşfini ve H₂O formülünü incele; bileşik ayrıntısına geç.

**Sonuç:** Koleksiyona bir keşif eklenir. Aynı formülü tekrarlamak sayacı artırmaz. Atom sayıları stoikiometriye uyar (2 H + 1 O → H₂O); bu yine de uygulanabilir bir laboratuvar deneyi tarifi değildir.

## 3. “Başladığım konuyu tamamlayıp anladığımı kontrol etmek istiyorum.”

**Kişi:** Kısa, hedefli öğrenme isteyen kullanıcı. **Gereken:** Koleksiyon → Günlük maddeler rotası.

1. H’yi iki kez, O’yu bir kez seçerek suyu; C + 2 O ile karbondioksiti; N + 3 H ile amonyağı keşfet. Her denemeden önce alanı temizle.
2. Koleksiyonda Günlük maddeler kartına dön.
3. Açılan formül sorusunu yanıtla. Yanlış yanıttaki açıklamayı gör, doğru yanıtla rotayı tamamla.

**Sonuç:** 3/167 keşif ve 1/6 tamamlanmış rota görünür. Tuzlar, Oksitler, Oksiasitler, Karbon iskeleti ve Hava ve kaya diğer rotalardır. Rota tamamlama sertifika veya ölçülmüş öğrenme başarısı iddiası taşımaz.

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

1. Bir elementin ayrıntısından ilgili bileşiklere geç veya 167 kayıt içeren bileşik kütüphanesinde ara.
2. Bileşik kaydında formül, yapı görseli, kullanım alanları ve bileşen elementlerini incele.
3. Bileşen element bağlantısıyla tekrar element kaydına dön.

**Sonuç:** Element–bileşik ilişkisi çift yönlü keşfedilir. Kütüphane 167 kayıttır; 51’inin tam yapı görseli vardır. Formül oranı her zaman ayrı bir molekül anlamına gelmez.

## 9. “Sipariş sisteminin baştan sona çalıştığını göstermek istiyorum.”

**Kişi:** Teknik demo izleyicisi. **Gereken:** Tam platform, geçici demo hesabı, çalışan kuyruk/servisler.

1. Piyasa ve mağazadan mağazaya git. İlk kasa 10.000 KREDI ile başlar.
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

1. Atlas ve bileşik ayrıntıları yerel katalogdan açılır (PubChem tam anlık görüntü API’ye kalır).
2. Laboratuvarda 2 H + 1 O keşfini yap.
3. API geri geldiğinde canlı kayıt yerel kopyanın üzerine yazılır.

**Sonuç:** Tablo ve keşif, servis arızasında çalışır. Ayrıntı sayfası “Yeniden dene” duvarına düşmez. Bu tam çevrimdışı/PWA desteği değildir; ilk sayfa ve varlıkların yüklenmesi gerekir.

## 13. “Bileşiğin adından formülü kurmak istiyorum.”

**Kişi:** Stoikiometri çalışmak isteyen öğrenci. **Gereken:** Hesap gerekmez.

1. Laboratuvarda **Formülü kur** oyununu aç veya bileşik kaydındaki “Formülü kur” bağlantısını kullan.
2. Su için hidrojeni 2, oksijeni 1 yap; Kontrol et.
3. Yanlış sayıda özgün açıklamayı oku; doğru olunca bilimsel kayda geç.

**Sonuç:** Skor bu tarayıcıda kalır; keşif defterine yazılmaz. İyonik kayıtlarda formül birimi olduğu belirtilir.

## 14. “İpuçlarından elementi bulmak istiyorum.”

**Kişi:** Periyodik tablo konumunu pekiştirmek isteyen ziyaretçi. **Gereken:** Hesap gerekmez.

1. Laboratuvarda **Element dedektifi**ni aç.
2. İlk ipucuyla dene; gerekirse başka ipucu aç.
3. Adı yaz veya dört adaydan birini seç; kayıt sayfasına geç.

**Sonuç:** İpucu metni sembol veya adı sızdırmaz. İlk 36 element havuzdadır. Skor keşif koleksiyonuna karışmaz.

## Beş dakikalık sunum sırası

1. **0:00–1:00:** Atlas → Demir → fotoğraf/özellik/kaynak.
2. **1:00–2:30:** İlk keşif → 2 H + 1 O → su kaydı.
3. **2:30–3:30:** Koleksiyon → öğrenme rotası → kayıt indirme.
4. **3:30–4:30:** API dokümanında gerçek istek ve alan seçimi.
5. **4:30–5:00:** Tam platformda hesap eşitlemesi ve ayrı sanal ticaret kapsamını göster.

Sonraki aşama: öğrenci/öğretmen pilotu ve içerik değerlendirmesi; barındırma/domain hazır olunca yayın ve Resend teslimat doğrulaması. Bunlar mevcut yerel otomasyonla tamamlanmış sayılmaz.
