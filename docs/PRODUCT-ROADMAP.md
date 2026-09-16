# ElementAPI — ürün değerlendirmesi ve yol haritası

> Bu belge başlangıç incelemesidir. Kod daha sonra değiştirildi. Güncel durum ve doğrulama için [uygulama kaydına](PRODUCT-DELIVERY.md), yerel gösterim için [sunum rehberine](LOCAL-PRESENTATION.md) bakın.

14 Eylül 2026 · İncelenen başlangıç commit'i: `2774eac`.

Hedef: Gerçek kullanıcıların kullanacağı bir ürün oluşturmak ve aynı çalışmayı iş/müşteri görüşmelerinde güçlü bir portföy olarak sunmak. Gelir modeli bu aşamanın ön koşulu değil. Aşağıdaki konumlandırma bir ürün hipotezidir; kullanıcı görüşmeleriyle doğrulanmalıdır.

**Ana karar önerisi**

ElementAPI'nin ana ürünü, Türkçe anlatımlı ve kaynaklı bir kimya keşif atlası ile kısa öğrenme deneyimleri olmalı. Açık API bunun geliştirici yüzü; sanal ticaret sistemi ise ayrıca açılabilen teknik demo olarak korunmalı.

Önerilen vaat: “Günlük maddelerin hangi elementlerden oluştuğunu keşfet; kısa görevlerle kimyayı anlamlandır.”

Mevcut uygulamada önemli miktarda mühendislik var. Ürünleşmenin önündeki temel sorun işlev azlığı değil: keşif, geliştirici API'si ve alım-satımın aynı navigasyonda eşit ağırlıkta sunulması. Öğrenmeye gelen kişinin kayıt olduğunda mağazaya gönderilmesi bu kopukluğun somut örneği.

**Bugün gerçekten ne var?**

| Alan | Kod/veride doğrulanan durum | Ürün değeri |
|---|---|---|
| Bilimsel atlas | 118 element, 51 bileşik; 169 kayıtta Türkçe editöryel özet | Kullanıcının doğrudan yararlanabileceği temel |
| Görseller | 40 element fotoğrafı, 51 bileşik yapı görseli; başvurulan yerel medya dosyalarında eksik bulunmadı | Kuru JSON verisini anlaşılır içeriğe dönüştürüyor |
| Keşif | Periyodik tablo, arama, kategori ve özellik görünümleri, element/bileşik ayrıntıları ve aralarındaki bağlantılar | Bir kayıttan diğerine anlamlı geçiş |
| Laboratuvar | 6 başlangıç elementi, kademeli açılan 15 element, 18 keşif; tarayıcıda kalıcı ilerleme | En belirgin etkileşimli ürün adayı |
| Bilimsel API | v2, alan seçimi, filtreleme, sayfalama, ETag ve kaynak meta verisi | Başka uygulamalarda yeniden kullanım |
| Ticaret demosu | Sanal kredi, fiyat simülasyonu, ürünler, sepet, sipariş, kasa, satış | Dağıtık sistem davranışlarını gösteren portföy değeri |
| Güvenilir işlem altyapısı | Sipariş durum geçişleri, outbox, mesaj tekilleştirme, stok ayırma/serbest bırakma, bakiye iadesi | Korunması gereken teknik yatırım |
| Hesap/geliştirici araçları | JWT, hash'lenmiş API anahtarları, anahtar iptali, limitler, webhook'lar | Var olan bir temel; hesap yaşam döngüsü tamamlanmamış |
| Operasyon | Docker Compose, sağlık uçları, yerel başlatma ve test scriptleri | Geliştirme desteği var; yayın süreci ayrıca tamamlanmalı |

Backend sekiz servis, üç uygulama ekosistemi (.NET, Node, Java), PostgreSQL, Redis ve RabbitMQ içeriyor. Bilimsel v2 kayıtları ise sürümlenmiş JSON dosyalarından okunuyor. Bu fark önemlidir: ana ürünün salt okunur bilgi ihtiyacı ile ticaret demosunun dağıtık işlem ihtiyacı aynı değil.

**İlk kullanıcı ve farklılaşma**

