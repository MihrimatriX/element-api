# Yerel doğrulama — 15 Eylül 2026

Kapsam: SMTP/e-posta teslimatı hariç yerel doğrulamalar. Kullanıcının seçtiği e-posta sağlayıcısı Resend; sunucu ve alan adı henüz yok. İnternet yayını bu çalışmada yapılmaz.

Not (aynı gün, sonraki karar): varsayılan ürün adresi artık **http://localhost:3000** (`docker compose` / `present-platform.ps1`). Aşağıdaki 3080 ifadeleri o günkü hibrit host+web ölçümüdür.

## Ön yüz yenilemesi — 15 Eylül 2026

shadcn/ui + Radix + Tailwind 4 geçişi tamamlandı. Ortak kabuk, form/düğme/tablo/kart katmanı, klavyeyle kullanılan Dialog/Tabs/Sheet ve bilimsel Disclosure alanları eklendi. API ve öğrenme kuralları korunuyor.

| Kontrol | Sonuç ve kapsam |
|---|---|
| Web lint ve TypeScript/Vite üretim derlemesi | Geçti; host ve tek web Docker imajı derlendi |
| Web birim testleri | 11/11 |
| Atlas/öğrenme/gezinti | 28/28; 5080 üretim derlemesi, Chromium masaüstü + mobil |
| Hesap ve simülasyon arayüzü | 10/10; kontrollü HTTP ile masaüstü + mobil; yatay taşma kontrolü dahil |
| Gerçek hesap/eşitleme/sipariş/şifre/indirme/silme | 2/2; 3080 üretim web + mevcut gerçek yerel servisler |
| Görsel kontrol | Atlas, bileşikler, lab, koleksiyon, bilimsel kayıt, doküman, giriş, piyasa, mağaza, hesap ayarları; 390 ve 1440 px ekranlar |
| Yeni bağımlılıklar | Temiz Docker npm ci denetiminde 0 açık |

Kanıtlar: artifacts/local/ui-redesign-browser.log, ui-redesign-auth.log, ui-redesign-live.log, web-redesign-build.log ve presentation-redesign.log. Görseller docs/screenshots/redesign-* altında. Son küçük piyasa şeridi ve koleksiyon başlığı CSS düzeltmesinden sonra 10 arayüz testi ve mobil gerçek hesap ekran kontrolü geçti; aşağıdaki eski tam backend koşusu yeniden çalıştırılmadı.

Geçiş sırasında bulunan Card/Slot sınırı, bilimsel bölüm açma, mobil piyasa taşması ve Windows Vite rapor izleme hataları giderildi. Playwright profilleri artık ayrı test-results klasörleri kullanıyor. Fiziksel telefon, Safari/Firefox, Resend teslimatı ve kamuya açık yayın bu doğrulamanın dışında.

[12 ürün senaryosu ve kısa sunum akışı](PRODUCT-SCENARIOS.md) · [Güncel memory bank](memory-bank/README.md).

## Önceki tam platform çalıştırmasının sonucu

Güncellenmiş komut tüm seçeneklerle yeniden çalıştırıldı ve **0 çıkış koduyla tamamlandı**. Son kanıt `artifacts/local/final-verification.log` içindedir; önceki hatalı başarı mesajı bulunan log kullanılmaz.

| Kontrol | Sonuç |
|---|---|
| Web lint, üretim build, Node sipariş build/check; tüm .NET projeleri | Geçti |
| Web birim testleri | 11/11 |
| .NET birim / gateway / entegrasyon | 57/57 + 7/7 + 16/16 |
| Java | 3/3 |
| Atlas masaüstü/mobil tarayıcı | 18/18 |
| Hesap arayüzü sözleşmeleri (kontrollü HTTP) | 8/8 |
| Gerçek servislerle hesap, eşitleme, ticaret ve hesap yaşam döngüsü | 2/2 |
| PostgreSQL saga / HTTP ticaret / smoke / platform | 6/6 + 18/18 + 20/20 + 11/11 |
| Bilimsel API veri, projection, ETag, CORS, gzip ve hata yanıtları | Geçti |
| Veritabanı geri yükleme | 5/5 veritabanı; 26 tabloda içerik eşleşti |
| Npm güvenlik taraması | Web ve order için 0 açık |
| Negatif smoke denemesi | Başarısız kontroller nonzero çıkış kodu üretti |

