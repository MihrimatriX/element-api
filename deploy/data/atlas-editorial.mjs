// Original Turkish editorial notes. Scientific measurements remain in their source snapshots.
// Element references: RSC element pages; compound references: the record's PubChem CID.
// Format: stable key | short introduction | uses (semicolon-separated) | optional story.
const elements = `
H|En hafif element olan hidrojen, suyun ve organik moleküllerin yapısında bulunur. Serbest hâlinde iki atomlu bir gazdır.|Amonyak üretimi;Yakıt hücreleri;Petrol arıtımı|Lavoisier'nin verdiği adı, su oluşturmasına gönderme yapar.
He|Helyum, kimyasal tepkimelere çok az katılan hafif bir soy gazdır. Çok düşük sıcaklıklarda bile sıvı kalabilmesi onu özel kılar.|Kriyojenik soğutma;Kaçak tespiti;Koruyucu gaz|Önce Güneş'in tayfında gözlendi; adı Güneş anlamındaki Helios'tan gelir.
Li|Lityum en hafif metaldir. İyonlarının elektrotlar arasında hareket edebilmesi, yeniden şarj edilen pillerin temelidir.|Şarj edilebilir piller;Isıya dayanıklı cam;Seramik
Be|Berilyum, düşük yoğunluğuna karşın sert bir metaldir. X ışınlarını görece kolay geçirmesi özel cihazlarda değerlendirilir.|X ışını pencereleri;Havacılık parçaları;Bakır alaşımları
B|Bor, metal ile ametal arasında özellikler gösterir. Borat mineralleri ve bor içeren camlar günlük yaşamda saf elementten daha yaygındır.|Borosilikat cam;Cam elyafı;Sert seramikler
C|Karbon; grafit, elmas ve grafen gibi çok farklı yapılarda bulunabilir. Aynı atomların bağlanma düzeni, yumuşak bir kalem ucuyla sert bir elmas arasındaki farkı yaratır.|Çelik üretimi;Elektrotlar;Karbon elyafı
N|Azot, atmosferin büyük bölümünü oluşturan iki atomlu gazdır. Proteinler ve DNA gibi biyolojik moleküllerde de yer alır.|Amonyak ve gübre üretimi;Koruyucu atmosfer;Sıvı azotla soğutma
O|Oksijen, havada iki atomlu moleküller hâlinde bulunur. Solunum ve çok sayıda yanma tepkimesinde rol alır; su ve oksitlerin de bileşenidir.|Çelik üretimi;Tıbbi oksijen;Kaynak işlemleri
F|Flor, elektronları güçlü biçimde çeken, çok reaktif bir halojendir. Florür tuzları ve florlu polimerlerin özellikleri elementel gazdan farklıdır.|Florlu polimerler;Özel kimyasallar;Florür bileşiklerinin üretimi
Ne|Neon, elektrik boşalması altında kırmızımsı turuncu ışık veren bir soy gazdır. Her renkli ışıklı tabela neon içermez.|Işıklı tabelalar;Gösterge lambaları;Lazer karışımları
Na|Sodyum, yumuşak ve reaktif bir alkali metaldir. Sofra tuzundaki sodyum iyonu, saf sodyum metalinden farklı bir kimyasal türdür.|Kimyasal sentez;Isı aktarımı;Sodyum bileşikleri
Mg|Magnezyum hafif bir metaldir; alaşımları ağırlığın önemli olduğu ürünlerde kullanılır. Klorofil molekülünün merkezinde magnezyum iyonu bulunur.|Hafif alaşımlar;Metal üretimi;Parlak ışık kaynakları
Al|Alüminyum, yüzeyindeki ince oksit tabakası sayesinde korozyona direnç gösteren hafif bir metaldir.|Ambalaj;Ulaşım araçları;Elektrik iletimi
Si|Silisyum, kum ve silikat minerallerinin temel bileşenlerindendir. Saflaştırılmış kristalleri elektronik devrelerde yarı iletken olarak çalışır.|Bilgisayar yongaları;Güneş hücreleri;Silikon polimerler için hammadde
P|Fosforun beyaz, kırmızı ve siyah gibi farklı yapısal biçimleri vardır. Fosfatlar DNA, kemik ve enerji aktarımında kullanılan moleküllerde bulunur.|Fosfatlı gübreler;Kibrit üretimi;Kimya sanayisi
S|Kükürt, sarı katısıyla tanınan bir ametaldir. Sülfürler ve sülfatlar biçiminde çok sayıda mineralde bulunur.|Sülfürik asit üretimi;Kauçuğun vulkanizasyonu;Tarımsal ürünler
Cl|Klor, sarımsı yeşil renkli, reaktif bir halojendir. Klorür iyonu ile klor gazının özellikleri birbirinden farklıdır.|Su arıtımı;PVC üretimi;Kimyasal ara ürünler
Ar|Argon, havada bulunan bir soy gazdır. Düşük tepkime eğilimi, hassas işlemlerde koruyucu bir ortam sağlamasına yardımcı olur.|Kaynakta koruyucu gaz;Ampuller;Metal üretimi
K|Potasyum, yumuşak ve reaktif bir alkali metaldir. Potasyum iyonları canlı hücrelerde elektriksel dengeye katkıda bulunur.|Gübrelerde potasyum tuzları;Kimyasal üretim
Ca|Kalsiyum; kireç taşı, alçı ve kemik gibi yapılarda bileşikleriyle bulunur. Saf metal, bu minerallerden oldukça farklı davranır.|Metalürji;Kalsiyum bileşikleri;Alaşım üretimi
Sc|Skandiyum, hafif bir geçiş metalidir. Az miktarda eklendiğinde bazı alüminyum alaşımlarının özelliklerini iyileştirebilir.|Alüminyum alaşımları;Yüksek yoğunluklu lambalar
Ti|Titanyum, dayanımı ve korozyon direnciyle tanınır. Yüzeyindeki oksit tabakası metalin çevresiyle etkileşimini sınırlar.|Havacılık;İmplant malzemeleri;Kimyasal tesis ekipmanı
V|Vanadyum farklı yükseltgenme basamaklarında renkli bileşikler oluşturabilir. Çeliğe küçük eklemeler malzemenin dayanımını değiştirebilir.|Takım çelikleri;Katalizörler;Akış bataryaları
Cr|Krom, paslanmaz çelikte koruyucu yüzey tabakasının oluşmasına katkı sağlar. Farklı krom bileşiklerinin özellikleri ve riskleri aynı değildir.|Paslanmaz çelik;Yüzey kaplama;Pigmentler
Mn|Manganez, çelik üretiminde önemli bir yardımcı metaldir. Oksitleri farklı yükseltgenme basamakları sayesinde çeşitli kimyasal işlevler görür.|Çelik üretimi;Pil malzemeleri;Pigmentler
Fe|Demir, çeliğin ana bileşenidir. Oksijen ve nemle etkileşimi paslanmaya yol açarken, alaşım ve yüzey işlemleri kullanım ömrünü değiştirir.|Yapılar ve köprüler;Makine parçaları;Elektrik motorları|Demir işleme tekniklerinin yayılması, insanlık tarihinde Demir Çağı olarak anılan döneme adını verdi.
Co|Kobalt, yüksek sıcaklıkta çalışabilen alaşımlarda ve bazı pil katotlarında yer alır. Kobalt bileşikleri camlara karakteristik mavi renk verebilir.|Pil katotları;Süperalaşımlar;Mavi pigmentler
Ni|Nikel, alaşımlara korozyon direnci kazandıran bir metaldir. Pek çok paslanmaz çelik türünde demir ve kromla birlikte bulunur.|Paslanmaz çelik;Şarj edilebilir piller;Katalizörler
Cu|Bakır, elektrik ve ısıyı iyi ileten kırmızımsı bir metaldir. Yüzeyinde zamanla gelişen patina, çevresine bağlı farklı bakır bileşikleri içerir.|Elektrik kabloları;Isı eşanjörleri;Pirinç ve bronz
Zn|Çinko, çeliği korozyondan korumak için kaplama olarak kullanılır. Bakırla oluşturduğu pirinç, saf metallerden farklı özelliklere sahiptir.|Galvanizleme;Pirinç üretimi;Pil elektrotları
Ga|Galyum, oda sıcaklığına yakın bir sıcaklıkta eriyen bir metaldir. Arsenit ve nitrür bileşikleri optoelektronikte önem taşır.|LED bileşenleri;Yarı iletkenler;Özel alaşımlar
Ge|Germanyum, yarı iletken davranış gösteren bir yarı metaldir. Kızılötesi ışıkla etkileşimi optik uygulamalarda değerlendirilir.|Kızılötesi optikler;Fiber optik;Yarı iletkenler
As|Arsenik farklı yapısal biçimleri bulunan bir yarı metaldir. Bazı bileşikleri yarı iletkenlerde kullanılır; toksikolojik özellikler kimyasal türe bağlıdır.|Galyum arsenit yarı iletkenleri;Özel alaşımlar
Se|Selenyum, ışığa bağlı elektriksel özellikleriyle tanınır. Canlılardaki rolü ve etkileri miktarına ve kimyasal biçimine bağlıdır.|Cam üretimi;Elektronik malzemeler;Pigmentler
Br|Brom, oda sıcaklığında sıvı olan az sayıdaki elementten biridir. Kırmızımsı kahverengi sıvısı kolayca buharlaşır.|Bromlu kimyasallar;Fotoğrafçılıkta bromürler;Özel sanayi bileşikleri
Kr|Kripton, havada çok az miktarda bulunan bir soy gazdır. Elektrik boşalması altında ışık yayabilir.|Özel aydınlatma;Lazerler;Yalıtımlı camlar
Rb|Rubidyum, çok reaktif bir alkali metaldir. Atomlarının belirli geçiş frekansları hassas zaman ölçümünde kullanılır.|Atom saatleri;Araştırma;Özel camlar
Sr|Stronsiyum bileşikleri aleve kırmızı renk verebilir. Kararlı stronsiyum ile radyoaktif izotoplarının kullanım alanları ayrıdır.|Kırmızı işaret fişekleri;Ferrit mıknatıslar;Özel seramikler
Y|İtriyum, nadir toprak elementleriyle birlikte bulunan bir metaldir. Oksit ve kristalleri optik malzemelerde kullanılır.|Lazer kristalleri;Fosfor malzemeleri;Seramikler
Zr|Zirkonyum, korozyona dirençli bir metaldir. Nötronları görece az soğurması, uygun saflıktaki alaşımlarını nükleer uygulamalarda önemli kılar.|Reaktör kaplamaları;Kimyasal ekipman;Zirkonya seramikleri
Nb|Niyobyum, çelik alaşımlarında ve süperiletken malzemelerde kullanılır. Oksit yüzeyi bazı elektrokimyasal uygulamalarda işlev görür.|Yüksek dayanımlı çelik;Süperiletken mıknatıslar
Mo|Molibden, yüksek sıcaklıkta özelliklerini koruyabilen alaşımlara katkı sağlar. Sülfürü katmanlı yapısıyla yağlayıcı olarak kullanılabilir.|Alaşım çelikleri;Katalizörler;Yağlayıcı bileşikler
Tc|Teknesyumun kararlı izotopu yoktur. Bazı izotoplarının yaydığı ışınım tıbbi görüntülemede değerlendirilir.|Nükleer tıp izleyicileri;Nükleer araştırma|Yapay olarak elde edilen ilk element olarak kimya tarihinde özel bir yere sahiptir.
Ru|Rutenyum, platin grubu metallerindendir. Az miktarda kullanıldığı alaşımlarda aşınma ve kimyasal dayanımı etkileyebilir.|Elektrik kontakları;Katalizörler;Özel alaşımlar
Rh|Rodyum, parlak yüzeyli bir platin grubu metalidir. Katalitik özellikleri egzoz gazı dönüşümünde değerlendirilir.|Otomotiv katalizörleri;Yansıtıcı kaplamalar
Pd|Paladyum, hidrojenle etkileşimi ve katalitik etkinliğiyle tanınır. Çok sayıda organik dönüşümde paladyum içeren katalizörler kullanılır.|Katalitik konvertörler;Kimyasal sentez;Elektronik
Ag|Gümüş, elektrik ve ısıyı çok iyi iletir. Işığa duyarlı gümüş halojenürler klasik fotoğrafçılığın temel malzemelerindendir.|Elektrik kontakları;Takı;Fotoğrafçılık
Cd|Kadmiyum, çinko cevherleriyle birlikte elde edilebilen bir metaldir. Kullanım alanları toksisitesi nedeniyle sınırlamalara konu olur.|Özel piller;Yarı iletken bileşikler;Araştırma
In|İndiyum, yumuşak bir metaldir. İndiyum kalay oksit, şeffafken elektrik iletebilmesiyle ekran teknolojisinde kullanılır.|Şeffaf iletken kaplamalar;Lehimler;Yarı iletkenler
Sn|Kalay, kaplama ve alaşım üretiminde uzun süredir kullanılır. Bakırla birleştiğinde bronzu oluşturan temel bileşenlerden biridir.|Lehim;Teneke kaplama;Bronz
Sb|Antimon, kırılgan bir yarı metaldir. Alaşımlarda sertliği etkiler; oksitleri bazı alev geciktirici sistemlerde kullanılır.|Kurşun alaşımları;Alev geciktirici katkılar;Yarı iletkenler
Te|Tellür, yarı iletken özellikler gösteren bir yarı metaldir. Tellürür bileşikleri ışık ve ısıdan elektrik üretiminde kullanılabilir.|Güneş hücreleri;Termoelektrik malzemeler;Alaşımlar
I|İyot, koyu renkli kristaller ve mor buharıyla tanınan bir halojendir. İyodür iyonları biyolojik ve endüstriyel süreçlerde bulunur.|İyot bileşikleri;Fotoğrafçılık;Özel kimyasallar
Xe|Ksenon bir soy gazdır, ancak uygun koşullarda bazı bileşikler oluşturabilir. Elektrik boşalması altında güçlü ışık yayar.|Flaş lambaları;İyon iticiler;Özel aydınlatma
Cs|Sezyum, çok reaktif ve düşük erime noktalı bir alkali metaldir. Sezyum-133 atomunun geçişi, saniyenin tanımında kullanılır.|Atom saatleri;Araştırma;Özel akışkan bileşikleri
Ba|Baryum reaktif bir metaldir; doğada bileşikler hâlinde bulunur. Baryum sülfatın düşük çözünürlüğü, diğer baryum bileşiklerinden farklı kullanım alanları sağlar.|Sondaj akışkanları için barit;Vakum tüpleri;Özel camlar
La|Lantan, lantanit serisine adını veren metaldir. Bileşikleri optik camların özelliklerini değiştirebilir.|Optik cam;Pil alaşımları;Katalizörler
Ce|Seryum, farklı yükseltgenme basamaklarına geçebilen bir lantanit metalidir. Oksidi parlatma ve kataliz uygulamalarında kullanılır.|Cam parlatma;Egzoz katalizörleri;Çakmak alaşımları
Pr|Praseodim, alaşımlarda ve renkli camlarda kullanılan bir lantanit elementidir. Bileşikleri sarı-yeşil renkler verebilir.|Mıknatıs alaşımları;Cam renklendirme;Havacılık alaşımları
Nd|Neodim, güçlü kalıcı mıknatısların önemli bileşenidir. Mıknatıslar saf neodimden değil, demir ve bor içeren alaşımlardan yapılır.|Elektrik motorları;Hoparlörler;Lazer kristalleri
Pm|Prometyumun kararlı izotopu yoktur. Sınırlı miktarlarda elde edildiği için kullanımı özel nükleer uygulamalarla sınırlıdır.|Radyoizotop güç kaynakları;Araştırma
Sm|Samaryum, kobaltla birlikte güçlü mıknatıslar oluşturabilir. Bazı izotopları nötronları etkili biçimde soğurur.|Yüksek sıcaklık mıknatısları;Nötron soğurma;Optik malzemeler
Eu|Evropiyum iyonları, farklı ortamlarda kırmızı veya mavi ışık verebilir. Bu özellik fosfor malzemelerinde kullanılır.|Ekran fosforları;Güvenlik işaretleri;Aydınlatma
Gd|Gadolinyum, manyetik özellikleriyle öne çıkan bir lantanit elementidir. Uygulamalarında saf metal ile kompleks bileşikleri ayrılmalıdır.|Manyetik malzemeler;Özel görüntüleme bileşikleri;Nötron soğurma
Tb|Terbiyum bileşikleri yeşil ışık veren fosforlarda kullanılır. Bazı alaşımları manyetik alan altında boyut değiştirebilir.|Yeşil fosforlar;Manyetostriktif alaşımlar
Dy|Disprosyum, yüksek sıcaklıkta mıknatıs performansını etkileyebilen bir lantanit elementidir.|Kalıcı mıknatıs katkıları;Nükleer kontrol malzemeleri
Ho|Holmiyum, belirgin manyetik özelliklere sahip bir lantanit metalidir. İyonları bazı lazer kristallerinde ışık üretir.|Lazerler;Manyetik araştırma;Optik kalibrasyon
Er|Erbiyum iyonları, fiber optik haberleşmede ışık sinyalini güçlendirebilir. Bazı camlara pembe renk verir.|Fiber optik yükselteçler;Lazerler;Cam renklendirme
Tm|Tulyum, doğada az bulunan lantanitlerdendir. Belirli ışık geçişleri lazer uygulamalarında değerlendirilir.|Lazerler;Taşınabilir ışınım kaynakları;Araştırma
Yb|İterbiyum, lazer ve hassas ölçüm çalışmalarında kullanılan bir lantanit elementidir. Atomları optik saat araştırmalarında incelenir.|Fiber lazerler;Atom saatleri araştırması
Lu|Lütesyum, lantanit dizisinin sonundadır. Bileşikleri ışınım algılayan kristallerde kullanılabilir.|Sintilasyon dedektörleri;Katalizörler;Nükleer araştırma
Hf|Hafniyum, zirkonyumla birlikte bulunur ancak nötron soğurması belirgin biçimde farklıdır. Oksidi mikroelektronikte yalıtkan olarak kullanılır.|Reaktör kontrolü;Yonga yalıtkanları;Süperalaşımlar
Ta|Tantal, korozyona dirençli bir metaldir. Yüzeyindeki oksit tabakası elektronik kapasitörlerde işlev görür.|Kapasitörler;Kimyasal ekipman;İmplant malzemeleri
W|Tungsten, çok yüksek erime noktasıyla tanınır. Karbür bileşikleri kesici takımlarda kullanılan sert malzemelerdir.|Kesici takımlar;Yüksek sıcaklık parçaları;Elektrotlar
Re|Renyum, yüksek sıcaklıkta çalışan bazı nikel alaşımlarına eklenir. Çok az miktarlar bile alaşımın davranışını değiştirebilir.|Jet motoru alaşımları;Petrol işleme katalizörleri
Os|Osmiyum, yoğunluğu çok yüksek bir platin grubu metalidir. Metal ile uçucu oksidinin özellikleri birbirinden farklıdır.|Özel sert alaşımlar;Kimyasal araştırma
Ir|İridyum, yüksek sıcaklık ve korozyon direnciyle öne çıkar. Çok sert alaşımların ve özel elektrotların bileşenidir.|Ateşleme uçları;Yüksek sıcaklık kapları;Elektrotlar
Pt|Platin, düşük tepkime eğilimi ile katalitik etkinliği bir arada sunar. Yüzeyi pek çok tepkimenin hızını değiştirebilir.|Katalizörler;Takı;Laboratuvar ekipmanı
Au|Altın, sarı rengi ve kolay şekillendirilebilmesiyle tanınır. Korozyona direnci, küçük elektronik bağlantılarda da değerlendirilir.|Takı;Elektronik bağlantılar;Yüzey kaplama|İnsanların çok erken dönemlerden beri işlediği metallerden biridir; doğada metal hâlinde bulunabilir.
Hg|Cıva, oda sıcaklığında sıvı olan bir metaldir. Tarihsel ölçüm cihazlarında kullanılmış olsa da toksisitesi kullanımlarını sınırlar.|Özel ışık kaynakları;Bilimsel araştırma;Tarihsel ölçüm cihazları
Tl|Talyum, yumuşak ve ağır bir metaldir. Bileşikleri özel optik ve elektronik uygulamalarda incelenir.|Özel camlar;Dedektör malzemeleri;Araştırma
Pb|Kurşun, yoğun ve kolay şekillendirilen bir metaldir. Toksisitesi nedeniyle kullanım ve geri dönüşümünde özel önlemler gerekir.|Kurşun-asit aküler;Işınım zırhlama;Özel alaşımlar
Bi|Bizmut, kırılgan ve kristal yüzeyleriyle dikkat çeken bir metaldir. Düşük erime sıcaklıklı alaşımlarda kullanılır.|Ergiyebilir alaşımlar;Pigmentler;Bizmut bileşikleri
Po|Polonyum, güçlü radyoaktivite gösteren bir elementtir. Çok küçük miktarları bile nükleer özellikleriyle önem taşır.|Nükleer araştırma;Tarihsel özel ışınım kaynakları|Marie ve Pierre Curie tarafından tanımlandı; adı Polonya'ya gönderme yapar.
At|Astatin, doğada çok küçük miktarlarda bulunan radyoaktif bir halojendir. Kimyası çoğunlukla iz miktarlarla araştırılır.|Radyoizotop araştırmaları
Rn|Radon, radyoaktif bozunma zincirlerinde oluşan bir soy gazdır. Gaz hâli nedeniyle oluştuğu mineralden çevresine geçebilir.|Yer bilimleri izleyicileri;Radyoaktivite araştırması
Fr|Fransiyum, çok kısa ömürlü izotopları bulunan bir alkali metaldir. Toplu bir metal numunesinden çok, az sayıda atom üzerinden incelenir.|Atom fiziği araştırması
Ra|Radyum, radyoaktif bir toprak alkali metaldir. Geçmişte ışıldayan boyalarda kullanılması bilim ve sağlık tarihinde önemli izler bıraktı.|Nükleer araştırma;Tarihsel ışıldayan boyalar
Ac|Aktinyum, aktinit serisine adını veren radyoaktif elementtir. İzotoplarının üretimi ve kimyasal ayrılması araştırma konusudur.|Radyoizotop araştırmaları
Th|Toryum, doğada bulunan radyoaktif bir aktinit metalidir. Nükleer yakıt çevrimleriyle ilişkisi nedeniyle araştırılır.|Nükleer yakıt araştırması;Özel alaşımlar
Pa|Protaktinyum, uranyum bozunma zincirlerinde çok az miktarda bulunur. Nadirliği ve radyoaktivitesi kullanımını sınırlar.|Nükleer kimya;Yer bilimleri araştırmaları
U|Uranyum, doğada bulunan ağır ve radyoaktif bir metaldir. Nükleer davranışı izotop bileşimine bağlıdır.|Nükleer yakıt;Nükleer ve jeolojik araştırma
Np|Neptünyum, uranyumun ötesindeki ilk elementtir. Nükleer tepkimelerle elde edilir ve aktinit kimyasının araştırılmasında kullanılır.|Nükleer kimya;İzotop üretimi
Pu|Plütonyum, farklı yükseltgenme basamakları gösteren radyoaktif bir aktinittir. İzotopları farklı nükleer uygulamalara sahiptir.|Nükleer yakıt;Radyoizotop güç sistemleri
Am|Amerikyum, yapay olarak üretilen bir aktinittir. Küçük, kapalı kaynaklar hâlinde bazı duman dedektörlerinde kullanılır.|İyonlaşmalı duman dedektörleri;Araştırma
Cm|Küriyum, laboratuvarda üretilen radyoaktif bir elementtir. Bazı izotopları analitik cihazlarda alfa kaynağı olarak kullanılır.|Alfa parçacığı kaynakları;Aktinit araştırması
Bk|Berkelyum, ağır elementlerin sentezinde hedef malzeme olarak kullanılabilen yapay bir aktinittir.|Yeni element sentezi;Aktinit kimyası
Cf|Kaliforniyumun bazı izotopları nötron kaynağı olarak kullanılabilir. Üretimi özel nükleer tesisler gerektirir.|Nötron kaynakları;Malzeme analizi;Araştırma
Es|Aynştaynyum, çok az miktarda üretilebilen bir aktinittir. Elektronik yapısı ağır element kimyasını anlamaya yardımcı olur.|Aktinit araştırması|Adı fizikçi Albert Einstein'ı anmak için seçildi.
Fm|Fermiyum, nükleer tepkimelerde oluşan yapay bir aktinittir. Kısa ömür ve üretim miktarı, kimyasal deneyleri sınırlar.|Ağır çekirdek araştırması|Adı Enrico Fermi'yi anmak için verildi.
Md|Mendelevyum atomları hızlandırıcı deneylerinde üretilir. Kimyasal davranışı çok küçük örneklerle incelenir.|Aktinit kimyası|Adı periyodik tablonun gelişimine katkı sağlayan Dmitri Mendeleyev'e gönderme yapar.
No|Nobelyum, yapay olarak üretilen bir aktinittir. İki değerlikli kimyasal davranışı aktinitler içinde dikkat çeker.|Ağır element kimyası|Adı Alfred Nobel'i anmak için seçildi.
Lr|Lavrensiyum, aktinit dizisinin sonunda yer alır. Atomlarının elektronik yapısı periyodik sınıflandırma açısından araştırılır.|Atomik yapı ve aktinit araştırması
Rf|Rutherfordyum, dördüncü grupta yer alan süper ağır bir elementtir. Tek tek atomlarla yapılan deneylerde zirkonyum ve hafniyumla karşılaştırılır.|Süper ağır element kimyası
Db|Dubniyum, beşinci grubun süper ağır üyesidir. Kısa ömürlü atomlarının kimyasal ayrılması özel deneyler gerektirir.|Süper ağır element araştırması
Sg|Seaborgiyum, altıncı grupta yer alan yapay bir elementtir. Çok az sayıdaki atomla yapılan deneyler grup benzerliklerini sınar.|Süper ağır element kimyası|Adı kimyager Glenn Seaborg'u anmak için verildi.
Bh|Bohriyum, manganezin bulunduğu grubun süper ağır üyesidir. Kararlı bir numunesi bulunmaz.|Çekirdek ve tek atom kimyası
Hs|Hassiyum, osmiyumla aynı grupta sınıflandırılır. Kısa ömürlü atomlarıyla ağır elementlerin kimyasal benzerlikleri incelenir.|Süper ağır element kimyası
Mt|Meitneriyum, parçacık hızlandırıcılarında sentezlenen bir elementtir. Makroskopik fiziksel özelliklerinin çoğu ölçülmemiştir.|Çekirdek fiziği|Adı fizikçi Lise Meitner'i anmak için seçildi.
Ds|Darmstadtiyum, platin grubunun altında sınıflandırılan süper ağır elementtir. Bilinen atomları radyoaktif bozunmayla tanınır.|Süper ağır çekirdek araştırması
Rg|Röntgenyum, bakır ve altınla aynı sütunda yer alır. Bu konum, ölçülmemiş özelliklerinin doğrulanmış olduğu anlamına gelmez.|Süper ağır çekirdek araştırması
Cn|Kopernikyum, on ikinci grubun süper ağır üyesidir. Çok az atom üzerinde yapılan çalışmalar ağır atom etkilerini araştırır.|Tek atom kimyası
Nh|Nihonyum, on üçüncü grupta sınıflandırılan yapay elementtir. Kısa ömürlü çekirdeklerinin üretimi özel hızlandırıcılar gerektirir.|Süper ağır çekirdek araştırması|Adı Japonya için kullanılan Nihon sözcüğünden gelir.
Fl|Flerovyum, on dördüncü grubun süper ağır üyesidir. Atom çekirdeğinin kararlılığına ilişkin modelleri sınamak için incelenir.|Çekirdek kararlılığı araştırması
Mc|Moskovyum, on beşinci grupta yer alan yapay elementtir. Üretim deneylerinde bozunma zincirleri izlenerek tanımlanır.|Nükleer yapı araştırması
Lv|Livermoryum, on altıncı grubun süper ağır üyesidir. Gündelik bir madde numunesi yerine tek tek üretilen atomlarla çalışılır.|Süper ağır çekirdek araştırması
Ts|Tennessin, halojenlerin altında sınıflandırılan süper ağır elementtir. Sınıflandırılması, klorla aynı ölçülmüş özelliklere sahip olduğu anlamına gelmez.|Çekirdek fiziği
Og|Oganesson, bilinen periyodik tablonun 118 numaralı elementidir. Soy gaz sütununda bulunsa da makroskopik hâli ve pek çok özelliği deneysel olarak bilinmez.|Süper ağır çekirdek araştırması
`;
const compounds = `
h2o|H2O|Su, iki hidrojen ile bir oksijen atomunun oluşturduğu moleküldür. Moleküller arası hidrojen bağları, sıvı suyun pek çok özelliğine katkı verir.|Çözücü;Soğutma ve ısı aktarımı;Biyolojik ortam
licl|LiCl|Lityum klorür, lityum ve klorür iyonlarından oluşan bir tuzdur. Nemi güçlü biçimde çekebilmesi teknik uygulamalarda değerlendirilir.|Nem kontrolü;Kimyasal sentez
li2co3|Li2CO3|Lityum karbonat, lityum tuzlarının üretiminde kullanılan bir karbonattır. Seramik ve cam formülasyonlarında da yer alır.|Cam ve seramik;Lityum kimyasalları
b2o3|B2O3|Bor trioksit, cam oluşturan bir oksittir. Camın ısı ve kimyasal dayanımını değiştiren bileşenlerden biridir.|Borosilikat cam;Seramik sırları
co2|CO2|Karbondioksit, bir karbon ile iki oksijen atomundan oluşur. Gaz hâli atmosferde bulunur; katı biçimi kuru buz olarak bilinir.|Gazlı içecekler;Soğutma;Koruyucu atmosfer
nh3|NH3|Amonyak, azot ve hidrojenden oluşan bir moleküldür. Suda çözünen gaz, çözeltide asit-baz dengelerine katılır.|Gübre hammaddesi;Endüstriyel soğutma
hf|HF|Hidrojen florür, hidrojen ile florun bileşiğidir. Gaz ve sulu çözelti biçimleri, derişim ve koşullarıyla birlikte değerlendirilir.|Florlu kimyasallar;Cam ve yüzey işleme
nacl|NaCl|Sodyum klorür, sofra tuzunun temel bileşenidir. Katı hâlde ayrı NaCl molekülleri yerine düzenli bir iyon örgüsü oluşturur.|Gıda işlemleri;Kimya sanayisi;Buzlanma kontrolü
naoh|NaOH|Sodyum hidroksit, suda çözündüğünde kuvvetli bazik ortam oluşturan iyonik bir katıdır. Yaygın adı kostik sodadır.|Sabun üretimi;Kâğıt üretimi;Kimyasal işleme
mgo|MgO|Magnezyum oksit, yüksek sıcaklıklara dayanabilen iyonik bir oksittir. Doğada periklaz minerali olarak bulunur.|Fırın astarları;Refrakter seramikler
al2o3|Al2O3|Alüminyum oksit, sert ve ısıya dayanıklı bir malzemedir. Korundumun kimyasal bileşimi budur; safsızlıklar yakut ve safire renk verir.|Aşındırıcılar;Teknik seramikler;Alüminyum üretimi
sio2|SiO2|Silisyum dioksit, kuvars ve birçok kumun temel bileşenidir. Katı yapısında atomlar geniş bir bağ ağı oluşturur.|Cam;İnşaat malzemeleri;Silika ürünleri
h2so4|H2SO4|Sülfürik asit, kükürt içeren temel sanayi kimyasallarındandır. Özellikleri sulu çözeltinin derişimine güçlü biçimde bağlıdır.|Gübre üretimi;Metal işleme;Kurşun-asit aküler
hcl|HCl|Hidrojen klorür, hidrojen ile klorun gaz bileşiğidir. Suda çözündüğünde oluşan çözelti hidroklorik asit olarak adlandırılır.|Kimyasal sentez;Metal yüzey işleme;Asitlik ayarı
kcl|KCl|Potasyum klorür, potasyum ve klorür iyonlarından oluşan bir tuzdur. Sylvit mineralinin kimyasal bileşimidir.|Gübre;Potasyum kimyasalları
koh|KOH|Potasyum hidroksit, kuvvetli baz oluşturan iyonik bir katıdır. Nem çekmesi ve çözünürken ısı açığa çıkarması önemli özellikleridir.|Yumuşak sabunlar;Alkali pil elektrolitleri
caco3|CaCO3|Kalsiyum karbonat; kireç taşı, mermer ve tebeşirin temel bileşenidir. Aynı bileşim kalsit ve aragonit gibi farklı kristal yapılarda bulunabilir.|Yapı malzemeleri;Kâğıt dolgusu;Cam üretimi
cao|CaO|Kalsiyum oksit, sönmemiş kireç olarak bilinir. Su ile kimyasal dönüşüme uğraması kireç teknolojisinin temelidir.|Çimento ve kireç;Çelik üretimi;Su işleme
tio2|TiO2|Titanyum dioksit, rutil ve anataz gibi farklı kristal yapılarda bulunur. Işığı güçlü saçması beyaz pigment olarak kullanılmasını sağlar.|Beyaz pigment;Kaplamalar;Fotokataliz araştırması
v2o5|V2O5|Vanadyum pentoksit, vanadyumun yüksek yükseltgenme basamağındaki oksididir. Yükseltgenme tepkimelerinde katalizör olarak kullanılır.|Kimya sanayisinde kataliz;Seramikler
cr2o3|Cr2O3|Krom(III) oksit, kararlı yeşil pigmentiyle tanınır. Kromun farklı yükseltgenme basamaklarındaki bileşikleriyle karıştırılmamalıdır.|Yeşil pigment;Parlatıcı;Refrakterler
mno2|MnO2|Manganez dioksit, manganezin önemli oksitlerinden biridir. Elektron aktarımına katılabilmesi pil kimyasında değerlendirilir.|Pil katotları;Kataliz;Cam üretimi
fe2o3|Fe2O3|Demir(III) oksit, hematit mineralinin bileşimidir. Kırmızımsı pigmentlerde bulunur; günlük pasın bileşimi ise daha karmaşıktır.|Demir üretimi;Kırmızı pigment;Parlatma
fe3o4|Fe3O4|Manyetit, hem demir(II) hem demir(III) içeren bir demir oksittir. Manyetik özellikleriyle diğer yaygın demir oksitlerinden ayrılır.|Demir cevheri;Manyetik malzemeler;Pigment
cocl2|CoCl2|Kobalt(II) klorürün rengi su içeriğine göre değişebilir. Susuz tuz ile hidratları aynı molar kütleye sahip değildir.|Kimyasal sentez;Nem göstergeleri
niso4|NiSO4|Nikel(II) sülfat, nikel iyonları ile sülfat iyonlarını bir araya getirir. Uygulamalarda farklı hidrat biçimleriyle karşılaşılır.|Nikel kaplama;Pil malzemeleri üretimi
cuso4|CuSO4|Bakır(II) sülfatın susuz biçimiyle mavi pentahidrat kristalleri farklı kayıtlardır. Buradaki formül susuz bileşiği gösterir.|Elektrokaplama;Kimyasal sentez;Analitik kimya
cu2o|Cu2O|Bakır(I) oksit, kırmızımsı bir bakır oksididir. Siyah bakır(II) oksitten hem bileşimi hem elektronik özellikleriyle ayrılır.|Pigment;Yarı iletken araştırması;Kaplamalar
zno|ZnO|Çinko oksit, beyaz bir oksit ve yarı iletkendir. Optik ve yüzey özellikleri farklı endüstrilerde değerlendirilir.|Kauçuk üretimi;Seramik;Optoelektronik
geo2|GeO2|Germanyum dioksit, germanyum içeren bir oksittir. Camın kırılma indisini değiştirmesi optik uygulamalarda önem taşır.|Fiber optik;Özel camlar
as2o3|As2O3|Arsenik trioksit, arsenik içeren bir oksittir. Kullanım alanları ve toksikolojik özellikleri nedeniyle özel denetim gerektiren bir maddedir.|Özel cam işlemleri;Kimyasal araştırma
mos2|MoS2|Molibden disülfür, tabakalı yapıya sahip bir bileşiktir. Tabakaların birbirine göre kayması düşük sürtünmeli davranışa katkı verir.|Katı yağlayıcı;Kataliz;İki boyutlu malzeme araştırması
pdcl2|PdCl2|Paladyum(II) klorür, paladyum içeren katalizör ve komplekslerin hazırlanmasında kullanılan bir başlangıç maddesidir.|Katalizör hazırlama;Analitik kimya
agno3|AgNO3|Gümüş nitrat, suda çözünebilen bir gümüş tuzudur. Halojenür iyonlarıyla az çözünen gümüş tuzları oluşturması analizde kullanılır.|Analitik kimya;Gümüş bileşikleri;Fotoğraf malzemeleri
agcl|AgCl|Gümüş klorür, suda az çözünen ve ışığa duyarlı bir tuzdur. Klorür iyonunun çöktürülerek belirlenmesinde kullanılabilir.|Referans elektrotlar;Fotoğrafçılık;Analitik kimya
cds|CdS|Kadmiyum sülfür, sarı renkli bir yarı iletkendir. Optik özellikleri pigment ve algılayıcı uygulamalarında değerlendirilmiştir.|Özel pigmentler;Optoelektronik araştırma
in2o3|In2O3|İndiyum oksit, bazı katkılarla şeffaf iletken malzemelere dönüşebilir. Kalay katkılı biçimi ekran kaplamalarında yaygındır.|Şeffaf iletkenler;Gaz algılayıcıları
sno2|SnO2|Kalay(IV) oksit, kasiterit mineralinin bileşimidir. Katkılanmış ince filmleri elektriksel ve optik işlevler görebilir.|Cam kaplamaları;Gaz algılayıcıları;Seramik
sb2o3|Sb2O3|Antimon trioksit, antimonun yaygın oksitlerinden biridir. Bazı polimerlerde diğer bileşenlerle birlikte alev geciktirici sistemlerde kullanılır.|Polimer katkıları;Cam;Seramik
teo2|TeO2|Tellür dioksit, optik özellikleriyle dikkat çeken bir oksittir. Kristal ve cam biçimleri farklı uygulamalarda değerlendirilir.|Akustooptik cihazlar;Özel camlar
cscl|CsCl|Sezyum klorür, kristal yapı öğretiminde sık karşılaşılan bir iyonik tuzdur. Yoğun çözeltileri ayırma tekniklerinde kullanılabilir.|Yoğunluk gradyanları;Sezyum kimyası
baso4|BaSO4|Baryum sülfat, barit mineralinin bileşimidir. Suda çok az çözünmesi onu birçok başka baryum tuzundan ayırır.|Sondaj akışkanları;Dolgu maddeleri;Özel görüntüleme süspansiyonları
wo3|WO3|Tungsten trioksit, tungsten içeren bir oksittir. Elektriksel etkiyle renk değiştirebilen sistemlerde araştırılır.|Elektrokromik camlar;Tungsten üretimi;Pigment
wc|WC|Tungsten karbür, yüksek sertliğiyle bilinen bir bileşiktir. Kesici takımlarda çoğunlukla metal bağlayıcıyla birlikte kullanılır.|Kesici takımlar;Aşınmaya dayanıklı parçalar
ptcl2|PtCl2|Platin(II) klorür, platin komplekslerinin hazırlanmasında kullanılan bir bileşiktir. Yapısı ve çözünürlüğü kimyasal ortama bağlıdır.|Koordinasyon kimyası;Katalizör hazırlama
aucl3|AuCl3|Altın(III) klorür, altının klor içeren bileşiklerinden biridir. Katı yapısı yalnız basit bir üç atomlu çevreyle açıklanmaz.|Altın kimyası;Kaplama çözeltileri;Sentez
hgs|HgS|Cıva(II) sülfür, zinober mineralinin bileşimidir. Kırmızı ve siyah gibi farklı yapısal biçimleri bulunabilir.|Mineraloji;Tarihsel pigmentler;Araştırma
pbo|PbO|Kurşun(II) oksit, farklı kristal biçimleri bulunan bir kurşun oksididir. Kurşun içerdiği için kullanımında toksikoloji bilgisi önemlidir.|Özel camlar;Akü malzemeleri;Seramik
bi2o3|Bi2O3|Bizmut(III) oksit, sarı renkli bir oksittir. İyon iletimi ve optik özellikleri malzeme araştırmalarında incelenir.|Özel camlar;Seramik;İyon iletkenleri
uo2|UO2|Uranyum dioksit, kristal bir uranyum oksididir. Nükleer yakıtta kullanılan malzemenin özellikleri izotop bileşimi ve üretim koşullarına bağlıdır.|Nükleer yakıt seramikleri;Nükleer malzeme araştırması
aspirin|C9H8O4|Aspirin, asetilsalisilik asidin yaygın adıdır. Aromatik halkasına bağlı karboksilik asit ve ester grupları, molekülün kimliğini belirler.|Farmasötik üretim;Organik kimya eğitimi;Analitik araştırma
`;
export const elementEditorial = Object.fromEntries(elements.trim().split('\n').map(line => { const [key, summary, uses, story] = line.split('|'); return [key, {summary, uses:uses.split(';'), story:story ?? null}]; }));
export const compoundEditorial = Object.fromEntries(compounds.trim().split('\n').map(line => { const [key, display_formula, summary, uses] = line.split('|'); return [key, {display_formula, summary, uses:uses.split(';'), story:null}]; }));
