# Ön yüz tasarım sistemi

15 Eylül 2026: Kullanıcının shadcn/Radix geçiş talebiyle ortak ön yüz katmanı kuruldu.

## Görsel yön

Krem kâğıt zemin (`#f8f1de`), grafit metin, aile renkleri hücreyi doldurur (sınıf posteri; 2 px şerit değil). IBM Plex Sans arayüzde; IBM Plex Mono bilimsel değer/formül/kodda. Koyu “workshop” krom, büyük harfli kicker, dekoratif gradyan ve tanıtım paneli ekleme. Sayfa başlığı kullanıcının bulunduğu yeri söylesin.

Masaüstünde yapışkan üst defter şeridi (hap nav + Daha fazla); şeridin altında aile rengi 8 px çizgi. Ana sayfa marka `ElementAPI` + kısa satır + Lab/Tablo CTA; periyodik tablo sahne; günün kayıtları tablonun altında. Kredi demosu “Daha fazla” menüsünün sonunda. 900 px ve altında `Menüyü aç` Radix Sheet.

Hareket: Framer rota/kart/dialog; GSAP tablo intro + lab keşif. Spline yalnız lab keşif inset’i (statik fallback). `prefers-reduced-motion` üçünü de keser.

## Kaynak ve kullanım

- components.json: shadcn new-york/Radix, @/ alias.
- components/ui: Button, Input, Textarea, NativeSelect, Card, Badge, Dialog, Sheet, DropdownMenu, Tabs, Table, Progress, Skeleton, Separator ve Disclosure.
- lib/utils.ts: clsx + tailwind-merge; yeni bağımsız cn paketi ekleme.
- ProductShell.tsx: ortak gezinme, mobil menü ve oturum menüsü.
- styles.css: theme/base/legacy/components/utilities sırası. Tailwind yalnız src içeriğini tarar; test raporlarını taramaz.
- design-system.css: ortak tokenlar ve alan yerleşimleri. index/science/atlas/product CSS alan stilleri legacy katmanında kalır; dönüşüm bütün özel bilimsel yerleşimleri silmez.

Yeni form/menü/tablo kontrollerini ortak bileşenlerden kur. Button asChild link için; Card asChild yalnız bir semantik article/section çocuğu alır. Yan yana Card sınırlarını koru; birden fazla çocuk veya boş Slot çalışma zamanı hatası verir. plain/none Button yalnız periyodik hücre ve özel laboratuvar kartı gibi alan kontrolleri içindir.

Tailwind utilities bileşen CSS'inden sonra gelir: arama ikonlu Input için pl-9 gibi açık sınıf, bilim hücrelerinde gap-0 kullan. Dialog Escape/odak dönüşünü, Tabs ok tuşlarını, mobil Sheet gezinmede kapanmasını koru. Disclosure kontrollü açık durumla bilimsel bölüm bağlantılarını destekler. Progress gerçek sayıyı ve max değerini ARIA üzerinden bildirir.

## Kontrol

npm --prefix web-app run lint; npm --prefix web-app run build; npm --prefix web-app test.
Tarayıcı: e2e/product.spec.ts + navigation.spec.ts; ayrı mock hesap ve gerçek platform testleri. Vite test-results*/playwright-report* klasörlerini izlemez; üç test profilinin çıktıları ayrı klasörlere gider.

[Ürün senaryoları](../PRODUCT-SCENARIOS.md) · [Doğrulama kaydı](../LOCAL-VERIFICATION.md).

Bileşik listesi kartlarında okunaklı formül önceliklidir; küçük önizlemede kaybolan PubChem yapı görselleri ayrıntı kaydında korunur. Mobil piyasa şeridi sayfa genişliğini aşmaz.