Kontrol sonunda hem 3080 tam uygulama hem 5080 bağımsız atlas HTTP 200 döndü. Uzak CI, fiziksel telefon ve farklı tarayıcı motorları bu sonucun kapsamında değildir.

## Kalan iş sırası

1. Beş gerçek katılımcıyla LOCAL-PRESENTATION.md oturumunu yürüt; süre, yardım gerektiren adım ve yanlış anlaşılan ifadeleri kaydet. Otomatik testlerden kullanıcı başarısı yüzdesi çıkarma.
2. Öğretmene üç rotayı ve kaynaklı açıklamaları incelet; tam katalog için editöryel incelemeyi ayrıca planla.
3. Bu gözlemlerdeki en büyük kullanım sorununu düzelt ve ilgili regresyon testini çalıştır.
4. Sunucu/alan adı seçilince HTTPS, güvenilen proxy, kalıcı anahtarlar, şifreli dış yedek ve geri yükleme, saklama/silme politikası ve geri alma prosedürünü gerçek yayın ortamında doğrula.
5. Resend bağlantısı ve gerçek e-posta teslimatını kullanıcının ayırdığı e-posta işinde ele al.

Yerelde başarısız kalan otomatik kontrol yoktur; bu ifade gerçek kullanıcı/uzman onayı veya üretim ortamı hazır olma iddiası değildir.

## Tekrarlanabilir kontroller

```powershell
$env:PLAYWRIGHT_BASE_URL = 'http://127.0.0.1:5080'
./deploy/scripts/test-all.ps1 -Configuration Review -Integration -Live -Browser -PaymentDocker -Recovery -WebBase http://localhost:3080
```

Ön koşul: 5080 bağımsız sunum ve 3080 tam uygulama açık; Docker Desktop çalışıyor. Review yapılandırması, çalışan Release servislerinin dosyalarını kilitlemeden derler. SMTP gönderilmez; e-posta token testleri sahte gönderici kullanır. `-Live`, geçici test hesapları/sanal işlemler oluşturur. `-Recovery`, yerel PostgreSQL yedeğini geçici veritabanlarına geri yükler.

Yeni gerçek tarayıcı senaryosu: hesap aç → API anahtarı edin → öğrenme kaydı oluştur → şifre değiştir → eski JWT ve anahtarın reddedildiğini doğrula → yeni şifreyle giriş → öğrenme verisini indir → sırların dosyada bulunmadığını doğrula → hesabı sil → eski oturumun ve yeniden girişin reddedildiğini doğrula. HTTP taklidi kullanılmaz.

İlk toplu kontrolde iki test altyapısı hatası bulundu: smoke testinin 9 karakterli şifresi yeni 10 karakter sınırını karşılamıyordu; alt PowerShell scriptinin `exit 1` sonucu üst scriptte denetlenmediğinden yanlış başarı mesajı yazılabiliyordu. Smoke şifresi düzeltildi, başarısız kontroller exception üretiyor ve üst script smoke testini ayrı PowerShell sürecinde çalıştırıp çıkış kodunu denetliyor. Düzeltme sonrası smoke **20/20** geçti. Kapalı yerel porta karşı negatif deneme de başarısız çıkış kodunu doğruladı. İlk logdaki genel başarı mesajı geçerli kanıt değildir.

## Yedek/geri yükleme provası

`node deploy/scripts/test-backup-restore.mjs` beş uygulama veritabanını ayrı ayrı sınar. Kaynak veritabanında salt okunur, tutarlı bir snapshot açar; `pg_dump` aynı snapshot'ı kullanır. Geri yükleme yalnız bu çalışmanın ürettiği benzersiz `element_restore_*` veritabanına yapılır. Kaynak ve hedefte her public tablonun satır sayısı ve sıralanmış içerik hash'i karşılaştırılır. Geçici veritabanları ve dump dosyaları işlem sonunda kaldırılır. Kaynak uygulama verileri silinmez.

