# Açık işler ve sınırlar — 15 Eylül 2026

- **Çalıştırma:** varsayılan tam Docker (`present-platform` / compose); host `start-local` / `artifacts` birincil yol değil. Eski 3080 hibrit adresleri tarihsel.
- **Yeni aktif ürün işi:** [İçerik/oyun/görsel planı](content-and-games-plan.md) sürüyor. Fotoğraflar 53/118; lab malzemelerinde yalnız H şemada. Bileşik sayısı, keşif/rota genişlemesi ve iki yeni oyun modu hâlâ açık. Önceki arayüz teslimi bu kapsamı kapatmaz.
- **Öğrenme genişletme bağımlılığı:** LearningController 18 keşif ve 3 rota sınırını, izinli kimlikleri sabit tutuyor. Yalnız web kataloğunu artırmak yeni kayıtların sunucuda reddedilmesine yol açar; uyumlu kayıt geçişi gerekir.

- **İnternet yayını yok:** kullanıcı henüz alan adı/sunucu sağlamadı; yerel sunum hedeflendi. DNS, TLS, public ağ ve üretim işletimi doğrulanmadı.
- **Resend bağlı değil:** tercih Resend; mevcut e-posta kodu SMTP gönderici altyapısını kullanır. Gerçek Resend API/SMTP seçimi, doğrulanmış domain ve teslimat testi sonraki iş. Yerelde kapalı özelliği gönderilmiş gibi gösterme.
- **Gerçek kullanıcı testi yok:** öğrenci/öğretmen denemesi ve editöryel uzman değerlendirmesi yapılmadı. Otomasyon sonuçları öğrenme etkisi kanıtı değildir.
- **Cihaz sınırı:** Chromium masaüstü ve mobil emülasyonu kullanıldı; fiziksel telefon, Safari ve Firefox doğrulaması ayrı iş.
- **Veri kapsamı:** 53/118 fotoğraf, 51/51 bileşik yapı görseli. H bilerek şema (deşarj tüpü reddedildi). Üç element bölümü bütünüyle boş: elektromanyetik/optik, kristal yapı, bolluk. Eksikleri null koru; kapsamı src/data/coverage.json üretir.
- **Yedek sınırı:** PostgreSQL için ayrı geçici veritabanında 5 DB/26 tablo satır+hash doğrulaması yapıldı. Uzak/encrypted yedek, anahtar kurtarma, broker/Redis ve tam felaket kurtarma tatbikatı değildir.
- **Hesap silme kapsamı:** profil/öğrenme/anahtar/webhook silinir; diğer servislerdeki simülasyon işlemleri, loglar ve eski yedekler ayrıca yaşam döngüsü gerektirir.
- **Legacy alan CSS'i:** ortak kontroller shadcn/Radix temelli; bilimsel/periyodik düzenlerin eski CSS'i legacy katmanında kalır. Yeni stillerde token/bileşen kaynağını kullan, ikinci bir paralel kontrol sistemi kurma.
- **Çalışma ağacı:** önceki büyük değişiklikler de uncommitted. Kullanıcı istemeden commit/push veya eski diff'i geri alma yok.
- **Release veri eskimesi:** bilimsel JSON değiştiğinde ilgili Docker imajını yeniden derle; eski net9 notları tarihsel, güncel .NET 10.
- **Sözleşme:** kullanıcıya KREDI; legacy *Elx / INSUFFICIENT_ELX alanları kırıcı migrasyon olmadan değiştirilmez.
