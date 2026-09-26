---
name: Museum Atlas UI
overview: "Tüm web-app’i eğlenceli, güzel bir ürün sitesi diline çekmek (atlas + müze iskeleti, daha canlı ürün hissi). API yüzeyi (/developers, /docs) boş hissetmesin diye ürün anlatımı + canlı örneklerle güçlendirilir."
todos:
  - id: tokens-fonts
    content: "Canlı gallery palette + Fraunces/Source Sans 3/Plex Mono; index.html + design-system + index.css hizala"
    status: pending
  - id: shell
    content: "ProductShell: marka güçlü, nav net, ürün sitesi toolbar (sıkıcı workspace değil)"
    status: pending
  - id: primary-surfaces
    content: "Tablo/lab/bileşik/defter — eğlenceli ürün yüzeyleri; kategori rengi + fotoğraf + hafif motion"
    status: pending
  - id: api-story
    content: "/developers ürün landing + /docs playground yıldız; canlı Fe/H2O örneği, net yol"
    status: pending
  - id: secondary-pages
    content: "About/Guide/Glossary/Auth/Demo/Market/Shop + Data — aynı dil, boş duvar yok"
    status: pending
  - id: verify
    content: "npm run build + /, /lab, /docs, /developers spot-check"
    status: pending
isProject: false
---

# ElementAPI — eğlenceli ürün sitesi + dolu API anlatımı

## Yön (güncellendi)

Önceki B/C iskeleti durur (açık galeri, serif başlık, fotoğraf), ama ton **müze vitrini değil ürün sitesi**: keşfetmek zevkli, lab/oyunlar davetkâr, marka ilk bakışta okunur.

API tarafı ayrı iş paketi: `/developers` ve `/docs` şu an metin duvarı + liste; bunları **ürünün ikinci kahramanı** yap (neden var, 30 saniyede dene, ne alırsın).

| Token | Değer | Rol |
|---|---|---|
| Gallery | `#ECEDEA` | zemin (krem `#f8f1de` kalkar) |
| Plinth | `#F7F7F4` | yüzey |
| Ink | `#121417` | metin |
| Mute | `#5C636B` | ikincil |
| Rule | `#C8CBC4` | çizgi |
| Accent | `#1F4B5A` | derin teal |
| Spark | kategori `categorySwatches` | tablo/lab’da eğlence (mor SaaS yok) |
| Display | **Fraunces** | marka / başlık |
| Body | **Source Sans 3** | UI |
| Mono | **IBM Plex Mono** | formül + API örnekleri |

Kurallar: ALL-CAPS kicker yok; hero’da kart yığını yok; Inter/krem-terracotta/purple glow yok. shadcn kabuk kalır.

```text
Ürün hissi:
  [ElementAPI]  Tablo · Bileşikler · Lab · Defter · El kitabı    API
  ─────────────────────────────────────────────────────────────
  Canlı tablo / lab anı (zevkli, bir kompozisyon)
  …aşağıda keşif, defter, kısa “açık API” köprüsü

API hissi (/developers):
  Başlık + tek cümle neden
  Canlı JSON (Fe veya H2O) + kopyala / docs’a git
  3 somut yetenek (fields, ETag, Türkçe kayıt) — süs kart değil
  /docs playground CTA
```

## Dokunulmayanlar

- Rotalar listesi (gerekirse nav’da “API” kısayolu; yeni path yok)
- Lab kuralları, science JSON, commerce demo iş mantığı
- Compose / observability

## 1. Token + font

- [`web-app/index.html`](web-app/index.html): Fredoka/Inter → Fraunces + Source Sans 3 + IBM Plex Mono
- [`design-system.css`](web-app/src/design-system.css) + [`index.css`](web-app/src/index.css): tek palette; krem/`--paper` temizliği
- Legacy CSS hard-code’ları token’a bağla

## 2. Kabuk — ürün sitesi

- [`ProductShell.tsx`](web-app/src/components/ProductShell.tsx): **ElementAPI** display marka; primary nav sade; **API** (`/developers` veya `/docs`) toolbar’da görünür kısayol (More menüsünde gömülü kalmasın)
- Footer: kısa ürün + “Açık bilimsel API” linki
- Az gölge/pill; etkileşim yerinde border

## 3. Ana ürün yüzeyleri — eğlenceli

- **Home/tablo** [`PeriodicExplorer`](web-app/src/components/PeriodicExplorer.tsx): ilk viewport marka + kısa davet + tablo; hücreler canlı swatch; seçimde fotoğraf/AtomShell büyük ve keyifli
- **Lab / oyunlar / defter**: davetkâr boş durumlar, net CTA (“Formülü kur”, “Dedektif”); dashboard kart çöplüğü yok
- **Bileşikler / detay**: formül markası + yapı/foto plinth; okuması güzel, “katalog dump” değil
- Motion: 2–3 bilinçli (sayfa fade, hücre seçim, detay görsel); her section stagger yok

## 4. API anlatımı — boş kalmasın (asıl içerik işi)

Hedef: geliştirici 20 saniyede “ne, neden, nasıl denerim” anlasın.

### `/developers` — API ürün landing

[`Developers.tsx`](web-app/src/pages/Developers.tsx) yeniden düzenle (kicker sil):

1. **Hero:** ElementAPI API — tek cümle (118 element + 167 bileşik, anahtar yok) + birincil CTA `/docs`, ikincil OpenAPI
2. **Canlı örnek paneli:** sabit Fe veya H2O için monospace JSON özeti (mevcut `publicApiUrl` / playground kalıbı; mümkünse küçük fetch + iskelet; offline’da statik snippet). Kopyala butonu
3. **Üç yetenek** (metin, süs kart değil): alan seçimi (`fields`), önbellek (ETag/304), Türkçe editoryal + kaynakça
4. **Kim için** kısa; şartlar özeti + GitHub terms linki (mevcut)
5. **Sonraki adım:** deneme tezgâhı `/docs`, veri dürüstlüğü `/data`

### `/docs` — yıldız yüzey

[`ApiDocs.tsx`](web-app/src/pages/ApiDocs.tsx): playground üstte ve ferah; endpoint seçici + dil (curl/JS/Python) + yanıt paneli görsel hiyerarşi; v2 bilimsel örnekler önde, v1 market örnekleri “simülasyon” diye altta/ayrı. Boş/hata durumları yönlendirici.

### Köprüler

- Home altında veya footer’da tek satır API köprüsü (hero’yu şişirmeden)
- [`DataCoverage`](web-app/src/pages/DataCoverage.tsx): API ile aynı dil; “null uydurma değil” mesajı developers’a bağlansın

Yeni backend endpoint yok; mevcut v2 + `openapi.json` / şemalar yeter.

## 5. Kalan sayfalar

About, Guide, Glossary, Auth, Account, Feedback, Demo/Market/Shop: aynı token + ürün tonu; tutarsız krem/band temizliği. Demo “kredi simülasyonu” olarak sakin kalır.

## 6. Doğrulama

- `cd web-app && npm run build`
- Spot: `/`, `/lab`, `/compound/h2o` veya list, `/developers`, `/docs` (playground istek)
- Gateway ayaktaysa `npm run dev`; tam stack rebuild şart değil

## Bilinçli sınır

- Tek geçiş: görsel dil + API landing/playground anlatımı
- Yeni illüstrasyon seti / video yok; atlas medyası kullanılır
- API sözleşme değişmez; sadece ürün yüzeyi ve kopya düzeni
- `media.photo: null` bilinçli boşluk kalır