İlk sonuç: **5/5 veritabanı, 26 tablo** eşleşti. Makine tarafından üretilen sonuç `artifacts/local/backup-restore-report.json` içindedir; kişisel veri veya bağlantı sırrı içermez.

Bu, yerel mantıksal PostgreSQL geri yükleme kanıtıdır. Şifrelenmiş dış yedek, point-in-time recovery, ayrı makineye taşıma, Identity DataProtection anahtarlarının kurtarılması veya RabbitMQ/Redis felaket kurtarma testi değildir. Veritabanları ayrı snapshot'lardır; servisler arası tek bir atomik yedek iddiası yoktur.

## Bilimsel içerik kontrolü

Üç rotanın soru/yanıtları ve ilgili laboratuvar açıklamaları kontrol edildi. Bu çalışma öğretmen/uzman onayı veya tüm 169 kaydın bilimsel denetimi değildir.

| Kontrol | Sonuç ve kaynak |
|---|---|
| H₂O'da atom sayısı | İki hidrojen/bir oksijen cevabı ve atom oranı–kütle oranı ayrımı uygun. [UCSB ScienceLine](https://scienceline.ucsb.edu/getkey.php?key=5027) |
| NaCl molekül/kristal ayrımı | Rota ayrı NaCl molekülü yerine iyon oranını soruyor. RSC'nin bağ türleri çalışması NaCl ve MgO'yu iyonik, hidrojen klorürü kovalent olarak ayırıyor. [RSC Chemical misconceptions](https://edu.rsc.org/download?ac=542046) |
| Hematit ve pas ayrımı | Laboratuvar hematiti tek saf pas olarak sunmuyor. RSC paslanmayı su/oksijen içeren, hidratlı demir oksitlere giden karmaşık süreç olarak açıklıyor. [RSC Preventing rust](https://edu.rsc.org/experiments/preventing-rust/1763.article) |

Kaynakların arama dizinindeki metinleri okunabildi; bu üç sayfanın tam metin açılışları erişim/zaman aşımı hatası verdi. Dolayısıyla bu sınırlı karşılaştırma, tam kaynak denetimi olarak değerlendirilmemeli.

Gerçek öğrencilerle beş kullanıcı oturumu veya öğretmen görüşmesi yapılmadı. Otomatik tarayıcı testleri kullanıcı davranışının yerine geçmez. Oturum akışı `LOCAL-PRESENTATION.md` içindedir.

## Resend kararı

Sağlayıcı tercihi kaydedildi; entegrasyon açılmadı, anahtar eklenmedi, e-posta gönderilmedi. Mevcut mailer SMTP kullanıyor. Resend hem bu kurulumla uyumlu SMTP erişimi hem API sunuyor; geçiş sırasında tercih netleştirilebilir. SMTP seçilirse Resend belgelerinde 587/STARTTLS, `smtp.resend.com`, `resend` kullanıcı adı ve API anahtarıyla kimlik doğrulama belirtiliyor. Doğrulanmış alan adı gerekir. [Resend resmi SMTP belgesi](https://resend.com/docs/send-with-smtp)

## İlk fotoğraf paketi — 15 Eylül 2026

Al/Si/Ti/Zn/Co/Ni kaynaklı fotoğrafları eklendi; 46/118. 13 web birim testi ve lint geçti; host/tek web Docker üretim derlemeleri başarılı. Hedefli media.spec.ts: 4/4, masaüstü ve mobilde altı fotoğrafın decode/atıf/şema geçişi ve kırık fotoğraf alternatifi doğrulandı. Sonuç artifacts/local/photo-browser.log içinde. Altı fotoğraf gateway kaydında mevcut ve 3080 üzerinden HTTP 200; 5080 bağımsız sunum yenilendi. Bu tur tam backend veya bütün E2E tekrarı değildir. [Medya envanteri](ELEMENT-MEDIA-INVENTORY.md).