İlk kullanıcı hipotezi: kimya konularını Türkçe ve görsel olarak anlamak isteyen lise düzeyindeki öğrenci. İlk dağıtım/geri bildirim ortağı: öğretmen. Geliştirici ayrı bir ikincil kullanıcıdır; ilk ekranın bütün açıklamalarını geliştiriciye göre kurmak önerilmez.

Sadece “118 element ve API” yeterli bir farklılaşma iddiası değil. [RSC periyodik tablosu](https://periodic-table.rsc.org/) zaten ayrıntı, tarih ve veri eğilimleri sunuyor. [PubChem](https://pubchem.ncbi.nlm.nih.gov/docs/periodic-table-element-pages) element verisi, oyun görünümü ve programatik erişim sağlıyor. Dolayısıyla burada sınanacak değer önerisi; Türkçe anlatım, günlük hayattaki maddeler ve yönlendirilmiş öğrenme akışının birlikte ne kadar işe yaradığıdır. Bu bir pazar talebi kanıtı değildir.

İlk başarı anı şöyle tasarlanmalı: Kullanıcı hesap açmadan H ve O'yu seçer, suyu keşfeder, iki elementin formüldeki oranını anlar ve bir sonraki kısa göreve geçer. Üyelik, bunu deneyimledikten sonra ilerlemesini başka cihazda sürdürmek için anlam kazanır.

**Korunacaklar, geri plana alınacaklar**

| Karar | Kapsam | Gerekçe |
|---|---|---|
| Koru ve geliştir | Atlas, kaynaklar, element/bileşik bağlantıları, laboratuvar | Kullanıcıya doğrudan değer sunuyor |
| Ayrı girişte koru | Piyasa, mağaza, sipariş, ödeme/kargo simülasyonu, webhook | Teknik demoda güçlü; öğrenme akışının zorunlu adımı değil |
| Sadeleştir | Ana menü, kayıt sonrası yönlendirme, hesap sayfası | Kullanıcıdan gereksiz ürün seçimi beklenmesini azaltır |
| Aşamalı ayır | Bilimsel okuma servislerinin ticaret altyapısına başlangıç bağımlılıkları | Atlası işletmek ve ayakta tutmak kolaylaşır |
| Şimdilik ertele | Gerçek ödeme/kargo, yeni servisler, Kubernetes, kapsamlı izleme yığını, sınıf yönetimi, büyük içerik genişlemesi | Öğrenme deneyiminin talebini doğrulamadan maliyeti artırır |
| Küçük temizlik olarak ele al | Eski Values/Trading yeniden dışa aktarımları, dağınık stil/isimler | Yayın veya kullanıcı değeri sorunlarından sonra gelir |

Mevcut API sözleşmelerini sırf iç isimler eski diye kırma. `*Elx` alanlarını ve çalışan saga'yı topluca yeniden yazmanın bu aşamada ürün getirisi düşük. Mikroservislerin tamamını bir anda monolite taşıma da önerilmiyor. Önce bilimsel çekirdeğin bağımsız çalışması sağlanmalı; fiziksel servis birleştirme gereği daha sonra ölçülmeli.

**Yayın öncesi somut bulgular**

P0: herkese açık betadan önce. P1: ilk kullanılabilir sürümün parçası. P2: kullanım kanıtından sonra. Kod incelemesi bulguları ile çalıştırılarak doğrulananlar aşağıda ayrılmıştır.

| Öncelik | Bulgu ve kanıt | Etkisi / önerilen çözüm |
|---|---|---|
| P0 | Docker web build context'i yalnız `./web-app`; sitemap scripti `../compound-service/.../scientific-compounds.json` okuyor. İzole dosya düzeninde aynı `ENOENT` yeniden üretildi. | Host build geçse de dokümante edilen temiz web imajı derlemesi bu dosyayı bulamaz. Build context ve açık COPY yollarını düzelt veya yayın için gerekli katalog manifestini web build girdisi yap. |
| P0 | `npm --prefix web-app run lint`: `src/services/api.ts:205`, `no-explicit-any` hatası. | Kalite kontrolü şu an yeşil değil. Yanıt tipini tanımla; lint kuralını susturmak yerine gerçek sözleşmeyi kullan. |
| P0 | Public overlay portları kapatıyor; ana Compose'daki `.NET` servisleri `Development` ortamında kalıyor. Hata middleware'i bu ortamda `ex.Message` döndürüyor. | Ayrı production ortamı, zorunlu secrets, TLS/reverse proxy ayarları ve yayın smoke testi oluştur. Mevcut overlay tek başına production profili değil. |
| P0, hesaplar açılacaksa | Login `CheckPasswordAsync` kullanıyor; başarısız deneme/lockout akışı görünmüyor. Gateway global limit anahtarı doğrulanmamış `X-API-Key` başlığından seçiliyor. | Auth uçları için IP/hesap temelli ayrı sınır, güvenilir proxy/IP yapılandırması ve başarısız deneme politikası ekle. Kayıt/login korumasını key limitine bağlama. Bu kod analizi; saldırı testi yapılmadı. |
| P1 | `ensureDashboardKey`, aynı hesabın aktif bütün “Web Dashboard Key” anahtarlarını iptal edip yenisini açıyor. | Başka cihazda giriş önceki cihazın ticaret çağrılarını bozabilir. İki bağımsız oturumla test et; web oturumunu geliştirici API anahtarından ayır veya oturum başına yönet. |
| P1 | Laboratuvar yalnız `localStorage` kullanıyor; kayıt kullanıcıyı `/shop`'a gönderiyor. | İlerleme üyeliğin faydasına dönüşmüyor. Misafir ilerlemesini koruyan hesap aktarımı ve “kaldığın yerden devam et” ekle. |
| P1 | `electromagnetic_and_optical`, `crystallography`, `abundance` alanlarında 118 elementin hiçbirinde dolu değer yok. | Şemadaki başlığı içerik varmış gibi tanıtma. UI'da boş bölümleri sakla/isteğe bağlı göster; API şemasında uyumluluğu koru, veri kapsamını açıkça yayınla. |
| P1 | Hesapta kayıt/giriş/anahtar yönetimi var; şifre kurtarma, e-posta doğrulama, hesap silme ve açık oturum sonu deneyimi görülmedi. | Gerçek kullanıcının sorun yaşadığında geri dönebileceği hesap yaşam döngüsünü tamamla. Veri kullanımı ve destek iletişimini de görünür yap. |
| P1 | Repo içinde CI workflow'u bulunmadı. `test-all.ps1` web lint/build çağırıyor ama `web-app test` çağırmıyor. | Her değişiklikte web testlerini de zorunlu kıl. Scriptin adı kapsam garantisi sağlamıyor. |
| P1 | `test-e2e.mjs` HTTP akışlarını, platform testi SPA HTML ve asset erişimini kontrol ediyor; gerçek tarayıcı kullanıcı yolculuğu kapsamı bulunmadı. | Atlas → ayrıntı → laboratuvar → ilerleme ve kayıt/oturum akışları için tarayıcı testleri ekle. Mevcut HTTP/saga testlerini koru. |
| P1 | Bilimsel veriler dosyadan okunmasına rağmen catalog başlangıcında Redis bağlantısı, DB migration ve mesajlaşma kuruluyor; compound da DB başlangıcına bağlı. | Salt okunur atlas için ayrı çalışma profili/host oluştur. Ticaret kapalıyken bilimsel API açılabilmeli. |
| P1 | Ana HTML metaları hâlâ “element verisi ve fiyat / mağazadan gram alıp sat” diyor; rota metaları React çalışınca değişiyor. | Ürün anlatımını HTML, paylaşım kartı ve sayfalarda hizala. Önce statik metadata; sonra arama/paylaşım açısından önemli katalog rotalarında prerender değerlendir. |
| P1 | Ürün kullanımı olay ölçümü veya hata izleme entegrasyonu bulunmadı. Sağlık endpoint'leri ve loglar var. | İlk keşif, görev tamamlama, geri dönüş ve istemci hatalarını ölç. Büyük ELK/Grafana kurulumuna dönmeden küçük bir çözüm yeterli. |
| P2 | Webhook teslimatı sırayla çalışıyor; başarısız gönderimde bekleyip ikinci denemeyi yapıyor. İkinci başarısızlıktan sonra kalıcı teslimat kaydı/kullanıcıya yeniden deneme yüzeyi görünmüyor. | Bu yüzey ürünleştirilecekse kalıcı teslimat kuyruğu, tekrar deneme ve teslimat geçmişi ekle. Şimdilik ana kapsam dışında tut. |

Frontend ayrıntı bileşeni bölüm sıralamasını büyük ölçüde veri şemasından çıkarıyor. Öğrenciye sunulacak önem sırası ayrıca tasarlanmalı: “Nedir?”, “Nerede karşılaşırım?”, “Neyle bağlantılı?” önce; teknik veri katmanı sonra. Her alanı doldurmak, her fotoğrafı bulmak ve her kimyasal özelliği ana ekrana taşımak gerekmiyor.

Bilimsel ölçüm değerlerinin tamamı bağımsız bir kimya uzmanı tarafından bu incelemede doğrulanmadı. Kaynak meta verisinin varlığı, editöryel metnin uzman onayından geçtiği anlamına gelmez. İlk görev seti, formül açıklamaları ve seçilen örnekler için öğretmen/uzman incelemesi planlanmalı. Oyundaki “keşif eşleştirmesi” ile kaynaklı tepkime ayrımı zaten var ve korunmalı.

**Arayüz incelemesinden çıkanlar**

Masaüstü ana sayfa ve laboratuvar, 390 × 844 mobil laboratuvar gözlemlendi. Görsel dilin baştan yenilenmesi gerekli görünmüyor: okunabilir tipografi, sakin renkler ve belirgin kart yapısı var. Mobilde navigasyon yatay kayıyor; ilk ekranda deney alanı ve birleştirme düğmesi görünmeden başlık, ilerleme ve malzeme paneli alanı tüketiyor. Malzeme panelinin de kendi kaydırması var. İlk keşif akışını mobilde kısaltmak, görsel süslemelerden daha yüksek öncelikli.

Önemli sınır: İnceleme başında backend servisleri çalışmıyordu. Ana sayfanın temel tabloya düşüşü ve laboratuvarın API olmadan çalışan kısmı gözlemlendi. API'ye bağlı tam atlas içeriğinin ve ticaretin canlı kullanıcı akışı doğrulanmış sayılmamalı. Tarayıcıda H + O → Su keşfi yapıldı, yenilemeden sonra 1/18 ilerlemesinin korunduğu görüldü.

**Önerilen ürün yüzeyi**

Ana navigasyon için başlangıç önerisi: Keşfet · Laboratuvar · Koleksiyonum. “Geliştiriciler” ayrı bir ikincil giriş; “Simülasyon demosu” hakkında/proje sayfasından erişilebilir. Koleksiyonum, hesap olmadan yerel çalışabilir; senkronizasyon ancak kullanıcı isterse üyelik gerektirir.

İlk öğrenme döngüsü: kısa amaç → iki kart seçimi → keşif → nedenini açıklayan tek soru → ilgili bilimsel kayıt → sıradaki görev. İlk sürümde üç küçük rota yeterli: Su ve günlük maddeler; tuzlar ve iyonlar; metaller ve oksitler. İçerik miktarından önce bu döngünün anlaşılması ölçülmeli.

API yüzeyinde açık bilimsel katalog ile hesap/ticaret dokümantasyonu ayrılmalı. v2 için parametreler ve hata yanıtları zaten var; buna makinece okunabilir güçlü şema, veri kapsamı, veri sürümü, değişiklik kaydı ve çalışır başlangıç örnekleri eklenmeli. Tam bir SDK ailesi ilk sürüm için gerekli değil.

**Sıralı yol haritası**

Süreler tek geliştirici için yaklaşık 6–8 haftalık çalışma çerçevesidir; taahhüt değildir. Yeni kapsam eklenirse veya kullanıcı erişimi gecikirse süre değişir. Aşamalar tamamlanma ölçütleriyle yönetilmeli.

| Aşama | Tahmini zaman | İş paketi | Tamamlanma ölçütü |
|---|---|---|---|
| 0 — Yön ve ilk kanıt | İlk 2–3 gün | Bir cümlelik vaat, ana/ikincil kullanıcı ayrımı, üç kısa görev taslağı; 5 öğrenci/öğretmen görüşmesi için soru seti | En az 3 katılımcı benzer bir kullanım ihtiyacını kendi örneğiyle anlatıyor; anlatmıyorsa konumlandırma yeniden ele alınıyor |
| 1 — Tekrar kurulabilen demo | 1. hafta | Docker dosya sınırı, lint, runtime kurulum adımları, CI, web testinin test-all'a eklenmesi, demo veri/başlatma akışı | Temiz checkout'tan belgelenen komutlarla derleme; hedef runtime'da testler; tarayıcıdan temel akış |
| 2 — Odaklı ilk deneyim | 2. hafta | Navigasyon, kayıt sonrası geri dönüş, mobil deney alanı, boş veri bölümleri, tutarlı metadata, açık demo ayrımı | 5 kişiden en az 4'ü yardım almadan ilk keşfi yaklaşık 2 dakika içinde tamamlıyor ve ürünün ne işe yaradığını açıklıyor |
| 3 — Tekrar kullanım | 3–4. hafta | Üç öğrenme rotası, kısa kontrol soruları, koleksiyon/ilerleme; hesap kullanılacaksa misafir verisinin güvenli aktarımı ve temel hesap yaşam döngüsü | İlerleme kaybolmadan oturum/cihaz geçişi; en az bir rota uçtan uca tamamlanıyor; ilk keşif ve rota tamamlama ölçülebiliyor |
| 4 — Küçük public beta | 5–6. hafta | Bağımsız bilimsel çalışma profili, production yapılandırması, auth sınırları, yedek/geri yükleme provası, hata takibi, tarayıcı testleri ve veri kapsamı sayfası | 10–20 davetli kullanıcı ürünü canlı adreste deneyebiliyor; başarısızlıklar gözleniyor; yayın geri alınabiliyor |
| 5 — Portföy ve ikinci iterasyon | 7–8. hafta | Ürün videosu, teknik vaka anlatımı, demo senaryosu, geri bildirimdeki en büyük sürtünmenin giderilmesi | 3 dakikalık ürün sunumu ve 5 dakikalık teknik anlatım; ölçülmüş bulgular ve alınan kararlar birlikte sunulabiliyor |

Temel portföy paketi 2. hafta sonunda hazırlanabilir; gerçek kullanıcı öğrenimleri geldikçe güncellenir. Tam kullanıcı doğrulaması bitmeden bütün sunumu bekletmek gerekmiyor.

**İlk sprint için uygulanabilir backlog**

| Sıra | İş | Kabul koşulu |
|---|---|---|
| 1 | Web Docker build girdilerini düzelt | Temiz, izole build kardeş klasörde olmayan dosya aramıyor; 169 katalog kaydının sayfaları sitemap'e giriyor |
| 2 | Lint yanıt tipini düzelt, web testini toplam kontrole dahil et | Lint + build + 5 laboratuvar testi tek belgeli akışta geçiyor |
| 3 | Minimum CI kur | PR kontrolü gerçek derleme ve test hatasında başarısız oluyor; kurulmuş yerel artifacts klasörüne bağımlı değil |
| 4 | Ürün/demo navigasyonunu ayır | Öğrenme akışı ticaret/ödeme sayfasına ihtiyaç duymuyor; teknik demo erişilebilir kalıyor |
| 5 | İlk mobil keşfi kısalt | 390 px genişlikte iki kart seçimi ve Birleştir eylemi anlaşılır; yatay taşma ana eylemi gizlemiyor |
| 6 | Veri kapsamı ve boş bölüm sunumunu düzelt | Tamamen boş üç bölüm içerik varmış gibi sunulmuyor; null anlamı ve kaynak tarihi korunuyor |
| 7 | Başlangıç metadata'sını ürün vaadiyle hizala | Paylaşılan ana sayfa başlık/açıklaması atlas ve keşif deneyimini anlatıyor |
| 8 | İlk tarayıcı regresyon akışını ekle | İlk keşif, yenilemede ilerleme, kilitli malzeme ve API kesintisi senaryoları doğrulanıyor |

Hesaplar ilk yayında açık tutulacaksa auth sınırları ve production ayarları bu sprintin yayın koşuluna eklenir. Güvenli bir misafir beta, tam üyelik hazır olana kadar ara teslim olabilir.

**Başarıyı nasıl ölçeceğiz?**

Ana aday ölçüt: Haftada en az bir öğrenme rotasını tamamlayan kullanıcı sayısı. Sayfa görüntüleme ve kayıt sayısı tek başına ürün değerini göstermiyor.

| Ölçüm | Tanım | Kullanılacağı karar |
|---|---|---|
| İlk keşif oranı | Laboratuvarı açıp ilk keşfi tamamlayan benzersiz kullanıcı / laboratuvarı açan benzersiz kullanıcı | Başlangıç anlaşılır mı? |
| İlk keşfe süre | İlk laboratuvar açılışı → ilk başarılı keşif | Mobil/başlangıç sürtünmesi var mı? |
| Rota bitirme | Başlanan rotaların tamamlanan oranı | Görev uzunluğu ve açıklamalar işe yarıyor mu? |
| Öğrenme kontrolü | Rotanın öncesi/sonrasındaki kısa sorunun sonucu | Kullanıcı sadece kombinasyon ezberliyor mu? |
| 7 günlük geri dönüş | İlk anlamlı deneyimi yaşayan kohortun sonraki 7 gün içinde geri gelen kısmı | Tek seferlik oyuncak mı, tekrar kullanılan araç mı? |
| İşlem başarısı | API ve istemci hata oranları; auth/senkronizasyon sorunları | Ürün kullanılamadığı için mi terk ediliyor? |

Önerilen olaylar: `lab_started`, `discovery_completed`, `lesson_completed`, `record_opened`, `progress_saved`, `api_example_run`. Kimlik bilgileri, anahtarlar ve ham kişisel içerik olay yüküne konmamalı. İlk 10–20 kişilik örneklemde yüzdeler kesin pazar kanıtı olarak sunulmamalı; gözlem ve görüşmelerle birlikte değerlendirilmeli. İlk 4/5 tamamlama eşiği de endüstri standardı değil, önerilen kullanılabilirlik geçiş ölçütüdür.

**Portföy anlatımı**

Ürün gösterimi: Bir günlük madde seç → elementlerine bak → kısa keşif yap → açıklamayı gör → ilerlemeyi sürdür. İlk üç dakikada kullanıcı faydası görünmeli.

Teknik gösterim: Bir simülasyon siparişi oluştur → stok ayırma, ödeme ve kargo durumlarını göster → aynı idempotency anahtarıyla tekrar isteğin ikinci tahsilat üretmediğini kanıtla → başarısız senaryoda stok/bakiye telafisini göster. Bu senaryoların bazıları için zaten test kodu var; canlı demo, başarısızlıkları yönetme kararları ve test çıktılarıyla hazırlanmalı.

README'nin başında problem, hedef kullanıcı, çalışan demo ve kısa ekran gösterimi bulunmalı. Ayrı teknik vaka anlatımı; mimari seçimin nedenini, hangi parçanın sonradan sadeleştirildiğini, hangi hatanın nasıl bulunduğunu ve kalan sınırları anlatmalı. “Üç dil ve sekiz servis kullandım” tek başına ürün hikâyesi olarak yeterli değil.

Başvuru/sunum paketi: canlı URL, üç dakikalık video, birkaç ekran görüntüsü, kurulum adımları, CI sonucu, mimari diyagram ve doğrulanmış iki güvenilirlik senaryosu. Kullanıcı sayısı, performans veya uptime ölçülmediyse iddia edilmemeli.

**Bu incelemede yapılan kontroller ve sınırlar**

| Kontrol | Sonuç |
|---|---|
| Web bağımlılıklarının lockfile ile kurulumu | Başarılı |
| `npm --prefix web-app test` | 5/5 geçti |
| `npm --prefix web-app run build` | Geçti; SignalR/Rolldown annotation uyarıları var |
| `npm --prefix web-app run lint` | 1 hata: `api.ts:205` |
| Order build ve `npm run check` | Geçti; ledger, compoundPrice ve HTTP kontrolleri başarılı |
| Her iki npm projesinde `npm audit --omit=dev` | Bu tarihte üretim bağımlılıklarında bildirilen açık 0; kapsamlı güvenlik denetimi değildir |
| .NET unit test projesi | Bağımlı projeler derlendi; test çalıştırma .NET 9 runtime bulunmadığından durdu. Bu makinede .NET 10 runtime var. Testler geçti denemez |
| Java testleri | Maven mevcut olmadığı için çalıştırılmadı |
| API/saga entegrasyonu | Çalışan backend/altyapı yoktu; bu incelemede canlı tekrar yapılmadı |
| Docker | Tam platform build yapılmadı; web build dosya sınırı izole dizinde yeniden üretildi ve ENOENT doğrulandı |
| Tarayıcı | Masaüstü ana sayfa, laboratuvar, mobil düzen, ilk keşif ve yenilemede ilerleme kontrol edildi |
| Veri/medya | 118+51 kayıt sayıldı; 169 özet, 40 fotoğraf, 51 yapı görseli ve başvurulan yerel dosyalar kontrol edildi |

Mevcut .NET hedefi `net9.0`. Microsoft'un 8 Eylül 2026 güncel [destek tablosuna](https://dotnet.microsoft.com/en-us/platform/support/policy/dotnet-core) göre .NET 9 desteği 10 Kasım 2026'da bitiyor; .NET 10 LTS desteği 14 Kasım 2028'e kadar sürüyor. Public beta takvimine kontrollü .NET 10 geçişi alınmalı. Bu, bugünkü testlerin otomatik olarak .NET 10'da aynı davrandığı anlamına gelmez; runtime, EF/paket uyumu ve integration testleri birlikte doğrulanmalı.

Geçmiş repo notlarındaki “büyük uncommitted değişiklik” anlatımı bu checkout'un başlangıç durumunu yansıtmıyor: incelemeye temiz çalışma ağacıyla başlandı. `deploy/AGENTS.md` MassTransit 9.1.1 derken mevcut proje referansları 8.3.4 kullanıyor. Geçmiş test sonuçları güncel doğrulama olarak kabul edilmedi.

**Bulguların kod adresleri**

- [Ana navigasyon ve uygulama akışı](C:/Users/AFU/Desktop/DEV/element-api/web-app/src/App.tsx)
- [Kayıt sonrası mağaza yönlendirmesi](C:/Users/AFU/Desktop/DEV/element-api/web-app/src/pages/Register.tsx:47)
- [Laboratuvar ilerlemesi ve tarifleri](C:/Users/AFU/Desktop/DEV/element-api/web-app/src/services/lab.ts)
- [Docker build context](C:/Users/AFU/Desktop/DEV/element-api/docker-compose.yml:338) ve [dış dosya okuyan sitemap scripti](C:/Users/AFU/Desktop/DEV/element-api/web-app/scripts/write-sitemap.mjs:14)
- [Lint hatası](C:/Users/AFU/Desktop/DEV/element-api/web-app/src/services/api.ts:205) ve [oturum anahtarlarının iptali](C:/Users/AFU/Desktop/DEV/element-api/web-app/src/services/api.ts:109)
- [Login davranışı](C:/Users/AFU/Desktop/DEV/element-api/identity-service/Element.Services.Identity.API/Controllers/AuthController.cs:47) ve [global limit bölümlendirmesi](C:/Users/AFU/Desktop/DEV/element-api/gateway-service/Program.cs:40)
- [Dosyadan okunan bilimsel API](C:/Users/AFU/Desktop/DEV/element-api/shared-lib/Science/ScientificCatalog.cs:17) ve [catalog başlangıç bağımlılıkları](C:/Users/AFU/Desktop/DEV/element-api/catalog-service/Element.Services.Element.API/Program.cs)
- [Veri kapsamı](C:/Users/AFU/Desktop/DEV/element-api/catalog-service/Element.Services.Element.Infrastructure/Data/scientific-elements.json)
- [Toplu test akışı](C:/Users/AFU/Desktop/DEV/element-api/deploy/scripts/test-all.ps1) ve [HTTP e2e kontrolleri](C:/Users/AFU/Desktop/DEV/element-api/deploy/scripts/test-e2e.mjs)
- [Sipariş saga'sı](C:/Users/AFU/Desktop/DEV/element-api/order-service/src/saga/orchestrator.ts)
- [Başlangıç HTML metaları](C:/Users/AFU/Desktop/DEV/element-api/web-app/index.html)

Bu çalışma bir değerlendirme ve uygulama planıdır. Ürün/servis kodu değiştirilmedi; yayın yapılmadı. İlk uygulama paketi, yukarıdaki ilk sprint kapsamıdır.
