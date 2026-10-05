# Arayüz (web-app)

> Tarayıcıda çalışan React uygulaması: atlas, laboratuvar, defter, geliştirici sayfaları ve hesaplar açıkken sanal KREDI demosu; bilimsel veriyi v2 API'sinden (ulaşılamazsa paketteki JSON'dan), hesap ve ticareti gateway'in v1 uçlarından alır.

| Özellik | Değer |
|---|---|
| Teknoloji | React 19, TypeScript 6, Vite 8, Tailwind CSS 4, React Router 7, framer-motion, Radix UI (shadcn kalıbı), lucide-react; testte Node test koşucusu ve Playwright |
| Port | Docker'da `6241` (host, `WEB_HOST_PORT`) → `80` (nginx); geliştirmede Vite `5173`; bağımsız atlasta aynı derleme science-service içinden `5080` |
| Klasör | `web-app/` |
| Veri | Kendi veritabanı yok. Bilim API'si `/api/v2` (yedek: paketteki JSON snapshot'ı), gateway `/api/v1` (hesap, cüzdan, sipariş), tarayıcıda localStorage (defter, oyun skorları, sepet, seçili element, isteğe bağlı tanılama) |
| Mesajlaşma | yok; RabbitMQ'ya bağlanmaz, sipariş durumunu HTTP yoklamasıyla izler |

## Ne işe yarar?

Kullanıcının ekranda gördüğü ElementAPI budur. Tek sayfalık bir uygulamadır (SPA): sunucu her adrese aynı `index.html` dosyasını verir, sayfayı tarayıcıdaki React Router seçer. Ürün yüzeyleri şunlardır: atlas (periyodik tablo, bileşik listesi, element ve bileşik kayıt sayfaları), laboratuvar ve iki yan oyun (formül kurma, element dedektifi), keşif defteri ve öğrenme rotaları, el kitabı ve sözlük, geliştirici sayfaları (API tanıtımı, API dokümanları, veri kapsamı, bu kılavuz) ve hesaplar açıkken ayrı bir köşede sanal KREDI demosu (piyasa, mağaza, hesap).

Uygulama `src/main.tsx` dosyasında açılır: `StrictMode` → `ErrorBoundary` (son çare çökme ekranı) → `App`. `App` içinde sağlayıcılar şu sırayla sarılır: `MotionConfig reducedMotion="user"` (işletim sistemi "azaltılmış hareket" diyorsa animasyonlar kapanır) → `BrowserRouter` → `SelectedElementProvider` → `ProductShell` → `Pages`: `ErrorBoundary` (çöken sayfa kabuğun içinde hata ekranı gösterir, başka adrese geçince temizlenir) → `Suspense` (`RouteFallback` iskeleti) → `RouteStage` → `AppRoutes`. Yönlendiricinin içinde, kabuğun yanında `Toaster` (bildirimler) ve `RouteFocus` da bağlanır. Yeni bir sürüm yayınlandığında eski sekmenin istediği karma adlı parça artık yoktur; `main.tsx` bu durumda (`vite:preloadError`) sayfayı bir kez yeniden yükler, 60 sn içinde ikinci kez gerekirse çökme ekranına bırakır (`sessionStorage` anahtarı `elementapi:chunk-reload`).

`SelectedElementProvider` (`src/context/selection.tsx`) iki ortak şeyi tutar: seçili element (önce `?symbol=`, sonra localStorage `elementapi:selectedSymbol`, yoksa `AU`; bilinmeyen sembol altına döner) ve istemci tarafındaki oturum bayrağı. Bayrak saklanan JWT'nin süresine bakar; 15 sn'de bir, başka sekmede değişiklik olunca (`storage`) ve oturum silinince (`element:session`) yeniden hesaplanır. `ProductShell` her sayfanın çerçevesidir: "İçeriğe geç" bağlantısı, yapışkan üst başlık (masaüstünde birincil menü, "Daha fazla" menüsü, "API" kısayolu ve hesap alanı; `lg` altında soldan açılan menü), `#main-content` odak hedefi ve alt bilgi. Menü içeriği `src/productNav.ts` dosyasındaki listelerden gelir.

Sayfa geçişlerini üç parça yönetir. `RouteStage` sayfayı yaylı bir solma ile gösterir; anahtarı yolun ilk parçası olduğu için `/element/fe` → `/element/cu` geçişinde sayfa yeniden kurulmaz. `RouteFocus` bir bağlantıyla yeni sayfaya geçince en üste kaydırır, odağı `#main-content`'e verir ve yeni başlığı ekran okuyucuya duyurur; geri/ileri gezinmede kaydırmayı tarayıcıya bırakır (odak ve duyuru yine yapılır), `#` içeren bağlantılarda ve yönlendirmelerde hiçbirini yapmaz. Menüden veya mobil menüden açılan sayfada kapanan panel odağı tetikleyicisine geri vermez, `#main-content`'e bırakır (`shell/navigationFocus.ts`). `html { scroll-padding-top: 4.5rem }` odaklanan öğeyi ve `#` hedefini yapışkan başlığın altında durdurur. `useRecordTracking` element veya bileşik kaydı açıldığında isteğe bağlı tanılama günlüğüne `record_opened` yazar. `/` ve `/periodic` ilk paketle gelir; diğer bütün sayfalar `lazy` ile ayrı parça olarak yüklenir.

Veri dört kaynaktan gelir:

- **Bilim API'si (v2)** — `src/services/science.ts`. `useScience(kind, id)` tek kaydı ya da bütün listeyi, `listScience(kind)` listeyi `pageSize=100&view=summary` ile bütün sayfaları paralel isteyerek getirir. Adres `SCIENCE_BASE_URL`'dir (geliştirmede Vite vekili üzerinden `/api/v2`, derlemede gateway kökeninde `/api/v2`, bağımsız atlasta aynı kökende `/api/v2`). Yanıtlar yol başına bellekte tutulur, başarısız istek önbellekten atılır, istek 15 sn'de zaman aşımına uğrar.
- **Paketteki veriler** — API'ye ulaşılamazsa `src/services/scienceCatalog.ts` devreye girer: catalog-service ve compound-service'in depodaki bilimsel JSON dosyalarından kurulan yaklaşık 1,4 MB'lık ayrı bir parça. Yerel kayıt önce ekrana gelir, API yanıtı gelince onun yerine geçer; hata yalnız iki kaynakta da kayıt yoksa gösterilir. Ayrıca `src/services/elementData.ts` içindeki `STATIC_ELEMENTS` (118 elementin tablo konumu, ağ olmadan da çalışır), `src/data/known-compounds.json` (laboratuvar kataloğu, 214 bileşik), `src/data/lessons.json` (altı öğrenme rotası; identity-service de okur) ve derleme script'lerinin ürettiği `src/data/coverage.json` ile `src/data/guide.json` kullanılır. `guide.json` pakete gömülmez, `/kilavuz` açılınca ayrı dosya olarak çekilir.
- **Gateway (v1)** — `src/services/api.ts`, adres `API_BASE_URL`. Giriş ve kayıt, API anahtarları, webhook'lar, element fiyatları (`/elements`, `/market/board`, `/market/movers`, ticker), mağaza ürünleri (`/compounds`), cüzdan ve varlıklar (`/me/wallet`, `/me/holdings`), geri satış (`/desk/sell`) ve siparişler (`/orders`) buradan gider. JWT localStorage'da `token` anahtarında durur. Cüzdan, sipariş ve satış uçları (`/me`, `/orders`, `/desk`) ayrıca API anahtarı istediği için uygulama ilk ihtiyaçta kendine "Web Dashboard Key" adlı, saniyede 10 isteklik bir anahtar üretir (`apiKey`); 20 anahtarlık kota doluysa en eski panel anahtarını iptal edip yeniden dener, başka yerde iptal edilmiş anahtarı 401'de bir kez yeniler. Hesap ayarları `src/components/auth/accountApi.ts` üzerinden `/auth/profile`, `/auth/password/*`, `/auth/email/*`, `/auth/export` ve `/auth/delete` uçlarını, `src/hooks/useAuthCapabilities.ts` de `GET /auth/capabilities` ile sunucunun e-posta ve captcha yeteneklerini kullanır. Bu istemcilerin hepsi, defter eşitlemesi ve geliştirici deneme alanı tek HTTP çekirdeğinden geçer: `src/lib/http.ts` içindeki `fetchJson` (JSON gövde, gövdeyi de kapsayan zaman aşımı, çağıranın iptali); her istemci kendi adresini, başlıklarını ve süresini verir.
- **Tarayıcıda öğrenme** — `src/services/useLearning.ts` keşif defterini `elementapi:learning:<kullanıcı>:v1` (misafirde `guest`) anahtarında tutar; localStorage kapalıysa ilerleme sekme kapanana kadar bellekte kalır. Girişliyken her değişiklik `PUT /auth/learning` ile gönderilir ve sunucunun kopyasıyla birleşimi alınır, böylece cihazlar aynı deftere varır; misafirken biriken ilerleme hesaba aktarılabilir. Diğer yerel anahtarlar: `elementapi:games:v1` (yan oyun skorları, defterden ayrı), `elementapi:lab:v1` (eski laboratuvar kaydı; misafir defterine devredilir), `elementapi:elementalCart` (mağaza sepeti), `elementapi:diagnostics:v1` ve `elementapi:diagnostics:enabled` (yalnız onay verilirse tutulan, hiçbir yere gönderilmeyen tanılama). Bütün erişim `src/lib/storage.ts` üzerinden yapılır; depolama kapalıysa hata fırlatılmaz.

Sayfalar sunucuda üretilmez. Başlık, açıklama, kanonik adres, Open Graph ve `robots` etiketlerini her sayfa `Seo` bileşeniyle çalışma anında yazar; `index.html`, `robots.txt` ve `sitemap.xml` içindeki `__SITE_URL__` yer tutucusu Docker'da konteyner açılışında, bağımsız atlasta derleme sonunda gerçek adresle değiştirilir. Tam platformda derleme nginx ile sunulur; nginx `/health` ve `/info` uçlarına sabit JSON döner ve bilinmeyen her yolu `index.html`'e düşürür. Bağımsız atlas (`science-service`) aynı derlemeyi hesaplar kapalı olarak kendi `wwwroot` klasöründen sunar.

Arayüz bilerek şunları yapmaz: fiyat hesaplamaz, stok ayırmaz, saga yürütmez (bunlar catalog, inventory, order ve wallet servislerinin işidir), gerçek ödeme almaz, RabbitMQ'ya bağlanmaz ve bilimsel veriyi dış kaynaklardan (PubChem, Wikimedia) çalışma anında çekmez; dış kaynaklara yalnız bağlantı verir. Hesaplar kapalı derlemede giriş, ayarlar ve ticaret ekranları hiç açılmaz, defter yalnız tarayıcıda kalır.

## Rotalar

Rotalar `src/App.tsx` içindeki `AppRoutes` bileşeninde tanımlıdır. Sayfa sütunu `src/` altındaki dosyayı gösterir.

| Yol | Sayfa | Ne yapar |
|---|---|---|
| `/` | `pages/Landing.tsx` (ilk paketle gelir) | Açılış sayfası: kahraman bölümü, `coverage.json`'dan okunan kapsam sayıları, dört ürün alanı ve kapanış çağrısı; Organization ve WebSite JSON-LD'si yazar. |
| `/periodic` | `components/PeriodicExplorer.tsx` (ilk paketle gelir) | 118 elementlik gezgin: arama, aile süzgeci ve renk mercekleri, tablo veya kart görünümü (telefonda kartla açılır); karonun üzerine gelmek önizler, tık veya boşluk önizleme penceresini, Enter tam kaydı açar. |
| `/element/:symbol` | `components/ScientificDetail.tsx` (`kind="elements"`) | Elementin bilimsel kaydı; yüklenirken kahraman biçiminde iskelet, bilinmeyen sembolde önerili "Kayıt bulunamadı", API'ye ulaşılamaz ve yerelde de yoksa yeniden dene uyarısı gösterir. |
| `/compounds` | `pages/Compounds.tsx` | 214 bileşiği aranabilir ve gruba göre süzülebilir kart ızgarası olarak listeler; yerel satırlar hemen, API satırları (yapı çizimi, özet) gelince görünür. |
| `/compound/:slug` | `components/ScientificDetail.tsx` (`kind="compounds"`) | Bileşiğin bilimsel kaydı; element kaydıyla aynı yükleniyor, bulunamadı ve hata hâllerine sahiptir. |
| `/lab` | `pages/Laboratory.tsx` | Serbest stokiyometri tezgâhı: element paletten tezgâha tıkla, klavyeyle veya sürükleyerek gelir, "Dene" karışımı katalogla eşleştirir, isabet deftere yazılır; `?material=Fe` bir atomla açar, `?lesson=<id>` bir öğrenme rotasını izler. |
| `/lab/formula` | `pages/LabFormula.tsx` | Formül kurma oyunu: bileşiğin adını okuyup her elementin atom sayısını ayarlatır; skor oyun deposuna yazılır; `?compound=<slug>` o bileşikle açar. |
| `/lab/detective` | `pages/LabDetective.tsx` | Element dedektifi: ipuçları tek tek açılır, element yazılarak ya da dört adaydan seçilerek bulunur; `?element=fe` (harf büyüklüğü fark etmez) o vakayı açar. |
| `/collection` | `pages/Collection.tsx` | Keşif defteri: ilerleme halkası, hesap eşitleme durumu, altı öğrenme rotası (üç bileşik + kısa soru), keşfedilen bileşikler ve JSON yedek alma/geri yükleme. |
| `/nasil` | `pages/Guide.tsx` | "El kitabı": ilk 10 dakika adım adım, sık sorulanlar ve aynı kayıtların curl ile nasıl çekileceği. |
| `/sozluk` | `pages/Glossary.tsx` | Ürün sözlüğü: A–Z dizin, gruba göre süzme ve her terimde onu denemeye götüren bağlantı. |
| `/developers` | `pages/Developers.tsx` | Açık v2 API'sinin ürün sayfası: canlı örnek istek, bilinmesi gerekenler, uçlar ve kullanım şartları. |
| `/docs` | `pages/ApiDocs.tsx` | İki sütunlu API başvurusu: görünen bölümü izleyen yapışkan içindekiler, canlı deneme alanı, v2 başvurusu ve anahtarlı v1 uçları; `#etag` gibi bağlantılar yerine kayar, `#simulation` kapalı simülasyon bölümünü de açar. |
| `/data` | `pages/DataCoverage.tsx` | Bu veri sürümünün kapsamı, sayıların nereden geldiği, nasıl okunacağı ve henüz boş kalan bölümler. |
| `/kilavuz` | `pages/SystemGuide.tsx` | Bu sistem kılavuzunun giriş sayfası; `guide.json` sayfa açılınca çekilir, kenar çubuğu ve arama sunar. |
| `/kilavuz/:slug` | `pages/SystemGuide.tsx` | Kılavuzun bir bölümü (`order`, `web-app` …); bilinmeyen bölümde "Bu bölüm yok" gösterir. |
| `/hakkinda` | `pages/About.tsx` | Proje nedir, veri nereden gelir, dürüst sınırlar ve teknik yapı. |
| `/feedback` | `pages/Feedback.tsx` | Yalnız yerel geri bildirim: onayla açılan tanılama günlüğü ve sayaçları, günlükle birlikte JSON olarak indirilen not; sunucuya hiçbir şey gitmez. |
| `/demo` | `pages/Demo.tsx` (`DemoLayout` içinde) | KREDI simülasyonunu (piyasa → mağaza → sipariş saga'sı) ayrı bir vitrin olarak anlatır ve `/market`, `/shop` ile API dokümanlarına giriş verir; hesaplar kapalıyken de açıktır. |
| `/login` | `pages/Login.tsx` (yalnız hesaplar açıkken) | E-posta ve şifreyle giriş; sonra `?returnTo` adresine (yalnız aynı köken) ya da deftere döner; captcha yapılandırılmışsa Turnstile doğrulaması ister. |
| `/register` | `pages/Register.tsx` (yalnız hesaplar açıkken) | Hesap açar; captcha yoksa doğrudan giriş yapıp `?returnTo` adresine döner, captcha varsa (token tek kullanımlık) giriş sayfasına yollar. |
| `/settings` | `pages/Settings.tsx` (yalnız hesaplar açıkken) | Hesap ayarları: profil, e-posta doğrulama, şifre değiştirme, anahtarlar için `/account` bağlantısı, veri dışa aktarma ve hesap silme; misafire giriş daveti gösterir. |
| `/reset-password` | `pages/Recovery.tsx` (yalnız hesaplar açıkken) | Bağlantıda token varsa yeni şifre belirletir (tüm oturumlar kapanır), yoksa yenileme bağlantısı ister; sunucu e-posta göndermiyorsa "E-postasız beta" notu gösterir. Token ve e-posta adresin `#` kısmından da okunur. |
| `/verify-email` | `pages/Recovery.tsx` (`verify`, yalnız hesaplar açıkken) | E-postadaki bağlantının token'ıyla adresi doğrular; token yoksa "Doğrulama bağlantısı eksik" uyarısı verir. |
| `/market` | `pages/Market.tsx` (`CommerceLayout`, yalnız hesaplar açıkken) | Sanal KREDI fiyat masası: hareketliler şeridi ve sıralanabilir fiyat panosu elementi seçer; fişte canlı fiyat, alış bağlantısı ve satış formu, kasada varlıklar görünür. |
| `/shop` | `pages/Shop.tsx` (`CommerceLayout`, yalnız hesaplar açıkken) | Sanal KREDI mağazası: element, paket gramı ve ana elementin ask fiyatı × çarpanla fiyatlanan ürünler; gram sepeti satır başına bir idempotent sipariş açar, siparişlerin saga durumu altta yoklanır. |
| `/account` | `pages/Account.tsx` (`CommerceLayout`, yalnız hesaplar açıkken) | Girişli kullanıcıya cüzdan, varlıklar, siparişler, API anahtarları ve webhook'lar; misafire giriş ve kayıt daveti. |
| `/values` | `App.tsx` `LegacyRedirect` | Eski adres; sorgu dizisini koruyarak `/market`'e yönlendirir (geçmişe kayıt eklemez). |
| `/trading` | `App.tsx` `LegacyRedirect` | Eski adres; sorgu dizisini koruyarak `/shop`'a yönlendirir. |
| `/stack` | `App.tsx` `LegacyRedirect` | Eski adres; `STACK_REDIRECT` değerine, yani `/hakkinda`'ya yönlendirir. |
| `/_ui` | `pages/UiGallery.tsx` (yalnız `npm run dev`) | Tasarım sistemi vitrini: her ilkel bileşen ve yapı taşı gerçekçi içerikle; üretim derlemesinde ne rota ne de içe aktarma vardır. |
| `*` (tanımsız her yol) | `pages/NotFound.tsx` | 404: istenen adresi gösterir, periyodik tablo, laboratuvar ve ana sayfa düğmeleri verir; arama motorlarına kapalıdır (`noindex`). |

Yerleşim (layout) rotaları adrese bir şey eklemez, yalnız sayfayı sarar. `DemoLayout` sayfanın üstüne "KREDI sanal; gerçek para, ödeme veya kargo yok" şeridini koyar. `AccountsOnly` hesaplar kapalı derlemede (`VITE_ACCOUNTS_ENABLED=false`) altındaki sekiz rotanın hepsinde sayfa yerine `pages/FeatureUnavailable.tsx` ("Bu kurulumda hesap kapalı", `noindex`, laboratuvar ve defter düğmeleri) gösterir; o zaman `CommerceProvider` hiç bağlanmaz. `CommerceLayout` `/market`, `/shop` ve `/account` için `CommerceProvider`'ı (sekme görünürken 30 sn'de bir canlı element fiyatı, girişliyse cüzdan bakiyesi), demo şeridini ve fiyat alınamazsa "Bağlantı kurulamadı" uyarısını ekler.

Üst menünün sırası `src/productNav.ts` dosyasındadır: birincil menü Tablo, Bileşikler, Lab, Defter, El kitabı; görünür "API" kısayolu `/developers`; "Daha fazla" menüsü Sözlük, API dokümanları, Kaynaklar ve veri, Sistem kılavuzu, Hakkında, Geri bildirim ve en sonda Kredi simülasyonu (`/demo`). Kayıt sayfaları kendi menü öğesini etkin gösterir: `/element/...` "Tablo"yu, `/compound/...` "Bileşikler"i, `/docs` "API"yi.

## Tasarım sistemi

Arayüzün görsel dili "Mineral" adını taşır: yalnız koyu tema, yeşil tonlu mineral yüzeyler, tek vurgu rengi (kuprit, pas kırmızısı) ve periyodik tablo için aile renkleri. Bütün renkler, köşeler, gölgeler ve yazı tipleri tek dosyada, `src/styles.css` içindeki Tailwind 4 `@theme static` bloğunda jeton olarak durur; Tailwind her jetondan bir yardımcı sınıf üretir (`bg-surface`, `text-ink-2`, `border-line`, `rounded-lg` …). `static` her değişkeni kullanılmasa da üretir, çünkü bileşenler bazı jetonları çalışma anında `var(--color-family-…)` ile okur.

- **Jetonlar** — yüzeyler `canvas`, `canvas-2`, `surface`, `surface-2`, `surface-3`; çizgiler `line`, `line-strong`; metin `ink` … `ink-4`; marka `brand` (yalnız dolu düğme), `brand-ink` (metin ve bağlantı), `brand-soft`, `brand-line`; durumlar `success`, `warning`, `danger`, `info` ve `-soft` dolguları; on bir aile rengi `--color-family-*`; JSON renklendirmesi `syntax-*`; shadcn/Radix bileşenleri için takma adlar; köşe, gölge, akışkan başlık boyları (`text-display-sm`, `text-display`, `text-display-lg`), hareket eğrileri ve katmanlar (`--z-header`, `--z-overlay`, `--z-toast`).
- **Yardımcılar** — `container-page` (tek sayfa genişliği ve kenar boşluğu), `tabular` (hizalı rakamlar), `eyebrow` (başlık üstü küçük etiket), `panel` (varsayılan kart yüzeyi), `text-link` (metin içi bağlantı), `focus-ring` (`data-slot` taşıyan kontrollerin odak halkası). Temel katman koyu `color-scheme`, ince grenli zemin, Bricolage Grotesque başlık, Geist gövde ve Geist Mono kod yazı tipini ve azaltılmış hareket kuralını kurar; fontlar `index.html` içinden Google Fonts'tan gelir.
- **Bileşenler** — `src/components/ui/` paylaşılan sistemdir. İlkel bileşenler (shadcn/Radix, yeniden boyanmış): Button, Input, Textarea, NativeSelect, Badge, Dialog, Sheet, DropdownMenu, Tabs, Table, Progress, Skeleton, Disclosure. Yapı taşları: PageHeader, Section, Stat/StatGrid, ProgressRing, EmptyState, Notice, CodeBlock, CopyButton, ExternalLink, Formula, ElementTile, SearchField, ChipGroup, Segmented, LinkCard, Breadcrumb, KeyValue, Field, ConfirmDialog, Toaster ve `toast()`. Ortak sınıf dizeleri ve ton stilleri `ui/classes.ts`, Field bağlamı `ui/field-context.ts` içindedir.

Kurallar:

- Bileşende ham hex/rgb yazılmaz, jeton yardımcısı kullanılır; `text-brand` metin olarak kullanılmaz (kontrastı yetmez), yerine `text-brand-ink`.
- Her sayfa `<main className="container-page pt-10 pb-24 lg:pt-14">` → `PageHeader` (sayfanın tek `h1`'i) → `Section` sırasını izler; mobil önceliklidir, 360 px'te yatay kaydırma olmaz.
- Her veri görünümünün yükleniyor (içerik biçiminde Skeleton), boş (EmptyState) ve hata (Notice + yeniden dene) hâli vardır.
- Etkileşimli her öğede üzerine gelme, basılma, `focus-visible` halkası ve devre dışı hâli bulunur; hareket framer-motion yayıyla yapılır ve `MotionConfig reducedMotion="user"` altında çalışır.
- İkonlar lucide-react'tir ve `strokeWidth={1.75}` ile çizilir; satır içi stil yalnız CSS özel değişkeni (`--family`, `--progress`) için kullanılır, tür desteği `src/types/css.d.ts`'tedir.
- Periyodik karolar `ElementTile` ile çizilir ve `data-symbol` taşır (e2e testleri buna bakar); bildirim `toast("Kopyalandı", { tone: "success" })` ile verilir.
- Bir sayfanın ihtiyacı `ui/` içinde yoksa bileşen sayfanın yanındaki özellik klasörüne (`components/<özellik>/`) konur.

Ayrıntılı kurallar ve görsel yön: [docs/memory-bank/design-system.md](../memory-bank/design-system.md). Canlı vitrin geliştirme sunucusunda `/_ui` adresindedir.


## Kod haritası

Bu bölüm uygulamanın giriş noktasını, rota tablosunu, ortak bağlamları (context), kancaları (hook), yardımcı kütüphaneyi, API ve veri servislerini, her sayfayı ve kabuğu (üst menü, mobil menü, alt bilgi) dosya dosya anlatır.

### `web-app/src/main.tsx`
Tarayıcıdaki giriş noktası: React ağacını `#root` içine `StrictMode` ve `ErrorBoundary` ile sarılı olarak bağlar ve yeni sürüm yayınlandığında eksik parçaları (chunk) sayfayı yenileyerek onarır.

| Fonksiyon | Ne yapar |
|---|---|
| `reloadForNewBuild()` | `vite:preloadError` olayında sayfayı bir kez yeniler; son 60 sn içinde zaten yenilendiyse (sessionStorage `elementapi:chunk-reload`) ya da sessionStorage kullanılamıyorsa yenilemez ve hatayı çökme ekranına bırakır. |
| (modül gövdesi) | `vite:preloadError` dinleyicisini kaydeder ve `<App />` bileşenini `StrictMode` + `ErrorBoundary` içinde `createRoot` ile çizer. |

### `web-app/src/App.tsx`
Uygulamanın kökü: rota tablosunu kurar, sayfaları tembel (lazy) yükler, sayfa geçişinde odak ve kaydırmayı yönetir ve hesap gerektiren rotaları derleme ayarına göre açar ya da kapatır.

| Fonksiyon | Ne yapar |
|---|---|
| `AccountsOnly()` | `ACCOUNTS_ENABLED` açıksa alt rotaları (`Outlet`), kapalıysa "Bu özellik kapalı" sayfasını (`FeatureUnavailable`) gösterir. |
| `LegacyRedirect({ to })` | Eski bir adresi (`/values`, `/trading`, `/stack`) sorgu dizgisini koruyarak yeni rotaya `replace` ile yönlendirir. |
| `RouteStage({ children })` | Sayfayı yolun ilk parçasına göre anahtarlayıp yaylı bir geçişle belirginleştirir; aynı bölüm içindeki geçişte (`/element/fe` → `/element/cu`) sayfayı yeniden kurmaz, azaltılmış hareket tercihinde animasyonu atlar. |
| `RouteFocus()` | Yol değişince odağı `#main-content` öğesine taşır (`focusMainContent`) ve yeni sayfa başlığını bir kare sonra görünmez bir `aria-live` bölgesinden okutur; yalnız bağlantıyla (PUSH) gelindiyse sayfanın başına kaydırır (geri/ileri kaydırmayı tarayıcıya bırakır); `#` içeren adreslerde ve yönlendirmelerde (REPLACE) hiçbir şey yapmaz. |
| `useRecordTracking()` | Yol `/element/:symbol` ya da `/compound/:slug` olduğunda isteğe bağlı tanılamaya `record_opened` olayı yazar. |
| `AppRoutes()` | Bütün rotaları tanımlar: atlas, laboratuvar, defter, rehberler, geliştirici sayfaları, `/kilavuz`, demo, hesap ve ticaret rotaları (`AccountsOnly` + `CommerceLayout` altında), eski adres yönlendirmeleri, yalnız geliştirmede açılan `/_ui` galerisi ve 404. |
| `Pages()` | Başlık ile alt bilgi arasındaki sayfa: `ErrorBoundary` → `Suspense` (yedek: `RouteFallback`) → `RouteStage` → `AppRoutes`. Sınır yolu `resetKey` olarak alır; çöken sayfa kabuğun içinde hata ekranı gösterir, menü çalışmaya devam eder ve başka adrese geçince sayfa yeniden çizilir. |
| `App()` | Kök bileşen: `MotionConfig`, `BrowserRouter`, `SelectedElementProvider`, `ProductShell` (içinde `Pages`), `Toaster` ve `RouteFocus` katmanlarını sırayla kurar. |

### `web-app/src/config.ts`
Derleme anındaki ortam değişkenlerinden API adreslerini, genel site adresini ve hesap özelliğinin açık olup olmadığını üretir.

| Fonksiyon | Ne yapar |
|---|---|
| `API_BASE_URL` (sabit) | Hesap ve ticaret kapısının adresi: `VITE_API_BASE_URL`, yoksa `http://localhost:5000/api/v1`; sondaki `/` atılır. |
| `API_ORIGIN` (sabit) | `API_BASE_URL` adresinden `/api/v1` sonekini atarak gateway'in kökünü verir. |
| `getPublicSiteUrl()` | Kanonik ve Open Graph adresleri için genel site kökünü döner: önce `VITE_PUBLIC_SITE_URL`, sonra tarayıcının kökeni, en son `http://localhost:3000`. |
| `ACCOUNTS_ENABLED` (sabit) | `VITE_ACCOUNTS_ENABLED` değeri `"false"` değilse true olur; giriş, kayıt, ayarlar ve KREDI demosu buna bağlıdır. |
| `SCIENCE_BASE_URL` (sabit) | Bilim API'sinin (`/api/v2`) adresi: `VITE_SCIENCE_API_BASE_URL`, yoksa geliştirmede göreli `/api/v2` (Vite vekili), derlemede gateway kökü + `/api/v2`. |
| `publicApiUrl(path)` | Kopyalanabilir tam API adresi üretir: `/api/v2` yollarını bilim adresine, diğerlerini gateway köküne bağlar; sonuç göreliyse sayfanın kökenini önüne ekler. |

### `web-app/src/productNav.ts`
Ürünün gezinme haritası: üst menüdeki ana rotalar, "Daha fazla" menüsü, alt bilgi ve mobil menünün paylaştığı site haritası ve hangi menü öğesinin etkin görüneceği kuralı.

| Fonksiyon | Ne yapar |
|---|---|
| `primaryRoutes` (sabit) | Ana menü: Tablo, Bileşikler, Lab, Defter, El kitabı. |
| `apiShortcut` (sabit) | Üst menüde ayrı duran "API" kısayolu (`/developers`). |
| `moreRoutes` (sabit) | "Daha fazla" altındaki ikincil sayfalar: Sözlük, API dokümanları, Kaynaklar ve veri, Sistem kılavuzu, Hakkında, Geri bildirim, Kredi simülasyonu. |
| `STACK_REDIRECT` (sabit) | Eski `/stack` adresinin yönlendirildiği yol (`/hakkinda`). |
| `pickMore(...paths)` | `moreRoutes` içinden verilen yollara karşılık gelen öğeleri verilen sırayla seçer. |
| `siteMap` (sabit) | Alt bilgi ve mobil menü için gruplanmış harita: Keşif, Geliştirici, Proje. |
| `NAV_ALIASES` (sabit) | Bir menü öğesine ait detay yolları (ör. `/element` → Tablo, `/compound` → Bileşikler, `/docs` → API). |
| `isNavActive(to, pathname)` | Yol menü öğesinin kendisi, altı (`/lab/formula`) ya da takma adlarından biriyse true döner. |

### `web-app/src/context/commerce.tsx`
KREDI demosu sayfalarının (`/market`, `/shop`, `/account`) paylaştığı canlı element fiyatlarını ve cüzdan bakiyesini tutan bağlam.

| Fonksiyon | Ne yapar |
|---|---|
| `fetchWalletBalance()` | API istemcisini tembel yükleyip cüzdanı okur ve `balanceElx` değerini sayı olarak döner; hata olursa `null` döner. |
| `CommerceProvider({ children })` | Statik element tohumlarını sekme görünürken 30 sn'de bir canlı fiyat ve stokla birleştirir (istek düşerse tohumlar kalır, `dataAvailable` false olur), oturum açıkken cüzdan bakiyesini yükler ve seçili elementi listeden bulur. |
| `refreshWallet()` (`CommerceProvider` içinde) | Jeton ve API anahtarı varsa bakiyeyi yeniden çeker; istek sürerken giriş/çıkış olduysa eski sonucu yazmaz. |
| `useCommerce()` | Ticaret bağlamını döner; `CommerceProvider` dışında çağrılırsa hata fırlatır. |

### `web-app/src/context/selection.tsx`
Uygulama genelinde seçili elementi ve istemci tarafı oturum bayrağını tutan bağlam.

| Fonksiyon | Ne yapar |
|---|---|
| `isKnownSymbol(symbol)` | Sembolün statik 118 element listesinde olup olmadığını söyler. |
| `hasSession()` | Hesaplar açıksa ve yerel JWT geçerli bir kullanıcı veriyorsa true döner. |
| `SelectedElementProvider({ children })` | Seçili sembolü sırayla `?symbol=` parametresinden, localStorage'dan ya da altından (AU) alır ve bilinmeyen sembolü altına düşürür; oturum bayrağını 15 sn'de bir ve `onSessionChange` bildirdiğinde (başka sekmenin `storage` olayı, bu sekmenin `clearSession`'ı) yeniden hesaplar. |
| `setSelectedSymbol(symbol)` (`SelectedElementProvider` içinde) | Sembolü büyük harfe çevirip saklar, localStorage'a yazar ve adres çubuğundaki `?symbol=` değerini günceller. |
| `useSelectedElement()` | Seçili element ve oturum bağlamını döner; sağlayıcı dışında çağrılırsa hata fırlatır. |

### `web-app/src/hooks/useAuthCapabilities.ts`
identity servisinde hangi isteğe bağlı hesap özelliklerinin (şifre kurtarma, e-posta doğrulama, CAPTCHA) açık olduğunu bir kez okuyan kanca.

| Fonksiyon | Ne yapar |
|---|---|
| `ALL_OFF` (sabit) | Bütün yetenekleri kapalı gösteren varsayılan değer. |
| `useAuthCapabilities({ enabled })` | `GET /auth/capabilities` isteğini `fetchJson` ile (zaman aşımı olmadan) bir kez atar; yüklenirken ve istek başarısız olursa her yeteneği kapalı sayar, böylece sayfa sunucunun tamamlayamayacağı bir akışı önermez; `enabled: false` ile istek atlanır, bileşen kalkınca istek iptal edilir. |

### `web-app/src/hooks/usePolling.ts`
Sekme görünürken bir işi düzenli aralıklarla çalıştıran kanca.

| Fonksiyon | Ne yapar |
|---|---|
| `usePolling(callback, intervalMs, { enabled })` | İşi hemen ve sonra her `intervalMs` milisaniyede bir çalıştırır; sekme gizlenince zamanlayıcıyı durdurur, geri gelince işi hemen çalıştırıp yeniden başlatır; en güncel `callback` zamanlayıcıyı yeniden kurmadan kullanılır (`useEffectEvent`). |

### `web-app/src/lib/captcha.ts`
Cloudflare Turnstile site anahtarını derleme anında okur.

| Fonksiyon | Ne yapar |
|---|---|
| `CAPTCHA_SITE_KEY` (sabit) | `VITE_CAPTCHA_SITE_KEY` değerinin kırpılmış hâli; boşsa CAPTCHA kapalıdır. |
| `isCaptchaConfigured()` | Site anahtarı tanımlıysa true döner. |

### `web-app/src/lib/format.ts`
İstatistikler, tablolar ve KREDI demosu için ortak Türkçe sayı biçimlendirme.

| Fonksiyon | Ne yapar |
|---|---|
| `formatNumber(value, options)` | Sayıyı Türkçe ayraçlarla (`1.234,5`) biçimler; seçenekler doğrudan `Intl.NumberFormat`'a geçer. |
| `formatFixed(value, digits)` | Sabit sayıda ondalıkla biçimler (`formatFixed(2.5, 2)` → `2,50`). |
| `formatKredi(value, digits)` | Sanal KREDI tutarını `1.234,50 kredi` biçiminde yazar; değer yoksa veya NaN ise `—` döner. |
| `formatGrams(value, digits)` | Kütleyi en fazla `digits` ondalıkla gram olarak yazar (`12,5 g`). |

### `web-app/src/lib/formula.ts`
Kimyasal formülü gösterim parçalarına (normal, alt simge, üst simge) bölen yardımcı.

| Fonksiyon | Ne yapar |
|---|---|
| `formulaParts(formula)` | `Ca(OH)2`, `CuSO4·5H2O` ya da `SO4^2-` gibi bir formülü parçalara ayırır: sembol, `)` veya `]` sonrasındaki rakamlar alt simge, `·5H2O` içindeki 5 gibi katsayılar normal metin, `^` sonrası yük üst simge olur. |

### `web-app/src/lib/highlightJson.tsx`
Bağımlılık kullanmadan JSON metnini renklendiren ve herhangi bir değeri JSON olarak yazan yardımcılar.

| Fonksiyon | Ne yapar |
|---|---|
| `highlightJson(source)` | JSON metnini anahtar, dizgi, sayı, `true`/`false`/`null` ve noktalama parçalarına ayırıp her birini sözdizimi rengi sınıfı taşıyan `span` öğelerine sarar. |
| `paint(text, kind)` (`highlightJson` içinde) | Bir parçayı ilgili renk sınıfıyla `span` olarak düğüm listesine ekler. |
| `jsonSource(value)` | Değeri 2 boşluk girintili JSON metnine çevirir; dizgiyi olduğu gibi bırakır, çevrilemezse `String(value)` döner. |

### `web-app/src/lib/http.ts`
Uygulamanın tek HTTP çekirdeği: `services/api.ts`, `auth/accountApi.ts`, `useLearning`, `useAuthCapabilities` ve geliştirici deneme alanı istekleri bununla atar; adresi, başlıkları ve süreyi her istemci kendisi verir.

| Fonksiyon | Ne yapar |
|---|---|
| `ApiHttpError` (sınıf) | 2xx olmayan yanıtı durum kodu ve ayrıştırılmış gövdeyle (`data`: JSON, ham metin ya da `null`) taşıyan hata; isteği atan istemci fırlatır. |
| `abortAfter(ms, signal)` | `ms` sonra `TimeoutError` ile (`ms` verilmezse hiç) ya da dış `signal` iptal olunca onun nedeniyle iptal olan bir sinyal üretir; hedef tarayıcılarda (Chrome 111, Safari 16.4) olmayan `AbortSignal.any` yerine geçer. İstek bitince zamanlayıcıyı ve dinleyiciyi temizleyen `release` döner. |
| `isTimeout(error)` | Hatanın `fetchJson`'un zaman aşımı (`TimeoutError`) olup olmadığını söyler; giriş, defter eşitlemesi ve deneme alanı bunu "ulaşılamadı" ya da "zaman aşımı" cümlesi için kullanır. |
| `fetchJson(url, { method, headers, body, timeoutMs, signal, cache })` | Tek istek atar: `body` varsa JSON'a çevirip `Content-Type: application/json` ekler; zaman aşımı gövdenin okunmasını da kapsar. Her HTTP durumunda çözülür ve `ok`, `status`, `headers`, `data` (JSON ya da `null`) ve `text` (ham gövde) döner; ağ hatası, zaman aşımı ve çağıranın iptali reddeder. |
| `parseJson(text)` | Gövdeyi JSON olarak okur; boş ya da JSON olmayan gövdede `null` döner. |

### `web-app/src/lib/storage.ts`
localStorage'a güvenli erişim: gizli pencere, engellenmiş site verisi ya da dolu kota hatasını yutar ve sonucu dönüş değeriyle bildirir.

| Fonksiyon | Ne yapar |
|---|---|
| `readStorage(key)` | Ham dizgiyi okur; anahtar yoksa ya da depolama kullanılamıyorsa `null` döner. |
| `writeStorage(key, value)` | Ham dizgiyi yazar; depolama kullanılamıyorsa `false` döner. |
| `removeStorage(key)` | Anahtarı siler; depolama kullanılamıyorsa `false` döner. |
| `readJson(key, fallback)` | Değeri JSON olarak okur; anahtar yoksa ya da değer bozuksa `fallback` döner. |
| `writeJson(key, value)` | Değeri JSON'a çevirip yazar; depolama kullanılamıyorsa `false` döner. |

### `web-app/src/lib/text.ts`
Türkçe metin araması için harf katlama ve kelime eşleştirme.

| Fonksiyon | Ne yapar |
|---|---|
| `foldTurkish(value)` | Metni Türkçe kurallarla küçültür, `ı` harfini `i` yapar, bütün aksanları atar ve kırpar ("çözelti" → "cozelti"). |
| `matchesSearch(query, ...fields)` | Sorgunun her kelimesi alanlardan herhangi birinde (katlanmış hâliyle) geçiyorsa true döner; boş sorgu her şeyle eşleşir. |

### `web-app/src/lib/utils.ts`
Tailwind sınıflarını birleştiren tek yardımcı.

| Fonksiyon | Ne yapar |
|---|---|
| `cn(...inputs)` | Koşullu sınıf listesini `clsx` ile birleştirir, çakışan Tailwind sınıflarını `tailwind-merge` ile ayıklar. |

### `web-app/src/services/api.ts`
Hesap ve ticaret kapısının (`/api/v1`) istemcisi: her isteğe saklı JWT'yi ve cüzdan/sipariş uçları için uygulamanın kendine ürettiği panel API anahtarını ekler; giriş, anahtar, katalog, cüzdan, webhook, sepet ve sipariş işlemlerini toplar. İstekleri `lib/http.ts` içindeki `fetchJson` ile atar.

| Fonksiyon | Ne yapar |
|---|---|
| `authHeaders()` | localStorage'daki `token` için `Authorization: Bearer`, `apiKey` için `X-API-Key` başlığını hazırlar. |
| `toQuery(params)` | `?a=1&b=2` sorgu dizgisini kurar; `null`, `undefined` ve boş değerleri atlar. |
| `invalidatesSession(path)` | Giriş ve kayıt dışındaki `/auth/`, `/api-keys` ve `/webhooks` yollarında 401 alınmasının oturumun bittiği anlamına geldiğini söyler. |
| `DASHBOARD_KEY_DESCRIPTION` (sabit) | Web uygulamasının kendine ürettiği anahtarın açıklaması ("Web Dashboard Key"); eski panel anahtarlarını bulmak ve `ApiKeysPanel`'de "Web paneli" rozeti için de kullanılır. |
| `request(method, path, options)` | Ortak istek akışı: isteği kimlik başlıkları ve sorgu dizgisiyle `fetchJson`'a verir (varsayılan 10 sn zaman aşımı, gövdenin okunmasını da kapsar); düz metin hata gövdesini (ASP.NET `BadRequest("…")`) olduğu gibi tutar. Panel anahtarı gereken yollarda (`/me`, `/orders`, `/desk`) anahtar yoksa önce üretir; 401'de (bu arada başka sekme giriş yapmadıysa) oturumu temizler ve başka cihazda iptal edilmiş panel anahtarını bir kez yenileyip isteği tekrarlar; başarısızlıkta `ApiHttpError` fırlatır. |
| `IDENTITY_ERRORS` (sabit) | Kayıtta karşılaşılabilecek ASP.NET Identity kodlarının Türkçe cümleleri: `DuplicateEmail` ve `DuplicateUserName` "Bu e-posta zaten kayıtlı.", `InvalidEmail`, `InvalidUserName`, `PasswordTooShort` "Şifre en az 10 karakter olmalı.". identity-service yalnız uzunluk istediği için `PasswordRequires*` kodları gelmez. |
| `apiError(error, fallback)` | Gateway hata gövdesinden kullanıcıya gösterilecek mesajı seçer: düz metin gövde olduğu gibi; sonra `error`, `message` ya da `detail`; sonra alan ya da hata koduna göre mesaj listeleri (ASP.NET doğrulamasının `errors` nesnesi ya da Identity'nin `BadRequest(ModelState)` gövdesi, ör. `{"DuplicateEmail": ["…"]}`). Bilinen Identity kodları Türkçe cümleye çevrilir, aynı cümle bir kez yazılır; bulamazsa `fallback` döner. |
| `storeCredential(key, value)` | Jetonu veya API anahtarını yazar; depolama kapalıysa Türkçe hata fırlatarak girişin görünür biçimde başarısız olmasını sağlar. |
| `authService.login(credentials)` | `POST /auth/login` atar; jeton gelirse önceki kullanıcının panel anahtarını silip yeni jetonu saklar. |
| `authService.register(userData)` | `POST /auth/register` ile ad, soyad, e-posta, şifre ve isteğe bağlı CAPTCHA jetonuyla hesap açar. |
| `mintDashboardKey(token)` | "Web Dashboard Key" açıklamalı, 10 TPS'lik bir API anahtarı üretir; bu sırada kullanıcı değiştiyse anahtarı reddeder, değişmediyse saklar. |
| `mintFreeingQuota(token)` | 20 anahtarlık kota doluysa (409) en eski etkin panel anahtarını iptal edip bir kez daha üretmeyi dener. |
| `apiKeyService.generate(description, rateLimitTps)` | `POST /api-keys/generate` ile yeni API anahtarı üretir (varsayılan 5 TPS). |
| `apiKeyService.list()` | Kullanıcının anahtarlarını maskeli olarak listeler. |
| `apiKeyService.revoke(id)` | Bir anahtarı `DELETE /api-keys/{id}` ile iptal eder. |
| `apiKeyService.adoptDashboardKey(apiKey)` | Tarayıcının henüz panel anahtarı yoksa verilen anahtarı panel anahtarı yapar; yaptıysa true döner. |
| `apiKeyService.forgetDashboardKey(matches)` | Saklı panel anahtarını `matches` kabul ederse (ör. az önce iptal edildi) siler; sildiyse true döner. |
| `apiKeyService.ensureDashboardKey()` | Saklı panel anahtarını döner, yoksa üretir; aynı jeton için paralel çağrılar tek üretimi paylaşır, jeton yoksa 401 fırlatır. |
| `pagesAfterFirst(total)` | Kalan sayfaları paralel çekmek için 2..`total` sayfa numaralarını üretir. |
| `toCompoundList(data)` | Eski gateway'in düz dizi yanıtını ve yeni sayfa zarfını (eksik alanlı olsa bile) tek `CompoundList` biçimine çevirir. |
| `compoundService.all(params)` | Bütün bileşik ürünlerini (isteğe bağlı tek element için) bütün sayfaları çekerek döner. |
| `compoundService.list(params)` | `GET /compounds` ile element, tür, arama ve sayfa filtreli tek sayfa döner (8 sn zaman aşımı). |
| `compoundService.get(slug)` | Tek bir bileşik ürününü slug ile getirir. |
| `elementService.getElements(page, pageSize)` | Ticaret kataloğundan bir sayfa element getirir. |
| `elementService.getAllElements()` | 118 elementin tamamını (100'lük iki sayfa) getirir; eski gateway'in düz dizi yanıtını da kabul eder. |
| `elementService.getTicker(symbol)` | Bir elementin canlı fiyat kartını (alış, satış, 24 saatlik değişim, küçük grafik, stok) getirir. |
| `elementService.getMovers(limit)` | En çok hareket eden elementleri (varsayılan 12) getirir. |
| `elementService.getBoard()` | Piyasa tahtasının bütün satırlarını getirir. |
| `walletService.get()` | Kullanıcının KREDI bakiyesini ve para birimini getirir. |
| `walletService.holdings()` | Kullanıcının sahip olduğu ürünleri gram ve ortalama maliyetle getirir. |
| `walletService.sell(symbol, grams, compoundSlug)` | `POST /desk/sell` ile varlığı masaya geri satar ve elde edilen KREDI'yi döner. |
| `webhookService.list()` | Kayıtlı webhook adreslerini listeler. |
| `webhookService.create(url, events, secret)` | Yeni webhook adresini olaylar ve imza sırrıyla kaydeder. |
| `webhookService.remove(id)` | Bir webhook kaydını siler. |
| `CART_KEY` (sabit) | Sepetin localStorage anahtarı (`elementapi:elementalCart`). |
| `ELEMENTAL_SLUG` (sabit) | Saf elementin (bileşik olmayan) ürün slug'ı, `elemental`: sepette, siparişte ve kasada; `/market` satış formu bununla başlar. |
| `cartLineKey(symbol, slug)` | Sepet satırının kimliğini üretir: büyük harfli sembol + küçük harfli ürün slug'ı (saf element için `elemental`). |
| `normalizeCartItem(raw)` | Saklı satırı onarır (eksik alanlara varsayılan, yoksa yeni `requestId`); sembolü olmayan veya miktarı pozitif olmayan satırı atar. |
| `readCart()` | Saklı sepeti okur; bozuk veri boş sepet sayılır. |
| `writeCart(items)` | Sepeti saklar; depolama yoksa sepet yalnız bu sayfada yaşar. |
| `orderService.submitOrder(elementSymbol, quantity, compoundSlug, requestId)` | `POST /orders` ile sipariş verir; saf element değilse bileşik slug'ını ekler, `requestId` değerini `Idempotency-Key` olarak yollar ki tekrar gönderim iki kez ücretlendirilmesin. |
| `orderService.list()` | Kullanıcının siparişlerini listeler. |
| `orderStatusLabel` (sabit) | Saga durumlarının Türkçe etiketleri (Hazırlanıyor, Ödeme, Kargoda, Teslim, İptal). |

### `web-app/src/services/apiDocs.ts`
API dokümanları ve geliştirici sayfalarındaki deneme alanı (playground) ile kod örnekleri için yardımcılar.

| Fonksiyon | Ne yapar |
|---|---|
| `playgroundView(status, etag, body)` | Deneme alanında gösterilecek değeri seçer: 304 yanıtında gövde olmadığı için durum, ETag ve Türkçe açıklama döner, diğer durumlarda gövdeyi olduğu gibi döner. |
| `API_KEY_ENV` (sabit) | Örneklerin v1 API anahtarını okuduğu ortam değişkeninin adı (`ELEMENTAPI_KEY`); anahtar hiçbir zaman koda veya adrese yazılmaz. |
| `requestSnippets(url, keyed)` | Bir GET isteği için curl, JavaScript ve Python örnekleri üretir; `keyed` true ise `X-API-Key` başlığını ortam değişkeninden okuyan sürümü yazar. |
| `postSnippet(url, body)` | JSON gövdeli ve API anahtarı başlıklı bir curl POST örneği üretir. |
| `statusTone(status)` | HTTP durumunun rozet tonunu seçer: 2xx başarı, 304 bilgi, diğer 4xx uyarı, geri kalanı tehlike. |

### `web-app/src/services/session.ts`
Tarayıcıdaki oturumun yardımcıları: JWT'yi okuma, oturumu kapatma, oturum değişikliğini dinleme ve güvenli geri dönüş adresi.

| Fonksiyon | Ne yapar |
|---|---|
| `decodeJwtPayload(token)` | JWT'nin orta (payload) parçasını base64url'den çözüp JSON olarak okur; bozuk girdide hata fırlatır. |
| `tokenUser(token)` | Saklı JWT hâlâ geçerliyse kullanıcı kimliğini (`sub`) döner; jeton yoksa, bozuksa ya da süresi dolduysa `null` döner. |
| `clearSession()` | Jetonu ve panel anahtarını siler, ardından `window` üzerinde `element:session` olayını yayınlayarak dinleyenlere haber verir. |
| `onSessionChange(listener)` | Oturum değişmiş olabilecek her an `listener`'ı çağırır: bu sekme oturumu kapattığında (`element:session`) ya da başka sekme depolamaya yazdığında (`storage`); aboneliği bırakan fonksiyonu döner. |
| `safeReturnTo(value, fallback)` | `returnTo` sorgu değerini aynı kökene ait bir yola çevirir; tarayıcı gibi ayrıştırdığı için `/\t/evil.com` gibi başka siteye kaçan değerleri reddeder ve `fallback` (varsayılan `/collection`) döner. |

### `web-app/src/services/diagnostics.ts`
İsteğe bağlı, yalnız bu tarayıcıda kalan ürün tanılaması: olaylar localStorage'da durur, ziyaretçi geri bildirim sayfasından dışa aktarmadıkça hiçbir yere gönderilmez.

| Fonksiyon | Ne yapar |
|---|---|
| `DIAGNOSTICS_CONSENT` (sabit) | Ziyaretçinin onayını (`"true"` / `"false"`) tutan localStorage anahtarı. |
| `isLocalEvent(value)` | Saklı bir kaydın `event` ve `at` alanları olan geçerli bir olay olup olmadığını söyler. |
| `diagnosticEvents()` | Saklı olayları (en yenisi sonda, en fazla 200) bozuk kayıtları atlayarak döner. |
| `isRecentDuplicate(last, event, item)` | Aynı olay aynı öğe için son 1 sn içinde zaten yazıldıysa true döner (çift tıklama, yeniden çizim). |
| `track(event, item)` | Ziyaretçi onay verdiyse olayı zaman damgasıyla yazar; `item` yalnız kısa bir kimlikse (harf, rakam, `_`, `-`, en fazla 64) saklanır; depolama hatası yok sayılır. |
| `setDiagnostics(enabled)` | Onay seçimini saklar; vazgeçildiğinde saklı olayları da siler; depolama kullanılamıyorsa `false` döner. |

### `web-app/src/services/lessons.ts`
Öğrenme rotalarını (`src/data/lessons.json`, identity-service de okur) yükler ve öğrenme ilerlemesini doğrular ve birleştirir.

| Fonksiyon | Ne yapar |
|---|---|
| `lessons` (sabit) | Öğrenme rotalarının listesi: her rota keşfedilecek bileşikleri ve kapanış sorularını taşır. |
| `normalizeLearning(value)` | Güvenilmeyen girdiyi (depolama, sunucu, içe aktarılan dosya) geçerli ilerlemeye çevirir: bilinmeyen bileşikleri atar ve bir rotayı yalnız bütün bileşikleri keşfedildiyse tamamlanmış sayar. |
| `mergeLearning(a, b)` | İki ilerleme kaydının (bu cihaz ve hesap ya da geri yüklenen yedek) birleşimini alıp yeniden doğrular. |

### `web-app/src/services/scienceCatalog.ts`
`science.ts` arkasındaki çevrimdışı veri: catalog ve compound servislerinin depodaki bilimsel JSON dosyalarını kendi parçası (yaklaşık 1,4 MB) olarak tembel yüklenen bir modülde toplar; `/api/v2` çökükse yedek olarak kullanılır.

| Fonksiyon | Ne yapar |
|---|---|
| `structureBySlug` (sabit) | compound-service JSON'undaki yapı çizimlerini bileşik slug'ına göre eşler. |
| `localCompounds` (sabit) | Laboratuvar kataloğundaki bilinen bileşikleri bilim kaydına çevirir ve yapı çizimi varsa `media.structure` olarak ekler. |
| `localScience(kind, id)` | Kimlik verilirse tek yerel kaydı (element sembolü ya da bileşik slug'ı, büyük/küçük harf fark etmez), verilmezse bütün listeyi döner. |
| `recordId(kind, row)` | API satırını yerel kayıtla eşleştirmek için kimliği çıkarır: elementte küçük harfli sembol, bileşikte slug. |
| `mergeRemote(kind, remote)` | Yerel kayıtların üzerine API satırlarını serer: aynı kimlikli API satırı yerel kaydın yerini tamamen alır, yalnız API'nin bildiği kayıtlar sona eklenir. |

### `web-app/src/services/chemistry.ts`
Laboratuvarın, oyunların ve bileşik sayfalarının formül motoru: formülü okur ve yazar, atom torbasını 214 bileşiklik katalogla (`data/known-compounds.json`) eşleştirir, bilinmeyen bir torbanın kimyasal olarak mümkün olup olmadığını yükseltgenme basamakları ve değerlikle tartar, bileşikleri geometri ve konuya göre sınıflar; düz Node'dan da (testler, script'ler) içe aktarılabilir.

| Fonksiyon | Ne yapar |
|---|---|
| `knownCompounds` (sabit) | Katalogdaki bütün bileşikler. |
| `compoundBySlug` (sabit) | Katalog bileşiklerinin slug'a göre sözlüğü. |
| `wordSet(list)` | Boşlukla ayrılmış sembol listesinden bir `Set` kurar (soygazlar, ametaller, kovalent elementler gibi tablolar için). |
| `addAtoms(counts, symbol, count)` | Sayım nesnesinde bir sembolün atom sayısını artırır. |
| `parseFormula(formula)` | `Ca(OH)2` gibi bir formülü (iç içe parantez dahil) `{ Ca: 1, H: 2, O: 2 }` sayımına çevirir; desteklenmeyen girdide Türkçe hata fırlatır. |
| `readMultiplier()` (`parseFormula` içinde) | Bulunulan konumdaki rakamları çarpan olarak okur, yoksa 1 döner. |
| `readGroup()` (`parseFormula` içinde) | Kapanan paranteze kadar atomları ve iç grupları özyinelemeli okuyup çarpanlarıyla toplar. |
| `prune(counts)` | Sıfır ya da negatif sayıları atar ve sembolleri alfabetik sıralar. |
| `compositionKey(counts)` | Bileşimin sıradan bağımsız kimliğini üretir (`H:2\|O:1`). |
| `atomCount(counts)` | Toplam atom sayısını döner. |
| `molecularWeight(counts)` | Mol kütlesini g/mol olarak 3 ondalığa yuvarlayıp hesaplar; kütlesi bilinmeyen elementte hata fırlatır. |
| `formulaText(formula)` | Formüldeki rakamları Unicode alt simgeye çevirir (`H2O` → `H₂O`). |
| `compareForFormula(a, b, symbols)` | Formül yazım sırasını belirler: karbonlu bileşikte Hill sırası (C, H, sonra alfabetik); diğerlerinde en elektropozitif önce, basit hidrürlerde H merkez atomdan sonra (NH₃), diğerlerinde önce (H₂O). |
| `writeFormula(counts)` | Sayımı alışılmış formül olarak yazar (`{ O: 1, H: 2 }` → `H2O`). |
| `compoundByComposition` (sabit) | Her bileşim için katalogdaki ilk bileşiği tutar (izomerler tek anahtarı paylaşır). |
| `lookup(counts)` | Tam olarak bu atom sayılarına sahip katalog bileşiğini döner. |
| `bagFormula(counts)` | Bilinen bileşimde katalogdaki yazımı, değilse alışılmış biçimde yazılmış formülü döner. |
| `sameElements(counts)` | Aynı elementlerden herhangi bir oranda oluşan katalog bileşiklerini döner. |
| `canBalanceCharges(counts)` | Elementlere birer yükseltgenme basamağı (ya da Fe₃O₄ gibi karışık değerlik için iki basamağa bölünmüş atomlar) seçerek toplam yükün sıfır olabildiğini arar. |
| `balances(index, charge)` (`canBalanceCharges` içinde) | Yük toplamını elementler üzerinde özyinelemeli deneyen arama adımı. |
| `satisfiesValence(counts)` | Yalnız ametallerden oluşan, fazla hidrojenli olmayan (H ≤ 2C + 2 + N + P) ve değerlik toplamı bütün atomları bağlayabilecek tam sayıda bağ veren torbaları kabul eder. |
| `fits(index, valenceSum)` (`satisfiesValence` içinde) | Değerlik seçeneklerini özyinelemeli deneyip toplamın çift ve en az atom−1 bağ verdiğini kontrol eder. |
| `isPlausible(counts)` | 36 atomdan büyük torbayı aramadan mümkün sayar; diğerlerinde yük dengesi ya da değerlik kuralından biri tutarsa true döner. |
| `formCompound(input)` | Atom torbasından bileşik oluşturmayı dener: yalnız katalog bileşikleri başarır; başarısızlıkta Türkçe açıklamalı kod döner (boş, soygaz, doğru elementler yanlış oran + öneriler, kimyasal olarak imkânsız, mümkün ama katalogda yok). |
| `labElements` (sabit) | Laboratuvarda sunulan elementler: katalogdaki her element artı He, Ne ve Ar, hafiften ağıra sıralı. |
| `GEOMETRY_LABEL` / `KNOWN_GEOMETRY` / `GEOMETRY_NOTE` (veri) | Şekillerin Türkçe ve İngilizce adları ve açıklamaları, ders kitabı şekli bilinen bileşiklerin listesi ve bileşiğe özel notlar. |
| `geometryBySlug` (sabit) | `KNOWN_GEOMETRY` listesini slug → şekil eşlemesine açar. |
| `inferGeometryKind(compound)` | Listedeki şekli, yoksa kuralla tahmini döner: metal içeriyorsa iyon örgüsü, iki atomluysa doğrusal, değilse genel molekül. |
| `geometryOf(compound)` | Bileşiğin şeklini Türkçe ve İngilizce adı ve (varsa bileşiğe özel) notuyla döner. |
| `COMPOUND_GROUP_LABELS` (sabit) | Bileşik filtre gruplarının Türkçe etiketleri: Günlük, Organik, Tuzlar, Oksitler, Asitler, Malzemeler, Çevre. |
| `compoundGroups(compound)` | Bileşiğin slug'ına, formülüne, adına ve kullanım alanlarına bakarak ait olduğu filtre gruplarını (sıfır ya da daha fazla) döner. |
| `asScienceCompound(compound)` | Katalog bileşiğinden çevrimdışı kullanım için `/api/v2` biçiminde asgari bir bilim kaydı (adlar, PubChem bağlantısı, mol kütlesi, bileşim, kaynak bilgisi) üretir. |

### `web-app/src/services/elementData.ts`
118 elementin tablo konumunu taşıyan çevrimdışı tohum listesi, aile etiketleri ve uygulamanın tek aile yardımcıları (`familyOf`, `familyColor`) ve gateway'den gelen canlı satırları bu tohumun üzerine bindiren birleştirici.

| Fonksiyon | Ne yapar |
|---|---|
| `categoryLabels` (sabit) | Her periyodik tablo ailesinin Türkçe etiketi (Alkali metal, Geçiş metali, Soy gaz …). |
| `familyOf(category)` | Tohum ya da katalog kategorisini `ElementTile` ailesine daraltır; `categoryLabels`'ta olmayan her şey `"unknown"` olur. Bütün sayfalar aileyi buradan okur. |
| `familyColor(family)` | Ailenin CSS rengini (`var(--color-family-<aile>)`) `--family` özel değişkeni için döner. |
| `rawElements` (veri) | Tek satırlık sıkıştırılmış tohum dizgisi (atom numarası, sembol, Türkçe ad, aile, tablo satırı, sütunu); `write-sitemap.mjs` ve `refresh-scientific-catalog.mjs` bunu ilk regex eşleşmesiyle okuduğu için tek satır kalmalıdır. |
| `STATIC_ELEMENTS` (sabit) | 118 elementi atom numarası sırasıyla, periyot, grup ve tablo konumuyla döner; f-blok satırlarında (8–9) periyodu 2 azaltır ve grubu 3 yapar; API çağrısından önce, çevrimdışı çalışır. |
| `enriched` / `genericSummaries` (veri) | Birkaç örnek element (H, C, O, Fe, Au, U) için kütle, faz ve özet; ayrıca gateway özet vermediğinde aile başına yedek özet. |
| `dbCategoryToStaticCategory(dbCategory)` | Gateway kategorisini ("Alkaline earth metal", "Post-transition metal") aile anahtarına çevirir; bilinmeyen değer `nonmetal` olur. |
| `mergeElementData(liveElements, seedElements)` | Her tohum elementi (tohum sırasıyla) döner ve gateway'in bildiği alanlarla zenginleştirir: Türkçe ad, kütle, faz, özet, görünüş, blok, elektronegatiflik, görsel, satıcı bilgileri, gram fiyatı, stok, yoğunluk, erime/kaynama noktası; gateway'de olmayan element tohum değerlerini korur. |

### `web-app/src/services/lab.ts`
Laboratuvarın malzeme listesi ve keşif ilerlemesi yardımcıları; `chemistry.ts` motorunun laboratuvarın kullandığı parçalarını da yeniden dışa verir.

| Fonksiyon | Ne yapar |
|---|---|
| `missTone(result)` | Başarısız `formCompound` sonucunu geri bildirim tonuna çevirir: yanlış oran "almost", boş tezgâh "empty", soygaz ya da kararsız "impossible", diğerleri "unknown". |
| `moveChip(order, from, to)` | Tezgâhtaki çipi bir sıradan diğerine taşır; aralık dışı ya da eşit indekste sırayı olduğu gibi döner. |
| `syncChipOrder(order, counts)` | Çiplerin gösterim sırasını sayımlarla uyumlu tutar: kaldırılan kimlikleri atar, yenilerini sona ekler. |
| `LAB_VERSION` / `LAB_STORAGE_KEY` (sabit) | Defter öncesi keşif deposunun sürümü (1) ve anahtarı (`elementapi:lab:v1`); `useLearning` misafirler için bunu bir kez okur. |
| `catalogSize` (sabit) | Laboratuvarda keşfedilebilecek bileşik sayısı. |
| `atomicNumber(symbol)` | Sembolün atom numarasını döner; bilinmiyorsa en büyük tam sayıyı vererek sona atar. |
| `materials` (sabit) | Palet elementlerini (atom numarası sırasıyla) ve katalog bileşiklerini tek kimlikle (sembol ya da slug) adreslenen malzeme listesine çevirir. |
| `materialById` (sabit) | Bütün malzemelerin kimliğe göre sözlüğü. |
| `elementMaterials` (sabit) | Yalnız palet elementleri (katalogdaki her element artı He, Ne, Ar), atom numarası sırasıyla. |
| `findLabElement(value)` | Adresten gelen `fe` ya da `Fe` gibi bir değeri palet sembolüne çevirir; laboratuvarda öyle bir element yoksa `undefined` döner. |
| `normalizeDiscoveries(input)` | Girdiden yalnız benzersiz ve katalogda bilinen bileşik slug'larını tutar. |
| `discover(discovered, slug)` | Keşif listesine slug'ı ekleyip yeniden doğrular. |
| `hint(discovered)` | Henüz keşfedilmemiş ilk katalog bileşiğini döner. |
| `parseProgress(raw)` | Eski `elementapi:lab:v1` değerini okur; sürüm tutmazsa ya da okunamazsa boş liste döner. |

### `web-app/src/services/games.ts`
Laboratuvarın iki yan oyununun ("Formülü kur" ve "Element dedektifi") soru seçimi, değerlendirmesi ve tarayıcıda tutulan skoru; skor keşif defterinden ayrı saklanır.

| Fonksiyon | Ne yapar |
|---|---|
| `GAMES_KEY` (sabit) | Oyun skorlarının localStorage anahtarı (`elementapi:games:v1`). |
| `elementSymbols` / `elementNames` (sabit) | Tohum listesinden bilinen semboller kümesi ve sembol → Türkçe ad sözlüğü. |
| `knownIds(value, isKnown)` | Girdiden `isKnown` testini geçen benzersiz dizgi kimlikleri tutar, gerisini atar. |
| `normalizeGames(value)` | Saklı ilerlemeyi temizler: bilinmeyen slug ve sembolleri ve tekrarları çıkarır. |
| `readGames()` | Bu tarayıcının ilerlemesini döner: saklı kopya ya da depolama yazmayı reddettiyse bu ziyaretin kaydedilemeyen kopyası; bozuk veri boş sayılır. |
| `rememberGame(kind, id)` | Çözülen bulmacayı ekler ve yeni ilerlemeyi döner; başka sekmede çözülenleri korumak için depodan başlar, yazılamazsa sayfa yenilenene kadar bellekte tutar. |
| `nextAfter(items, rank, currentRank)` | Sırası `currentRank` değerinden büyük ilk öğeyi, yoksa listenin başını döner; "geç" düğmesi iki öğe arasında gidip gelmez, listede ilerler. |
| `isFormulaUnit(compound)` | Bileşik iyon örgüsü ya da ağ yapılı katıysa (formül bir molekül değil, formül birimiyse) true döner. |
| `formulaTier(compound)` | Zorluk seviyesi: 1 = en fazla 2 element ve 3 atom, 2 = en fazla 3 element ve 7 atom, 3 = geri kalanı. |
| `unlockedFormulaTier(solved)` | Doğru çözülen formül sayısına göre açık en yüksek seviyeyi döner (3 doğruda seviye 2, 8 doğruda seviye 3). |
| `formulaPool(tier)` | Verilen seviyeye kadar olan katalog bileşiklerini katalog sırasıyla döner. |
| `compoundRank` (sabit) | Bileşik slug'ından katalog sırasına eşleme. |
| `pickFormula(solved, prefer, current)` | "Formülü kur" için sıradaki bileşiği seçer: adresteki `prefer` varsa o; yoksa açık seviyelerde `current` sonrasındaki ilk çözülmemiş bileşik; hepsi çözüldüyse kataloğu döngüyle gezer. |
| `gradeFormula(slug, input)` | Girilen atom sayılarını bileşikle karşılaştırır; doğruysa molekül ya da formül birimi olduğunu söyler, yanlışsa her hatalı elementi eksik/fazla/olmamalı diye Türkçe adıyla sayar. |
| `findElement(symbol)` | Elementi sembolüyle büyük/küçük harf gözetmeden bulur (`fe`, `FE`, `Fe`). |
| `leaks(text, element)` | Metin elementin adını, sembolünü ya da İngilizce adını içeriyorsa (cevabı ele veriyorsa) true döner. |
| `detectiveClues(element)` | Belirsizden belirgine doğru ipuçları üretir: aile, periyot ve grup, oda koşullarındaki hâl, adını vermeyen bir katalog bileşiği, özet ve sembolün harf sayısı; hiçbiri elementin adını söylemez. |
| `detectiveElements` (sabit) | Dedektif havuzu: ilk 36 elementten en az üç ipucu çıkanlar. |
| `detectivePool()` | Dedektif havuzunu döner. |
| `buildDetective(symbol, solved)` | Bir element için vaka kurar: ipuçları ve aynı aileden ya da periyottan seçilmiş üç çeldiriciyle dört seçenek (çözülmemişler önce, sonra atom numarasına göre); bilinmeyen elementte `undefined` döner. |
| `pickDetective(solved, prefer, current)` | Sıradaki dedektif vakasını seçer: adresteki `prefer` varsa o; yoksa `current` sonrasındaki ilk çözülmemiş havuz elementi; hepsi çözüldüyse havuzu döngüyle gezer. |
| `gradeDetective(symbol, guess)` | Tahmini sembol ya da Türkçe ad olarak, büyük/küçük harf ve Türkçe aksan gözetmeden kabul eder; yanlışta yeni ipucu açmayı önerir. |
| `recordKindQuestion(compound)` | Keşiften sonraki kısa soruyu kurar: kayıt ayrı bir molekülü mü, iyon veya ağ formül birimini mi, yoksa bir karışımı mı gösterir; açıklama geometri notundan gelir. |

### `web-app/src/services/science.ts`
Herkese açık bilim API'sinin (`/api/v2`) istemcisi; servis ulaşılamazsa kayıtlar `scienceCatalog.ts` içindeki depoya gömülü JSON'dan gelir.

| Fonksiyon | Ne yapar |
|---|---|
| `loadCatalog()` | Yaklaşık 1,4 MB'lık çevrimdışı veri parçasını ilk bilim görünümünde tembel yükler ve modülü saklar. |
| `scienceUrl(path)` | `elements/fe` gibi bir yol için tam API adresini üretir. |
| `responseCache` (sabit) | Süren ve biten yanıtları yola göre tutar; başarısız istek silinir ki yeniden denenebilsin. |
| `ScienceNotFoundError` (sınıf) | API'nin 404 yanıtı: kayıt yok demektir, servisin kapalı olmasından ayrılır. |
| `fetchJson(path)` | Çerez göndermeden ve 15 sn zaman aşımıyla (`AbortSignal.timeout`) GET atar; 404'te `ScienceNotFoundError` ("Kayıt bulunamadı."), ağ hatası ve zaman aşımı dahil diğer her hatada "Bilimsel veri servisine ulaşılamadı." fırlatır. |
| `getCached(path)` | Aynı yol için tek bir isteği paylaştırır; hata olursa önbellekten siler. |
| `listScience(kind)` | Bir türün bütün kayıtlarını (özet görünüm, 100'lük sayfalar paralel) çekip yerel verinin üzerine birleştirir; API başarısız olursa yalnız yerel veriyi döner. |
| `localFallback(kind, id)` | Yerel verideki kaydı ya da listeyi döner; parça yüklenemezse `undefined` döner. |
| `useScience(kind, id)` | Tek bir kaydı (`id` verilirse) ya da bütün listeyi veren kanca: yerel veri yüklenince önce o çizilir, API yanıtı gelince yerini alır; `error` yalnız iki kaynakta da kayıt yoksa dolar ve `notFound` o zaman API'nin kaydı tanımadığını (404) servisin ulaşılamaz olmasından ayırır; `retry()` isteği yeniden başlatır. |
| `formatScience(value, unit)` | Ölçülen değeri Türkçe gösterimle (7 anlamlı basamak) ve birimiyle yazar; değer yoksa `—` döner. |

### `web-app/src/services/useLearning.ts`
Öğrenenin defteri: keşfedilen bileşikleri ve tamamlanan rotaları kullanıcıya (ya da misafire) göre localStorage'da tutar, oturum açıkken her değişikliği hesapla eşitler.

| Fonksiyon | Ne yapar |
|---|---|
| `STATUS_TEXT` (sabit) | Defterin saklama ve eşitleme durumlarının Türkçe cümleleri (yerel, yalnız bellek, eşitleniyor, eşitlendi, başarısız, zaman aşımı). |
| `memoryStore` (sabit) | localStorage hata verdiğinde ilerlemeyi sekme kapanana kadar tutan bellek deposu. |
| `storageKey(user)` | Kullanıcıya özel anahtarı üretir: `elementapi:learning:<kullanıcı ya da guest>:v1`. |
| `subscribe(listener)` | `storage` ve `element:learning` olaylarına abone olur; `useSyncExternalStore` için aboneliği kaldıran işlevi döner. |
| `readRaw(user)` | Saklı ilerlemeyi ham JSON olarak okur (önce bellek, sonra localStorage); defteri olmayan misafir eski `elementapi:lab:v1` keşiflerini devralır. |
| `parseRaw(value)` | Ham JSON'u doğrulanmış ilerlemeye çevirir; bozuksa boş ilerleme döner. |
| `persist(user, progress)` | İlerlemeyi doğrulayıp yazar ve bütün kanca örneklerine haber verir; localStorage yazamazsa belleğe koyar ve `false` döner. |
| `forgetLearning(user)` | Hesap silindikten sonra o kullanıcının ilerlemesini bu cihazdan siler. |
| `useLearning()` | Defter kancası: ilerlemeyi depodan okur; kullanıcı girişliyse her değişiklikte `fetchJson` ile `PUT /auth/learning` atar (12 sn zaman aşımı), sunucunun kopyasını birleştirip geri yazar, 401'de oturumu kapatır; `progress`, `user`, `syncState`, `status`, `save`, `retry`, `guest` ve `importGuest` döner. |
| `sync()` (`useLearning` içinde) | Tek bir eşitleme turu: ilerlemeyi gönderir, yanıtı mevcut kayıtla birleştirir, fark varsa saklar, `progress_saved` tanılama olayını yazar ve durumu "synced" yapar; HTTP hatası ya da JSON gövdesiz yanıt "failed", zaman aşımı (`isTimeout`) "timedOut" olur; bileşen kalktıysa ya da bu arada oturum değiştiyse sonucu yok sayar. |
| `save(next)` (`useLearning` dönüşü) | Yeni ilerlemeyi saklar; yalnız belleğe yazılabildiyse durumu "memoryOnly" yapar. |
| `retry()` (`useLearning` dönüşü) | İlerlemeyi hesaba yeniden göndermek için eşitlemeyi tekrar başlatır. |
| `importGuest()` (`useLearning` dönüşü) | Bu cihazdaki misafir ilerlemesini girişli hesabın defterine ekler. |

### `web-app/src/components/ProductShell.tsx`
Her rotanın çevresindeki ortak çerçeve: "İçeriğe geç" bağlantısı, yapışkan üst bilgi (tek kırılma noktası: `lg`), `#main-content` odak hedefi ve alt bilgi.

| Fonksiyon | Ne yapar |
|---|---|
| `ProductShell({ children })` | Klavye için gizli "İçeriğe geç" bağlantısını, mobil menü, marka, ana menü, "Daha fazla", API kısayolu ve hesap menüsünden oluşan üst bilgiyi, odaklanabilir `#main-content` alanını ve `SiteFooter` bileşenini çizer. |

### `web-app/src/components/Seo.tsx`
Sayfanın `<head>` bilgilerini (başlık, açıklama, robots, kanonik adres, Open Graph, Twitter kartı, JSON-LD) yöneten, ekrana hiçbir şey çizmeyen bileşen.

| Fonksiyon | Ne yapar |
|---|---|
| `upsertMeta(attribute, key, content)` | `name` ya da `property` özniteliğiyle aranan `meta` etiketini bulur, yoksa oluşturur ve içeriğini yazar. |
| `upsertLink(rel, href)` | Verilen `rel` değerli `link` etiketini bulur ya da oluşturur ve adresini yazar. |
| `withContext(node)` | JSON-LD düğümünde `@context` yoksa `https://schema.org` ekler. |
| `syncJsonLd(json)` | Sayfanın JSON-LD betiğini (`#json-ld-seo`) yazar; sayfada JSON-LD yoksa betiği kaldırır. |
| `Seo({ title, description, path, ogType, jsonLd, noIndex })` | Belge başlığını ve dilini (`tr`) ayarlar, açıklama, robots (`noIndex` ile "noindex, nofollow"), kanonik adres, Open Graph (1200×630 `og.png`) ve Twitter etiketlerini günceller; JSON-LD'yi metne çevirerek eşit içerikli yeni nesnenin etkiyi yeniden çalıştırmasını önler. |

### `web-app/src/components/ErrorBoundary.tsx`
Çizimde hata veren sayfanın yerine çıkan çökme ekranı. `App` rotaları kabuğun içinde bir tanesiyle sarar (başlık ve menü çalışmaya devam eder); `main.tsx` bütün uygulamayı bir tane daha ile sarar. O ikincisi yönlendiricinin dışında durduğu için ekran düz bağlantı kullanır ve sayfayı yenileyerek toparlanır.

| Fonksiyon | Ne yapar |
|---|---|
| `ErrorBoundary({ children, resetKey })` (sınıf bileşen) | Alt ağaçta hata olmadıkça çocukları çizer; hata olunca `noindex` başlıklı (`Seo`) "Bu sayfa açılırken bir sorun oluştu" ekranını, keşiflerin silinmediği notunu, "Yeniden dene" ve "Ana sayfa" düğmelerini gösterir. Ekran sayfa düzenindeki `<main>` içindedir; `role="alert"` `<main>`'de değil, içindeki kutudadır. |
| `getDerivedStateFromError()` | Yakalanan hatada durumu `failed: true` yapar. |
| `componentDidCatch()` | Hatayı isteğe bağlı tanılamaya `client_error` olayı olarak yazar. |
| `componentDidUpdate(previous)` | Hata ekranı açıkken `resetKey` değişirse (yönlendirici yolu verir) durumu temizler ve çocukları yeniden çizer. |
| `render()` | Duruma göre çocukları ya da çökme ekranını çizer. |

### `web-app/src/components/RouteFallback.tsx`
Rota parçası yüklenirken gösterilen yedek görünüm.

| Fonksiyon | Ne yapar |
|---|---|
| `RouteFallback()` | Sayfa başlığı (`PageHeader`) biçiminde iskelet çizgileri ve bir içerik bloğu çizer; ekran okuyucuya "Sayfa yükleniyor…" okutur ve `aria-busy` işaretler. |

### `web-app/src/components/CaptchaWidget.tsx`
Giriş ve kayıt formları için Cloudflare Turnstile doğrulaması; yalnız derlemede `VITE_CAPTCHA_SITE_KEY` varsa çizilir.

| Fonksiyon | Ne yapar |
|---|---|
| `loadTurnstile()` | Turnstile betiğini sayfa başına bir kez yükler ve bütün bileşenlere aynı söz (promise) verir; yükleme başarısız olursa betiği kaldırıp bir sonraki denemeye izin verir. |
| `CaptchaWidget({ onToken, serverRequiresCaptcha })` | Site anahtarı varsa "Güvenlik doğrulaması" kutusunu koyu temayla çizer ve jetonu `onToken` ile verir (süresi dolar ya da hata olursa boş dizgi); bileşen kalkınca kutuyu kaldırır; site anahtarı yokken sunucu CAPTCHA istiyorsa derlemenin yeniden yapılması gerektiğini söyleyen uyarı gösterir. |

### `web-app/src/components/AtlasVisual.tsx`
Element ya da bileşik için görsel alanı: lisanslı fotoğraf, açık zemin üzerinde PubChem yapı çizimi ya da şema (elementte elektron kabukları, bileşikte formül), görünüm seçici ve kaynak/lisans altyazısıyla.

| Fonksiyon | Ne yapar |
|---|---|
| `STRUCTURE_PLATE` (sabit) | Yapı çiziminin plakası: çerçeve kadar yüksek bir kare, molekül bunun %80'ini kaplar, çizim hiç küçültülmez. |
| `MediaImage({ media, plate, eager, fallback })` | Fotoğraf ya da yapı görselini çizer; yapı çiziminde (`plate`) görsel yüklenince `measureStructure` ile çizimi ölçer, `STRUCTURE_PLATE`'e göre ortalayıp büyütür ve beyaz zemini plakaya karıştırır, ölçülene kadar gizler; yükleme hatasında şemayı "Görsel yüklenemedi" notuyla gösterir. |
| `Credits({ media })` | Görselin yaratıcısını kaynak bağlantısıyla ve lisansını (varsa bağlantısıyla) gösterir; ikisi de yeni sekmede açılır. |
| `AtlasVisual({ symbol, formula, shells, photo, structure, compact, className })` | Var olan görsellere göre Fotoğraf, Yapı ve Atom şeması/Formül seçeneklerini kurar, seçili görünümü çizer ve altyazıyı yazar; seçilen görünüm artık sunulmuyorsa ilk görünüme döner (geç gelen kayıtta fotoğraf öne geçer). Kabuk şeması rengini üst öğedeki `--family`'den alır (yoksa marka rengi). `compact` modunda seçiciyi kaldırır, yazıyı küçültür ve görseli tembel yükler. |

### `web-app/src/components/WorkshopMarks.tsx`
Bileşik kurmayı anlatan sayfaların başlığında süs amaçlı "A + B → AB" çip dizisi.

| Fonksiyon | Ne yapar |
|---|---|
| `BEATS` (veri) | Gösterilebilen dört tepkime: su (H₂ + O → H₂O), tuz (Na + Cl → NaCl), pas (Fe + O₂ → pas), kuvars (Si + O₂ → SiO₂). |
| `WorkshopMarks({ beat, className })` | Seçilen tepkimeyi (varsayılan su) çerçeveli çipler ve aralarında `+` / `→` işaretleriyle çizer; ekran okuyuculardan gizlidir. |

### `web-app/src/components/GeometryFigure.tsx`
Bir bileşiğin geometri sınıfının (VSEPR şekli ya da örgü) 80×56'lık ızgarada ölçeksiz küçük şeması, Türkçe adı ve tek satırlık notuyla.

| Fonksiyon | Ne yapar |
|---|---|
| `Atom({ x, y, center })` | Atom noktası çizer: merkez atom büyük ve marka renginde, çevredekiler küçük ve açık renkte. |
| `Bond({ from, to })` | İki nokta arasına bağ çizgisi çizer. |
| `Cell({ x, y })` | İyon örgüsü taslağı için birim hücre çerçevesi çizer. |
| `SHAPE` (veri) | Her geometri sınıfı (doğrusal, açısal, üçgen düzlem, üçgen piramit, tetrahedral, üçgen çift piramit, oktahedral, ağ, iyon örgüsü, molekül) için hazır SVG çizimi. |
| `GeometryFigure({ geometry, compact, className })` | Şemayı `role="img"` ve Türkçe adla, notu `aria-describedby` ile bağlayarak çizer; `compact` laboratuvar sonuçları ve sözlükte kullanılan satır içi küçük boydur. |

### `web-app/src/components/CompoundCard.tsx`
Bileşik kataloğundaki tek bir bileşiğin kartı; kartın tamamı `/compound/{slug}` sayfasına bağlanır.

| Fonksiyon | Ne yapar |
|---|---|
| `GROUP_HUE` (veri) | Her katalog grubunun formül plakasını renklendiren aile tonu; grup yoksa nötr ton kullanılır. |
| `CompoundPlate({ formula, structureUrl, hue, mediaPending })` | Kartın üst kısmı: görsel hâlâ yükleniyorsa iskelet, PubChem yapı çizimi varsa çizimi ölçüp ortalayarak koyu zemine karıştırır (yüklenene kadar nabız efekti), çizim yoksa ya da yüklenemezse grup tonlu plakada formülü gösterir. |
| `CompoundCard({ compound, group, mediaPending })` | Plaka, formül, Türkçe ad, iki satırlık özet ve mol kütlesinden oluşan kartı çizer; ekran okuyucu için adı ve formülü `aria-label` olarak verir. |

### `web-app/src/components/LabModes.tsx`
Laboratuvarın üç modu arasında bölümlü gezinme.

| Fonksiyon | Ne yapar |
|---|---|
| `MODES` (veri) | Tezgâh (`/lab`), Formülü kur (`/lab/formula`), Element dedektifi (`/lab/detective`) bağlantıları ve simgeleri. |
| `LabModes()` | Üç modu `NavLink` olarak çizer ve etkin modu vurgular; "Tezgâh" yalnız tam `/lab` adresinde etkin sayılır. |

### `web-app/src/components/CommerceLayout.tsx`
KREDI demosu sayfalarının rota yerleşimleri: demo şeridi, bağlantı uyarısı ve canlı fiyat/cüzdan bağlamı.

| Fonksiyon | Ne yapar |
|---|---|
| `DemoBanner()` | Üst bilginin altında sayfanın sanal KREDI demosu olduğunu (gerçek para, ödeme, kargo yok) söyleyen ince uyarı şeridini ve "Keşiflerime dön" bağlantısını çizer. |
| `OfflineNotice()` | Canlı fiyat isteği bittiği hâlde veri yoksa "Bağlantı kurulamadı" uyarısını gösterir. |
| `DemoLayout()` | `/demo` için yerleşim: demo şeridi ve altında sayfa. |
| `CommerceLayout()` | `/market`, `/shop`, `/account` için yerleşim: `CommerceProvider` içinde demo şeridi, bağlantı uyarısı ve sayfa. |

### `web-app/src/components/PeriodicExplorer.tsx`
`/periodic` sayfası: 118 elementlik gezgin; arama, aile filtresi ve renk mercekleri (lens) tablo ya da kart görünümünde çalışır.

| Fonksiyon | Ne yapar |
|---|---|
| `initialView()` | Telefonda (en fazla 767 px) kart görünümüyle, daha geniş ekranda tabloyla açar; seçim saklanmaz. |
| `PeriodicExplorer()` | Bilim kayıtlarını `useScience("elements")` ile yükler, aramayı ve aile filtresini tohum listesine uygular, seçili merceğin değer aralığını hesaplar, tablo ya da kart görünümünü yumuşak geçişle çizer; eşleşme yoksa boş durum, veri gelmezse "Yeniden dene" uyarısı gösterir; üzerine gelmek ya da odaklanmak hücreyi önizler, tık veya Boşluk önizleme penceresini, Enter tam kaydı açar. |
| `openPreview(symbol)` (`PeriodicExplorer` içinde) | Elementi seçer ve önizleme penceresini açar. |
| `openBestMatch()` (`PeriodicExplorer` içinde) | Arama kutusunda Enter'a basılınca en iyi eşleşen elementin `/element/<sembol>` sayfasına gider. |
| `clearFilters()` (`PeriodicExplorer` içinde) | Arama metnini ve aile filtresini temizler. |
| `readingOf(symbol)` (`PeriodicExplorer` içinde) | Bir elementin seçili mercekteki okumasını (değer ve renk) hesaplar. |
| `Key({ children })` | Metin içinde klavye tuşu adını `kbd` olarak gösterir. |

### `web-app/src/components/ScientificDetail.tsx`
Element (`/element/:symbol`) ya da bileşik (`/compound/:slug`) kayıt sayfası: yüklenirken iskelet, bilinmeyen kimlikte önerili 404, API'ye ulaşılamıyor ve yerel veri de yoksa yeniden deneme uyarısı gösterir.

| Fonksiyon | Ne yapar |
|---|---|
| `useScrollToHash(ready)` | Kayıt çizildikten sonra adresteki `#` bölümüne kaydırır (yönlendirici geç gelen bağlantı noktalarına kendisi kaydırmaz). |
| `RecordPage({ kind, id, record })` | Kaydın tam sayfasını kurar: SEO, kahraman alanı (`RecordHero`), içindekiler (Kullanım, molekül geometrisi, içindeki elementler, bilimsel özellik alt bölümleri, bileşikleri, kaynaklar, API ve JSON), genel bakış, bileşik yapısı, özellik bölümleri, ilgili bileşikler, kaynaklar ve geliştirici paneli; JSON indirme düğmesini bağlar. |
| `ScientificDetail({ kind })` | Adresteki sembolü ya da slug'ı küçük harfe çevirip kaydı yükler; veriye, 404'e (`useScience`'ın `notFound` bayrağı), hataya ya da yükleme durumuna göre `RecordPage`, `RecordNotFound`, `RecordError` veya `RecordSkeleton` çizer. |

### `web-app/src/components/shell/AccountMenu.tsx`
Üst bilginin hesap alanı (`lg` ve üstü): misafire giriş düğmeleri, girişli kullanıcıya avatar menüsü, hesaplar kapalı derlemede hiçbir şey.

| Fonksiyon | Ne yapar |
|---|---|
| `AccountMenu()` | Hesaplar kapalıysa hiçbir şey çizmez; misafire "Giriş yap" ve "Hesap aç" düğmelerini, girişli kullanıcıya Hesabım, Ayarlar ve Çıkış seçenekli açılır menüyü gösterir; bir öğe seçilince kapanan menü odağı tetikleyiciye değil yeni sayfaya bırakır (`useNavigationMenuFocus`). |

### `web-app/src/components/shell/BrandLink.tsx`
Ana sayfaya giden marka bağlantısı.

| Fonksiyon | Ne yapar |
|---|---|
| `BrandLink({ className, onClick })` | Koyu yüzeyde okunan açık renkli logo işaretini ve "ElementAPI" yazısını `/` bağlantısı olarak çizer; `onClick` mobil menünün kapanması için kullanılır. |

### `web-app/src/components/shell/DesktopNav.tsx`
Masaüstü (`lg` ve üstü) üst bilgi gezinmesi: ana menü, "Daha fazla" menüsü ve API kısayolu.

| Fonksiyon | Ne yapar |
|---|---|
| `PrimaryNav()` | Ana bölümleri bağlantı olarak çizer; etkin öğenin altındaki bakır renkli çizgi öğeler arasında yaylı animasyonla kayar; etkin öğe `aria-current="page"` alır. |
| `MoreMenu()` | "Daha fazla" açılır menüsünde ikincil sayfaları simgeleriyle listeler, etkin olanı vurgular ve "Kredi simülasyonu" öğesini ayraçla ayırır; seçilen sayfa açılınca odak menü düğmesine dönmez, sayfada kalır (`useNavigationMenuFocus`). |
| `ApiShortcut()` | `/developers` sayfasına giden eş aralıklı yazılı "API" kısayolunu çizer; `/developers` ve `/docs` adreslerinde etkin görünür. |

### `web-app/src/components/shell/MobileNav.tsx`
`lg` altındaki ekranlar için hamburger düğmesi ve soldan açılan, bütün rotaları ve hesap işlemlerini içeren menü.

| Fonksiyon | Ne yapar |
|---|---|
| `MobileAccount({ onNavigate })` | Misafire giriş ve kayıt bağlantılarını, girişli kullanıcıya Hesabım, Ayarlar ve Çıkış satırlarını gösterir; her biri menüyü kapatmak için `onNavigate` çağırır. |
| `MobileNav()` | Menünün açık durumunu düz bir `useState` ile tutar: menü yalnız bir bağlantı seçilince (`close`) ya da geri/ileri (`popstate`) ile kapanır. Yolu izlemez, çünkü yönlendirici yolu tembel sayfa yüklendikten sonra günceller ve o arada yeniden açılmış menü kendiliğinden kapanırdı. Site haritasını gruplar hâlinde etkin satırı vurgulayarak listeler, hesaplar açıksa alt kısma hesap alanını koyar; kapanırken odağı yeni sayfaya bırakır (`useNavigationMenuFocus`). |
| `close()` (`MobileNav` içinde) | Gezinmeyi işaretler (`markNavigation`) ve menüyü kapatır; bağlantı aynı sayfaya gitse bile menü kapanır. |

### `web-app/src/components/shell/navigationFocus.ts`
Bir menüden ya da mobil menüden sayfa açılınca odağın yeni sayfada kalmasını sağlayan yardımcılar.

| Fonksiyon | Ne yapar |
|---|---|
| `focusMainContent()` | Kabuğun `#main-content` odak hedefine kaydırmadan odaklanır; `RouteFocus` ve kapanan menüler kullanır. |
| `useNavigationMenuFocus()` | Radix menüsü ya da Sheet için `markNavigation` ve `onCloseAutoFocus` döner; ikisi de çizimler arasında aynı kalır. Radix panel kapanınca odağı tetikleyiciye verir, bu da `RouteFocus`'tan sonra olabilir. Sayfa açan öğe `markNavigation`'ı çağırdıysa kapanış odağı `#main-content`'e gönderir; Escape ve dışarı tıklama odağı yine tetikleyiciye verir. |

### `web-app/src/components/shell/NavIcon.tsx`
Menülerde satırların hizalı durması için her rotaya ayrı bir simge.

| Fonksiyon | Ne yapar |
|---|---|
| `iconByPath` (veri) | Rota yolundan lucide simgesine eşleme (Tablo, Bileşikler, Lab, Defter, El kitabı, API, Sözlük, dokümanlar, veri, kılavuz, hakkında, geri bildirim, demo). |
| `NavIcon({ to, className })` | Rotanın süs simgesini ekran okuyuculardan gizli olarak çizer; bilinmeyen yolda hiçbir şey çizmez. |

### `web-app/src/components/shell/SiteFooter.tsx`
Sitenin alt bilgisi.

| Fonksiyon | Ne yapar |
|---|---|
| `SiteFooter()` | Marka ve "Atomdan bileşiğe." sloganını, gruplanmış site haritasını (Keşif, Geliştirici, Proje) ve veri kaynağı, MIT lisansı ve yıl satırını çizer. |

### `web-app/src/components/shell/useSignOut.ts`
Oturumu kapatma işleyicisini veren kanca.

| Fonksiyon | Ne yapar |
|---|---|
| `useSignOut()` | Çağrıldığında oturumu temizleyen (`clearSession`), oturum bayrağını kapatan ve ana sayfaya giden bir işlev döner. |

### `web-app/src/pages/Landing.tsx`
Herkese açık giriş sayfası (`/`, tembel değil, hemen yüklenir): kahraman alanı, kapsam rakamları, dört ürün alanı zikzak düzende ve kapanış çağrısı.

| Fonksiyon | Ne yapar |
|---|---|
| `LANDING_DESCRIPTION` (sabit) | `coverage.json` sayılarından element ve bileşik sayısını içeren sayfa açıklamasını kurar. |
| `Landing()` | SEO etiketlerini ve Organization + WebSite JSON-LD'sini yazar; `LandingHero`, `CoverageBand`, `TableFeature`, `LabFeature`, `NotebookFeature`, `ApiFeature` ve `ClosingBand` bölümlerini sırayla çizer. |

### `web-app/src/pages/NotFound.tsx`
Bilinmeyen adresler için 404 sayfası.

| Fonksiyon | Ne yapar |
|---|---|
| `NotFound()` | İstenen yolu gösteren "Sayfa bulunamadı" boş durumunu, arama motorlarına kapalı (`noIndex`) SEO ile ve Periyodik tablo, Laboratuvar, Ana sayfa düğmeleriyle çizer. |

### `web-app/src/pages/FeatureUnavailable.tsx`
Hesaplar kapalı derlemede (yalnız atlas kurulumu) hesap ve ticaret rotalarında gösterilen sayfa.

| Fonksiyon | Ne yapar |
|---|---|
| `FeatureUnavailable()` | "Bu kurulumda hesap kapalı" mesajını, tablo, laboratuvar ve defterin açık olduğunu ve ilerlemenin tarayıcıda saklandığını söyleyen açıklamayla ve laboratuvar ile deftere giden düğmelerle gösterir. |

### `web-app/src/pages/About.tsx`
`/hakkinda`: projenin ne olduğu, verinin nereden geldiği, bilerek konan sınırlar ve teknik yapı.

| Fonksiyon | Ne yapar |
|---|---|
| `AREAS` / `LIMITS` / `STACK` / `GUIDES` (veri) | Ürün alanı kartları, dört sınır (laboratuvar simülasyon, KREDI gerçek para değil, eksik veri boş kalır, misafir defteri tarayıcıda), teknoloji yığını satırları ve kılavuz bağlantıları. |
| `figure(text)` | Sayıyı eş aralıklı, hizalı rakamlarla ve satır kırılmadan gösterir. |
| `SOURCE_FACTS` (sabit) | `coverage.json` dosyasından element, bileşik, Türkçe anlatım, fotoğraf, yapı görseli sayılarını ve veri alım tarihlerini anahtar-değer satırlarına çevirir. |
| `WaterCard()` | Başlığın yanındaki kart: iki H ve bir O karosu, H₂O formülü, el kitabı bağlantısı ve `/lab?lesson=everyday` adresine giden "Laboratuvara git" düğmesi. |
| `About()` | Sayfa başlığını, "Ne var burada", "Veri nereden geliyor", "Sınırlar" (kredi simülasyonu bağlantısıyla) ve "Teknik yapı" bölümlerini çizer. |

### `web-app/src/pages/Account.tsx`
`/account`: girişli kullanıcı için cüzdan, varlıklar, siparişler, API anahtarları ve webhook'lar; misafire giriş çağrısı.

| Fonksiyon | Ne yapar |
|---|---|
| `GUEST_FACTS` (veri) | Misafire girişten sonra ne alacağını anlatan üç madde: 10.000 sanal KREDI'lik cüzdan, otomatik üretilen ilk ticaret anahtarı, v2'nin anahtarsız olduğu. |
| `Account()` | Arama motorlarına kapalı SEO yazar; oturum açıksa `AccountOverview`, değilse `GuestAccount` çizer. |
| `GuestAccount()` | "Hesabım" başlığını `returnTo=/account` ile giriş ve kayıt düğmeleriyle ve üç bilgi maddesiyle gösterir. |
| `AccountOverview()` | Varlıkları ve siparişleri (15 sn'de bir) yükler, piyasa tahtasından satış fiyatlarını alır; bakiye, bugünkü satış fiyatıyla varlık değeri, ürün sayısı ve teslim edilen sipariş istatistiklerini, her satırda ürünü önceden seçili "Sat" bağlantılı varlık tablosunu, sipariş tablosunu ve API anahtarı ile webhook panellerini çizer. |
| `bidOf(symbol)` (`AccountOverview` içinde) | Bir sembolün piyasa tahtasındaki güncel satış (bid) fiyatını döner. |

### `web-app/src/pages/ApiDocs.tsx`
`/docs`: iki sütunlu API referansı; yapışkan içindekiler görünürdeki bölümü izler, içerikte canlı deneme alanı, v2 referansı ve anahtarlı v1 uçları vardır.

| Fonksiyon | Ne yapar |
|---|---|
| `OUTLINE` (veri) | İçindekiler: "Bilimsel API · v2" (canlı istek, referans, örnekler, ETag, parametreler, özet, hatalar, İngilizce özet) ve "Hesaplı uçlar · v1" (anahtar ve sınırlar, webhooklar, simülasyon). |
| `SECTION_IDS` (sabit) | Kaydırma izleyicisinin (scroll spy) takip ettiği bütün bölüm kimlikleri. |
| `ApiDocs()` | SEO ve WebAPI JSON-LD'si yazar; tembel yüklenen sayfada tarayıcının kaçırdığı `#bölüm` atlamasını yeniden yapar; `#simulation` adresine (sonradan gelinse bile) varınca kapalı simülasyon bölümünü açar; masaüstünde yapışkan, mobilde açılır içindekilerle bütün referans bölümlerini çizer. |
| `handleNavigate(id)` (`ApiDocs` içinde) | İçindekilerden simülasyon bağlantısına yeniden tıklanınca (adres değişmese de) bölümü yeniden açar. |

### `web-app/src/pages/Collection.tsx`
`/collection`: öğrenenin keşif defteri; ilerleme, öğrenme rotaları, keşfedilen bileşikler ve yedekler.

| Fonksiyon | Ne yapar |
|---|---|
| `Collection()` | Defteri `useLearning` ile okur; başlıkta keşif ve tamamlanan rota sayılarını, altında hesap eşitleme durumunu (`NotebookSync`), rota kartlarını, keşif ızgarasını ve yedek/aktarım panelini çizer; geri yüklenen yedeği mevcut ilerlemeyle birleştirerek saklar. |
| `completeLesson(lessonId)` (`Collection` içinde) | Rotayı tamamlanmış olarak deftere yazar ve `lesson_completed` tanılama olayını kaydeder. |

### `web-app/src/pages/Compounds.tsx`
`/compounds`: 214 bilinen bileşiğin aranabilir ve gruba göre süzülebilir kart ızgarası; yerel katalog satırları hemen çizilir, API satırları (yapı görselleri, özetler) gelince yerlerini alır.

| Fonksiyon | Ne yapar |
|---|---|
| `groupsBySlug` (sabit) | Formül ayrıştırmak ucuz olmadığı için her bileşiğin katalog gruplarını bir kez hesaplar. |
| `groupOptions` (sabit) | "Tümü" ve her grup için sayılarıyla birlikte çip seçenekleri. |
| `Compounds()` | Bileşik kayıtlarını yükler, API'de olmayanları yerel katalogdan tamamlar, arama ve grup süzgecini uygular, sonuç sayısını duyurur; API hatasında "gömülü katalog gösteriliyor" uyarısı, sonuç yoksa boş durum, varsa `CompoundCard` ızgarası çizer. |
| `clearFilters()` (`Compounds` içinde) | Arama metnini ve grup seçimini temizler. |

### `web-app/src/pages/DataCoverage.tsx`
`/data`: bu veri sürümünün neyi kapsadığı, sayıların nereden geldiği ve hâlâ neyin boş olduğu.

| Fonksiyon | Ne yapar |
|---|---|
| `SECTION_LABELS` / `SOURCES` / `RELATED` (veri) | Boş element bölümlerinin Türkçe adları, kaynak listesi (PubChem, RSC, NIST) ve ilgili sayfa bağlantıları. |
| `retrievalDates` (sabit) | `coverage.json` içindeki `2026-09-05 / 2026-09-17` gibi tarihleri "5 Eylül 2026 ve 17 Eylül 2026" biçiminde Türkçe yazar. |
| `percent(part, whole)` | Oranı tam sayı yüzdeye yuvarlar (fotoğraf ve yapı görseli ilerleme çubukları için). |
| `GapRow({ icon, title, children })` | Bir eksikliği ve arayüzün onun yerine ne gösterdiğini uyarı simgeli bir satır olarak çizer. |
| `DataCoverage()` | Sürüm istatistiklerini (element, bileşik, Türkçe anlatım, fotoğraf, yapı görseli, boş bölüm), "null sıfır değildir" açıklamasını, doldurulmamış bölümleri ve fotoğrafı olmayan elementleri, kaynakları ve ilgili bağlantıları çizer. |

### `web-app/src/pages/Demo.tsx`
`/demo`: sanal KREDI simülasyonunu (piyasa → mağaza → sipariş saga'sı) atlastan açıkça ayrı bir vitrin olarak anlatır.

| Fonksiyon | Ne yapar |
|---|---|
| `ShowcaseNote()` | Neyin simüle edildiğini (mağaza, sepet, kasa) ve neyin olmadığını (gerçek ödeme, kargo, canlı borsa) anlatan yan not. |
| `Demo()` | Hesaplar açıksa mağaza ve piyasa düğmelerini ve giriş kartlarını, kapalıysa ticaret servislerinin bu kurulumda olmadığı bilgisini gösterir; sipariş adımlarını (`SagaSteps`) ve `/docs#simulation` bağlantısını çizer. |

### `web-app/src/pages/Developers.tsx`
`/developers`: açık v2 API'nin ürün sayfası; canlı istek, temel kurallar, uç listesi ve kullanım şartları.

| Fonksiyon | Ne yapar |
|---|---|
| `AUDIENCE` / `TERMS` (veri) | API'yi kimlerin kullandığına dair üç madde ve özet kullanım şartları (sayfala ve ETag kullan, kaynak göster, v1 KREDI'yi gerçek para gibi sunma). |
| `Developers()` | Başlığı deneme tezgâhı ve OpenAPI düğmeleriyle ve yanında canlı isteği (`LiveRequest`) çizer; "Bilmen gerekenler" (`ApiFacts`), `SCIENCE_ROUTES` tablosu (yol, döndürdüğü, kabul ettiği parametreler), kullanıcı kitlesi ve şartlar (tam metin ve değişiklik kaydı bağlantılarıyla) ve sonraki adımlar bölümlerini gösterir. |

### `web-app/src/pages/Feedback.tsx`
`/feedback`: yalnız yerelde çalışan geri bildirim; isteğe bağlı tanılama kaydı sayaçlarıyla ve kayıtla birlikte JSON olarak indirilen bir not; sunucuya hiçbir şey gitmez.

| Fonksiyon | Ne yapar |
|---|---|
| `Feedback()` | Not alanını (en fazla 4000 karakter, yalnız bellekte), tanılama onay kutusunu ve kayıt, keşif, rota sayaçlarını çizer; not doluyken sayfadan ayrılmadan önce tarayıcıya uyarı gösterttirir. |
| `countOf(event)` (`Feedback` içinde) | Saklı olaylardan belirli türde kaç tane olduğunu sayar. |
| `toggleDiagnostics(next)` (`Feedback` içinde) | Tanılama onayını açar ya da kapatır (kapatmak olayları siler); depolama kapalıysa uyarı gösterir. |
| `download()` (`Feedback` içinde) | Kapsam açıklaması, tarih, not ve olaylardan oluşan `elementapi-deneyim-notlari.json` dosyasını indirir ve "kimseye gönderilmedi" bilgisini gösterir. |

### `web-app/src/pages/Glossary.tsx`
`/sozluk`: ürünün sözlüğü; A–Z dizili, gruba göre süzülebilir, her terim denenebileceği yere bağlanır.

| Fonksiyon | Ne yapar |
|---|---|
| `terms` (sabit) | Hesapların açık ya da kapalı olmasına göre seçilmiş sözlük terimleri. |
| `groupShort` / `groupOptions` (sabit) | Grup kimliğinden kısa etikete eşleme ve "Tümü" ile her grubun terim sayılarıyla çip seçenekleri. |
| `GlossaryAside()` | Başlığın yanındaki not: su ve tuzun tarifinin el kitabında olduğu, ETag'in kısa tanımı ve Laboratuvar, API, El kitabı bağlantıları. |
| `Glossary()` | Seçili gruba göre terimleri harflere böler; grup çiplerini, harf dizinini ve her harf için yapışkan başlıklı terim listesini çizer. |

### `web-app/src/pages/Guide.tsx`
`/nasil` ("El kitabı"): ilk on dakikanın adım adım anlatımı, sık sorulanlar ve aynı kayıtların curl ile okunuşu.

| Fonksiyon | Ne yapar |
|---|---|
| `steps` / `questions` (sabit) | Hesapların açık ya da kapalı olmasına göre seçilmiş adımlar ve sık sorulan sorular. |
| `API_SAMPLES` (veri) | İki curl örneği: alan seçimli Fe elementi ve H₂O bileşiği. |
| `GuideFaq({ items })` | Soruları açılır-kapanır satırlar olarak çizer; cevaplar istenince açılır. |
| `ProgressAside()` | Yan panel: deftere ve `/lab?lesson=everyday` adresine giden düğmeler; hesaplar kapalıysa KREDI demosuna sessiz bir not. |
| `Guide()` | Sayfa başlığını, adımları (`GuideSteps`), sık sorulanları, `publicApiUrl` ile tam adresli curl örneklerini ve yan paneli çizer. |

### `web-app/src/pages/LabDetective.tsx`
`/lab/detective`: ipuçlarını tek tek açıp elementi yazarak ya da dört adaydan birini seçerek bulma oyunu; `?element=fe` (büyük/küçük harf fark etmez) o vakayı açar.

| Fonksiyon | Ne yapar |
|---|---|
| `LabDetective()` | Çözülenleri tarayıcıdan okur, adresteki elementle ya da sıradaki vakayla başlar; açılan ipuçlarını animasyonla, kapalıları kilitli satır olarak, yeni açılan ipucunu ekran okuyucuya okutarak çizer; tahmin formunu, aday düğmelerini (yanlışlar üstü çizili, doğru yeşil), sonucu ve çözülünce "Sonraki" ile "Element kaydını aç" düğmelerini gösterir. |
| `nextCase()` (`LabDetective` içinde) | Mevcut elementi asla geri getirmeden sıradaki vakaya geçer ve ipucu, tahmin, sonuç ve yanlış seçim durumlarını sıfırlar ("Pas geç"). |
| `continueToNextCase()` (`LabDetective` içinde) | "Sonraki": yeni vakayı hemen çizdirip (`flushSync`) odağı yeniden etkinleşen tahmin alanına taşır. |
| `revealClue()` (`LabDetective` içinde) | Bir ipucu daha açar; son ipucu açılınca "Başka ipucu" düğmesi kaybolacağı için odağı tahmin alanına taşır. |
| `submit(value)` (`LabDetective` içinde) | Tahmini değerlendirir; doğruysa çözüleni kaydeder ve odağı "Sonraki" düğmesine taşır. |
| `pick(symbol)` (`LabDetective` içinde) | Seçilen adayı tahmin olarak gönderir; yanlışsa yanlış seçimler listesine ekler. |

### `web-app/src/pages/LabFormula.tsx`
`/lab/formula`: bileşiğin adını okuyup her elementin atom sayısını artı/eksi düğmeleriyle kurma oyunu; skor keşif defterinden ayrı tutulur, `?compound=<slug>` o bileşikle başlatır.

| Fonksiyon | Ne yapar |
|---|---|
| `LabFormula()` | Çözülenleri tarayıcıdan okur, adresteki ya da sıradaki bileşikle başlar; bileşiğin adını, özetini, geometri şemasını ve molekül/formül birimi notunu, her element için sayaçlı satırları, "Kontrol et" düğmesini, sonucu ve çözülünce "Sonraki" ile "Bilimsel kaydı aç" düğmelerini çizer; yanda doğru sayısını ve açık seviyeyi gösterir. |
| `step(symbol, delta)` (`LabFormula` içinde) | Bir elementin sayısını bir artırır ya da azaltır (sıfırı atar) ve önceki sonucu temizler. |
| `nextPuzzle()` (`LabFormula` içinde) | Mevcut bileşiği asla geri getirmeden sıradakine geçer ve sayıları ile sonucu sıfırlar. |
| `continueToNextPuzzle()` (`LabFormula` içinde) | "Sonraki": yeni bulmacayı hemen çizdirip (`flushSync`) odağı ilk etkin sayı düğmesine taşır. |
| `check()` (`LabFormula` içinde) | Sayıları değerlendirir; doğruysa bileşiği çözülenlere kaydeder ve "Kontrol et" kapanacağı için odağı "Sonraki" düğmesine taşır. |

### `web-app/src/pages/Laboratory.tsx`
`/lab`: serbest stokiyometri tezgâhı; elementler paletten tezgâha (tık, klavye ya da sürükleme) gider, "Dene" karışımı katalogla eşleştirir, bulunan bileşik öğrenme defterine yazılır; `?material=Fe` tezgâha bir atom koyar, `?lesson=<id>` bir öğrenme rotasını izler.

| Fonksiyon | Ne yapar |
|---|---|
| `hintMessage(compound)` | İpucu cümlesini kurar: "Su için 2 hidrojen ve 1 oksijen dene." |
| `progressHint(found)` | Keşif sayısına göre yan paneldeki notu seçer: ilk molekülü dene, kalan bileşik sayısı ya da "Katalog tamam". |
| `Laboratory()` | Defteri, rotayı ve tezgâhı kurar, açılışta `lab_started` olayını yazar; rota varsa kalan keşifleri gösteren notu, element paletini, tezgâhı, canlı formül önizlemesini, İpucu ve Dene düğmelerini, sonuç alanını (`MixOutcome`), keşif defterini ve sürüklenen öğenin gölgesini çizer. |
| `edit(change)` (`Laboratory` içinde) | Tezgâhta bir değişiklik yapar ve son sonucu geçersiz kılar. |
| `mix(override)` (`Laboratory` içinde) | Tezgâhtaki (ya da başlangıç tarifinden gelen) atomları katalogla eşleştirir; olmazsa ton ve açıklamalı "miss" sonucunu, olursa bileşiği deftere yazıp (ilk keşifse `discovery_completed` olayıyla) "hit" sonucunu gösterir. |
| `showHint()` (`Laboratory` içinde) | Rotanın ya da kataloğun sıradaki bileşiği için ipucu gösterir; hepsi bulunduysa bunu söyler. |
| `clearBench()` (`Laboratory` içinde) | Tezgâhı temizler ve odağı tezgâha taşır ("Temizle" kendini kapattığı için odak orada kalamaz); sonuç kartındaki "Yeniden karıştır" da bunu kullanır. |
| `resetNotebook()` (`Laboratory` içinde) | Misafir için keşif listesini sıfırlar, tezgâhı temizler ve "Yeni keşif defteri açıldı." bildirimi gösterir. |
| `startPaletteDrag(event, id, addOnTap)` (`Laboratory` içinde) | Paletten sürüklemeyi başlatır; tezgâhın üstüne bırakılırsa (ya da dokunuşla eklemede hareket olmadıysa) elementi ekler. |
| `startChipDrag(event, source)` (`Laboratory` içinde) | Tezgâhtaki çipin sürüklenmesini başlatır; başka bir çipin üstüne bırakılırsa sırasını değiştirir, tezgâhın dışına bırakılırsa çıkarır ve odağı tezgâha verir. |

### `web-app/src/pages/Login.tsx`
E-posta ve şifreyle giriş; başarıda `?returnTo` adresine (yalnız aynı köken) ya da deftere döner.

| Fonksiyon | Ne yapar |
|---|---|
| `Login()` | Kimlik yeteneklerini yükler; e-posta, şifre ve CAPTCHA alanlı formu, şifre kurtarma açıksa "Şifremi unuttum" bağlantısını, kapalıysa e-postasız beta notunu ve `returnTo` korunarak kayıt bağlantısını çizer. |
| `handleSubmit(event)` (`Login` içinde) | CAPTCHA yapılandırılmışsa jeton ister, girişi dener, jeton gelirse oturum bayrağını açıp güvenli geri dönüş adresine gider; hatada `loginError`'ın Türkçe mesajını gösterir. |

### `web-app/src/pages/Market.tsx`
`/market`: sanal KREDI fiyat masası; hareketli elementler şeridi ve sıralanabilir fiyat tahtası elementi seçer, fiyat kartı canlı fiyatları alış bağlantısı ve satış formuyla gösterir, kasa varlıkları listeler.

| Fonksiyon | Ne yapar |
|---|---|
| `holdingsOf(state, symbol)` | Satış formu için bir elementin varlıklarını döner: yüklenirken `null`, kasa yüklenemediyse boş liste. |
| `Market()` | Tahtayı ve hareketlileri 20 sn'de bir yükler (aralığı `QuoteBoard`'a `pollMs` olarak verir); satış taslağı Hesabım'daki "Sat" bağlantısının `location.state.slug` değeriyle (ör. NaCl), yoksa saf elementle (`ELEMENTAL_SLUG`) başlar; seçili elementin fiyat kartını ve varlıkları getirir; girişliyse cüzdan bakiyesini, satış formunu ve "Satış için seç" düğmeli varlık tablosunu, misafire satış için giriş bağlantısını gösterir. |
| `loadBoard()` (`Market` içinde) | En çok hareket eden 16 elementi ve bütün piyasa tahtasını çeker; tahta hatasında durumu "error" yapar. |
| `bidOf(symbol)` (`Market` içinde) | Bir sembolün tahtadaki satış (bid) fiyatını döner. |
| `selectForSale(row)` (`Market` içinde) | Varlık satırının elementini seçer, satış taslağını o ürün ve en fazla 10 gramla doldurur ve fiyat kartını görünür alana kaydırır. |
| `handleSold()` (`Market` içinde) | Satıştan sonra varlıkları, cüzdan bakiyesini ve fiyat kartını yeniler. |

### `web-app/src/pages/Recovery.tsx`
Şifre kurtarma ve e-posta doğrulama sayfası; davranışı kullanıcının izlediği bağlantı belirler: `/reset-password` (jetonlu ya da jetonsuz) ve `/verify-email` (jetonlu).

| Fonksiyon | Ne yapar |
|---|---|
| `MODES` (veri) | Üç modun başlık, açıklama, düğme, başarı metni ve çağrılacak uç yolu: doğrula (`/auth/email/verify`), sıfırla (`/auth/password/reset`), bağlantı iste (`/auth/password/forgot`). |
| `modeFor(verify, token)` | Modu seçer: doğrulama sayfasıysa "verify", jeton varsa "reset", yoksa "request". |
| `readLinkParams(query)` | Bağlantı parametrelerini sunucu loglarına düşmemesi için `#token=…&email=…` biçimindeki adres parçasından, yoksa sorgu dizgisinden okur. |
| `Recovery({ verify })` | Moda göre formu gösterir: jetonsuz doğrulamada "bağlantı eksik" uyarısı, bağlantı isteğinde sunucu şifre kurtarmayı desteklemiyorsa "E-postasız beta" notu, sıfırlamada yeni şifre ve tekrarı (en az 10 karakter); başarıda sonucu gösterir. |
| `submit(event)` (`Recovery` içinde) | Sıfırlamada şifrelerin eşleştiğini kontrol eder, e-posta, jeton ve şifreyi uygun uca gönderir; başarıda jetonu adres çubuğundan siler ve sıfırlamadan sonra bu tarayıcıdaki oturumu kapatır. |
| `FormSkeleton()` | Sunucunun kurtarma yeteneği kontrol edilirken e-posta formunun yerinde iskelet gösterir ve "Kurtarma seçenekleri kontrol ediliyor…" okutur. |

### `web-app/src/pages/Register.tsx`
Hesap açma; CAPTCHA yoksa doğrudan giriş yapıp `?returnTo` adresine döner (bu giriş olmazsa nedenini söyler ve giriş bağlantısı verir), CAPTCHA varsa (Turnstile jetonları tek kullanımlık olduğu için) kullanıcıyı giriş sayfasına yollar.

| Fonksiyon | Ne yapar |
|---|---|
| `PERKS` / `EMPTY_FORM` (veri) | Hesap açmanın üç faydası (her cihazda aynı defter, 10.000 sanal kredi ve ticaret anahtarı, kaybolmayan sipariş geçmişi) ve boş form değerleri. |
| `Register()` | Fayda listesini, ad, soyad, e-posta, şifre ve şifre tekrarı alanlarını, CAPTCHA'yı ve `returnTo` korunarak giriş bağlantısını çizer. |
| `handleChange(event)` (`Register` içinde) | Değişen alanı forma yazar; şifre alanlarından biri değişince eşleşmeme uyarısını kaldırır. |
| `goToLogin()` (`Register` içinde) | "Hesap oluştu" mesajını gösterip 1,2 sn sonra giriş sayfasına gider. |
| `handleSubmit(event)` (`Register` içinde) | Şifre eşleşmesini ve gerekiyorsa CAPTCHA jetonunu kontrol eder, hesabı açar; CAPTCHA yoksa hemen giriş yapıp güvenli geri dönüş adresine gider; otomatik giriş reddedilirse nedenini (`loginError`) "Hesap oluştu, oturum açılamadı" uyarısında "Giriş yap" bağlantısıyla gösterir ve formu kilitler (hesap zaten var); jeton gelmezse ya da CAPTCHA varsa giriş sayfasına yönlendirir; hesap açılamazsa sunucunun mesajını `apiError` ile gösterir (Identity kodları Türkçe: "Bu e-posta zaten kayıtlı."). |

### `web-app/src/pages/Settings.tsx`
`/settings`: hesap ayarları; profil, e-posta doğrulama, şifre, anahtarlar, veri dışa aktarma ve hesap silme.

| Fonksiyon | Ne yapar |
|---|---|
| `useProfile(enabled)` | Oturum açıkken `GET /auth/profile` profilini 10 sn zaman aşımıyla yükler; hata olursa `failed` döner, `retry()` yeniden ister, bileşen kalkınca isteği iptal eder. |
| `Settings()` | Girişliyse profil (e-posta doğrulama yeteneğiyle), şifre, API anahtarları için hesap sayfası kartı, veri dışa aktarma ve hesap silme bölümlerini; misafire `returnTo=/settings` korunarak giriş ve kayıt düğmeli boş durumu çizer. |

### `web-app/src/pages/Shop.tsx`
`/shop`: sanal KREDI mağazası; element, paket boyu ve ana elementin alış fiyatı × çarpanla fiyatlanan ürünler seçilir, gram sepeti her satır için ayrı ve idempotent bir siparişle ödenir, siparişlerin saga durumu aşağıda izlenir.

| Fonksiyon | Ne yapar |
|---|---|
| `PICKS` / `PACK_OPTIONS` (veri) | Hızlı seçilen elementler (AU, AG, CU, FE, C, NA, AL, PT) ve paket boyları (1, 10, 100 g). |
| `Shop()` | Fiyat tahtasını 15 sn'de bir, siparişleri girişliyse 4 sn'de bir yükler; ürün kataloğunu seçili elemente ve aramaya göre süzer, sepeti özetler (ara toplam, stok aşımı, bakiye yetersizliği), ürün kartlarını, sepet panelini ve sipariş durumu tablosunu (misafire giriş çağrısı) çizer. |
| `quoteOf(symbol)` (`Shop` içinde) | Bir elementin tahtadaki alış fiyatını ve stoğunu döner. |
| `showElement(symbol)` (`Shop` içinde) | `null` gelirse süzgeci kaldırır ("Tümü"), değilse elementi seçip kataloğu yalnız onunla sınırlar. |
| `addSku(sku)` (`Shop` içinde) | Ürünü seçili paket gramıyla sepete ekler ve "Sepete eklendi" bildirimi gösterir. |
| `checkout()` (`Shop` içinde) | Misafiri giriş sayfasına yollar; sepet boş, stok aşımı ya da bakiye yetersizse durur; aksi hâlde her satır için sırayla sipariş verir (satırın `requestId` değeri `Idempotency-Key` olduğu için tekrar denemede iki kez ücretlendirme olmaz), kabul edilen satırı hemen sepetten çıkarır, sonunda bakiyeyi yeniler; hatada (402'de "Cüzdanda yeterli kredi yok.") kalan ürünlerin sepette olduğunu söyler. |

### `web-app/src/pages/SystemGuide.tsx`
`/kilavuz` ve `/kilavuz/:slug`: uygulama içi sistem kılavuzu; içeriği `docs/kilavuz` klasörüdür, `scripts/write-guide.mjs` bunu `src/data/guide.json` dosyasına çevirir (predev, build, pretest) ve sayfa açılınca bu dosya indirilir.

| Fonksiyon | Ne yapar |
|---|---|
| `eyebrowOf(guide, page)` | Sayfanın üst etiketini kurar: kenar çubuğundaki grup adı ve sayfanın belgelediği klasör (ör. "Ticaret demosu · order-service"). |
| `seoTitle(guide, page)` | Sekme başlığını seçer: sayfa yoksa "Bölüm bulunamadı", genel bakışta kılavuz başlığı, diğerlerinde sayfa adı + kılavuz başlığı. |
| `GuideBrowser({ guide })` | Yüklenmiş kılavuz: gruplu kenar çubuğu ve her fonksiyonda arama (`lg` altında içeriğin üstünde sayfa listesi düğmesi ve arama kutusu), sağda seçili sayfa, arama sonuçları ya da "Bu bölüm yok" ekranı; arama metni yazıldığı konuma bağlıdır, herhangi bir gezinme sonuçları kapatır; sonuçlar açılınca sayfanın başına kaydırır ve bağlantı noktalarına (tek tablo satırına kadar) kaydırmayı yönetir. |
| `focusFirstResult(event)` (`GuideBrowser` içinde) | Arama kutusunda aşağı ok tuşuna basılınca odağı ilk sonuca taşır. |
| `setQuery(value)` (`GuideBrowser` içinde) | Arama metnini o anki konumun anahtarıyla birlikte saklar. |
| `SystemGuide()` | Kılavuz verisini `useGuide` ile yükler; hazırsa `GuideBrowser`, hatada "Kılavuz yüklenemedi" uyarısını "Yeniden dene" düğmesiyle, yüklenirken iskeleti çizer; her durumda arama motorlarına kapalıdır. |

### `web-app/src/pages/UiGallery.tsx`
Yalnız geliştirmede açılan `/_ui` sayfası: Mineral tasarım sisteminin her ilkel bileşeni ve yapı taşı gerçekçi Türkçe içerikle; üretim derlemesine girmez.

| Fonksiyon | Ne yapar |
|---|---|
| `CONTENTS` (veri) | Galeri içindekileri: Temeller, Eylemler, Formlar ve filtreler, Durumlar ve ölçüler, Veri ve gezinme, Kimya bileşenleri, Kod ve bağlantılar. |
| `UiGallery()` | Başlığı üç örnek element karosuyla, masaüstünde yapışkan numaralı içindekilerle ve yedi galeri bölümünü sırayla çizer. |

### `web-app/src/pages/ui-gallery/Specimen.tsx`
Galerideki her örneğin etrafındaki etiketli çerçeve.

| Fonksiyon | Ne yapar |
|---|---|
| `Specimen({ title, note, children, className })` | Başlık ve isteğe bağlı eş aralıklı not (ör. bileşen adı) taşıyan üst şerit ile içerik alanından oluşan çerçeveyi çizer. |

### `web-app/src/pages/ui-gallery/ActionsSection.tsx`
Galerinin "Eylemler" bölümü: düğmeler, rozetler, menüler, pencereler ve bildirimler.

| Fonksiyon | Ne yapar |
|---|---|
| `DeleteAccountDemo()` | Onay için "HESABIMI SİL" yazılmasını isteyen, onaylanınca 0,9 sn bekleyip gerçek istek göndermeden başarı bildirimi gösteren örnek hesap silme penceresi. |
| `ActionsSection()` | Düğme türlerini, boyutlarını ve durumlarını, rozet tonlarını, Demir önizleme penceresini, dışa aktarma menüsünü, onay penceresini ve başarı/hata bildirimlerini örnekler. |

### `web-app/src/pages/ui-gallery/ChemistrySection.tsx`
Galerinin "Kimya bileşenleri" bölümü: her aileden ve her hâlden element karoları ve kimyasal formüller.

| Fonksiyon | Ne yapar |
|---|---|
| `TILES` / `FORMULAS` (veri) | On bir ailenin her birinden örnek element (kütlesiyle) ve alt simge, katsayı, iyon yükü örnekleri içeren formüller (H₂O, aspirin, Ca(OH)₂, göztaşı, sülfat, amonyum). |
| `ChemistrySection()` | Tıklanınca seçilen (`pressed` ile aç-kapa düğmesi olan) element karolarını, seçili/filtre dışı/değersiz/bağlantı hâllerini, formül gösterimlerini ve adların gizlendiği yoğun küçük karo ızgarasını örnekler. |

### `web-app/src/pages/ui-gallery/CodeSection.tsx`
Galerinin "Kod ve bağlantılar" bölümü.

| Fonksiyon | Ne yapar |
|---|---|
| `IRON_RESPONSE` / `SAMPLES` (veri) | `jsonSource` ile biçimlenmiş örnek Demir yanıtı ve aynı uç için curl, JavaScript ve Python örnekleri. |
| `CodeSection()` | Renklendirilmiş JSON kod bloğunu, dil sekmeli örnekleri, dış bağlantıları ve adres kopyalama düğmesini örnekler. |

### `web-app/src/pages/ui-gallery/DataSection.tsx`
Galerinin "Veri ve gezinme" bölümü.

| Fonksiyon | Ne yapar |
|---|---|
| `IRON_FACTS` / `ENDPOINTS` (veri) | Demir için örnek anahtar-değer satırları ve dört v2 ucunu listeleyen örnek tablo satırları. |
| `DataSection()` | Ekmek kırıntısı yolunu, anahtar-değer listesini, açılır bölümleri, uç tablosunu ve iç ile dış bağlantı kartlarını örnekler. |

### `web-app/src/pages/ui-gallery/FeedbackSection.tsx`
Galerinin "Durumlar ve ölçüler" bölümü.

| Fonksiyon | Ne yapar |
|---|---|
| `FeedbackSection()` | Beş tonda uyarıları (bilgi, başarı, uyarı, tehlike, nötr), boş durumu, içerik biçimli yükleniyor iskeletini, istatistik kutularını, halka ve çubuk ilerleme göstergelerini örnekler. |

### `web-app/src/pages/ui-gallery/FormsSection.tsx`
Galerinin "Formlar ve filtreler" bölümü.

| Fonksiyon | Ne yapar |
|---|---|
| `SAMPLE_ELEMENTS` / `LENSES` / `FAMILY_FILTERS` (veri) | Türkçe harfli örnek element adları, mercek seçenekleri ve renkli aile süzgeçleri. |
| `FormsSection()` | Hata ve ipucu bağlı alanları (e-postada nokta yoksa hata), seçim kutusunu ve metin alanını, Türkçe harf katlayan canlı aramayı ("cinko" Çinko'yu bulur), tekli ve çoklu çip gruplarını, bölümlü seçicileri ve iki tür sekmeyi örnekler. |

### `web-app/src/pages/ui-gallery/FoundationsSection.tsx`
Galerinin "Temeller" bölümü: tasarım jetonları.

| Fonksiyon | Ne yapar |
|---|---|
| `surfaces` / `inks` / `accents` / `families` / `radii` / `shadows` (veri) | Yüzey, mürekkep, vurgu ve durum renkleri, element aile renkleri (uygulamanın `categoryLabels` adları ve `familyColor` ile, artı "Bilinmiyor"), köşe yarıçapları ve gölge jetonlarının listeleri. |
| `FoundationsSection()` | Yüzeyleri, metin renklerini, vurgu (kuprit) ve durum renklerini, aile renklerini, yazı ölçeğini (Bricolage Grotesque, Geist, Geist Mono), köşe yarıçaplarını ve gölgeleri örnekler. |

**Bileşenler.** Aşağıdaki dosyalar ortak arayüz parçaları (`components/ui`) ve özellik klasörlerindeki bileşenlerdir (landing, periodic, detail, reference, lab, notebook, auth, commerce, developer, system-guide), ardından derleme betikleri.

### `web-app/src/components/ui/badge.tsx`
Sayı, durum ve etiket göstermek için küçük rozet ilkeli (primitive).

| Fonksiyon | Ne yapar |
|---|---|
| `badgeVariants` (cva) | Rozetin ortak sınıflarını ve `default`, `secondary`, `outline`, `ghost`, `link`, `success`, `warning`, `info`, `destructive` tonlarını üretir. |
| `Badge({ variant, asChild, ...props })` | Seçilen tonla bir `<span>` (ya da `asChild` ile alt öğe) çizer ve `data-variant` işaretini koyar. |

### `web-app/src/components/ui/breadcrumb.tsx`
"Tablo › Demir" gibi konum izini (breadcrumb) çizer; son adım geçerli sayfadır.

| Fonksiyon | Ne yapar |
|---|---|
| `Breadcrumb({ items, className })` | `to` alanı olan ve son olmayan adımları router bağlantısı, son adımı `aria-current="page"` metni yapar; aralarına ok simgesi koyar. |

### `web-app/src/components/ui/button.tsx`
Uygulamanın tek düğme ilkeli: ton ve boyut varyantları.

| Fonksiyon | Ne yapar |
|---|---|
| `buttonVariants` (cva) | `default`, `outline`, `secondary`, `ghost`, `link`, `destructive`/`danger`, `plain` tonlarını ve `xs`…`lg`, `icon*` boyutlarını üretir; `link` tonunda düğme kutusunu kaldırır. |
| `Button({ variant, size, asChild, ...props })` | Stilleri bir `<button>` üzerine ya da `asChild` ile alt öğeye (ör. router `Link`) uygular; `data-variant` ve `data-size` işaretlerini koyar. |

### `web-app/src/components/ui/chip-group.tsx`
Filtreler için tekli ya da çoklu seçimli çip (toggle) grubu.

| Fonksiyon | Ne yapar |
|---|---|
| `ChipContent({ option })` | Bir çipin içini çizer: isteğe bağlı renk noktası, etiket ve sayı. |
| `ChipGroup(props)` | Radix `ToggleGroup` ile çipleri dizer; `single` türünde etkin çipe yeniden tıklamak seçimi `null` yapar, `multiple` türünde seçili değerlerin dizisini verir; ok tuşlarıyla gezilir. |

### `web-app/src/components/ui/classes.ts`
Birden çok ilkelin paylaştığı sınıf metinlerini (`controlClass`, `overlayClass`, `modalPanelClass`, `overlayCloseClass`, `modalTitleClass`) ve `Tone` türüyle ton başına kutu, simge rengi ve simgeyi veren `toneStyles` haritasını dışa verir (fonksiyon yok).

### `web-app/src/components/ui/code-block.tsx`
Kopyalama düğmeli, salt okunur kod paneli; tek parça ya da dil sekmeli örnekler.

| Fonksiyon | Ne yapar |
|---|---|
| `CodeBody({ code, language })` | Kodu kaydırılabilir `<pre>` içinde gösterir; dil `json` ise `highlightJson` ile renklendirir (sonucu `useMemo` ile saklar). |
| `CodeBlock({ code, samples, language, title, maxHeight, className })` | `samples` yoksa başlıklı ve kopyalama düğmeli tek panel, varsa Radix sekmeleriyle (curl, JavaScript, Python gibi) her örneği ayrı sekmede gösterir; kopyalama düğmesi etkin örneği kopyalar. |

### `web-app/src/components/ui/confirm-dialog.tsx`
"Emin misiniz?" onay penceresi (`role="alertdialog"`).

| Fonksiyon | Ne yapar |
|---|---|
| `ConfirmDialog({ title, description, children, onConfirm, tone, confirmDisabled, trigger, open, onOpenChange })` | Odak "Vazgeç" düğmesinde başlar, Escape iptal eder, dış tıklama yok sayılır; kontrollü ya da kontrolsüz açılabilir, `tone="danger"` onay düğmesini kırmızı yapar. |
| `setOpen(next)` | İç açık durumunu günceller ve `onOpenChange` geri çağrısına haber verir. |
| `confirm(event)` | `onConfirm`'u çalıştırır; promise dönerse pencereyi açık tutup dönen bir simge gösterir, başarıda kapatır, ret gelirse açık bırakır. |

### `web-app/src/components/ui/copy-button.tsx`
Bir metni panoya kopyalayan simge düğmesi.

| Fonksiyon | Ne yapar |
|---|---|
| `CopyButton({ value, label, showLabel, className })` | Tıklanınca değeri kopyalar, simgeyi onay işaretine çevirir ve sonucu ekran okuyucuya duyurur. |
| `copy()` | `navigator.clipboard.writeText` çağırır; tarayıcı izin vermezse "Kopyalanamadı" bildirimi gösterir. |
| (zamanlayıcı effect'i) | "Kopyalandı" durumunu `COPIED_MS` (1600 ms) sonra sıfırlar. |

### `web-app/src/components/ui/dialog.tsx`
Radix Dialog üzerine kurulu, ortalanmış kalıcı pencere (modal) parçaları.

| Fonksiyon | Ne yapar |
|---|---|
| `Dialog(props)` | Radix kökünü `data-slot` işaretiyle sarar. |
| `DialogTrigger(props)` | Pencereyi açan öğeyi sarar. |
| `DialogPortal(props)` | Pencereyi belgenin sonuna taşıyan portalı sarar. |
| `DialogOverlay({ className })` | Arkadaki karartılmış katmanı `overlayClass` ile çizer. |
| `DialogContent({ showCloseButton, closeLabel, ... })` | Portal, karartma ve ortalanmış paneli bir arada çizer; istenirse köşeye kapatma düğmesi koyar (Escape ve dış tıklama da kapatır). |
| `DialogHeader({ className })` | Başlık ve açıklama için dikey düzen kutusu. |
| `DialogFooter({ showCloseButton, ... })` | Eylem satırı: telefonda düğmeleri alt alta, `sm` üstünde sağa yaslar; istenirse "Kapat" düğmesi ekler. |
| `DialogTitle({ className })` | Pencere başlığını `modalTitleClass` ile çizer. |
| `DialogDescription({ className })` | Pencere açıklamasını ikincil metin rengiyle çizer. |

### `web-app/src/components/ui/disclosure.tsx`
Aç/kapa (göster/gizle) bölüm parçaları.

| Fonksiyon | Ne yapar |
|---|---|
| `Disclosure(props)` | Radix `Collapsible` kökünü sarar. |
| `DisclosureTrigger({ children, className })` | Tam genişlikte, açıldığında dönen ok simgeli tetik satırını çizer. |
| `DisclosureContent({ className })` | Yüksekliği açılıp kapanırken canlandırılan gövdeyi çizer. |

### `web-app/src/components/ui/dropdown-menu.tsx`
Radix DropdownMenu üzerine kurulu açılır menü parçaları.

| Fonksiyon | Ne yapar |
|---|---|
| `DropdownMenu(props)` | Menü kökünü sarar. |
| `DropdownMenuTrigger(props)` | Menüyü açan öğeyi sarar. |
| `DropdownMenuContent({ sideOffset, className })` | Portala taşınan, klavyeyle gezilen, Escape ile kapanan yüzen paneli tetiğe 6 px uzaklıkta çizer. |
| `DropdownMenuItem({ className })` | Menü satırını çizer; gezinme için `asChild` ile router `Link` alabilir. |
| `DropdownMenuLabel({ className })` | Menü içindeki küçük grup başlığını çizer. |
| `DropdownMenuSeparator({ className })` | Menü satırları arasına ince çizgi koyar. |

### `web-app/src/components/ui/element-tile.tsx`
Periyodik tablo hücresi: atom numarası, sembol, ad ve isteğe bağlı değer; aile rengiyle boyanır (`ElementFamily` türünü de dışa verir).

| Fonksiyon | Ne yapar |
|---|---|
| `ElementTile({ symbol, atomicNumber, name, family, value, selected, pressed, dimmed, missing, to, onClick, tabIndex, label })` | `to` varsa router bağlantısı (`selected` iken `aria-current`), `onClick` varsa düğme (`pressed` verilirse aç-kapa düğmesi, `aria-pressed`), yoksa `<div>` çizer. Zemin aile renginin (`familyColor`) %20'si, üzerine gelince %28'i; atom numarası ve ad `text-ink-2` ile en az 5,5:1 kontrast tutar. Değer varsa 4:5 oranına geçer, seçili, soluk ve eksik durumlarını stillendirir, `tabIndex`'i (gezici Tab durağı) iletir ve testler için `data-symbol` koyar. |

### `web-app/src/components/ui/empty-state.tsx`
"Burada bir şey yok" durumu: simge, başlık, kısa metin ve eylemler kesik çizgili panelde.

| Fonksiyon | Ne yapar |
|---|---|
| `EmptyState({ icon, title, children, actions, titleAs, size, className })` | İçeriği ortalar; `size="page"` tam sayfa durumları (404) için daha geniş boşluk ve büyük başlık kullanır, başlık seviyesi `titleAs` ile seçilir. |

### `web-app/src/components/ui/external-link.tsx`
Başka siteye giden bağlantı.

| Fonksiyon | Ne yapar |
|---|---|
| `ExternalLink({ href, variant, children, className })` | Yeni sekmede `noopener noreferrer` ile açar, ok simgesi ekler ve ekran okuyucuya "yeni sekmede açılır" der; `inline` varyantı bağlantı rengi verir. |

### `web-app/src/components/ui/field-context.ts`
`Field` ile içindeki form denetimi arasında id ve aria özniteliklerini taşıyan bağlam.

| Fonksiyon | Ne yapar |
|---|---|
| `FieldContext` | `Field`'ın denetime verdiği `id`, `aria-describedby`, `aria-invalid` ve `required` değerlerini taşıyan React bağlamı. |
| `useFieldControl()` | Çevreleyen `Field`'ın özniteliklerini, dışarıdaysa boş nesneyi döndürür; denetimler bunu kendi prop'larından önce yayar, böylece açık prop'lar kazanır. |

### `web-app/src/components/ui/field.tsx`
Form satırı: etiket, denetim, ipucu ve hata metni.

| Fonksiyon | Ne yapar |
|---|---|
| `Field({ label, hint, error, required, labelAction, children })` | `useId` ile kimlik üretir, `htmlFor`, `aria-describedby` ve `aria-invalid` bağlantılarını `FieldContext` üzerinden denetime verir; zorunluysa yıldız, hata varsa uyarı simgeli mesaj gösterir. |

### `web-app/src/components/ui/formula.tsx`
Kimyasal formülü atom sayıları alt simge, yük üst simge olacak şekilde yazar.

| Fonksiyon | Ne yapar |
|---|---|
| `Formula({ value, charge, className })` | Formülü (`charge` verilmişse `^yük` ekleyerek) `formulaParts` ile parçalar ve her parçayı `<sub>`, `<sup>` ya da düz metin olarak çizer. |

### `web-app/src/components/ui/input.tsx`
Metin girişi ilkeli.

| Fonksiyon | Ne yapar |
|---|---|
| `Input({ className, type, ...props })` | `controlClass` stiliyle `<input>` çizer; bir `Field` içindeyse id, açıklama ve geçersizlik özniteliklerini kendiliğinden alır. |

### `web-app/src/components/ui/key-value.tsx`
İnce çizgilerle ayrılmış etiket/değer satırlarından oluşan tanım listesi.

| Fonksiyon | Ne yapar |
|---|---|
| `KeyValue({ items, columns, className })` | Her öğeyi `<dt>`/`<dd>` satırı olarak çizer, varsa değerin altına küçük not koyar; `columns={2}` ile `md` üstünde iki sütuna geçer. |

### `web-app/src/components/ui/link-card.tsx`
Simge, başlık, açıklama ve oktan oluşan, tamamı tıklanabilir gezinme kartı.

| Fonksiyon | Ne yapar |
|---|---|
| `LinkCard({ to, href, icon, title, description, meta, className })` | `to` varsa uygulama içi router bağlantısı (sağ ok), yoksa `href` ile yeni sekmede açılan dış bağlantı (çapraz ok ve "yeni sekmede açılır" notu) çizer; isteğe bağlı küçük `meta` satırı ekler. |

### `web-app/src/components/ui/native-select.tsx`
`Input` gibi stillendirilmiş, tarayıcının kendi `<select>` denetimi.

| Fonksiyon | Ne yapar |
|---|---|
| `NativeSelect({ size, className, ...props })` | `controlClass` ile `<select>` çizer, sağına ok simgesi koyar; `size="sm"` daha alçak sürüm verir ve `Field` içindeyse id ile aria özniteliklerini alır. |
| `NativeSelectOption({ className })` | Koyu yüzey renkli `<option>` çizer (tarayıcı açılır listeleri çoğu CSS'i yok saydığı için). |
| `NativeSelectOptGroup({ className })` | Koyu yüzey renkli `<optgroup>` çizer. |

### `web-app/src/components/ui/notice.tsx`
Ton simgeli satır içi mesaj kutusu (bilgi, başarı, uyarı, hata, nötr).

| Fonksiyon | Ne yapar |
|---|---|
| `Notice({ tone, title, children, action, role, className })` | `toneStyles` ile kutu rengini ve simgeyi seçer; `role` verilmezse `danger` için `alert`, diğerleri için `status` kullanır; sağda isteğe bağlı eylem gösterir. |

### `web-app/src/components/ui/page-header.tsx`
Her sayfanın üst kısmı: küçük üst etiket, tek `h1`, giriş metni, eylemler ve isteğe bağlı yan sütun.

| Fonksiyon | Ne yapar |
|---|---|
| `PageHeader({ eyebrow, title, lead, actions, aside, breadcrumb, className })` | Sayfanın tek `h1` başlığını çizer; `lg` üstünde `aside` içeriğini (Stat, ProgressRing gibi) sağ sütuna, `breadcrumb`'ı en üste koyar. |

### `web-app/src/components/ui/progress-ring.tsx`
Ortasında yüzde ya da özel içerik bulunan dairesel ilerleme göstergesi (`role="progressbar"`).

| Fonksiyon | Ne yapar |
|---|---|
| `ProgressRing({ value, max, size, thickness, label, children, className })` | Değeri 0–100 yüzdeye sıkıştırır, SVG çemberinin `strokeDashoffset` değeriyle dolu kısmı çizer ve ortada `%n` (ya da `children`) gösterir. |

### `web-app/src/components/ui/progress.tsx`
İnce yatay ilerleme çubuğu.

| Fonksiyon | Ne yapar |
|---|---|
| `Progress({ value, max, style, className })` | Radix `Progress` üzerinde değeri yüzdeye çevirip `--progress` CSS değişkeniyle göstergenin genişliğini ayarlar. |

### `web-app/src/components/ui/search-field.tsx`
Baştaki büyüteç, gizli etiket, temizleme düğmesi ve canlı sonuç sayısı olan arama kutusu.

| Fonksiyon | Ne yapar |
|---|---|
| `SearchField({ value, onValueChange, label, resultCount, formatCount, onKeyDown, ... })` | Kontrollü `type="search"` girişi çizer; arama doluysa ve `resultCount` verilmişse sayıyı kutunun içinde gösterip `aria-live` ile duyurur; Escape ile temizler. |
| `clear()` | Değeri boşaltır ve odağı yeniden kutuya verir. |

### `web-app/src/components/ui/section.tsx`
`h2` başlıklı sayfa bölümü; bölümler arası dikey boşluğu da o yönetir.

| Fonksiyon | Ne yapar |
|---|---|
| `Section({ title, eyebrow, description, actions, id, className, children })` | `aria-labelledby` ile başlığa bağlı `<section>` çizer; başlığın yanına sağa yaslı eylemler koyar ve `id` ile sayfa içi bağlantılara hedef olur. |

### `web-app/src/components/ui/segmented.tsx`
2–4 seçenekli, birbirini dışlayan görünüm anahtarı (radyo grubu).

| Fonksiyon | Ne yapar |
|---|---|
| `Segmented({ label, options, value, onValueChange, size, className })` | Radix `RadioGroup` ile seçenekleri dizer; seçili seçeneğin arkasındaki göstergeyi framer-motion `layoutId` ile yaylı animasyonla kaydırır; ok tuşları hem gezer hem seçer. |

### `web-app/src/components/ui/sheet.tsx`
Ekran kenarına yapışık panel (mobil menü, filtreler); Radix Dialog üzerine kuruludur.

| Fonksiyon | Ne yapar |
|---|---|
| `Sheet(props)` | Panel kökünü sarar. |
| `SheetTrigger(props)` | Paneli açan öğeyi sarar. |
| `SheetPortal(props)` | Paneli belgenin sonuna taşıyan portalı sarar. |
| `SheetOverlay({ className })` | Arkadaki karartmayı `overlayClass` ile çizer. |
| `SheetContent({ side, showCloseButton, className, children })` | `sideClass` haritasına göre sağ, sol, üst ya da alt kenardan kayarak açılan paneli çizer; istenirse köşeye kapatma düğmesi koyar. |
| `SheetTitle({ className })` | Panel başlığını çizer. |

### `web-app/src/components/ui/skeleton.tsx`
Yüklenirken gösterilen yer tutucu.

| Fonksiyon | Ne yapar |
|---|---|
| `Skeleton({ className })` | Nabız gibi yanıp sönen, yardımcı teknolojilerden gizli (`aria-hidden`) bir kutu çizer; şekli içeriğe göre sınıfla verilir. |

### `web-app/src/components/ui/stat.tsx`
Tek bir ölçüm (etiket, büyük sayı, birim, not, ilerleme) ve bunların ızgarası.

| Fonksiyon | Ne yapar |
|---|---|
| `Stat({ label, value, unit, hint, progress, variant, size, className })` | Kendi `<dl>` öğesini çizer; `panel` varyantı çerçeveli kutu, `plain` çıplak sürümdür; `progress` verilirse altına `Progress` çubuğu koyar. |
| `StatGrid({ children, columns, className })` | Telefonda iki, `md` üstünde 2/3/4 sütunlu `Stat` ızgarası kurar. |

### `web-app/src/components/ui/table.tsx`
Yatay kaydırılabilir çerçevede veri tablosu parçaları.

| Fonksiyon | Ne yapar |
|---|---|
| `Table({ className })` | `<table>`'ı yatay taşmada kayan bir kutuya sarar. |
| `TableHeader({ className })` | `<thead>` çizer ve satırların altına kalın çizgi koyar. |
| `TableBody({ className })` | `<tbody>` çizer; son satırın çizgisini kaldırır. |
| `TableRow({ className })` | Üzerine gelinince ve `data-state="selected"` iken renk değiştiren `<tr>` çizer. |
| `TableHead({ className })` | Küçük, soluk yazılı başlık hücresi çizer. |
| `TableCell({ className })` | Veri hücresi çizer; ilk ve son hücrenin kenar boşluğunu sıfırlar. |

### `web-app/src/components/ui/tabs.tsx`
Radix Tabs üzerine kurulu sekme parçaları.

| Fonksiyon | Ne yapar |
|---|---|
| `Tabs({ orientation, className })` | Sekme kökünü yatay ya da dikey düzenle çizer. |
| `tabsListVariants` (cva) | Sekme listesinin `default` (hap biçimli iz) ve `line` (alt çizgili) varyantlarını üretir. |
| `TabsList({ variant, className })` | Sekme düğmelerinin listesini seçilen varyantla çizer. |
| `TabsTrigger({ className })` | Tek sekme düğmesi; `default` listede etkin sekmeye dolgu, `line` listede alt çizgi verir. |
| `TabsContent({ className })` | Etkin sekmenin içerik alanını çizer. |

### `web-app/src/components/ui/textarea.tsx`
İçeriğe göre büyüyen çok satırlı metin girişi.

| Fonksiyon | Ne yapar |
|---|---|
| `Textarea({ className })` | `controlClass` ve `field-sizing-content` ile `<textarea>` çizer; `Field` içindeyse id ve aria özniteliklerini alır. |

### `web-app/src/components/ui/toast.ts`
Bildirim (toast) kuyruğunu React dışında tutan küçük depo; aynı anda en fazla 3 bildirim görünür.

| Fonksiyon | Ne yapar |
|---|---|
| `DEFAULT_DURATION` | Tona göre varsayılan görünme süresi: nötr, bilgi ve başarı 3,2 sn, uyarı 8 sn, hata kapatılana kadar (`Infinity`). |
| `publish(next)` | Listeyi değiştirir, listeden düşen bildirimlerin zamanlayıcılarını temizler ve abonelere haber verir. |
| `runCountdown(id, countdown)` | Kalan süre kadar bir zamanlayıcı kurar; süre bitince bildirimi kapatır. |
| `toast(message, options)` | Yeni bildirimi tonu, açıklaması ve süresiyle kuyruğa ekler (en eski fazlalık düşer) ve kimliğini döndürür. |
| `dismissToast(id)` | Bildirimi süresi dolmadan kaldırır. |
| `holdToast(id, held)` | Üzerine gelinen ya da odaklanılan bildirimin zamanlayıcısını durdurur; bırakılınca en az `MIN_AFTER_HOLD` (1,5 sn) kalacak şekilde yeniden başlatır. |
| `subscribeToToasts(listener)` | `useSyncExternalStore` için abone ekler ve aboneliği bitiren fonksiyonu döndürür. |
| `getToasts()` | Geçerli bildirim listesini (değişene kadar aynı referans) döndürür. |

### `web-app/src/components/ui/toaster.tsx`
`toast()` mesajlarını sağ altta (telefonda alt ortada) gösteren genel canlı bölge; bir kez bağlanır.

| Fonksiyon | Ne yapar |
|---|---|
| `ToastCard({ item })` | Tek bildirimi simgesi, metni ve kapatma düğmesiyle canlandırarak çizer; işaretçi üstündeyken ya da odak içindeyken `holdToast` ile süresini durdurur. |
| `syncHold()` (`ToastCard` içinde) | Fare ya da odak durumundan birinin sürmesine göre bekletmeyi açar veya kapatır. |
| `Toaster()` | `useSyncExternalStore` ile kuyruğa abone olur ve bildirimleri `AnimatePresence` ile giriş/çıkış animasyonlu listeler. |

### `web-app/src/components/landing/ApiFeature.tsx`
Açılış sayfasının açık API bölümü: v2 API'nin sundukları ve gerçek bir istek/yanıt çifti.

| Fonksiyon | Ne yapar |
|---|---|
| `ApiFeature()` | `FeatureSection` içinde örnek `GET` adresini (yalnız `?` ve `,` sonrasında satır kırılacak şekilde) kopyalama düğmesiyle, `API_SAMPLE_RESPONSE`'u renkli JSON olarak gösterir; `FACTS` listesini (anahtar gerekmez, alan seçimi, ETag, Türkçe adlar) ve `/developers`, `/docs` bağlantılarını ekler. |

### `web-app/src/components/landing/apiSample.ts`
Açılış sayfasındaki API örneğinin alanlarını (`API_SAMPLE_FIELDS`), bunlardan kurulan `/api/v2/elements/fe?fields=…` yolunu (`API_SAMPLE_PATH`) ve beklenen gövdeyi (`API_SAMPLE_RESPONSE`, testler veri snapshot'ıyla karşılaştırır) dışa verir (fonksiyon yok).

### `web-app/src/components/landing/ClosingBand.tsx`
Açılış sayfasının kapanış çağrısı: başlamak için iki yer, tek çerçeveli şeritte.

| Fonksiyon | Ne yapar |
|---|---|
| `ClosingBand()` | `coverage.json`'dan hücre ve bileşik sayılarını gösterir, "Bir elementle başla" başlığı altında `/periodic` ve `/collection` düğmelerini `Reveal` ile canlandırarak çizer. |

### `web-app/src/components/landing/CoverageBand.tsx`
Veri kapsamı rakamları şeridi; sayılar `data/coverage.json`'dan okunduğu için gönderilen veriden hiç sapmaz.

| Fonksiyon | Ne yapar |
|---|---|
| `CoverageBand()` | `FIGURES` listesindeki element, bileşik, fotoğraf ve yapı görseli sayılarını büyük `Stat` kutuları olarak dizer; kaynakları, alım tarihini ve `/data` bağlantısını altına yazar. |

### `web-app/src/components/landing/FeatureSection.tsx`
Açılış sayfasındaki tek bir özellik bölümü: metin ve görsel asimetrik iki sütunda.

| Fonksiyon | Ne yapar |
|---|---|
| `FeatureSection({ eyebrow, title, children, actions, media, mediaFirst, className })` | Telefonda metni üste, `lg` üstünde metin ve görseli yan yana koyar (`mediaFirst` ile görsel sola geçer, bölümler zikzak dizilir); uzun görselin yanında metni yapışık (sticky) tutar ve iki yarıyı sırayla `Reveal` ile gösterir. |

### `web-app/src/components/landing/LabFeature.tsx`
Laboratuvar özellik bölümü: tezgâh fotoğrafı ve bir denemenin üç adımı.

| Fonksiyon | Ne yapar |
|---|---|
| `LabFeature()` | Tezgâh fotoğrafını, `STEPS` listesindeki "Sürükle, Oranı ayarla, Dene" adımlarını numaralı olarak, `/lab` düğmesini ve bunun gerçek deney tarifi olmadığını söyleyen notu çizer. |

### `web-app/src/components/landing/LandingHero.tsx`
Açılış sayfasının giriş bölümü; sayfanın tek `h1` başlığı buradadır.

| Fonksiyon | Ne yapar |
|---|---|
| `LandingHero()` | "Atomdan bileşiğe." sloganını, `coverage.json` sayılarıyla tek cümlelik tanımı, `/periodic` ve `/lab` düğmelerini ve markaya rengini veren kuprit (Cu₂O) kristali fotoğrafını öncelikli yükleyerek çizer. |

### `web-app/src/components/landing/NotebookFeature.tsx`
Defter ve öğrenme rotaları bölümü.

| Fonksiyon | Ne yapar |
|---|---|
| `NotebookFeature()` | `data/lessons.json`'daki gerçek rota listesini numara, başlık, açıklama ve keşif sayısıyla dizer (her satır `/lab?lesson=<id>` açar); defterin tarayıcıda durduğunu ve JSON yedeğini anlatır, `/collection` ve `/nasil` bağlantılarını ekler. |

### `web-app/src/components/landing/Reveal.tsx`
İçeriği ilk kez görünür alana girdiğinde yumuşakça belirginleştiren sarmalayıcı.

| Fonksiyon | Ne yapar |
|---|---|
| `Reveal({ children, delay, className })` | framer-motion ile içeriği bir kez, %20'si göründüğünde aşağıdan yukarı solarak getirir; kullanıcı azaltılmış hareket tercih ediyorsa animasyonsuz çizer. |

### `web-app/src/components/landing/TableFeature.tsx`
Periyodik tablo özellik bölümü: bir kaydın içerdikleri ve tablonun canlı bir satırı.

| Fonksiyon | Ne yapar |
|---|---|
| `PERIOD_FOUR` | `STATIC_ELEMENTS` içinden 4. periyodu (K → Kr) süzer; neredeyse her aileyi kesen gerçek bir satırdır. |
| `TableFeature()` | Kaydın içeriğini anlatan metni, `/periodic` ve `/compounds` bağlantılarını ve 4. periyodun her hücresi element sayfasına giden `ElementTile` satırını çizer. |

### `web-app/src/components/periodic/ElementCards.tsx`
Kart görünümü: filtreye uyan elementler, adlarını gösterecek kadar büyük kutular hâlinde akan ızgarada (telefonda varsayılan görünüm).

| Fonksiyon | Ne yapar |
|---|---|
| `ElementCards({ elements, readingOf, valueLabel, selected, onOpen, gridProps })` | Her eşleşen element için bir `ExplorerTile` çizer; `tabStopSymbol` ile ızgaranın tek Tab durağını seçer ve `useTileNavigation`'dan gelen olay işleyicilerini ızgara kutusuna yayar. |

### `web-app/src/components/periodic/ElementPreviewDialog.tsx`
Tek bir elementin kalıcı pencere önizlemesi: özet, temel bilgiler, kayıt sayfasıyla aynı görsel alanı (`AtlasVisual`) ve tam kayda bağlantı.

| Fonksiyon | Ne yapar |
|---|---|
| `ElementPreviewDialog({ element, open, onOpenChange, onReturnFocus })` | `Dialog` içinde önizlemeyi açar; kapanınca odağı varsayılan yere değil, `onReturnFocus` ile pencereyi açan hücreye geri verir. |
| `PreviewBody({ element })` | `useScience` ile bilimsel kaydı yükler; Türkçe ve İngilizce adı, editoryal özeti, temel bilgileri, "Tam kaydı aç" bağlantısını ve `AtlasVisual`'ı (fotoğraf ya da kabuk şeması; element değişince `key` ile sıfırlanır) çizer; yükleme başarısızsa "Yeniden dene" düğmeli uyarı gösterir. |
| `facts(record)` | Atom kütlesi, standart hâl, elektronegatiflik (Pauling), elektron dizilimi, erime noktası ve yoğunluk satırlarını üretir; kayıt yüklenirken değer yerine iskelet koyar. |

### `web-app/src/components/periodic/ElementSpecimen.tsx`
Seçili element için büyük, süs amaçlı hücre (numara, sembol, kütle); üst öğenin `--family` rengiyle boyanır.

| Fonksiyon | Ne yapar |
|---|---|
| `ElementSpecimen({ element, mass, className })` | Kare hücreyi çizer, kütle yoksa "—" yazar; aynı bilgiler yanında metin olarak bulunduğu için yardımcı teknolojilerden gizlenir. |

### `web-app/src/components/periodic/ExplorerTile.tsx`
Tablo gezgininin tek hücresi: etkin lensin boyadığı bir `ElementTile`; tıklama ya da Boşluk önizlemeyi açar.

| Fonksiyon | Ne yapar |
|---|---|
| `ExplorerTile({ element, reading, valueLabel, selected, tabStop, dimmed, onOpen, className, style, tileClassName })` | Lens rengini `--lens-edge` ve `--lens-fill` değişkenleriyle sarmalayıcıya koyar (lens boyamıyorsa `ElementTile`'ın aile tonu kalır); hücreye uzun bir erişilebilir ad verir ("Demir, Fe, atom numarası 26, Atom kütlesi: 55,85, filtreye uymuyor; önizle, Enter ile kaydı aç"; aile lensinde değer okunmaz); gezici Tab durağını `tabIndex` ile verir; `xl` üstünde odaklanan hücreyi yapışık araç çubuğunun altında durduran kaydırma payını ekler (başlığın payını sayfanın `scroll-padding-top`'u verir). |

### `web-app/src/components/periodic/ExplorerToolbar.tsx`
Gezgin denetimleri: canlı sayaçlı arama, renk lensi, tablo/kart anahtarı ve aynı zamanda çoklu filtre olan aile göstergesi.

| Fonksiyon | Ne yapar |
|---|---|
| `FAMILY_OPTIONS` | `FAMILIES` listesini Türkçe ad ve aile rengiyle (`familyColor`) çip seçeneklerine çevirir. |
| `ExplorerToolbar({ query, onQueryChange, onSearchSubmit, matchCount, lens, onLensChange, view, onViewChange, families, onFamiliesChange, onClear })` | Arama kutusunda Enter'ı `onSearchSubmit`'e bağlar ve sayacı "n / 118" biçiminde gösterir; lens çipinin seçimi kaldırılınca `category`'ye döner; filtre varsa sayı durumunu ve "Temizle" düğmesini gösterir; `xl` üstünde site başlığının altında yapışık durur. |

### `web-app/src/components/periodic/lenses.ts`
Periyodik tablonun renk lensleri (aile, atom kütlesi, elektronegatiflik, fiziksel hâl) ve bir elementin lens altındaki okunuşu.

| Fonksiyon | Ne yapar |
|---|---|
| `LENS_OPTIONS` | Araç çubuğundaki lens çiplerinin değer ve etiketleri. |
| `LENS_VALUE_LABEL` | Her değer lensinin hücrede yazdığı değerin adı; aile lensi yalnız renk verir, değer yazmaz. |
| `NUMERIC_LENSES` | Sayısal lenslerin birimini ve kayıttan değeri okuyan fonksiyonunu tutar (kütle `u`, elektronegatiflik Pauling). |
| `PHASES` | Hâl lensinin renkleri: katı nötr, sıvı ve gaz öne çıkar. |
| `phaseLabel(state)` | Standart hâlin Türkçe adını döner ("solid" → "Katı"); bilinmiyorsa "Bilinmiyor". |
| `isNumericLens(lens)` | Lensin sayısal ölçekle boyayıp boyamadığını söyler. |
| `formatLensNumber(value)` | Sayıyı Türkçe ayırıcılarla 4 anlamlı basamağa biçimler (55,85). |
| `tint(color, percent)` | Rengi yüzey rengiyle oklab'da karıştırır; oklch'nin turuncu ve pembeyi yeşile kaydırmasını önler. |
| `heatPaint(position)` | 0–1 konumu için maviden yeşile, oradan turuncuya giden ve açıklığı da artan ısı rengini (`edge`) ve en fazla %28'lik dolguyu (`fill`) üretir. |
| `lensDomain(lens, records)` | Sayısal lensin yüklü kayıtlardaki en küçük ve en büyük değerini döner; değer yoksa ya da lens sayısal değilse `undefined`. |
| `readLens(lens, record, domain)` | Bir elementin lens altında hücrede yazacağı metni, eksik (taralı) olup olmadığını ve boyasını hesaplar; kayıt henüz yüklenmediyse "—" yazar ama taramaz; aile lensinde değer yoktur (`{ missing: false }`). |

### `web-app/src/components/periodic/LensLegend.tsx`
Etkin renk lensinin açıklaması: sayısal renk ölçeği ve aralığı ya da üç hâl rengi, artı eksik veri taraması.

| Fonksiyon | Ne yapar |
|---|---|
| `scaleGradient` | Isı lensi hücrelerinin üst kenarıyla aynı rengi beş noktadan örnekleyen CSS gradyanı. |
| `LensLegend({ lens, domain, className })` | Aile lensinde hiçbir şey çizmez (onun açıklaması aile filtresidir); diğerlerinde değer adı, birim, eksik veri anahtarı ve ölçek ya da hâl renklerini gösterir. |
| `ColorScale({ domain })` | Gradyan çubuğu ve altında en düşük/en yüksek değeri çizer; aralık henüz yoksa iskelet gösterir. |
| `PhaseKey()` | Katı, sıvı ve gaz renk örneklerini listeler. |
| `MissingKey({ label })` | `ElementTile`'ın eksik veri taramasıyla aynı küçük taralı örneği ve etiketini çizer. |

### `web-app/src/components/periodic/model.ts`
Gezginin saf (yan etkisiz) modeli: aileler, filtre, en iyi eşleşme, tablo hücresi ve ok tuşu komşuları.

| Fonksiyon | Ne yapar |
|---|---|
| `FAMILIES` | Aile filtresi anahtarları, gösterge sırasıyla (`categoryLabels` anahtarları). |
| `elementMatches(element, query, families, englishName)` | Element seçili ailelerden birindeyse (hiç seçili değilse hepsi) ve her arama kelimesi sembol, Türkçe ad, atom numarası ya da İngilizce adda geçiyorsa true döner. |
| `bestMatch(query, matches)` | Arama kutusunda Enter'ın açacağı elementi seçer: tam sembol, Türkçe ad ya da numara eşleşmesi kazanır ("c" → karbon), yoksa ilk eşleşme. |
| `tableCell(element)` | Elementin tablo ızgarasındaki satır ve sütununu hesaplar; eksen satır/sütunu için bir kaydırır ve f-bloğu boşluğun altına indirir. |
| `tabStopSymbol(matches, selected)` | Izgaranın tek Tab durağını seçer: seçili element filtreye uyuyorsa o, değilse ilk eşleşme. |
| `isArrowKey(key)` | Tuşun dört ok tuşundan biri olup olmadığını söyler. |
| `tableNeighbour(candidates, from, key)` | Tabloda ok yönündeki en yakın eşleşen elementi bulur: sol/sağ için aynı satır, yukarı/aşağı için aynı sütun. |
| `cardNeighbour(cards, from, key, columns)` | Kart ızgarasında sol/sağ bir kart, yukarı/aşağı bir satır ilerler; kenarda olduğu yerde kalır. |

### `web-app/src/components/periodic/PeriodicTable.tsx`
Grup ve periyot eksenli, f-bloğu ayrı satırlarda duran 18 sütunlu periyodik tablo.

| Fonksiyon | Ne yapar |
|---|---|
| `PeriodicTable({ elements, matchingSymbols, readingOf, valueLabel, selected, onOpen, gridProps, panel, legend })` | Eksen numaralarını, f-bloğu işaretlerini, geçiş metallerinin üstündeki boş bloğa seçili element panelini ve 1. periyodun boş hücrelerine lens açıklamasını yerleştirir; filtreye uymayan elementleri yerinde soluk bırakır; 59rem'in altında kendi çerçevesinde yatay kayar. |
| `SeriesMarker({ family, label, range, markerRow, row })` | 6. ve 7. periyotta ayrık satırı gösteren kesik çizgili yer tutucu hücreyi ("57–71") ve o satırın "Lantanitler/Aktinitler" etiketini çizer. |

### `web-app/src/components/periodic/SelectedElementPanel.tsx`
Seçili (üzerine gelinen ya da odaklanan) elementin, geçiş metallerinin üstündeki boş blokta gösterilen önizlemesi.

| Fonksiyon | Ne yapar |
|---|---|
| `SelectedElementPanel({ element, className })` | `useScience` ile kaydı yükler; örnek hücreyi, adları, aile/periyot/grup satırını, üç temel bilgiyi, `xl` üstünde özeti ve "Tam kayıt" bağlantısını çizer; element değişince içeriği kısa bir solmayla yeniler, yükleme başarısızsa "Yeniden dene" sunar. |
| `Fact({ label, loading, children })` | Panelin tek etiket/değer çiftini çizer; yüklenirken değer yerine iskelet koyar. |

### `web-app/src/components/periodic/ShellDiagram.tsx`
Bohr tarzı şema: sembollü çekirdek ve her kabuk için bir elektron halkası (ölçekli değildir).

| Fonksiyon | Ne yapar |
|---|---|
| `ShellDiagram({ symbol, shells, className })` | Her kabuk için bir çember ve elektronları eşit açıyla (kabuk başına hafif kaydırarak) dizer, ortaya çekirdeği ve sembolü koyar; renkleri üst öğenin `--family` değişkeninden, o yoksa marka renginden alır (çekirdek dolgusu oklab karışımıdır, sıcak renkler yeşile kaymaz) ve kabuk dağılımını erişilebilir ada yazar. |

### `web-app/src/components/periodic/useTileNavigation.ts`
Tablo ve kart görünümlerinin ortak klavye ve işaretçi davranışı; ızgara kutusundan devredilir, böylece `ElementTile` sade kalır.

| Fonksiyon | Ne yapar |
|---|---|
| `tileSymbol(target)` | Olay hedefinin en yakın `data-symbol` atasından element sembolünü okur. |
| `useTileNavigation({ view, matches, onSelect })` | Izgaraya verilecek `gridProps`'u (ref ve olay işleyicileri) ve `focusTile`'ı döndürür: odak hücreyi hemen seçer, fare ise ancak `HOVER_REST_MS` (120 ms) durunca seçer; oklar eşleşen hücreler arasında gezer, Enter tam kaydı router ile açar. |
| `cancelHover()` | Bekleyen fare seçimi zamanlayıcısını iptal eder. |
| `focusTile(symbol)` | Izgarada o sembollü hücreye odak verir. |
| `cardColumns()` | Kart ızgarasının o anki sütun sayısını hesaplanmış `grid-template-columns` değerinden okur. |
| `gridProps.onFocus` / `onPointerMove` / `onPointerLeave` / `onKeyDown` | Odakta seçer; farede gecikmeli seçim kurar; ayrılınca iptal eder; Enter'da `/element/<sembol>` adresine gider, oklarda görünüme göre `tableNeighbour` ya da `cardNeighbour` ile sonraki hücreye odaklanır. |

### `web-app/src/components/detail/CompoundStructure.tsx`
Yalnız bileşik kayıtlarına ait bölümler: laboratuvar geometri sınıfı ve bir formül birimindeki elementler.

| Fonksiyon | Ne yapar |
|---|---|
| `CompoundStructure({ compound, geometry })` | Geometri biliniyorsa `#geometry` çapalı bölümde `GeometryFigure`'ı gösterir (sözlük buraya bağlanır); `#composition` bölümünde her element için atom sayısını yazan ve element sayfasına giden bir `ElementTile` dizer. |

### `web-app/src/components/detail/DetailToc.tsx`
Kayıt sayfasının "Bu sayfada" dizini: masaüstünde iç içe bağlantılı yapışık sütun, küçük ekranda yatay kayan çip satırı.

| Fonksiyon | Ne yapar |
|---|---|
| `useActiveSection(ids)` | `IntersectionObserver` ile yapışık başlığın hemen altındaki şeritten geçen ilk üst düzey bölümün kimliğini döndürür. |
| `DetailToc({ items, className })` | Bölüm bağlantılarını çizer, etkin olanı `aria-current` ve renkle işaretler; alt bağlantıları (`children`) yalnız masaüstünde girintili gösterir. |

### `web-app/src/components/detail/DeveloperPanel.tsx`
"Bu veriyi projende kullan" bölümü: JSON indirme, herkese açık API kaydı, doküman bağlantısı ve açılır panelde tam JSON.

| Fonksiyon | Ne yapar |
|---|---|
| `DeveloperPanel({ kind, id, record, onDownload })` | "JSON indir", `scienceUrl` ile kurulan API kaydı bağlantısı ve `/docs` düğmelerini dizer; kaydı `jsonSource` ile bir kez metne çevirip (`useMemo`) `GET /api/v2/<tür>/<id>` başlıklı açılır panelde renkli gösterir. |

### `web-app/src/components/detail/properties.ts`
Bilimsel kayıt anahtarlarının Türkçe etiketleri ve özellik bölümlerini hazırlayan saf yardımcılar.

| Fonksiyon | Ne yapar |
|---|---|
| `PROPERTY_LABELS` | Kayıt anahtarlarının Türkçe etiketleri; buradaki üst düzey anahtarlar ayrıntı sayfasında açılır bölüm olur, iç anahtarlar satır etiketi olarak aynı haritayı kullanır. |
| `SECTION_NOTES` | Sayıları kolay yanlış okunan bölümlerin (izotoplar, güvenlik, termodinamik) başına konan okuma notları. |
| `isPopulated(value)` | Değerin en az bir gerçek veri taşıyıp taşımadığını söyler (null, boş metin ya da yalnız boş çocuklar sayılmaz). |
| `propertyLabel(key, parentKey)` | Anahtarın satır etiketini döner; örgü parametrelerindeki `c`'yi Santigrat'tan ayırır, bilinmeyen anahtarda alt çizgileri boşluğa çevirir. |
| `formatPropertyNumber(value, key)` | Sayıyı kaynak hassasiyetini koruyarak (14 anlamlı basamak) Türkçe biçimler; yıl, CID ve "number" ile biten anahtarlarda binlik ayırıcı koymaz. |
| `propertySections(record, showMissing)` | Kaydın etiketli üst düzey bölümlerini kayıt sırasıyla döner; boş olanları yalnız `showMissing` açıkken ekler. |
| `sectionCount(value)` | Bölüm rozetinin metnini üretir: liste için "n kayıt", nesne için dolu yaprak sayısıyla "n değer"; boşsa `null`. |
| `countLeaves(value)` | Bir değerdeki dolu yaprak değerleri sayar (her liste bir sayılır). |
| `sectionMatches(section, query)` | Bölüm başlığı ya da içindeki herhangi bir alan etiketi aramaya (Türkçe katlamalı) uyuyorsa true döner. |
| `nestedLabels(value)` | Bir değerin içindeki tüm alan etiketlerini düz bir listeye toplar. |

### `web-app/src/components/detail/PropertySections.tsx`
"Bilimsel özellikler" bölümü: kaydın her etiketli bölümü boyut rozetli açılır grup olarak, bölüm/alan araması, eksik alan anahtarı ve tümünü aç/kapa ile.

| Fonksiyon | Ne yapar |
|---|---|
| `PropertyDisclosure({ section, open, onOpenChange, showMissing })` | Bir bölümü `h3` başlıklı, rozetli ("n değer" ya da "Veri yok") açılır grup olarak çizer; varsa okuma notunu ve `PropertyValue` içeriğini gösterir. |
| `clickedAnchor(event)` | Değiştirici tuşsuz sol tıklamanın hedefi sayfa içi bir bağlantıysa (`#isotopes`) çapa adını, değilse `null` döner. |
| `PropertySections({ record })` | Filtreyi, eksik alan anahtarını ve açık bölüm kümesini tutar; filtrelerken eşleşen her bölümü açık gösterir ve "Tümünü aç/kapat"ı kapatır; adres `#<bölüm>` ile gelirse ya da aynı çapaya tıklanırsa filtreyi temizleyip o bölümü açar; arama eşleşmezse "Aramayı temizle" düğmeli, hiç veri yoksa "Doğrulanmış özellik verisi yok" boş durumunu gösterir. |
| `reveal(key)` | Filtreyi temizler ve bölümü açar; hedefin kaymaması için filtrenin açık tuttuğu bölümleri de açık bırakır. |
| `onDocumentClick` (`useEffectEvent`) | Belgedeki her tıklamada `clickedAnchor` ile çapayı okur ve kayıtta varsa `reveal` çağırır (URL zaten o çapada olsa bile). |
| `setOpen(key, open)` | Tek bir bölümü açık kümesine ekler ya da çıkarır. |

### `web-app/src/components/detail/PropertyValue.tsx`
Her biçimdeki bilimsel değeri çizer: sayı ya da metin, çip listesi, alt kayıt ızgarası veya iç içe tanım listesi.

| Fonksiyon | Ne yapar |
|---|---|
| `Missing({ children })` | Soluk "Veri yok" (ya da verilen) metnini yazar. |
| `ScalarValue({ value, fieldKey })` | Sayıyı `formatPropertyNumber` ile, mantıksal değeri "Evet/Hayır", adresi "Kaynağı incele" dış bağlantısı, kaynak gösterimli sayıyı ("53.93960899(53)") tek aralıklı yazıyla, diğer metni olduğu gibi yazar. |
| `isScalarList(items)` | Listedeki her öğenin null ya da yalın değer olup olmadığını söyler. |
| `ValueList({ items, fieldKey, showMissing })` | Yalın listeyi çipler hâlinde, nesne listesini (izotoplar, raporlar) iki sütunlu kart ızgarası olarak çizer; boş listede not yazar. |
| `FieldList({ record, fieldKey, showMissing })` | Nesnenin alanlarını tanım listesi olarak çizer; iç içe grupları sol çizgili girintiyle, yalın değerleri etiket/değer satırı olarak gösterir ve boş alanları `showMissing` kapalıyken gizler. |
| `PropertyValue({ value, fieldKey, showMissing })` | Değerin türüne göre `Missing`, `ValueList`, `FieldList` ya da `ScalarValue`'ya yönlendirir; null "Veri yok" demektir, sıfır değil. |

### `web-app/src/components/detail/record.ts`
Ayrıntı sayfasının kayıt yardımcıları: laboratuvar bağlantısı, JSON indirme, kaynaklar ve tarih (`DetailSubject` türünü de dışa verir).

| Fonksiyon | Ne yapar |
|---|---|
| `labHref(subject)` | Element laboratuvarda varsa `/lab?material=<sembol>`, bileşik laboratuvar kataloğundaysa `/lab/formula?compound=<slug>` döner; yoksa `undefined`. |
| `downloadRecord(record)` | Tam kaydı tarayıcıda `<id>.json` olarak indirir ve geçici nesne adresini 1 sn sonra serbest bırakır. |
| `recordSources(record, atlas)` | Kaynak bilgisindeki (provenance) veri kaynaklarını ve editoryal kaynakları birleştirir, aynı adresi bir kez bırakır. |
| `formatRetrievedAt(value)` | ISO tarihini "5 Eylül 2026" biçimine çevirir; başka her şeyde (çevrimdışı katalogdaki "catalog") `null` döner. |

### `web-app/src/components/detail/RecordHero.tsx`
Bilimsel kaydın üst kısmı: konum izi, sembol hücresi ya da formül levhası, ad, aile, özet, temel bilgiler, eylemler ve medya.

| Fonksiyon | Ne yapar |
|---|---|
| `ElectronConfiguration({ value })` | "[Ar]4s2 3d6" gibi dizilimde orbital doluluklarını üst simge yapar ve "(predicted)" ifadesini "(öngörülen)" diye yazar. |
| `mono(value)` | Değeri tek aralıklı, eşit genişlikli rakamlı bir `<span>` içine sarar. |
| `elementFacts(element)` | Element için İngilizce ad, atom kütlesi, fiziksel hâl, elektron dizilimi, elektronegatiflik ve periyot · grup · blok satırlarını üretir. |
| `compoundFacts(compound, geometry)` | Bileşik için formül (farklı element sayısıyla), molar kütle, İngilizce ve IUPAC adı, PubChem CID ve biliniyorsa geometri satırlarını üretir. |
| `RecordMark({ subject })` | Element için periyodik hücreyi, bileşik için formül levhasını çizer. |
| `FamilyBadge({ category })` | Aile renginde noktalı, Türkçe aile adlı rozeti çizer. |
| `RecordHero({ id, subject, atlas, geometry, onDownload })` | `PageHeader` ile başlığı (süs hücre gizli, sembol ya da formül ekran okuyucuya yazılı), laboratuvar, Wikipedia, PubChem ve JSON indirme eylemlerini, iki sütunlu temel bilgileri ve `AtlasVisual`'ı (kayıt değişince `key` ile sıfırlanır) çizer. |

### `web-app/src/components/detail/RecordOverview.tsx`
"Nerelerde kullanılır?" bölümü ve isteğe bağlı kısa hikâye.

| Fonksiyon | Ne yapar |
|---|---|
| `RecordOverview({ editorial })` | Kullanım alanlarını numaralı listeler (yoksa "henüz eklenmedi" der), kapsam notunu ekler ve hikâye varsa yanında "Kısa hikâyesi" panelini gösterir. |

### `web-app/src/components/detail/RecordSources.tsx`
"Kaynaklar ve veri kapsamı" bölümü: alım tarihi ve her kaynak için bir kart.

| Fonksiyon | Ne yapar |
|---|---|
| `hostOf(url)` | Adresin `www.` önekisiz alan adını döner; çözülemezse adresin kendisini. |
| `RecordSources({ sources, retrievedAt })` | Tarih biliniyorsa "… tarihinde alındı", değilse çevrimdışı katalog notunu yazar ve her kaynağı alan adlı bir `LinkCard` olarak dizer. |

### `web-app/src/components/detail/RecordStates.tsx`
Kayıt sayfasının yükleniyor, bulunamadı ve hata görünümleri.

| Fonksiyon | Ne yapar |
|---|---|
| `backLink(kind)` | Türe göre "Periyodik tablo" ya da "Bileşikler" geri bağlantısını döner. |
| `RecordSkeleton({ kind, path })` | Üst kısmın şeklinde (konum izi, hücre, başlık, özet, bilgiler, medya) iskelet çizer, `aria-busy` ve durum metniyle yüklendiğini duyurur. |
| `suggestionsFor(id)` | Türkçe adı ya da sembolü bilinmeyen kimlikle başlayan en fazla 6 elementi önerir ("/element/demir" → Fe). |
| `RecordNotFound({ kind, id, path })` | `noIndex` SEO ile 404 sayfası çizer, adres biçimini açıklar, tablo ve bileşik bağlantılarını ve varsa "Bunu mu arıyordun?" önerilerini gösterir. |
| `RecordError({ kind, message, path, onRetry })` | Önbellekte hiçbir şey yokken ağ ya da sunucu hatasında mesajı ve "Yeniden dene" düğmesini gösterir. |

### `web-app/src/components/detail/RelatedCompounds.tsx`
Yalnız element kayıtlarında, formülünde o elementi içeren katalog bileşiklerini listeleyen bölüm.

| Fonksiyon | Ne yapar |
|---|---|
| `RelatedCompounds({ symbol, name })` | `useScience` ile bileşik kataloğunu yükler, bileşimde sembolü geçenleri süzer; önce `PREVIEW_COUNT` (12) tanesini formül ve adla gösterip "Tümünü göster (n)" ile genişletir; yüklenirken iskelet, hatada "Yeniden dene", hiç yoksa boş durum çizer. |

### `web-app/src/components/reference/compound-filter.ts`
Bileşik kataloğunun arama ve grup filtresi (Node test koşucusu doğrudan içe aktarabilsin diye göreli `.ts` yoluyla yazılmıştır).

| Fonksiyon | Ne yapar |
|---|---|
| `filterCompounds(records, query, group, groupsBySlug)` | Grup seçiliyse yalnız o gruptaki bileşikleri bırakır; aramanın her kelimesinin Türkçe/İngilizce/IUPAC adında, formülünde ya da PubChem CID'inde (Türkçe katlamalı) geçmesini ister ("sulfurik" → "Sülfürik asit", "2244" → aspirin). |

### `web-app/src/components/reference/glossary-terms.ts`
`/sozluk` sözlüğünün içeriği: üç grupta (tezgâh, katalog, kredi demosu) 25 terim, her biri "dene" bağlantısıyla; `GLOSSARY_GROUPS` ve Türk alfabesi sabitini de dışa verir.

| Fonksiyon | Ne yapar |
|---|---|
| `glossaryTerms(accountsEnabled)` | Tüm terimleri döner; hesaplar kapalıysa yalnız hesapla çalışan sayfalara (`/shop`, `/market`, `/register`, `/account`) giden bağlantıları `/demo` turuna çevirir. |
| `TURKISH_ALPHABET` | Sözlük sırasıyla 29 harflik Türk alfabesi. |
| `initialOf(term)` | Terimin ilk harfini Türkçe kurala göre büyütür ("izomer" → "İ"). |
| `termsByLetter(terms)` | Terimleri Türkçe sözlük sırasıyla dizer ve baş harfe göre (yalnız terimi olan harfler) gruplar. |
| `letterAnchor(letter)` | Harf bölümünün çapa kimliğini üretir ("Ç" → "harf-ç"). |

### `web-app/src/components/reference/GlossaryEntry.tsx`
Sözlüğün `<dl>` içindeki tek satırı.

| Fonksiyon | Ne yapar |
|---|---|
| `GlossaryEntry({ term, groupLabel })` | Terimi süs işaretiyle (sembol, formül ya da durum kodu), tanımını, terim `geometry` ise suyun VSEPR şeklini, ürünü denemeye götüren bağlantıyı ve grup rozetini çizer; satır terimin kimliğiyle çapa olur. |

### `web-app/src/components/reference/GlossaryIndex.tsx`
Site başlığının devamı gibi yapışan A–Z harf çubuğu.

| Fonksiyon | Ne yapar |
|---|---|
| `GlossaryIndex({ activeLetters })` | Terimi olan harfleri o harfin bölümüne giden bağlantı, diğerlerini görünür ama etkisiz metin olarak dizer; dar ekranda satır yana kayar ve sağ kenarı solar. |

### `web-app/src/components/reference/guide-content.ts`
`/nasil` el kitabının içeriği: ilk on dakikanın adımları ve sık sorulan sorular.

| Fonksiyon | Ne yapar |
|---|---|
| `guideSteps(accountsEnabled)` | Numaralı adımları (Demir'i bul, Suyu kur, İlk rotayı bitir, Formül/Dedektif, Defteri yedekle) döner; hesaplar açıksa yedek adımına "Hesap aç" bağlantısını ve sona "İstersen pazara geç" adımını ekler. |
| `guideQuestions(accountsEnabled)` | Sık sorulan soruları döner; hesaplardan söz eden cevapları hesaplar kapalıyken buna göre değiştirir. |

### `web-app/src/components/reference/GuideSteps.tsx`
Dikey bir ray üzerinde, yukarıdan aşağı okunan numaralı nasıl yapılır adımları.

| Fonksiyon | Ne yapar |
|---|---|
| `GuideSteps({ steps })` | Her adımı numaralı daire ve kart olarak çizer, adımları ince bir çizgiyle bağlar; kartın sonundaki ilk bağlantıyı çerçeveli (asıl sonraki adım), diğerlerini sade düğme yapar. |

### `web-app/src/components/reference/structure-fit.ts`
PubChem yapı küçük resimlerinde molekülü bulup her levhayı aynı oranda dolduracak şekilde yakınlaştıran yardımcılar.

| Fonksiyon | Ne yapar |
|---|---|
| `CARD_PLATE` / `NO_FIT` | Bileşik kartının 4:3 levhası (molekül dar kenarın %72'sini kaplar, uzun molekül 0,6'ya kadar küçülebilir) ve okunamayan görsel için yakınlaştırmasız dönüşüm. Kayıt sayfası kendi levhasını (`AtlasVisual` `STRUCTURE_PLATE`) verir. |
| `inkBounds(pixels, size, tolerance)` | Kare RGBA arabelleğinde sol üst piksel (arka plan) renginden farklı piksellerin sınır kutusunu 0–1 kesirleri olarak döner; görsel boşsa `null`. |
| `fitToPlate(bounds, plate)` | Molekülü levhada (varsayılan `CARD_PLATE`) ortalayan ve dar kenarın `plate.fill` kadarını dolduran ölçeği (`plate.minScale`–3) ve yüzde kaydırmayı hesaplar. |
| `measureStructure(image, plate)` | Yüklenmiş görseli 96 px'lik bir canvas kopyasında tarar ve verilen levha için `fitToPlate` sonucunu döner; pikseller okunamazsa (CORS başlıksız çapraz köken) `NO_FIT`. |

### `web-app/src/components/lab/BenchDropZone.tsx`
Laboratuvar tezgâhı: her element için bir çip tutan bırakma alanı (`data-lab-drop`); çipler sürüklenerek ya da ok tuşlarıyla sıralanır.

| Fonksiyon | Ne yapar |
|---|---|
| `STARTERS` | Hızlı başlangıç için hazır karışımlar (Su, Tuz, Karbondioksit); seçilince tezgâha yüklenir. |
| `handleSelector(id)` | Bir çipin tutamacını bulan CSS seçicisini (`CSS.escape` ile) üretir. |
| `BenchDropZone({ counts, chipIds, drag, onStep, onRemove, onMove, onChipDragStart, onStarter })` | Tezgâh boşsa `BenchInvite`'ı, doluysa çip listesini çizer; sürükleme üstündeyken vurgular, yer değiştiren çipin yeni sırasını ekran okuyucuya duyurur ve çip taşınınca ya da kalkınca odağı `<body>`'ye düşürmeden doğru öğeye verir. |
| (odak effect'i) | `refocus` değişince tezgâhta istenen seçiciye uyan öğeye odaklanır. |
| `moveWithKeys(event, index, id)` | Tutamaçtaki ok tuşlarıyla çipi bir sola/sağa taşır, duyuru metnini ve yeniden odaklanacak tutamacı ayarlar. |
| `focusAfterLeaving(id)` | Çip ayrılmadan önce odağı sonraki çipe, yoksa öncekine, o da yoksa boş tezgâh başlığına yönlendirir. |
| `remove(id)` | Odağı ayarlayıp çipi kaldırır. |
| `step(id, delta)` | Sayıyı değiştirir; sayı 1'den aşağı inecekse (çip kalkacağı için) önce odağı ayarlar. |
| `loadStarter(starter)` | Odağı çip listesine ayarlayıp hazır karışımı yükler. |
| `BenchChip({ id, index, count, hintId, drag, onStep, onRemove, onHandleKeyDown, onDragStart })` | Tezgâhtaki tek elementi tutamaç, sembol, ad, `CountStepper` ve kaldır düğmesiyle çizer; sürüklenen çipi soluklaştırır, üzerine bırakılacak çipe halka koyar, giriş ve yer değiştirmeyi (azaltılmış hareket yoksa) canlandırır. |
| `BenchInvite({ dropping, onStarter })` | Boş tezgâhta laboratuvarın nasıl çalıştığını üç adımda anlatır ve hazır karışım düğmelerini gösterir; sürükleme üstündeyken yalnız "Bırak: tezgâha eklenir." yazar. |

### `web-app/src/components/lab/CountStepper.tsx`
Bir elementin atom sayısı için "− sayı +" denetimi.

| Fonksiyon | Ne yapar |
|---|---|
| `CountStepper({ name, count, onStep, announce, disabled })` | Element adlı erişilebilir etiketlerle azalt/artır düğmelerini çizer; sayı 0 iken azaltmayı kapatır ve `announce` açıksa yeni sayıyı `aria-live` ile duyurur. |

### `web-app/src/components/lab/DiscoveryNotebook.tsx`
Laboratuvar sayfasındaki keşif defteri: bulunan bileşikler katalog sırasıyla ve misafir için sıfırlama.

| Fonksiyon | Ne yapar |
|---|---|
| `DiscoveryNotebook({ found, status, canReset, onReset })` | Bulunan bileşikleri kayıt sayfasına giden formüllü bağlantılar olarak dizer, katalog bitince başlığı "Katalog tamamlandı" yapar; misafirse onay pencereli "İlerlemeyi sıfırla" sunar, defter boşsa boş durum gösterir ve saklama yerini yazar. |

### `web-app/src/components/lab/DragGhost.tsx`
Sürüklenen elementin işaretçinin altında süzülen kopyası.

| Fonksiyon | Ne yapar |
|---|---|
| `DragGhost({ drag })` | Sembolü ve adı işaretçinin hemen üstünde çizer; tezgâh dışında tutulan bir tezgâh çipi için kırmızıya dönüp "Bırak: tezgâhtan çıkar" yazar. |

### `web-app/src/components/lab/elementInfo.ts`
Laboratuvar hücre ve çipleri için element görüntüleme bilgileri.

| Fonksiyon | Ne yapar |
|---|---|
| `elementInfo(symbol)` | Sembolün adını, atom numarasını ve ailesini (`familyOf`) `STATIC_ELEMENTS`'ten döner; bilinmeyen sembolde adı sembol, ailesi `"unknown"` olur. |

### `web-app/src/components/lab/ElementPalette.tsx`
Aranabilir element paleti; tıklama, dokunma, Enter ya da Boşluk tezgâha bir atom ekler.

| Fonksiyon | Ne yapar |
|---|---|
| `PINNED` | Arama boşken ayrı grupta gösterilen sık kullanılan atomlar (H, O, C, N, Na, Cl, Fe, S, K, Ca). |
| `ElementPalette({ counts, onAdd, onDragStart, draggingId })` | Arama boşken "Sık kullanılanlar" ve "Tüm elementler", doluysa "Sonuçlar" grubunu çizer; eşleşme yoksa boş durum gösterir; masaüstünde yapışık ve kendi içinde kayar. |
| `PaletteItem({ material, count, dragging, onAdd, onDragStart })` | `ElementTile`'ın üstüne tam boy ekleme düğmesi koyar (farede basınca sürükleme başlar), tezgâhtaki sayıyı "×n" rozetiyle gösterir ve dokunmatik için yalnız tutamaçtan sürüklemeye izin verir. |

### `web-app/src/components/lab/GradeNotice.tsx`
Yan oyunların (formül kur, dedektif) her zaman bağlı durum kutusu (`Grade` türünü de dışa verir).

| Fonksiyon | Ne yapar |
|---|---|
| `look(grade)` | Cevap yoksa nötr, doğruysa "Doğru" başlıklı başarı, yanlışsa "Henüz değil" başlıklı uyarı tonunu seçer. |
| `GradeNotice({ grade, idle })` | Cevap denetlenene kadar yönergeyi, sonra sonucu gösterir; bağlı kalarak canlı bölgenin duyurmasını sağlar. |

### `web-app/src/components/lab/KindQuiz.tsx`
Keşiften sonra isteğe bağlı tek soru: molekül mü, formül birimi mi, karışım mı.

| Fonksiyon | Ne yapar |
|---|---|
| `KindQuiz({ quiz })` | "İstersen kısa soru" açılır panelinde seçenekleri basılı/basılı değil düğmeler olarak gösterir; seçim doğruysa açıklamayı, yanlışsa "formül birimi ile molekül aynı şey değildir" notunu yazar. |

### `web-app/src/components/lab/MixOutcome.tsx`
"Dene" ya da "İpucu" sonrası tezgâhın altındaki geri bildirim (`Outcome` türünü de dışa verir).

| Fonksiyon | Ne yapar |
|---|---|
| `MISS_NOTICE` | Iska türüne göre ton ve başlık: "Neredeyse", "Bu karışmaz", "Katalogda yok", "Tezgâh boş". |
| `noticeLook(outcome)` | Sonuca göre durum kutusunun tonunu ve başlığını seçer ("İpucu", "Yeni keşif", "Bunu biliyordun"). |
| `MixOutcome({ outcome, preview, discovered, nextUp, onLoad, onRestart })` | Henüz denenmediyse hazır istemini, sonuç varsa durum kutusunu ve isabette `ResultCard`'ı gösterir; boşta durum kutusu bağlı ama görünmez kalır, böylece sonradan eklenen metin okunur. |
| `OutcomeMessage({ outcome, discovered, onLoad })` | Durum kutusunun gövdesi: isabette deftere işlendi/tekrar metni, ıskada mesaj ve aynı elementlerle katalogdaki doğru oranları yükleyen en fazla 4 formül düğmesi. |
| `nextHintText(nextUp, discovered)` | Sıradaki hedef bileşiği ya da katalog bittiyse diğer modlara yönlendiren satırı üretir. |
| `ReadyPrompt({ preview })` | Tezgâhtaki formülü "→ ?" ile gösterip "Hazır. Dene'ye bas." der. |

### `web-app/src/components/lab/ProgressAside.tsx`
Laboratuvar modlarının sayfa başlığındaki yan kutusu.

| Fonksiyon | Ne yapar |
|---|---|
| `percentFormat` | Yüzdeyi Türkçe ve tek ondalıkla biçimler ("%0,5"), böylece 214'te ilk keşif sıfır görünmez. |
| `ProgressAside({ label, value, total, hint })` | `ProgressRing` ile yüzdeyi ve yanında `Stat` ile "x / toplam" sayısını ve kısa notu gösterir. |

### `web-app/src/components/lab/ResultCard.tsx`
Eşleşen bileşiğin kartı: ad, formül, yapı, geometri, kullanım alanları ve sonraki adımlar.

| Fonksiyon | Ne yapar |
|---|---|
| `ResultCard({ compound, fresh, nextHint, onRestart })` | Kartı yaylı animasyonla açar; ilk keşifse kutlama ve `KindQuiz` ekler; kayıt sayfası, "Formülü kur" ve "Yeniden karıştır" eylemlerini ve sıradaki ipucunu gösterir. |
| `ResultVisual({ compound })` | `useScience` ile bileşiğin yapı görselini yükler; yüklenirken iskelet, görsel yoksa formüllü `AtlasVisual` gösterir. |
| `PARTICLES` | Kutlamadaki sekiz noktanın eşit aralıklı açıları. |
| `Celebration()` | İlk keşifte sekiz bakır rengi noktayı dışa doğru saçıp söndürür (azaltılmış harekette çağrılmaz). |

### `web-app/src/components/lab/useBench.ts`
Tezgâhtaki atom sayılarını ve çiplerin gösterim sırasını tutan hook.

| Fonksiyon | Ne yapar |
|---|---|
| `fromCounts(counts)` | Sayıları `prune` ile sıfırlardan temizler ve anahtarlarından ilk sırayı kurar. |
| `useBench(initial)` | `counts`, `chipIds` ve aşağıdaki işlemleri döndürür; her güncelleme fonksiyonel olduğu için sürükleme başında yakalanan geri çağrılar da doğru kalır. |
| `add(id, delta)` | Atom ekler (negatif `delta` ile çıkarır); sayı sıfırlanırsa çip düşer ve sıra `syncChipOrder` ile eşitlenir. |
| `remove(id)` | Elementi sayılardan ve sıradan tamamen çıkarır. |
| `move(from, to)` | Çipin sırasını `moveChip` ile değiştirir. |
| `load(counts)` | Tezgâhı verilen sayılarla baştan kurar. |
| `clear()` | Tezgâhı boşaltır. |

### `web-app/src/components/lab/useLabDrag.ts`
Laboratuvar için kütüphanesiz işaretçi sürükle-bırak (fare, kalem, dokunma); `DragSource`, `DragState`, `DragEnd` türlerini de dışa verir.

| Fonksiyon | Ne yapar |
|---|---|
| `hitTest(x, y)` | `elementFromPoint` ile işaretçinin tezgâh üstünde olup olmadığını ve altındaki çipin sırasını bulur. |
| `useLabDrag()` | Anlık sürükleme durumunu (`drag`) ve `startDrag`'i döndürür; bileşen kalkarken açık sürüklemeyi durdurur. |
| `startDrag(event, source, onEnd)` | Sol tuşla başlayan basışı izler; işaretçi 6 px (`DRAG_THRESHOLD`) gitmeden sürükleme saymaz, pencere düzeyindeki olaylarla konumu ve hedefi günceller; bırakınca `onEnd`'e taşınıp taşınmadığını ve hedefi bildirir, iptal edilen işaretçide sessizce biter. |
| `move` / `finish` / `stop` (`startDrag` içinde) | Hareketi izler; aynı işaretçinin bırakılışında sonucu bildirir; dinleyicileri kaldırıp durumu sıfırlar. |

### `web-app/src/components/notebook/backup.ts`
Defter yedek dosyasının biçimi: dosya adı (`BACKUP_FILE_NAME` = `elementapi-koleksiyon.json`), en fazla 32.768 bayt (`MAX_BACKUP_BYTES`), yazma ve okuma.

| Fonksiyon | Ne yapar |
|---|---|
| `backupData(progress)` | Yedek dosyasının içeriğini kurar: ilerleme artı `version: 1`. |
| `parseBackup(text)` | Dosya metnini çözer; sürüm 1 ve `discoveries`/`lessons` dizileri varsa `normalizeLearning` ile bilinmeyen bileşikleri ve hak edilmemiş rotaları atıp ilerlemeyi döner, değilse `null`. |

### `web-app/src/components/notebook/BackupPanel.tsx`
Defteri JSON olarak indirme ya da böyle bir dosyadaki keşifleri geri ekleme paneli.

| Fonksiyon | Ne yapar |
|---|---|
| `BackupPanel({ progress, onRestore })` | "Kaydımı indir" (ilk keşfe kadar kapalı) ve "JSON dosyası seç" bölümlerini çizer; dosya seçilince `restore`'u çağırır ve sonucu başarı ya da hata kutusuyla gösterir. |
| `restore(file)` | Boyut sınırını aşmayan dosyayı `parseBackup` ile okur; geçerliyse `onRestore`'a verip "mevcut koleksiyonuna eklendi" der, değilse geçersiz dosya mesajını gösterir (hiçbir kayıt silinmez). |

### `web-app/src/components/notebook/DiscoveryGrid.tsx`
Bulunan bileşiklerin kayıt sayfasına giden kart ızgarası.

| Fonksiyon | Ne yapar |
|---|---|
| `DiscoveryGrid({ discoveries })` | Her keşfi formül ve adla kart yapar; defter boşsa laboratuvara ve el kitabına yönlendiren boş durumu gösterir. |

### `web-app/src/components/notebook/downloadJson.ts`
Veriyi tarayıcıda JSON dosyası olarak kaydeden yardımcı; hiçbir yere bir şey gönderilmez.

| Fonksiyon | Ne yapar |
|---|---|
| `downloadJson(fileName, data)` | Veriyi girintili JSON'a çevirip geçici nesne adresiyle indirir ve adresi 1 sn sonra serbest bırakır. |

### `web-app/src/components/notebook/LessonCard.tsx`
Tek bir öğrenme rotasının kartı: bileşikleri (bulunanlar işaretli), ardından ilerlemeye göre laboratuvar bağlantısı, sorular ya da açıklamalar.

| Fonksiyon | Ne yapar |
|---|---|
| `ROUTE_COLOR` | Her rotaya dayandığı element ailesinin rengini verir. |
| `LessonCard({ lesson, progress, onComplete })` | Başlığı, "n / toplam keşif" ya da "Tamamlandı" rozetini, ilerleme çubuğunu ve bileşik çiplerini çizer; keşifler eksikse kilit notu ve `/lab?lesson=<id>` bağlantısı, tamamsa soruları, rota bittiyse açıklamaları gösterir. |
| `DiscoveryChip({ id, found })` | Rotadaki bir bileşiği kayıt sayfasına giden formüllü çip olarak çizer; bulunduysa yeşil ve işaretli olur, durumu ekran okuyucuya yazar. |
| `LessonQuiz({ lesson, onComplete })` | Rotanın sorularını birer birer sorar ("1/2" etiketiyle); son soru doğru bilinince `onComplete` çağırır. |
| `handleCorrect()` (`LessonQuiz` içinde) | Doğru cevapta sonraki soruya geçer, son soruysa rotayı tamamlar. |
| `LessonExplanations({ lesson })` | Tamamlanan rotanın her sorusunun açıklamasını işaretli satırlar olarak listeler. |

### `web-app/src/components/notebook/NotebookProgress.tsx`
Defter sayfasının başlık yan kutusu.

| Fonksiyon | Ne yapar |
|---|---|
| `NotebookProgress({ discovered, completedRoutes })` | Bileşik kataloğunun keşfedilen payını halka ile, keşif ve rota sayılarını `Stat` ile gösterir; kalan bileşik ve rota sayısını (ya da ilk keşif çağrısını) yazar. |

### `web-app/src/components/notebook/NotebookSync.tsx`
Defterin nerede saklandığı (bu tarayıcı ya da hesap), uygun sonraki adım ve misafir keşiflerini hesaba taşıma önerisi.

| Fonksiyon | Ne yapar |
|---|---|
| `SYNC_TONE` | Eşitleme durumunu (`local`, `memoryOnly`, `syncing`, `synced`, `failed`, `timedOut`) kutu tonuna çevirir. |
| `NotebookSync({ learning })` | Durum metnini gösterir; giriş yapılmışsa "Yeniden eşitle", yapılmamışsa ve hesaplar açıksa "Hesap aç" düğmesi koyar; hesapta olmayan misafir keşifleri varsa "Misafir keşiflerimi hesabıma ekle" önerisini gösterir. |

### `web-app/src/components/notebook/QuizQuestion.tsx`
Tek bir çoktan seçmeli soru.

| Fonksiyon | Ne yapar |
|---|---|
| `QuizQuestion({ prompt, choices, answer, stepLabel, retryHint, onCorrect })` | Seçenekleri A, B, C harfli basılı/basılı değil düğmeler olarak çizer; yanlış seçimi kırmızıyla işaretleyip ipucunu duyurur; sonraki soruya geçmek için çağıran yeni bir `key` verir. |
| `pick(index)` | Seçimi kaydeder ve doğruysa `onCorrect` çağırır. |

### `web-app/src/components/auth/accountApi.ts`
identity servisinin hesap uçlarına (`/auth/profile`, `/auth/delete` …) giden istemci, giriş hatalarının Türkçe metni ve tek bir hesap formunun durumunu tutan hook.

| Fonksiyon | Ne yapar |
|---|---|
| `loginError(error)` | Başarısız girişin Türkçe metnini seçer: 401 "E-posta veya şifre yanlış.", 429 "Çok fazla hatalı deneme…", diğer sunucu yanıtlarında `apiError`; ağ hatası (`TypeError`) ve zaman aşımı (`isTimeout`) "Servise ulaşılamadı…", başka bir `Error` kendi cümlesi (ör. kapalı tarayıcı depolaması). Giriş ve kayıt sayfaları kullanır. |
| `messageOf(ok, status, data)` | Sunucunun cümlesini bulur: başarıda gövdedeki `message`, hatada `apiError`'un hata gövdesinden çıkardığı metin. |
| `accountRequest(path, { method, body, auth, timeoutMs, signal })` | `fetchJson` ile oturum belirteciyle (varsayılan) 15 sn zaman aşımlı istek atar; HTTP hatasını `ok: false` ile çözer, geçerli belirteç için 401 gelirse oturumu kapatır; ağ hatası, zaman aşımı ve iptalde reddeder. |
| `useAccountAction()` | Bir hesap formu ya da düğmesi için `busy`, `result`, `run` ve `clear` döndürür. |
| `run(path, body, { auth, fallback })` | Uca POST atar, meşgul durumunu izler ve sonucu (sunucu mesajı ya da yedek metin, ağ hatasında "Servise ulaşılamadı…") satır içi bildirim için saklar; yanıtı ya da `null` döner. |

### `web-app/src/components/auth/AuthLayout.tsx`
Giriş, kayıt ve kurtarma sayfalarının ortalanmış tek panelli çerçevesi; sayfanın `h1`'ini o çizer.

| Fonksiyon | Ne yapar |
|---|---|
| `AuthLayout({ title, lead, children, footer })` | Marka işaretini, "Hesap" etiketini, başlığı ve giriş metnini, formu içeren paneli ve altında sayfalar arası geçiş bağlantılarını dizer. |

### `web-app/src/components/auth/AuthStatus.tsx`
Hesap panelinde formun yerine geçen mesaj (bağlantı gönderildi, özellik kapalı, bağlantı eksik).

| Fonksiyon | Ne yapar |
|---|---|
| `AuthStatus({ tone, title, children })` | Ton simgesini yuvarlak rozette, başlığı ve açıklamayı ortalı gösterir; `role="status"` ile kibarca duyurulur ve panel zaten çerçevelediği için ikinci kutu çizmez. |

### `web-app/src/components/auth/DataExportSettings.tsx`
Hesabın tuttuğu her şeyi (`GET /auth/export`) `elementapi-hesabim.json` olarak indiren ayar bölümü.

| Fonksiyon | Ne yapar |
|---|---|
| `DataExportSettings()` | Dosyanın neleri kapsadığını (profil, öğrenme kayıtları, maskeli API anahtarları, webhook adresleri; simülasyon işlemleri hariç) anlatır ve indirme düğmesini, başarısızlıkta hata kutusunu gösterir. |
| `exportAccount()` | Dışa aktarma ucunu 10 sn zaman aşımıyla çağırır, yanıtı `downloadJson` ile indirir ve başarı bildirimi gösterir; hata olursa `failed` durumunu açar. |

### `web-app/src/components/auth/DeleteAccountSettings.tsx`
Şifre ve yazılı onay ifadesi isteyen tehlikeli onay penceresinin arkasındaki hesap silme bölümü.

| Fonksiyon | Ne yapar |
|---|---|
| `DeleteAccountSettings()` | Sonuçları anlatır ve `ConfirmDialog` içinde şifre ile "HESABIMI SİL" alanını ister; onay düğmesi ikisi de geçerli olana kadar kapalı kalır (ifade Türkçe büyük harfe çevrilerek karşılaştırılır, "hesabımı sil" de geçer). |
| `deleteAccount()` | `/auth/delete`'e şifre ve ifadeyi gönderir; başarısızsa reddedip pencereyi hatayla açık tutar; başarıda bu cihazdaki defteri `forgetLearning` ile siler, bildirim gösterir, oturumu kapatıp ana sayfaya gider. |
| `resetOnClose(open)` | Pencere kapanınca şifre, onay metni ve sonucu temizler. |

### `web-app/src/components/auth/PasswordInput.tsx`
Göster/gizle anahtarı ve Caps Lock uyarısı olan şifre girişi; `Field` içinde `Input` gibi öznitelikleri alır.

| Fonksiyon | Ne yapar |
|---|---|
| `PasswordInput({ className, ...props })` | Girişi `password`/`text` arasında değiştiren göz düğmesini (`aria-pressed`, `aria-controls`) çizer ve Caps Lock açıkken uyarı satırı gösterir. |
| `readCapsLock(event)` | Tuş olayından Caps Lock durumunu okur; odak kaybolunca uyarı kapanır. |

### `web-app/src/components/auth/PasswordSettings.tsx`
Şifre değiştirme bölümü; başarı her yerde oturumu kapattığı için giriş sayfasında biter.

| Fonksiyon | Ne yapar |
|---|---|
| `PasswordSettings()` | Mevcut, yeni ve tekrar şifre alanlarını (en az 10 karakter) ve sonuç kutusunu çizer. |
| `submit(event)` | Yeni şifreler eşleşmezse alan hatası gösterir; eşleşirse `/auth/password/change`'e gönderir, başarıda bildirim gösterip oturumu kapatır ve `/login`'e gider. |

### `web-app/src/components/auth/ProfileSettings.tsx`
Profil bilgileri ve e-posta doğrulama durumu, iki ayar bölümü olarak (`AccountProfile` türünü de dışa verir).

| Fonksiyon | Ne yapar |
|---|---|
| `formatDate(value)` | Tarihi "5 Eylül 2026" biçimine çevirir; geçersizse "—". |
| `ProfileSettings({ profile, failed, onRetry, emailVerification })` | Ad soyad, e-posta ve üyelik tarihini gösterir; yüklenirken iskelet, hatada "Yeniden dene" kutusu çizer; e-posta doğrulama bölümünü durum bilinene kadar iskeletle gösterir. |
| `ProfileSkeleton()` | Üç satırlık profil iskeleti çizer. |
| `EmailVerification({ confirmed, canSendMail })` | Doğrulanmış ya da doğrulanmamış durumu simgeyle yazar; doğrulanmamışsa ve sunucu posta gönderebiliyorsa `/auth/email/send-verification` düğmesini, gönderemiyorsa "bu kurulumda kapalı" notunu gösterir. |

### `web-app/src/components/auth/SettingsSection.tsx`
Tek bir ayar satırı: solda başlık ve açıklama, `lg` üstünde sağda denetimler.

| Fonksiyon | Ne yapar |
|---|---|
| `SettingsSection({ title, description, children })` | `aria-labelledby` ile başlığa bağlı `<section>` çizer ve içeriği iki sütunlu düzene yerleştirir. |

### `web-app/src/components/commerce/ApiKeysPanel.tsx`
Hesabın API anahtarları paneli: anahtar üretme (bir kez gösterilir, açılana kadar maskeli, kopyalanabilir), listeleme ve onayla iptal.

| Fonksiyon | Ne yapar |
|---|---|
| `ApiKeysPanel({ onDashboardKeyChange })` | Açıklama formunu, yeni anahtar kutusunu, hata kutusunu ve anahtar listesini çizer; yeni anahtar saniyede 5 istek (`NEW_KEY_TPS`) iznidir. |
| `reload()` | `apiKeyService.list()` ile anahtarları yükler; başarıda `ready`, hatada `error` durumuna geçer. |
| `generate(event)` | Açıklamayla yeni anahtar üretir ve gösterir; tarayıcıda henüz panel anahtarı yoksa `apiKeyService.adoptDashboardKey` bunu panel anahtarı yapar ve `onDashboardKeyChange` çağrılır, sonra liste yenilenir. |
| `revoke(key)` | Anahtarı iptal eder (hatada bildirim gösterip reddeder, böylece onay penceresi açık kalır); iptal edilen anahtar bu tarayıcının panel anahtarıysa `apiKeyService.forgetDashboardKey` onu siler ve haber verilir, sonra liste yenilenir. |
| `FreshKey({ value })` | Yeni üretilen anahtarı ilk 8 karakteri dışında maskeli gösterir; göz düğmesiyle açılır, kopyalanır ve "yalnız şimdi gösterilir" uyarısı taşır. |
| `KeyList({ state, onRetry, onRevoke })` | Yüklenirken iskelet, hatada "Yeniden dene", boşken not, doluyken açıklama, "Web paneli"/"İptal edildi" rozetleri, maske ve TPS ile listeyi çizer; etkin anahtarlara onaylı "İptal et" düğmesi koyar. |

### `web-app/src/components/commerce/cart.ts`
Mağazanın gram sepeti; React durumu esastır, `localStorage`'a (`elementapi:elementalCart`) yalnız tek bir effect yazar.

| Fonksiyon | Ne yapar |
|---|---|
| `withAdded(cart, sku, grams, maxGrams)` | Sepete üründen gram ekler (stokla sınırlı); yeni satır başa gelir, en fazla 12 satır (`MAX_CART_LINES`) tutulur, 0 g'a düşen satır çıkar; miktar değiştiği için satıra yeni bir `requestId` (idempotency anahtarı) verir ve yalnız verilen sepet üzerinde çalışır. |
| `useCart(stockOf)` | Sepeti `readCart` ile başlatır, her değişiklikte `writeCart` ile kaydeder ve `cart`, `setCart`, `add`, `step`, `remove`, `gramsOf` döndürür; depolama yoksa da sayfa için çalışır. |
| `add(sku, grams)` | Ürünün satırına gram ekler (stokla sınırlı). |
| `step(item, delta)` | Satırı `delta` gram değiştirir, yeni `requestId` verir; 0 g olan satırı düşürür. |
| `remove(item)` | Tek satırı kaldırır. |
| `gramsOf(sku)` | Üründen sepette kaç gram olduğunu (yoksa 0) döner. |

### `web-app/src/components/commerce/ChangeValue.tsx`
İşaretli 24 saatlik değişimi tek aralıklı yazıyla gösterir.

| Fonksiyon | Ne yapar |
|---|---|
| `ChangeValue({ value, className })` | `formatChange` ile "+%1,23" biçiminde yazar ve `trendOf`'a göre yükselişte yeşil, düşüşte kırmızı, değişmezse soluk renk verir (işaret de anlamı taşır). |

### `web-app/src/components/commerce/classes.ts`
Ticaret tablolarının paylaştığı `panelTableClass` sınıf metnini (panel içindeki tablonun ilk ve son sütununa 16 px iç boşluk) dışa verir (fonksiyon yok).

### `web-app/src/components/commerce/CartPanel.tsx`
Gram sepeti paneli: miktar ayarlı satırlar, cüzdanla karşılaştırılan toplam, stok ve bakiye uyarıları ve sipariş düğmesi.

| Fonksiyon | Ne yapar |
|---|---|
| `checkoutLabel(submitting, isAuthenticated)` | Sipariş düğmesinin metnini seçer: "İletiliyor…", "Sipariş ver" ya da "Giriş yap ve sipariş ver". |
| `CartPanel({ lines, subtotal, walletElx, isAuthenticated, overStock, walletShort, submitting, checkoutNote, onStep, onRemove, onClear, onCheckout })` | Toplam gramı, satırları, toplamı ve (giriş yapılmışsa) cüzdanı gösterir; bakiye yetmezse ya da stok aşılırsa uyarı koyup sipariş düğmesini kapatır; siparişler gönderilirken her denetimi kilitler ve sonuç notunu duyurur. |
| `CartLineRow({ line, disabled, onStep, onRemove })` | Tek satırı ürün formülü, birim fiyatı, satır toplamı, ±1 g düğmeleri (stoka ulaşınca artır kapanır) ve "Kaldır" ile çizer. |

### `web-app/src/components/commerce/data.ts`
KREDI demosu sayfalarının veri hook'ları: fiyat, varlıklar (holdings), siparişler ve ürün kataloğu.

| Fonksiyon | Ne yapar |
|---|---|
| `useTicker(symbol)` | Bir sembolün anlık fiyatını açılışta, sembol değişince ve sekme görünürken 12 sn'de bir (`usePolling`) çeker; önceki sembole geç gelen cevabı atar ve yalnız bu sembolün fiyatını döndürür. |
| `fetchHoldings()` | Cüzdandaki sıfırdan büyük varlıkları alır, bileşik ürünlerin fiyat çarpanını `compoundService.get` ile toplar (saf element 1, bilinmeyen `null`). |
| `useHoldings(enabled)` | Varlık durumunu (`loading`/`error`/`ready`) tutar, etkinse yükler; `reload` ve iskeleti yeniden gösterip yükleyen `retry` döndürür. |
| `useOrders(enabled, pollMs, onUpdate)` | Kullanıcının siparişlerini sekme görünürken `pollMs` aralığıyla yoklar (saga adımları canlı görünür), her başarılı yoklamadan sonra `onUpdate` çağırır, başarısız yoklamada son iyi listeyi korur. |
| `upsert(order)` (`useOrders` içinde) | Yeni verilen siparişi bir sonraki yoklamayı beklemeden listenin başına koyar. |
| `useCatalog(elementSymbol)` | Bir elementin (ya da `null` ile hepsinin) mağaza ürünlerini yükler; geçerli filtrenin cevabı gelene kadar `loading` kalır, böylece eski ızgara görünmez; `requestKey` ve hata sonrası yeniden soran `retry` döndürür. |

### `web-app/src/components/commerce/ElementPicker.tsx`
Mağaza kataloğunu süzen "Tümü" düğmesi ve sembol başına element hücreleri.

| Fonksiyon | Ne yapar |
|---|---|
| `ElementPicker({ symbols, elements, value, onValueChange })` | "Tümü" düğmesini ve her sembol için bir `ElementTile` aç-kapa düğmesini (`pressed`, `aria-pressed`) çizer; karoya tıklamak o elemente süzer, etkin karoya yeniden tıklamak "Tümü"ne döner; etkin filtreyi halka ile vurgular. |

### `web-app/src/components/commerce/HoldingsTable.tsx`
Kasa tablosu: ürün başına gram, ortalama maliyet ve alış (bid) fiyatıyla bugünkü değer.

| Fonksiyon | Ne yapar |
|---|---|
| `formatValue(value)` | Kredi tutarını 2 ondalıkla yazar; bilinmiyorsa "—". |
| `HoldingsTable({ state, elements, bidOf, onRetry, action })` | Yüklenirken iskelet, hatada "Yeniden dene", boşken "Mağazadan 1 g Fe dene" boş durumunu, doluyken ürün, miktar, ortalama maliyet (`md` üstünde) ve değer sütunlu tabloyu çizer; isteğe bağlı satır sonu eylemi ekler. |

### `web-app/src/components/commerce/model.ts`
KREDI demosu sayfalarının (/market, /shop, /account) React'sız, test edilebilir saf mantığı.

| Fonksiyon | Ne yapar |
|---|---|
| `findElement(elements, symbol)` | Elementi büyük/küçük harfe bakmadan sembolle bulur ("AU" → "Au"). |
| `elementName(elements, symbol)` | Sembolün Türkçe adını, bilinmiyorsa sembolün kendisini döner. |
| `nextSort(current, key)` | Etkin sütuna tıklanınca yönü çevirir; yeni sütun sembolde A→Z, sayılarda büyükten küçüğe başlar. |
| `sortBoard(rows, sort)` | Fiyat tablosunun sıralı kopyasını döner; eksik 24 saatlik değişim en düşük sayılır. |
| `filterBoard(rows, query, elements)` | Sembolü ya da Türkçe adı aramaya uyan satırları bırakır ("altin" → Altın). |
| `trendOf(percent)` | Değişimi `up`, `down` ya da `flat` sayar; bilinmeyen değişim `flat`'tir. |
| `formatChange(percent)` | Türkçe işaretli yüzde yazar ("+%1,23", "-%0,40"); bilinmiyorsa "—". |
| `isElementalSlug(slug)` | Ürünün saf element olup olmadığını söyler (`null`, "elemental", "elemental-au"). |
| `describeProduct(elements, product)` | Varlık ya da sipariş satırı için formülü, ana elementin adını ve saf element olup olmadığını üretir; formülü `compoundFormula`'dan ya da "NaCl · NA" etiketinin ilk parçasından alır. |
| `holdingValue(holding, bid)` | Alış fiyatıyla değeri hesaplar (gram × bid × çarpan); bid ya da çarpan bilinmiyorsa `null`. |
| `saleProblem(grams, holding)` | Satışın neden yapılamayacağını söyler (kasada yok, gram girilmemiş, kasadakinden fazla) ya da `null` döner. |
| `ORDER_FLOW` | Mutlu yoldaki saga durumları sırasıyla: Submitted, StockReserved, Shipping, Completed. |
| `isOrderCancelled(status)` | Durum Failed ya da Compensated ise (stok ve kredi iade edildi) true döner. |
| `orderProgress(status)` | Tamamlanan saga adımı sayısını döner: gönderimde 1, teslimde 4, iptal ya da bilinmeyende 0. |
| `orderTone(status)` | Sipariş rozetinin tonunu seçer: Completed başarı, iptal kırmızı, diğerleri bilgi. |
| `quoteFor(board, elements, symbol)` | Sembolün satış (ask) fiyatını ve stoğunu tablodan okur; tabloda satır yoksa fiyatsız sayar (ask 0, stok 0) ki hiçbir şey eklenemesin. |
| `summarizeCart(cart, elements, quoteOf)` | Her satırı ask × ürün çarpanıyla fiyatlar, ara toplamı hesaplar ve element başına toplam gramın stoğu aşıp aşmadığına bakar. |
| `maskApiKey(key)` | Anahtarı sunucunun maskeli biçimine çevirir (ilk 13 karakter + "..." + son 4), saklı anahtarı liste satırıyla eşleştirmek için. |
| `webhookUrlProblem(value)` | Webhook adresini göndermeden denetler: boş, `https://` olmayan ya da geçersiz adres için Türkçe sebep, uygunsa `null` döner. |

### `web-app/src/components/commerce/MoversStrip.tsx`
24 saatte en çok hareket eden elementlerin yatay kayan şeridi.

| Fonksiyon | Ne yapar |
|---|---|
| `MoversStrip({ rows, selectedSymbol, onSelect })` | Her satırı sembol, son fiyat ve `ChangeValue` içeren basılı/basılı değil çip olarak dizer; tıklanınca o elementi fiyat tablosunda seçer; veri yokken 8 iskelet çip gösterir. |

### `web-app/src/components/commerce/OrdersTable.tsx`
Sipariş tablosu: ürün, gram, tutar, durum rozeti ve dört saga adımını gösteren ilerleme çubuğu.

| Fonksiyon | Ne yapar |
|---|---|
| `OrdersTable({ state, elements, onRetry, emptyHint })` | Yüklenirken iskelet, hatada "Yeniden dene", boşken `emptyHint`'li boş durum, doluyken ürün, miktar, tutar (`sm` üstünde) ve durum sütunlu tabloyu çizer. |
| `OrderRowView({ order, elements })` | Tek siparişi formül, element adı, kısa sipariş numarası (`#` + ilk 8 karakter), varsa kargo takip numarası, gram, tutar ve Türkçe durum rozetiyle çizer. |
| `stepFill(status)` | Dolu adımın rengini seçer: teslimde yeşil, geri alındıysa kırmızı, arada mavi. |
| `OrderSteps({ status })` | Her saga adımı için ince bir parça çizer, ulaşılanları doldurur, geçerli adımı `aria-current="step"` ile işaretler; iptal edilen siparişte dört parçayı da kırmızı doldurur. |

### `web-app/src/components/commerce/QuoteBoard.tsx`
Tüm elementlerin yoğun, sıralanabilir fiyat tablosu: sembol ve ad, son fiyat, alış (ask), satış (bid) ve 24 saatlik değişim.

| Fonksiyon | Ne yapar |
|---|---|
| `QuoteBoard({ rows, elements, loading, failed, pollMs, selectedSymbol, onSelect, onRetry })` | Başlık altında yenileme aralığını `pollMs`'ten yazar ("20 saniyede bir yenilenir"); arama kutusunu ve sıralama durumunu tutar, satırları `filterBoard` ve `sortBoard` ile (`useMemo`) hazırlar; yüklenirken iskelet, eşleşme yoksa "Aramayı temizle" düğmeli boş durum, son yenileme başarısızsa eski satırlar dururken uyarı gösterir. |
| `changeSort(key)` | Sıralamayı `nextSort` ile günceller. |
| `QuoteTable({ rows, elements, sort, onSort, selectedSymbol, onSelect })` | Satırları yüksekliği sınırlı, başlığı yapışık bir kaydırıcıda çizer; satırın tamamını kaplayan (`::after`) basılı/basılı değil düğmeyle tıklanan satırı seçer; telefonda alış/satış sütunlarını gizler. |
| `SortableHead({ column, sort, onSort, numeric, className, children })` | Tıklanınca tabloyu o sütuna göre sıralayan başlık hücresi; yönü okla gösterir ve `aria-sort` ile ekran okuyucuya söyler. |
| `BoardSkeleton()` | Fiyat tablosu şeklinde 10 satırlık iskelet çizer. |

### `web-app/src/components/commerce/QuoteTicket.tsx`
Seçili elementin alım-satım kartı.

| Fonksiyon | Ne yapar |
|---|---|
| `QuoteTicket({ element, ticker, children })` | Element hücresini ve adını (üst etikette sembol büyük harfe çevrilmez: "Au"), son fiyatı 24 saatlik değişim ve yöne göre renklenen `Sparkline` ile (en düşük/en yüksek), alış, satış ve stok satırlarını, `/shop?symbol=<sembol>` "Satın al" bağlantısını ve altında satış formunu (ya da giriş çağrısını) gösterir. |

### `web-app/src/components/commerce/SagaSteps.tsx`
Sipariş saga'sını dört adımlı bir şema ve başarısızlıktaki telafi yoluyla anlatan kutu.

| Fonksiyon | Ne yapar |
|---|---|
| `STEP_TEXT` | Her saga durumunda ne olduğunu sade Türkçe anlatan metinler (Idempotency-Key, stok ayırma, sanal kargo, kasaya yazma). |
| `SagaSteps()` | `ORDER_FLOW` adımlarını sipariş listeleriyle aynı Türkçe etiketlerle numaralı şema olarak çizer ve altında Failed · Compensated durumunda stoğun bırakılıp kredinin iade edildiğini anlatır. |

### `web-app/src/components/commerce/SellForm.tsx`
Bir varlığın bir kısmını masaya geri satma formu (`SaleDraft` türünü de dışa verir).

| Fonksiyon | Ne yapar |
|---|---|
| `SellForm({ symbol, elementName, elements, holdings, bid, draft, onDraftChange, onSold })` | Varlıklar yüklenirken iskelet, yoksa "mağazadan al" bağlantısı, varsa ürün seçimi, "Tümü" kısayollu gram alanı ve canlı tahmini tutarı (bid × ürün çarpanı × gram) gösterir. |
| `productLabel(row)` | Seçim listesindeki ürün adını üretir: saf elementse "Saf element", değilse formül. |
| `edit(next)` | Alan hatasını temizler ve taslağı (ürün slug'ı ve gram) sayfaya bildirir. |
| `submit(event)` | `saleProblem` ya da bid eksikliği varsa hatayı `flushSync` ile önce çizip gram alanına odaklanır; yoksa `walletService.sell` ile satar, "n g … satıldı" bildirimi gösterir ve `onSold` çağırır; sunucu hatasını kutuda gösterir. |

### `web-app/src/components/commerce/SkuCard.tsx`
Mağazadaki tek ürün kartı.

| Fonksiyon | Ne yapar |
|---|---|
| `KIND_LABEL` | Ürün türlerinin Türkçe adı: başka biçim (allotrop), bileşik, preparat. |
| `SkuCard({ sku, elementName, unitPrice, stock, inCart, pack, disabled, onAdd, onShowElement })` | Formülü, türü, Türkçe adı, katalogu ana elemente süzen bağlantıyı, varsa açılır "Kimyasal özellikler" (molar kütle, IUPAC adı, PubChem kaynağı) panelini, gram fiyatını, stoğu ya da sepetteki gramı ve "+paket g" düğmesini çizer; sepetteyse kenarı vurgular. Düğmenin erişilebilir adı ürün adını da içerir ("Altın (saf gram) · Au: sepete 1 g ekle"), böylece aynı formüllü ürünler ayrılır. |

### `web-app/src/components/commerce/SkuCatalog.tsx`
Yükleniyor, hata ve boş durumları olan, 24'er gösteren ürün ızgarası.

| Fonksiyon | Ne yapar |
|---|---|
| `SkuCatalog({ status, skus, filterKey, emptyText, onRetry, renderSku })` | Durumlara göre iskelet, "Yeniden dene" ya da boş durum çizer; ürünleri `PAGE_SIZE` (24) kadar gösterip "Daha fazla göster" ile kalan sayıyı açar; filtre (`filterKey`) değişince ilk sayfaya döner. |

### `web-app/src/components/commerce/Sparkline.tsx`
Son fiyatların kendi en düşük–en yüksek aralığına ölçeklenmiş küçük çizgi grafiği.

| Fonksiyon | Ne yapar |
|---|---|
| `Sparkline({ prices, className })` | Fiyatları 100 × 40 kutuda çizgi ve altı soluk dolgulu alan olarak çizer, rengi `currentColor`'dan alır ve en düşük/en yüksek değeri erişilebilir ada yazar; ikiden az noktada hiçbir şey çizmez. |

### `web-app/src/components/commerce/WebhooksPanel.tsx`
Hesabın webhook paneli: fiyat ve sipariş olayları için HMAC gizli anahtarlı bir HTTPS adresi kaydetme, listeleme ve onayla silme.

| Fonksiyon | Ne yapar |
|---|---|
| `WebhooksPanel()` | Adres ve gizli anahtar formunu, her webhook'a verilen `price.updated` ve `order.updated` olay rozetlerini, hata kutusunu ve listeyi çizer; imzanın `X-Element-Signature` HMAC-SHA256 olduğunu yazar. |
| `reload()` | `webhookService.list()` ile webhook'ları yükler. |
| `register(event)` | Adresi `webhookUrlProblem` ile denetler; uygunsa `webhookService.create` ile kaydeder, bildirim gösterir, formu temizleyip listeyi yeniler. |
| `remove(hook)` | Webhook'u siler; hatada bildirim gösterip reddeder (onay penceresi açık kalır), başarıda listeyi yeniler. |
| `HookList({ state, onRetry, onRemove })` | Yüklenirken iskelet, hatada "Yeniden dene", boşken not, doluyken adres ve olaylarla listeyi çizer; her satıra onaylı "Sil" düğmesi koyar. |

### `web-app/src/components/developer/AccountSections.tsx`
API dokümanlarının anahtarlı v1 bölümleri: kimlik doğrulama ve webhook'lar.

| Fonksiyon | Ne yapar |
|---|---|
| `KeyedEndpointsSection()` | `#v1-auth` bölümünde `X-API-Key` başlığını, anahtarın hesap sayfasında üretildiğini, anahtar başına saniyede 1–10 istek sınırını ve `X-RateLimit-*` başlıklarını, anahtarın koda değil `API_KEY_ENV` ortam değişkenine konması gerektiğini anlatır. |
| `WEBHOOK_EVENTS` | İki webhook olayı ve gövdeleri: `price.updated` ve `order.updated`. |
| `WebhooksSection()` | `#webhooks` bölümünde olay tablosunu ve alıcı kurallarını listeler: `X-Element-Signature` HMAC-SHA256 imzası, 5 dakikadan eski `Timestamp`'i reddetme, `OrderId + Status` tekrarını yok sayma, yalnız herkese açık HTTPS adresi, hesap başına en çok 10 webhook ve 10 sn sonra bir yeniden deneme. |

### `web-app/src/components/developer/ApiFacts.tsx`
Bir v2 istemcisinin bilmesi gereken altı kural.

| Fonksiyon | Ne yapar |
|---|---|
| `FACTS` | Altı kuralın simge, başlık ve metni: anahtar gerekmez, hız sınırı (atlasta dakikada 300, kapı arkasında 10 sn'de 60), açık CORS, ETag ve 304, alan seçimi, kaynaklı Türkçe kayıt. |
| `ApiFacts()` | `FACTS` listesini bir, iki ya da üç sütunlu ızgarada simgeli maddeler olarak çizer. |

### `web-app/src/components/developer/ApiPlayground.tsx`
`/docs` sayfasının etkileşimli istek tezgâhı: istek seç, curl/JavaScript/Python olarak oku, gönder, durumu, ETag'i ve JSON'u incele.

| Fonksiyon | Ne yapar |
|---|---|
| `keyHint(path, keyed, hasKey)` | Seçili isteğin anahtar isteyip istemediğini ve anahtarın nereden geldiğini açıklayan ipucunu üretir (bilimsel API açık; anahtarsızsa hesap sayfası bağlantısı). |
| `ApiPlayground()` | Bilimsel v2 ve (hesaplar açıksa) v1 simülasyon isteklerini gruplu seçim listesinde sunar, "Demir"/"Su" hızlı örneklerini, "Aynı ETag ile sor" ve "İsteği gönder" düğmelerini, kod örneklerini ve `ResponsePanel`'i gösterir. |
| `run(target, extraHeaders)` | Gönderimi `api_example_run` olarak izler (`track`); v1 yolundaysa ve tarayıcıda anahtar varsa `X-API-Key` ekleyip isteği gönderir. |
| `runPreset(target)` | Seçimi hızlı örneğe çevirip hemen gönderir. |

### `web-app/src/components/developer/DocsToc.tsx`
Dokümanların "Bu sayfada" içindekiler listesi.

| Fonksiyon | Ne yapar |
|---|---|
| `DocsToc({ groups, activeId, onNavigate })` | Başlıklı gruplar hâlinde sayfa içi bağlantıları çizer, görünen bölümü `aria-current="location"` ve sol çizgiyle işaretler, tıklanınca `onNavigate`'e kimliği verir. |

### `web-app/src/components/developer/docText.ts`
API dokümanlarındaki düz metin paragraflarının sınıfını (`proseClass`: gövde boyu ve okunur satır genişliği) dışa verir (fonksiyon yok).

### `web-app/src/components/developer/endpoints.ts`
`/developers` ve `/docs` sayfalarının paylaştığı sabit API kataloğu: tezgâhın gönderebileceği istekler ve doküman tablolarının satırları.

| Fonksiyon | Ne yapar |
|---|---|
| `IRON_PATH` / `WATER_PATH` | Varsayılan demir ve su istek yolları. |
| `SCIENCE_ENDPOINTS` | Anahtarsız bilimsel v2 istekleri: tam demir kaydından alan seçimine, aramaya ve 400/404 hata gövdelerine kadar. |
| `SIMULATION_ENDPOINTS` | Yalnız hesaplı derlemede gösterilen v1 kredi simülasyonu istekleri; bazıları anahtar ister (`keyed`). |
| `isSciencePath(path)` | Yol `/api/v2` ile başlıyorsa (açık bilim API'si) true döner. |
| `findEndpoint(path)` | Yolun tezgâh kataloğundaki girdisini döner; katalog dışıysa `undefined`. |
| `SCIENCE_ROUTES` | `/developers` hızlı listesi için beş v2 yolu, döndürdükleri ve kabul ettikleri. |
| `QUERY_PARAMETERS` | v2 sorgu parametreleri (`view`, `include`, `fields`, `q`, filtreler, sayfalama), nerede geçerli oldukları ve anlamları. |
| `SIMULATION_ROUTES` | v1 simülasyon yolları, yöntemleri, anahtar isteyip istemedikleri ve amaçları. |

### `web-app/src/components/developer/InlineCode.tsx`
Akan metin içindeki tek aralıklı kod parçası (parametre, başlık, yol adları).

| Fonksiyon | Ne yapar |
|---|---|
| `InlineCode({ children })` | İçeriği ince çerçeveli, hafif dolgulu bir `<code>` içinde yazar. |

### `web-app/src/components/developer/LiveRequest.tsx`
`/developers` sayfasının giriş konsolu: demir isteği curl, JavaScript ve Python olarak ve canlı yanıtı.

| Fonksiyon | Ne yapar |
|---|---|
| `OFFLINE_SAMPLE` | API'ye ulaşılamadığında yanıtın şeklini göstermek için hazırlanmış çevrimdışı demir örneği. |
| `LiveRequest()` | `GET` rozetli istek satırını, kod örneklerini ve `ResponsePanel`'i (hatada çevrimdışı örnekle) gösterir; açılışta bir kez yükler, altına yanıtın canlı mı yedek mi olduğunu yazar. |
| `run()` | Gönderimi `api_example_run` olarak izler ve isteği yeniden gönderir. |

### `web-app/src/components/developer/MethodBadge.tsx`
HTTP yöntemi etiketi.

| Fonksiyon | Ne yapar |
|---|---|
| `MethodBadge({ method })` | `GET`'i yeşil, `POST`'u bilgi tonunda tek aralıklı rozet olarak çizer. |

### `web-app/src/components/developer/NextSteps.tsx`
`/developers` sayfasından sonra gidilecek yerler ve makine sözleşmeleri.

| Fonksiyon | Ne yapar |
|---|---|
| `NextSteps()` | `/docs`, `/kilavuz` ve `/data` sayfalarını `LinkCard` olarak, yanında v2 OpenAPI ile element ve bileşik JSON şeması bağlantılarını "Makine sözleşmeleri" panelinde gösterir. |

### `web-app/src/components/developer/ReferenceSections.tsx`
v2 başvuru bölümleri: sözleşmeler, örnekler, ETag ve parametreler.

| Fonksiyon | Ne yapar |
|---|---|
| `ReferenceSection()` | `#reference` bölümünde JSON şema ve OpenAPI bağlantılarını, element/bileşik kimlik kurallarını, v1 mağaza SKU'sunun bilimsel kimlik olmadığını ve `/api/v2/coverage`'ın yalnız atlas ana bilgisayarında (:5080) olduğunu anlatır. |
| `ExamplesSection()` | `#examples` bölümünde demir, su ve arama için kopyalanabilir üç `curl` komutu gösterir. |
| `EtagSection()` | `#etag` bölümünde zayıf ETag, bir saatlik önbellek ve `If-None-Match` ile 304'ü anlatır ve iki adımlı `curl` örneği verir. |
| `ParametersSection()` | `#parameters` bölümünde `QUERY_PARAMETERS` tablosunu (parametre, nerede, ne işe yarar) çizer. |

### `web-app/src/components/developer/ResponsePanel.tsx`
Tezgâh isteğinin sonucu: yüklenirken iskelet, renkli JSON ile durum ve ETag ya da yeniden deneme düğmeli hata.

| Fonksiyon | Ne yapar |
|---|---|
| `ResponseStatus({ response })` | Yanıt başlık satırını çizer: tona göre renkli `HTTP n` rozeti, ETag ve gidiş-dönüş süresi (ms). |
| `ResponseSkeleton({ height })` | JSON paneli şeklinde ve paneli kadar yüksek iskelet çizer. |
| `ResponsePanel({ response, error, pending, onRetry, maxHeight, fallback })` | Hatada "İstek tamamlanmadı" uyarısını (ve varsa yedek içeriği), yanıt varsa durum başlıklı `CodeBlock`'u (yeni istek beklerken soluk), hiçbiri yoksa iskeleti gösterir; gönderimi ve gelen durumu ekran okuyucuya duyurur. |

### `web-app/src/components/developer/ResponseSections.tsx`
Yanıt biçimini anlatan doküman bölümleri.

| Fonksiyon | Ne yapar |
|---|---|
| `SummarySection()` | `#summary` bölümünde element ve bileşik özetinin neleri içerdiğini ve liste gövdesinin `{ info, results }` biçimini anlatır. |
| `ErrorsSection()` | `#errors` bölümünde 400, 404, 304 ve 429 durumlarını problem+json başlıkları ve ne zaman oluştuklarıyla tablo yapar; tezgâhın atlas mı kapı mı profilinden okuduğunu `SCIENCE_BASE_URL`'den çıkarır ve 400/404 gövdeleri için `curl` örneği verir. |
| `EnglishSection()` | `#english` bölümünde Türkçe okumayanlar için `lang="en"` işaretli kısa İngilizce özet yazar. |

### `web-app/src/components/developer/SimulationSection.tsx`
v1 kredi simülasyonu bölümü; varsayılan kapalıdır, `/docs#simulation` onu açar.

| Fonksiyon | Ne yapar |
|---|---|
| `RULES` | Simülasyon kuralları: %0,8 alış/satış makası, işlem başına en fazla %3 fiyat etkisi, 10.000 başlangıç kredisi ve 402, `balanceElx` gibi eski alan adları, bileşik fiyatı, `Idempotency-Key`, miktar biçimi ve 409. |
| `SimulationSection({ open, onOpenChange })` | `/demo` bağlantılı açıklamanın altında kontrollü bir açılır panelde kuralları, `SIMULATION_ROUTES` tablosunu (yöntem rozeti ve "Var/Yok" anahtar rozeti) ve sipariş verme ile kasadan satma `POST` örneklerini gösterir. |

### `web-app/src/components/developer/useApiRequest.ts`
Tezgâhlar için API'ye GET isteği atan hook (`ApiResponse` türünü de dışa verir).

| Fonksiyon | Ne yapar |
|---|---|
| `requestApi(path, headers, signal)` | İsteği `fetchJson` ile önbelleksiz ve 10 sn zaman aşımıyla atar; durum, ETag, `playgroundView` ile hazırlanmış gövde ve süreyle yanıt sonucu döner; zaman aşımında "10 saniye içinde yanıt gelmedi.", ağ hatasında "Sunucuya ulaşılamadı." der, iptalde `null` döner. |
| `useApiRequest(initialPath)` | Açılışta `initialPath`'i yükler, `response`, `error`, `pending` ve `send` döndürür; yeni istek gelirken son yanıt görünür kalır, bileşen kalkınca uçuştaki istek iptal edilir. |
| `start(path, headers)` | Uçuştaki isteği iptal edip yenisini başlatır; yalnız en son isteğin sonucunu duruma yazar. |
| `send(path, headers)` | Beklemede durumunu açıp `start`'ı çağırır. |

### `web-app/src/components/developer/useScrollSpy.ts`
İçindekiler listesini vurgulamak için görünen bölümü izleyen hook.

| Fonksiyon | Ne yapar |
|---|---|
| `useScrollSpy(ids)` | `IntersectionObserver` ile yapışık başlığın altından ekranın üst ~%40'ına uzanan okuma şeridindeki ilk bölümün kimliğini (`ids` sırasıyla) döndürür; `ids` sabit olmalıdır. |

### `web-app/src/components/system-guide/CodeMap.tsx`
Bir bölümün kod haritası dosyalarını "tümünü aç" anahtarlı açılır liste olarak çizer; bir dosyaya ya da satırına giden derin bağlantı o dosyayı açar.

| Fonksiyon | Ne yapar |
|---|---|
| `rowCount(file)` | Dosyanın tablolarındaki toplam satır (fonksiyon) sayısını döner. |
| `fileOfAnchor(files, anchor)` | Çapanın gösterdiği dosyayı bulur: dosyanın kendisi ya da tablo satırlarından biri. |
| `CodeMapFile({ file, open, onOpenChange, selected })` | Tek dosyayı tek aralıklı yol başlığı, amaç satırı ve (tablosu varsa) satır sayısı rozetli açılır panelle çizer; tablosu yoksa düz başlık olur; üzerine gelince çapa bağlantısı belirir, derin bağlantı hedefiyse vurgulanır. |
| `CodeMap({ files })` | "n dosya · m fonksiyon" sayacını ve "Tümünü aç/kapat" düğmesini gösterir; yeni bir derin bağlantının dosyasını bir kez açar, sonra okur onu yeniden kapatabilir. |
| `setFileOpen(anchor, open)` | Tek bir dosyayı açık kümesine ekler ya da çıkarır. |

### `web-app/src/components/system-guide/guide-model.ts`
`scripts/write-guide.mjs`'in `docs/kilavuz/*.md`'den ürettiği `src/data/guide.json` dosyasının türleri ve `/kilavuz` sayfasının saf yardımcıları (node testleri doğrudan içe aktarabilsin diye React'sızdır).

| Fonksiyon | Ne yapar |
|---|---|
| `GUIDE_ROOT` | Genel bakış sayfasının rotası (`/kilavuz`). |
| `GUIDE_GROUPS` | Kenar çubuğu grupları okuma sırasıyla (Kapı ve ortak, Bilim, Hesap, Ticaret demosu, Altyapı, Arayüz); sayfası olmayan slug'lar atlanır. |
| `groupGuidePages(pages)` | Genel bakış sayfasını ayırır, sayfaları `GUIDE_GROUPS`'a göre gruplar, hiçbir gruba girmeyenleri "Diğer"e koyar ve boş grupları atar. |
| `splitGuideTitle(title)` | "Sipariş servisi (order-service)" başlığını ad ("Sipariş servisi") ve etikete ("order-service") ayırır. |
| `inlineText(tokens)` | Satır içi belirteçlerin düz metnini üretir (kalın içindekiler dahil). |
| `rowEntry(page, row, where)` | Bir tablo satırından arama girdisi kurar: derin bağlantı, ad, son hücreden açıklama, "Sayfa · yer" konumu ve Türkçe katlanmış arama anahtarları. |
| `buildGuideSearchIndex(pages)` | Her sayfayı arama girdilerine düzler: kod haritası dosyaları, onların satırları ve bölümlerdeki her tablo satırı. |
| `searchGuide(index, query, limit)` | Tüm arama kelimelerini (Türkçe katlamalı) içeren girdileri bulur; sorgunun tamamı adda geçenleri önce, sonra tüm kelimeleri adda geçenleri, sonra kalanları sıralar ve toplamla birlikte en fazla `limit` (60) sonuç döner. |
| `rank(entry)` (`searchGuide` içinde) | Girdinin sıra derecesini (0, 1 ya da 2) hesaplar. |

### `web-app/src/components/system-guide/GuideArticle.tsx`
Tek bir kılavuz sayfası: özetli başlık, özellik listesi ve bütün bölümler.

| Fonksiyon | Ne yapar |
|---|---|
| `SectionBody({ blocks })` | Art arda gelen kod haritası dosyalarını tek bir `CodeMap`'te toplar, diğer her bloğu `GuideBlock` ile tek başına çizer. |
| `GuideArticle({ page, eyebrow })` | `PageHeader` ile sayfa adını ve özetini, `KeyValue` ile özellik tablosunu, ardından her `##` bölümünü çapalı `Section` olarak çizer. |

### `web-app/src/components/system-guide/GuideBlock.tsx`
Bir kılavuz bölümündeki dosya olmayan tek blok: paragraf, liste, kod ya da tablo.

| Fonksiyon | Ne yapar |
|---|---|
| `CODE_TITLES` | Kod bloğu dillerinin başlıkları: Mermaid diyagramı, PowerShell, Terminal. |
| `ListItems({ items })` | Liste öğelerini ve bir seviye iç içe alt maddelerini çizer. |
| `GuideBlock({ block })` | Paragrafı düz metin, numaralı listeyi tek aralıklı sayaç rozetli adımlar, madde listesini noktalı liste, kodu başlıklı `CodeBlock` (mermaid ise mermaid.live notuyla), tabloyu `GuideTable` olarak çizer. |

### `web-app/src/components/system-guide/GuideLayout.tsx`
`/kilavuz` doküman düzeni.

| Fonksiyon | Ne yapar |
|---|---|
| `GuideLayout({ sidebar, toolbar, children })` | `lg` üstünde solda yapışık, kendi içinde kayan kenar çubuğu; daha küçük ekranlarda içeriğin üstünde bir ya da iki sütunlu araç çubuğu kurar. |

### `web-app/src/components/system-guide/GuideNav.tsx`
Kılavuzun masaüstü kenar çubuğu ve telefon/tablet sayfa seçicisi.

| Fonksiyon | Ne yapar |
|---|---|
| `NavItem({ page, label, isCurrent })` | Sayfa bağlantısını çizer; geçerli sayfaysa `aria-current="page"` ile işaretler ve altında bölümlerini sayfa içi bağlantılar olarak listeler. |
| `GuideNav({ overview, groups, current })` | "Genel bakış" bağlantısını ve ardından grup başlıklarıyla servis sayfalarını dizer. |
| `GuidePicker({ overview, groups, current })` | Geçerli sayfanın adını taşıyan düğmeyle kenar çubuğu listesini açar; yalnız bağlantıya tıklamak gezinir (oklarla dolaşmak sayfayı değiştirmez); açıldığı konum anahtarını hatırladığı için her gezinmede kendiliğinden kapanır, izlenen bağlantıdan sonra odak düğmeye geçer. |
| `handleListClick(event)` | Listede bir bağlantıya tıklanınca odağı tetik düğmesine taşır. |
| `handleListKeyDown(event)` | Escape'te listeyi kapatıp odağı düğmeye verir. |

### `web-app/src/components/system-guide/GuideSearchResults.tsx`
Tüm kılavuz sayfalarındaki arama sonuçları: fonksiyon ya da dosya adı, yeri ve ne yaptığı.

| Fonksiyon | Ne yapar |
|---|---|
| `moveFocus(event)` | Sonuç listesinde yukarı/aşağı ok tuşlarıyla bağlantılar arasında odak taşır. |
| `GuideSearchResults({ query, total, results, onSelect, listRef })` | Sonuç yoksa `h1` başlıklı boş durum, varsa toplamı (ve kaçının gösterildiğini) yazar ve her sonucu satıra derin bağlantı olarak listeler; seçilince `onSelect` sorguyu temizler. |

### `web-app/src/components/system-guide/GuideSkeleton.tsx`
Kılavuz şeklinde yükleniyor görünümü.

| Fonksiyon | Ne yapar |
|---|---|
| `GuideSkeleton()` | `GuideLayout` içinde arama kutusu ve gezinme satırları, sayfa başlığı ve özellik satırları biçiminde iskelet çizer ve "Kılavuz yükleniyor…" diye duyurur. |

### `web-app/src/components/system-guide/GuideTable.tsx`
Kılavuz tablosunu şekline göre çizer; her satır bir derin bağlantı hedefidir.

| Fonksiyon | Ne yapar |
|---|---|
| `KIND_TONES` | Tür sütunu (`Yöntem`, `Yön`) değerlerinin rozet tonları: GET yeşil, POST bilgi, PUT/PATCH uyarı, DELETE kırmızı, Yayınlar varsayılan, Dinler bilgi. |
| `KindBadges({ cell })` | "GET, OPTIONS" gibi hücreyi tür başına bir rozete böler; bilinmeyen türler nötr kalır. |
| `rowTarget(row, activeAnchor)` | Satırın derin bağlantı özniteliklerini üretir: `id`, `tabIndex=-1` ve adresteki çapaysa `data-state="selected"`. |
| `DefinitionRows({ table, activeAnchor })` | İki sütunlu tabloyu (fonksiyon → ne yapar) tanım listesi olarak çizer: telefonda ad açıklamanın üstünde, `sm` üstünde yan yana. |
| `isPageIndex(table)` | Tablonun genel bakıştaki "Bölümler" gibi, ilk hücreleri sayfa bağlantısı olan bir sayfa dizini olup olmadığını söyler. |
| `PageIndex({ table })` | Sayfa dizinini `LinkCard`'lar olarak çizer; sayfası henüz yazılmamış satırı "Sayfa henüz yazılmadı" yazan kesik çizgili karta çevirir. |
| `nameColumns(table)` | Satırı adlandıran baştaki sütunları bulur: varsa tür sütunu ve ondan sonraki ad. |
| `StackedRows({ table, activeAnchor })` | Telefonda geniş tabloyu her satır için bir blok yapar: üstte rozet ve ad, altında kalan sütunlar küçük etiket/değer çiftleri olarak. |
| `WideTable({ table, activeAnchor })` | `md` üstünde geniş tabloyu rozet ve ad sütunlu `Table` olarak çizer. |
| `GuideTable({ table })` | `useMediaQuery` ve sütun sayısına göre `PageIndex`, `DefinitionRows`, `StackedRows` ya da `WideTable` seçer. |

### `web-app/src/components/system-guide/hooks.ts`
Kılavuz sayfasının medya sorgusu, çapa ve kaydırma hook'ları.

| Fonksiyon | Ne yapar |
|---|---|
| `useMediaQuery(query)` | `matchMedia` sonucunu `useSyncExternalStore` ile canlı döndürür; telefonda yalnız stil değil yapı değiştiği yerlerde kullanılır (ikisini birden çizmek derin bağlantı kimliklerini çoğaltırdı). |
| `useActiveAnchor()` | Adresteki çapayı döndürür (`#src-db-pool-ts` → "src-db-pool-ts"); yoksa boş metin. |
| `useAnchorScroll()` | Her gezinmeden sonra web yazı tipleri yüklenince çapa hedefine kaydırıp odak verir (aynı sayfada yumuşak, sayfaya ilk inişte anında); çapa yoksa en üste atlar. |

### `web-app/src/components/system-guide/InlineContent.tsx`
Kılavuzun satır içi belirteçlerini çizer: metin, `kod`, **kalın** ve kılavuz ya da dış bağlantılar.

| Fonksiyon | Ne yapar |
|---|---|
| `InlineContent({ tokens, code })` | Kodu `chip` (akan metin için çerçeveli) ya da `plain` (adlar için çıplak) biçimde yazar ve 24 karaktere kadar kodu kırılmaz yapar; `/` ile başlayan bağlantıyı router bağlantısı, diğerlerini yeni sekmede açılan `ExternalLink` yapar. |

### `web-app/src/components/system-guide/useGuide.ts`
Üretilmiş sistem kılavuzunu (yaklaşık 600 kB'lık `guide.json`, sayfa JavaScript'ine gömülmeyip ayrı bir statik dosya olarak) yükleyen hook.

| Fonksiyon | Ne yapar |
|---|---|
| `loadGuide()` | `guide.json`'ı oturumda bir kez çeker, sayfaları gruplayıp arama dizinini kurar ve sonucu saklar; başarısız istek unutulur ki yeniden deneme yeniden çeksin. |
| `useGuide()` | İlk yüklemeden sonra hemen `ready`, aksi hâlde `loading`, ardından `ready` ya da yeniden deneme fonksiyonlu `error` durumunu döndürür. |
| `retry()` (`useGuide` içinde) | Hata durumunu temizleyip yeni bir yükleme denemesi başlatır. |

### `web-app/scripts/finalize-static.mjs`
Yalnız science-service derlemesinde (`science-service/Dockerfile`, `npm run build` sonrası) çalışır; konteyner giriş betiği olmadığı için genel kökeni derlenmiş `index.html`, `robots.txt` ve `sitemap.xml` içindeki `__SITE_URL__` yer tutucularına yazar.

| Fonksiyon | Ne yapar |
|---|---|
| (üst düzey betik kodu) | `VITE_PUBLIC_SITE_URL`'yi (yoksa `http://127.0.0.1:5080`) okur, HTTP(S) olmayan kökeni reddeder, `dist/` altındaki üç dosyada `__SITE_URL__`'yi kökenle değiştirir ve kullanılan kökeni yazdırır. |

### `web-app/scripts/write-coverage.mjs`
Depodaki bilimsel snapshot'lardan `src/data/coverage.json` dosyasını (kayıt sayıları ve hiç verisi olmayan element bölümleri) üretir; `predev` ve `build` çalıştırır.

| Fonksiyon | Ne yapar |
|---|---|
| `readJson(path)` | web-app klasörüne göre verilen JSON dosyasını okuyup çözer. |
| `isPopulated(value)` | Değerin ya da içindeki herhangi bir şeyin veri taşıyıp taşımadığını söyler (null ve boş metin sayılmaz). |
| (üst düzey betik kodu) | catalog ve compound snapshot'larını okur; hiçbir elementte dolu olmayan bölümleri, element ve bileşik sayısını, editoryal özeti olan kayıt sayısını, fotoğraflı element ve yapı görselli bileşik sayısını ve tekilleştirilmiş alım tarihlerini (`retrievedAt`) yazar. |

### `web-app/scripts/write-guide.mjs`
`docs/kilavuz/*.md` sayfalarını uygulamadaki `/kilavuz` kılavuzu için `src/data/guide.json`'a çeviren el yazımı ayrıştırıcı (markdown bağımlılığı yok); kalıba uymayan dosyada `dosya:satır` ile hata verip derlemeyi durdurur, `predev`, `build` ve `pretest` çalıştırır.

| Fonksiyon | Ne yapar |
|---|---|
| `slugify(text)` | Türkçe katlamalı, URL'de güvenli çapa üretir ("Kod haritası" → "kod-haritasi", "src/db/pool.ts" → "src-db-pool-ts"). |
| `pagePath(file)` | Sayfanın rotasını döner: `README.md` kılavuz kökü (`/kilavuz`), diğerleri `/kilavuz/<slug>`. |
| `slugOf(file)` | Dosya adından `.md`'yi atıp küçük harfli slug üretir. |
| `splitTableRow(line)` | GFM tablo satırını kaçırılmamış dikey çizgilerden böler; `\\|` (kod içinde de) hücrede düz çizgi olur, dış çizgiler atılır. |
| `parseInline(text, resolveLink)` | Satır içi markdown'ı belirteçlere çevirir: metin, `kod`, **kalın** (içinde kod olabilir) ve bağlantı; çözülemeyen bağlantı yalnız etiketi bırakır. |
| `pushText(value)` (`parseInline` içinde) | Düz metni bir önceki metin belirtecine ekler ya da yeni belirteç açar. |
| `inlineText(tokens)` | Belirteçlerin düz metnini üretir (arama etiketleri, çapalar, SEO açıklamaları için). |
| `linkResolver(knownFiles)` | Bağlantı çözücü kurar: var olan kılavuz sayfası bağlantısını `#çapa`sıyla uygulama rotasına çevirir, http(s) adresini korur, diğerlerini (depo dosyaları, henüz yazılmamış sayfalar) düz metne düşürür. |
| `isTableStart(lines, index)` | Satırın `\|` ile başlayıp altında ayırıcı satır olan bir tablo başlangıcı olup olmadığını söyler. |
| `isBlockStart(lines, index)` | Satırın başlık, kod çiti, alıntı, liste ya da tablo gibi yeni bir blok başlatıp başlatmadığını söyler. |
| `parseGuidePage(markdown, file, knownFiles)` | Tek sayfayı `{ slug, path, file, title, summary, facts, sections }` yapısına ayrıştırır; ilk `##`'den önce yalnız `>` özet ve özellik tablosuna izin verir, `###` ile kod haritası dosyası açar, `####` ve kapanmamış kod çitini reddeder. |
| `fail(message)` (`parseGuidePage` içinde) | Okunan bloğun başladığı satır numarasıyla `dosya:satır: mesaj` hatası fırlatır. |
| `uniqueAnchor(text)` (`parseGuidePage` içinde) | Sayfa içinde benzersiz çapa üretir; tekrar eden çapaya `-2`, `-3` … ekler. |
| `pushBlock(block)` (`parseGuidePage` içinde) | Bloğu açık bölüme ekler; açık bir kod haritası dosyası ilk paragrafı amaç satırı, tabloları fonksiyon tablosu olarak alır, başka her blok dosyayı kapatıp bölüme geçer. |
| `readTable()` (`parseGuidePage` içinde) | Başlık satırını ve ayırıcıdan sonraki tüm `\|` satırlarını okur. |
| `readList()` (`parseGuidePage` içinde) | `-` ya da `1.` listesini bir seviye iç içe maddeleri ve girintili devam satırlarıyla okur. |
| `buildGuide(directory)` | Klasördeki her `.md` dosyasını önce genel bakış, sonra dosya adına göre sıralayıp ayrıştırır. |
| (ana çalıştırma bloğu) | Betik doğrudan çalıştırıldığında kılavuz klasörünün varlığını denetler ve sonucu sıkıştırılmış JSON olarak `src/data/guide.json`'a yazar. |

### `web-app/scripts/write-schema.mjs`
Depodaki snapshot'ların tam kayıtlarından `public/schema/elements.schema.json` ve `compounds.schema.json` JSON şemalarını çıkarır; `predev`, `build` ve `pretest` çalıştırır.

| Fonksiyon | Ne yapar |
|---|---|
| `typeOf(value)` | Değerin JSON türünü döner (`null`, `array` ya da `typeof` sonucu). |
| `inferSchema(values)` | Verilen tüm değerlerin uyduğu bir draft-07 şeması çıkarır: nesnelerde her anahtar için özyineli şema, her kayıtta bulunan anahtarları `required`, dizilerde öğe şeması, birden çok türde `anyOf`; hep null olan alana tür atamaz, yalnız "veri yok, sıfır değil" açıklaması koyar. |
| (üst düzey betik kodu) | Element ve bileşik snapshot'larını okuyup başlık ve açıklama (özet/`fields`/`include` yanıtlarının `required`'ı karşılamak zorunda olmadığı) eklenmiş şemaları yazar. |

### `web-app/scripts/write-sitemap.mjs`
Her bileşik, sabit sayfalar ve 118 element için `public/sitemap.xml` yazar; `__SITE_URL__` konteyner açılışında (`docker-entrypoint.sh`) ya da `finalize-static.mjs` ile gerçek kökene çevrilir.

| Fonksiyon | Ne yapar |
|---|---|
| (üst düzey betik kodu) | Element sembollerini `src/services/elementData.ts` içindeki `const rawElements = "…"` metninden ayrıştırır (bulamazsa ya da 118 değilse hata verir), bileşik slug'larını snapshot'tan okur, 15 sabit sayfayla birleştirip `<url><loc>` satırları yazar ve URL sayısını yazdırır. |

## Yapılandırma

`VITE_*` değerleri derleme anında pakete gömülür; değiştirince yeniden derlemek (Docker'da imajı yeniden kurmak) gerekir. Örnek değerler `web-app/.env.example` dosyasındadır.

| Değişken | Varsayılan | Ne işe yarar |
|---|---|---|
| `VITE_API_BASE_URL` | `http://localhost:5000/api/v1` | Hesap ve ticaret kapısının (gateway v1) kökü; sondaki `/` atılır, gateway kökeni (`API_ORIGIN`) bundan `/api/v1` kesilerek bulunur. Docker web imajı aynı varsayılanla, bağımsız atlas imajı `/api/v1` ile derlenir. |
| `VITE_SCIENCE_API_BASE_URL` | geliştirmede `/api/v2`, derlemede `<API_ORIGIN>/api/v2` | Bilim API'sinin kökü; API sayfalarındaki kopyalanabilir adresler (`publicApiUrl`) de buna göre kurulur, göreli değer sayfanın kökenini alır. |
| `VITE_ACCOUNTS_ENABLED` | açık (yalnız `false` kapatır) | `false` iken giriş, kayıt, ayarlar ve ticaret rotaları `FeatureUnavailable` gösterir, menülerde hesap bağlantıları çıkmaz, defter hesapla eşitlenmez. Bağımsız atlas imajı `false` ile derlenir. |
| `VITE_PUBLIC_SITE_URL` | boş → tarayıcının `window.location.origin` | Kanonik bağlantı, Open Graph ve JSON-LD adresleri (`getPublicSiteUrl`). Docker web imajında varsayılan `http://localhost:6241`; `scripts/finalize-static.mjs` bunu (yoksa `http://127.0.0.1:5080`) bağımsız atlas derlemesindeki `__SITE_URL__` yerine yazar. |
| `VITE_CAPTCHA_SITE_KEY` | boş (captcha kapalı) | Cloudflare Turnstile site anahtarı; doluysa giriş ve kayıt formları captcha ister ve `captchaToken` gönderir. Boşken sunucu captcha bekliyorsa formda uyarı çıkar. |
| `PUBLIC_SITE_URL` | `http://localhost:6241` | Yalnız Docker web konteyneri: her açılışta `docker-entrypoint.sh` `index.html`, `robots.txt` ve `sitemap.xml` dosyalarını şablondan kopyalayıp `__SITE_URL__` yerine bunu yazar. |
| `WEB_HOST_PORT` | `6241` | docker-compose'da nginx'in (konteyner içi `80`) yayınlandığı host portu; `VITE_PUBLIC_SITE_URL` varsayılanı da bunu kullanır. |
| `PLAYWRIGHT_BASE_URL` | boş | Doluysa `npm run test:e2e` kendi sunucularını açmaz, bu adrese karşı koşar. |
| `WEB_BASE` | `http://localhost:6241` | `npm run test:e2e:live` testinin hedeflediği çalışan web adresi. |
| `CI` | boş | Doluysa Playwright başarısız testi bir kez yeniden dener ve zaten açık bir science-service'i yeniden kullanmaz. |

Kod `import.meta.env.DEV` değerini de okur: geliştirme sunucusunda `/_ui` rotası açılır ve bilim API'si göreli `/api/v2` adresinden istenir.

`vite.config.ts` React ve Tailwind eklentilerini yükler, `/api/v2` isteklerini `http://127.0.0.1:5080`'e (bağımsız atlas veya `dotnet run` ile science-service) vekil olarak iletir, depo kökünden dosya okumaya izin verir (catalog-service ve compound-service'in JSON dosyaları içe aktarılır) ve `@` takma adını `src/` klasörüne bağlar. `/api/v1` için vekil yoktur; geliştirme sunucusu gateway'e doğrudan `VITE_API_BASE_URL` adresinden gider (gateway CORS listesinde 5173 vardır).

`npm run build` sırasıyla `write-coverage.mjs` (`src/data/coverage.json`), `write-guide.mjs` (`src/data/guide.json`), `write-sitemap.mjs` (`public/sitemap.xml`), `write-schema.mjs` (`public/schema/*.schema.json`), `tsc -b` ve `vite build` çalıştırır; `npm run dev` öncesinde kapsam, şema ve kılavuz dosyaları da yazılır. Docker imajında (`web-app/Dockerfile`) derleme Node 22 ile yapılır, `nginx:stable-alpine` sunar. `nginx.conf` sıkıştırmayı açar, `/assets/` dosyalarını bir yıl değişmez, `/media/`, `/brand/`, `og.png` ve simgeleri yedi gün, `robots.txt` ve `sitemap.xml` dosyalarını bir saat önbelleğe aldırır; `index.html`'e düşen sayfa yollarında önbelleği kapatır.

## Testler

Birim testleri `tests/*.test.mjs` altındaki 23 dosyadır ve Node'un yerleşik test koşucusuyla (`node --experimental-strip-types --test`) çalışır; testler `.ts` kaynaklarını doğrudan içe aktarır. `npm test` önce şemaları ve `guide.json`'u yeniden yazar. Bir kısmı saf fonksiyonları sınar, bir kısmı kaynak dosyanın metnini okuyup sayfa sözleşmesini (rota yolu, `noindex`, eski sınıf adlarının yokluğu) denetler. Konulara göre:

- **Sistem kılavuzu** — `system-guide.test.mjs`: ayrıştırıcının tablo satırını yalnız kaçırılmamış dikey çizgilerden böldüğünü (`\|` hücrede kalır), satır içi kod/kalın/bağlantıyı, başlık-özet-özellik tablosunu, olmayan sayfaya bağlantının düz metne döndüğünü, listeleri, kod haritası dosyalarını ve kod bloklarını, ilk `##`'den önceki metnin dosya:satır hatasıyla reddedildiğini denetler; ayrıca gerçek `docs/kilavuz` sayfalarının hepsinin ayrıştığını, her servis sayfasında özet, en az dört özellik ve amaçlı dosyalardan oluşan kod haritası bulunduğunu, bağlantıların benzersiz olduğunu ve aramanın `createOrderWithSaga` fonksiyonunu bulduğunu doğrular.
- **Periyodik tablo, kayıtlar, bileşikler** — `periodic-swatches.test.mjs` (118 elementlik tohum ve `rawElements` metni, f-bloğunun 8–9. satırlara ayrılması, aile jetonları ve `familyOf`'un yalnız bilinen aileleri kabul etmesi, gateway kategorisi eşlemesi, gezgin yerleşimi, Türkçe katlamalı arama, Enter ile tam eşleşme, tabloda ve kartlarda klavye gezinmesi ve tek Tab durağı, renk mercekleri ve aile merceğinde değer yazılmaması), `museum-preview-dialog.test.mjs` (önizleme penceresinin genişliği, adlı kapatma düğmesi, kendi içinde kayması, odağı karoya geri vermesi; kayıtların tam sayfa yüklemeden açılması, `data-symbol`, tek başlık), `record-detail.test.mjs` (boş değerin sıfır sayılmaması, bölüm listesi ve sayaçları, alan süzme, kafes `c` ile Celsius ayrımı, Türkçe sayı biçimi, JSON'un CodeBlock ile gösterilmesi, `#geometry` bağlantısı, bulunamadı ve hata görünümlerinde `noindex`), `compounds-grid.test.mjs` (bileşik süzgecinde aksansız Türkçe ad, İngilizce ad, formül ve PubChem CID araması, grupla birleşme; yapı küçük resminin mürekkep sınırı, yakınlaştırma, sığdırma ve ortalama; kayıt sayfasının hiç küçültmeyen kare levhası), `element-photos.test.mjs` (75 seçilmiş fotoğraf, Pm/Tc/H'nin bilerek boş kalması, önemli örneklerin dosyasının diskte ve katalogla eşit olması, S/Ga/Hg seçimleri).
- **Laboratuvar, oyunlar, defter** — `lab-games.test.mjs` (formül ve dedektif oyununda "Başka kayıt" ve "Pas geç"in sıradakine geçmesi, URL'den gelen sembolün harf büyüklüğünden bağımsız çözülmesi, dört farklı aday, sembol veya Türkçe adla cevap, yanlış atom sayılarının adlandırılması, oyun kaydının temizlenmesi), `lab-sandbox-outcome.test.mjs` (karışım sonucunun isabet, neredeyse, imkânsız ve boş ayrımı; çip sırası yardımcıları), `lab-void-chrome.test.mjs` (laboratuvar sayfalarının PageHeader, mod seçici ve SEO yolları, eski sınıfların yokluğu, tanılama olayları, sürükle-bırak hedefleri, dokunmatikte paletin kayabilmesi, atla düğmelerinin mevcut bulmacayı geçirmesi), `notebook-backup.test.mjs` (bilinmeyen bileşiklerin ve eksik rotaların atılması, iki cihazın birleşimi, sürüm 1 yedek dosyasının gidiş-dönüşü ve başka biçimlerin reddi).
- **Kabuk, gezinme, tasarım yardımcıları** — `product-nav.test.mjs` (birincil menünün atlas → lab → defter sırası, görünür API kısayolu, demonun "Daha fazla"nın sonunda olması, `/stack` → `/hakkinda`), `ui-lib.test.mjs` (Türkçe katlama, formül parçalama, tr-TR sayı biçimleri, detay rotalarında etkin menü öğesi), `product-chrome.test.mjs` (başvuru sayfalarının ortak çerçevesi ve eski sınıfların yokluğu; KREDI şeridinin "gerçek para" uyarısı ve bütün ticaret rotalarını ve demoyu sarması).
- **İçerik sayfaları** — `product-landing-css.test.mjs` (adı eskidir, artık CSS denetlemez: açılış sloganı, kristal görsel, WebSite JSON-LD, sayıların `coverage.json`'dan okunması, jeton kullanımı ve API örneğinin paketteki Fe kaydıyla eşleşmesi), `about-page.test.mjs` (tasarım sistemi, SEO yolu, açıklanan her sayfaya bağlantı, dürüst sınırlar), `guide-cards.test.mjs` (el kitabının laboratuvar, oyun ve deftere derin bağlantıları, hesaplar kapalıyken hesap sayfasına göndermemesi, laboratuvarı bugünkü hâliyle anlatması; sözlükte benzersiz bağlantılar, Türkçe alfabe sırası ve hesaplar kapalıyken `/demo`'ya yönlendirme).
- **Geliştirici sayfaları** — `docs-auth-chrome.test.mjs`: deneme alanında 304'ün not olarak gösterilmesi, açık API için anahtarsız, v1 için anahtarı ortam değişkeninden okuyan kod örnekleri, durum kodu tonları, `lib/http.ts` çekirdeği (`abortAfter`'ın zaman aşımında `TimeoutError` vermesi ve çağıranın iptalini iletmesi; `fetchJson`'un JSON gönderip okuması, düz metin hata gövdesini `text`'te tutması ve zaman aşımında `isTimeout`'un tanıdığı hatayla reddetmesi), JSON renklendirmesinin işaretlemeyi kaçırması, API sayfalarının SEO'su, CodeBlock kullanımı, korunan bağlantılar ve deneme sayacı.
- **Hesap, güvenlik, gizlilik** — `safe-return-to.test.mjs` (`returnTo`'nun yalnız aynı kökenli yolu kabul etmesi), `captcha-config.test.mjs` (Turnstile'ın `VITE_CAPTCHA_SITE_KEY`'e bağlı, koyu temalı olması, giriş ve kaydın `captchaToken` göndermesi ve sunucu captcha beklerken uyarması), `feedback-void-chrome.test.mjs` (tanılamanın onaydan önce hiçbir şey yazmaması, onay geri alınınca silinmesi, e-posta gibi serbest metni saklamaması; geri bildirim sayfasının ağ çağrısı yapmayıp yalnız JSON indirmesi).
- **KREDI demosu** — `commerce-model.test.mjs` (fiyat panosu sıralama ve süzme, işaretli Türkçe yüzdeler, ürün tanımları, varlık değerinin bid × çarpan olması ve imkânsız satışın engellenmesi, saga durumundan ilerleme ve rozet tonu, sepette ask × çarpan fiyatı ve stok aşımı, anahtar maskeleme ve yalnız https webhook adresi), `demo-vitrin-chrome.test.mjs` (demo sayfasının sanal kredi olduğunu açıkça söylemesi ve bağlantıları, ticaret sayfalarının tek PageHeader'lı ortak çerçevesi, SEO yolları, hesap sayfasının `noindex` olması, eski CSS ve satır içi stil olmaması).
- **SEO** — `seo-static.test.mjs`: `robots.txt` ve `sitemap.xml`'deki `__SITE_URL__` yer tutucusu ve kapalı yollar, `index.html`'deki Open Graph, Twitter ve JSON-LD etiketleri, `og.png`, `index.html`'deki `theme-color`'ın tuval rengi (`#080b09`) olması, giriş ve hesap sayfalarında `noindex`.

Tarayıcı testleri Playwright ile üç yapılandırmada koşar:

- **`playwright.config.ts` → `e2e/`** — masaüstü (1365×900) ve telefon (390×844, dokunmatik) Chromium projeleri, 2 işçi. `PLAYWRIGHT_BASE_URL` yoksa iki sunucu açar: `dotnet run` ile science-service (`127.0.0.1:5080`, .NET 10 SDK gerekir) ve hesaplar kapalı, bilim API'si 5080'e bağlı Vite (`127.0.0.1:5173`). `atlas-lab-notebook.spec.ts` tablo, laboratuvar ve defterin açıldığını; `periodic.spec.ts` "demir" + Enter'ın tam sayfa yüklemeden `/element/fe` açtığını ve aile çipinin kartları daralttığını; `record-detail.spec.ts` Fe kaydının başlık, temel değerler ve `fe-26.json` indirmesini, H₂O formülünü ve `/element/zz` için bulunamadı hâlini; `lab.spec.ts` yalnız klavyeyle suyun keşfedilip deftere düştüğünü, dedektifin `?element=fe` ile demiri açıp "Pas geç" ile başka vakaya geçtiğini ve formül oyununda "Başka kayıt"ın bileşiği değiştirdiğini; `system-guide.spec.ts` kılavuz aramasının `consumeSagaEvents` satırına derin bağlantıyla gittiğini; `accounts-off.spec.ts` `/market`'in hesap kapalı sayfası gösterdiğini ve `/`, `/periodic`, `/lab`, `/kilavuz` sayfalarının 390 px'te yatay taşmadığını; `auth-smoke.spec.ts` `/login`'in her iki derlemede çökmediğini denetler.
- **`playwright.auth.config.ts` → `e2e-auth/account.spec.ts`** — hesaplar açık, `VITE_API_BASE_URL=/api/v1` ile Vite `127.0.0.1:5174`'te açılır; arka uç yoktur, her `/api/v1` çağrısını identity-service biçiminde bellekteki bir sahte yanıtlar, beklenmeyen çağrı testi düşürür. Kayıtta doğrulama hatalarının isteği engellediğini ve alınmış e-postanın Identity gövdesinden (`DuplicateUserName`, `DuplicateEmail`) tek bir "Bu e-posta zaten kayıtlı." cümlesiyle reddedildiğini, başarılı kaydın giriş yapıp aynı kökenli `returnTo` ile ayarlara gittiğini, yanlış şifrenin reddedildiğini, girişte hesap menüsünün çıktığını ve site dışı `returnTo`'nun yok sayıldığını, çıkışın oturumu sildiğini ve kapanan menünün odağı yeni sayfanın `#main-content`'ine bıraktığını denetler; telefonda menü, tembel sayfa yüklenirken açılsa da kendiliğinden kapanmaz.
- **`playwright.live.config.ts` → `e2e-live/commerce-journey.spec.ts`** — çalışan Docker platformuna (`WEB_BASE`, gateway 5000) karşı tek yolculuk: arayüzden yeni hesap, 10.000 KREDI hoş geldin bakiyesi, `/shop`'ta 1 g altın siparişi (202), saga "Teslim" olunca kasada altın ve düşen bakiye, `/market`'te geri satış ve cüzdanın satış tutarı kadar artması. Tek işçi, yeniden deneme yok; her koşuda gerçek bir hesap açar (rastgele `@example.test` adresi, şifre loglanmaz).

Çalıştırma:

```bash
cd web-app
npm ci
npm test                          # birim testleri (önce şema ve guide.json yazılır)
npm run lint                      # ESLint
npx tsc -b                        # tip kontrolü (npm run build de yapar)
npm run build                     # üretilen veri dosyaları + tsc + vite build

npx playwright install chromium   # ilk tarayıcı testinden önce bir kez
npm run test:e2e                  # science 5080 + Vite 5173, hesaplar kapalı
npm run test:e2e:auth             # Vite 5174, hesaplar açık, sahte identity
WEB_BASE=http://localhost:6241 npm run test:e2e:live   # çalışan Docker platformu gerekir
```

Depo kökündeki `./scripts/test.ps1` web için her zaman lint, birim testleri, derleme ve `npm audit` çalıştırır; `-Browser` ile `test:e2e` ve `test:e2e:auth`, `-Live` ile duman testlerinden sonra `test:e2e:live` eklenir.
