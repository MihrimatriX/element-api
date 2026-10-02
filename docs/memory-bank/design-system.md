# Ön yüz tasarım sistemi: "Mineral"

2 Ekim 2026: web-app arayüzü sıfırdan yeniden kuruldu. Tek kaynak `web-app/src/styles.css` (jetonlar) ve `web-app/src/components/ui/` (bileşenler). Canlı vitrin: geliştirme sunucusunda `/_ui` (üretim derlemesine girmez).

## Görsel yön

Yalnız koyu tema. Sakin, kesin, bilimsel cihaz hissi; yeşil tonlu mineral yüzeyler, tek vurgu rengi (kuprit, pas kırmızısı), periyodik tablo için aile renkleri. Derinlik ince çizgi, yüzey tonunda gölge ve hafif dokuyla gelir; süs gradyanı, cam efekti (yapışkan başlık bulanıklığı hariç), emoji yok. Arayüz metni Türkçe, cümle düzeninde, ünlemsiz. Slogan: "Atomdan bileşiğe."

## Jetonlar (`src/styles.css`, `@theme static`)

Bileşenlerde ham hex/rgb yazılmaz; Tailwind yardımcıları kullanılır. `static` tüm değişkenleri her zaman üretir; çünkü bazı değerler çalışma anında `var()` ile okunur (ör. `--family`).

| Rol | Yardımcılar |
|---|---|
| Yüzey (sayfa → basılı) | `bg-canvas`, `bg-canvas-2`, `bg-surface`, `bg-surface-2`, `bg-surface-3` |
| Çizgi | `border-line` (varsayılan), `border-line-strong` (girdi, üzerine gelinen kart) |
| Metin | `text-ink` başlık/ana değer, `text-ink-2` gövde, `text-ink-3` ≤14 px etiket, `text-ink-4` yalnız süs |
| Marka | `bg-brand` yalnız dolu düğme; metin/bağlantı/etkin gösterge `text-brand-ink`; `bg-brand-soft`, `border-brand-line` |
| Durum | `success`, `warning`, `danger`, `info` + `-soft` dolgu |
| Aile | `--color-family-{alkali,alkaline,transition,post,metalloid,nonmetal,halogen,noble,lanthanide,actinide,unknown}` |
| Sözdizimi | `text-syntax-{key,string,number,literal,punct}` |
| Köşe | `rounded-sm` 6 çip/rozet, `md` 8 düğme/girdi, `lg` 12 küçük kart/kod, `xl` 16 panel, `2xl` 22 büyük görsel |
| Gölge | `shadow-xs` … `shadow-lg`, `shadow-glow` (seçili kuprit öğe) |
| Yazı | `font-display` Bricolage Grotesque (h1/h2, büyük sayı), `font-sans` Geist (her şey), `font-mono` Geist Mono (sembol, formül, veri sayısı, kod, eyebrow) |
| Görüntü boyu | `text-display-lg` yalnız açılış, `text-display` bölüm kahramanı, `text-display-sm` sayfa h1 |
| Yardımcılar | `container-page`, `tabular`, `eyebrow`, `panel`, `text-link` (metin içi bağlantı), `focus-ring` (data-slot taşıyan kontrollerin odak halkası) |

Kontrast kuralı: `text-brand` metin olarak yasak (≈2:1); `text-brand-ink` kullan. Aile renginin üstüne koyu metin konmaz; karoda metin `text-ink` kalır.

Fontlar `index.html` içinde Google Fonts'tan (`display=swap`) yüklenir. `theme-color` tuval rengi `#080b09`.

## Sayfa iskeleti

