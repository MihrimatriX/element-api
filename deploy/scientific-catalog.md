# Bilimsel katalog ve ana sayfa uygulaması

## Ürün akışı

Ana sayfa ve `/periodic`, aynı periyodik tablo bileşenini kullanır. 118 hücre, kategori renkleri, Türkçe/İngilizce arama, atom numarası, kategori filtresi, klavye okları, masaüstü önizlemesi ve mobil liste görünümü bulunur. Bir element kendi bilimsel ayrıntı sayfasına açılır. `/compounds` bileşik aramasını; `/compound/:slug` moleküler, fiziksel, güvenlik ve farmakoloji bölümlerini sunar. Kaynak bağlantıları, eksik alan görünümü ve JSON indirme tüm ayrıntılarda vardır.

## Servis sorumlulukları

- Catalog: sürümlenmiş 118 element ve 354 NIST izotop referans kaydı; `/api/v2/elements`.
- Compound: 50 mevcut saf bileşik ve aspirin; `/api/v2/compounds`. Preparat, ticari ürün ve allotrop kayıtları bu bilimsel koleksiyona karıştırılmaz.
- Shared: sorgu doğrulama, iç içe alan seçimi, arama, sayfalama, ETag ve önbellek sözleşmesi.
- Gateway: herkese açık v2 GET/OPTIONS rotaları, ayrı CORS ilkesi, mevcut rate limit, gzip/Brotli.
- Web: bilimsel özetleri yalnız ihtiyaç anında yükler. Bilimsel sayfalarda fiyat listesini her 30 saniyede çekmez veya fiyat SignalR bağlantısı açmaz.
- Identity, order, payment, shipment ve notification mevcut v1 sözleşmeleriyle simülasyonu sürdürür. Bilimsel kayıt okumak için hesap açmak, anahtar üretmek veya sipariş vermek gerekmez.

## v2 sözleşmesi

Listeler varsayılan `view=summary`, tekil kayıtlar `view=full` döndürür. Element kimliği sembol (`fe`), atom numarası (`26`) veya kalıcı kimlik (`fe-26`) olabilir. Bileşiklerde slug (`aspirin`) veya CID (`2244`) kullanılır.

```http
GET /api/v2/elements?view=summary&pageSize=100
GET /api/v2/elements/fe
GET /api/v2/elements/fe?view=summary&include=isotopes,provenance
GET /api/v2/elements/fe?fields=symbol,names.tr,atomic_properties.radii_pm
GET /api/v2/elements?q=demir&block=d
GET /api/v2/compounds?q=aspirin
GET /api/v2/compounds/2244?fields=names,molecular_properties,safety
```

`fields`, `view` ve `include` üzerinde önceliklidir. Nesneler noktalı yollarla, diziler bütün olarak seçilir. En fazla 32 yol ve altı derinlik seviyesi kabul edilir. Boş/yanlış alanlar ve geçersiz sayfalama 400; bulunmayan kimlik 404 döndürür. `pageSize` 1–100 arasındadır. `info.next/prev`, filtre ve alan seçimini koruyan gateway köküne göreli bağlantılardır. `q`, Türkçe harflerin ASCII karşılıklarını da arar; elementlerde `category`, `block`, `group`, `period` birlikte uygulanır.

Başarılı bilimsel yanıtlar bir saatlik `public` önbellek ve temsil bazlı zayıf ETag taşır; eşleşen `If-None-Match` 304 döndürür. Hesap, kasa ve sipariş rotalarına ortak önbellek veya açık CORS uygulanmaz. v1 JSON alan adları ve fiyat sözleşmeleri korunur; v2 bilimsel alan adları snake_case biçimindedir.

## Kaynaklar, kapsam ve eksik veriler

PubChem PUG REST periyodik tablosu ve moleküler tanımlayıcıları, RSC sayısal atomik/mekanik verileri, NIST izotop bileşimleri kullanılır. PubChem PUG View deney kayıtları kaynak ve koşullarıyla korunur. Kaynaklar her tam kaydın `provenance` bölümündedir. Türkçe adlar ve tablo yerleşimi editöryeldir.

Kaynakta standart atom ağırlığı tek sayı ve belirsizlikle verildiğinde NIST kullanılır; aralık veya bilinmeyen durumda PubChem'in bildirdiği atom kütlesi korunur. Tam elektron dizilimi, kaynak kısa diziliminin soy gaz çekirdeği açılarak hesaplanır; elektron toplamı atom numarasıyla doğrulanmadan yayımlanmaz. Kabuk dolulukları aynı dizilimden türetilir. İyonlaşma enerji dizisi RSC; kaynakta bulunmayan dizilerde PubChem ilk enerji değeridir. Enerji, sıcaklık, yarıçap ve ısı kapasitesi dönüşümleri kayıtta açıklanır.

Bu sürümde 118 CAS kaydı, 85 element için birden fazla iyonlaşma enerjisi, 84 özgül ısı kapasitesi ve 49 sayısal hacim modülü vardır. Koşula bağlı Young/kayma modülü sayıları metin halinde de korunur. Bileşiklerin 45'inde erime deneyi, 46'sında GHS tehlike kodları vardır. NIST dizisi tüm radyoaktif izotopların eksiksiz listesi değildir.

Bir alanın şemada bulunması, doğrulanmış değerinin bulunduğu anlamına gelmez. İleri kristalografi, elektromanyetik özellikler, bolluk, birçok sertlik/entalpi ve normalize edilmiş NFPA, maruziyet sınırı, yarı ömür alanı kaynak eklenene kadar `null` kalır. `null`, sıfır veya güvenli anlamına gelmez. Örneğin aspirinde farklı oral sıçan LD50 raporları tek sayıya indirgenmez. Doğal izotop bolluğundan kararlılık/bozunma çıkarılmaz. Yoğunluk, kaynak koşul belirtmiyorsa STP olarak etiketlenmez. Yükseltgenme, değerlik ve blok sınıflandırmasında yöntem farkları olabilir; mevcut tablonun seri yerleşimi korunur.

## Yenileme ve doğrulama

```powershell
node deploy/scripts/refresh-scientific-catalog.mjs
# Dış kaynakları tekrar almak için --force; varsayılanda artifacts/science-cache tekrar kullanılır.
./deploy/scripts/start-local.ps1 -Configuration Science
node deploy/scripts/test-scientific-api.mjs
./deploy/scripts/test-unit.ps1 -Configuration Science
npm --prefix web-app run build
npm --prefix web-app run lint
```

Kaynak HTTP hataları sessizce boş kayıt üretmez; yenileme başarısız olur. Snapshot dosyaları build/publish çıktısına kopyalanır; API okumaları dış kaynaklara istek atmaz. Yeni snapshot'ın etkinleşmesi için ilgili servisi yeniden derleyip başlatın. `Science` derleme yapılandırması, yerel Release çıktısını kilitleyen araçlardan bağımsız doğrulama sağlar. İnternetten erişim için mevcut Docker public profili bir sunucu üzerinde yayınlanmalıdır; localhost, internete yayın anlamına gelmez.