- Kabuk (`components/ProductShell.tsx` + `components/shell/`): "İçeriğe geç" bağlantısı, `h-14` yapışkan başlık, tek gezinme kırılımı `lg` (1024 px). Masaüstünde birincil menü (Tablo, Bileşikler, Lab, Defter, El kitabı; etkin öğenin altında kayan kuprit çizgi), "Daha fazla" menüsü, mono "API" kısayolu, hesap alanı. `lg` altında soldan açılan Sheet; tüm rotalar ve hesap işlemleri orada, bir bağlantı seçilince veya geri/ileri ile kapanır. Menüden veya Sheet'ten açılan sayfada odak tetikleyiciye dönmez, `#main-content`'e geçer (`shell/navigationFocus.ts`). Alt bilgi `productNav.siteMap` gruplarını (Keşif, Geliştirici, Proje) kullanır.
- Kabuk `#main-content` odak hedefini sahiplenir; yeni sayfa en üstte, odak orada açılır (`App.tsx` `RouteFocus`). `html { scroll-padding-top: 4.5rem }` odaklanan öğeyi ve `#çapa` hedefini yapışkan başlığın altında durdurur; bileşenlerdeki `scroll-mt-*` yalnız bunun üstüne eklenen boşluktur. Her sayfa: `<main className="container-page pt-10 pb-24 lg:pt-14">` → `PageHeader` → `Section`'lar (aralarındaki boşluğu `Section` verir).
- Rota yüklenirken `RouteFallback` (PageHeader biçiminde iskelet). Çöken sayfa kabuğun içinde `ErrorBoundary` hata ekranını gösterir (başlık ve menü çalışır); başka adrese geçince temizlenir. Bilinmeyen adres `pages/NotFound.tsx`; hesaplar kapalıyken hesap/ticaret rotaları `pages/FeatureUnavailable.tsx`.
- `/market`, `/shop`, `/account` `CommerceLayout` içinde (canlı fiyat + cüzdan, demo şeridi, bağlantı uyarısı); `/demo` `DemoLayout` içinde (yalnız demo şeridi). Hesaplar kapalıysa `AccountsOnly` bu rotalarda sağlayıcıyı hiç bağlamadan FeatureUnavailable gösterir.
- Mobil öncelikli; 360 px'te yatay kaydırma olmaz. `h-screen` yerine `min-h-dvh`.

## Bileşenler (`src/components/ui/`)

İlkel (shadcn/Radix, yeniden boyandı): Button (`default`, `outline`, `secondary`, `ghost`, `link`, `destructive`/`danger`, `plain`; boyutlar `none`, `xs`, `sm`, `default`, `lg`, `icon`, `icon-xs`, `icon-sm`, `icon-lg`), Input, Textarea, NativeSelect, Badge (+ `success`, `warning`, `info` tonları), Dialog, Sheet, DropdownMenu, Tabs (`default`, `line`), Table, Progress, Skeleton, Disclosure.

Yapı taşları: PageHeader, Section, Stat/StatGrid, ProgressRing, EmptyState, Notice, CodeBlock, CopyButton, ExternalLink, Formula, ElementTile, SearchField, ChipGroup, Segmented, LinkCard, Breadcrumb, KeyValue, Field, ConfirmDialog, Toaster + `toast()`.

Ortak sınıf dizeleri ve ton stilleri `ui/classes.ts`; Field bağlamı `ui/field-context.ts` (Input/Textarea/NativeSelect bir Field içindeyse kimlik, açıklama ve geçersiz durumunu kendiliğinden alır).

Kurallar:
- Bir sayfanın ihtiyacı listede yoksa sayfanın yanında (`components/<özellik>/`) kur; `components/ui/` paylaşılan sistemdir.
- Her etkileşimli öğede hover, `active:scale-[0.98]`, `focus-visible` halkası ve disabled hâli olur. Geçişler 150–250 ms, yalnız renk/çizgi/dönüşüm; hareket framer-motion yayı, `MotionConfig reducedMotion="user"`.
- Her veri görünümünün yükleniyor (içerik biçiminde Skeleton), boş (EmptyState) ve hata (Notice + yeniden dene) hâli vardır.
- İkonlar lucide-react, kontrollerde `size-4`, her yerde `strokeWidth={1.75}`.
- Satır içi stil yalnız CSS özel değişkeni için (`--family`, `--progress`); tür desteği `src/types/css.d.ts`.
- Periyodik karolar `ElementTile` ile çizilir ve `data-symbol` taşır (e2e buna bakar). `selected` yalnız görseldir (bağlantıda `aria-current`); tıklayınca açılıp kapanan karo ayrıca `pressed` verir (`aria-pressed`).
- Eski `#toast` öğesi yok; bildirim için `toast("Kopyalandı", { tone: "success" })`.

## Yardımcılar

- `lib/storage.ts`: güvenli localStorage (`readStorage`, `writeStorage`, `removeStorage`, `readJson`, `writeJson`).
- `lib/format.ts`: tr-TR sayılar (`formatNumber`, `formatFixed`, `formatKredi`, `formatGrams`).
- `lib/text.ts`: Türkçe arama katlaması (`foldTurkish`, `matchesSearch`; "cinko" → Çinko).
- `lib/formula.ts`: formül parçalama (Formula bileşeni kullanır). `lib/highlightJson.tsx`: JSON renklendirme (sözdizimi jetonları).
- `hooks/usePolling.ts`: sekme gizliyken duran aralıklı çağrı. `hooks/useAuthCapabilities.ts`: `GET /auth/capabilities`.
- `context/selection.tsx` (`useSelectedElement`), `context/commerce.tsx` (`useCommerce`).

## Kontrol

`npx tsc -b`, `npm run lint`, `npm test` (web-app içinde). `tests/ui-lib.test.mjs` yardımcıları sınar. Görsel inceleme: `npm run dev` → `/_ui`.
