import { Link } from "react-router-dom";
import Seo from "../components/Seo";
import { WorkshopMarks } from "../components/AtlasVisual";
import GeometryFigure from "../components/GeometryFigure";
import { compoundBySlug, geometryOf } from "../services/chemistry";

const GROUPS = [
  {
    id: "tezgah",
    title: "Laboratuvar tezgâhı",
    items: [
      {
        term: "Element",
        mark: "Fe",
        try: { to: "/periodic", label: "Tabloda Demir’e bak" },
        def: "Periyodik tablodaki bir tür atom. Demir Fe, oksijen O, helyum He. Kartı iki kez basınca iki atom seçmiş olursun; yeni bir element icat etmezsin.",
      },
      {
        term: "Bileşik",
        mark: "H₂O",
        try: { to: "/compounds", label: "214 kayda bak" },
        def: "Birden fazla elementin bilinen bir oranı. Su H₂O, sofra tuzu NaCl, pasın hikâyesi demir oksitler. Kataloğumuzda 214 kayıt var; hayali molekül yok.",
      },
      {
        term: "Molekül",
        mark: "H₂O",
        try: { to: "/compound/h2o", label: "Su kaydını aç" },
        def: "Kendi başına durabilen bir parça. Su öyledir: iki hidrojen, bir oksijen, bükük bir şekil. Laboratuvarda H₂O kartı açılır.",
      },
      {
        term: "Formül birimi",
        mark: "NaCl",
        try: { to: "/lab/formula?compound=nacl", label: "Tuzu formülle kur" },
        def: "Tuz tanesi milyarlarca Na⁺ ve Cl⁻; yine de deftere NaCl yazarız. Kuvars (SiO₂) da tek molekül değil, uçsuz bir ağ. Formülü kur oyununda “ayrı molekül arama” denmesinin sebebi bu.",
      },
      {
        term: "Stoikiometri",
        mark: "2H+O",
        try: { to: "/lab", label: "Labda suyu dene" },
        def: "Kaç atom. İki H + bir O = su. Bir H + bir O = HO; katalogda yok, Birleştir boş döner. Atomları doğru seçip sayıyı yanlış basmak en sık hata.",
      },
      {
        term: "VSEPR",
        mark: "∠",
        geometry: true,
        try: { to: "/compound/h2o#geometry", label: "Suyun şekline bak" },
        def: "Elektron çiftleri birbirini iter, şekil oradan çıkar. Su bükülür, karbondioksit cetvel gibi durur. Burada SVG şema var; 3D film yok.",
      },
      {
        term: "Ağ / kristal",
        mark: "SiO₂",
        try: { to: "/compound/sio2", label: "Kuvars kaydını aç" },
        def: "SiO₂ kuvars gibi maddeler molekül torbası değil, tekrarlayan kafes. Keşif kartı “ağ” der; tuz “iyonik kafes” der.",
      },
      {
        term: "Oksiasit",
        mark: "H₂SO₄",
        try: {
          to: "/lab/formula?compound=h2so4",
          label: "Asidin formülünü kur",
        },
        def: "Hidrojen + oksijen + bir ametal. Sülfürik asit H₂SO₄ bu aileden. Laboratuvarda doğru atom sayılarıyla kurulur; “asit damlat” deneyi değildir.",
      },
      {
        term: "Keşif",
        mark: "✓",
        try: { to: "/lab", label: "İlk kartı aç" },
        def: "Deftere yazılan “bildim”. İki H bir O ile suyu bir kez kaydedersin; tekrar Birleştir aynı kartı çoğaltmaz. Cam tüpte gaz çıkışı yok.",
      },
      {
        term: "Gerçek reaksiyon değil",
        mark: "—",
        try: { to: "/lab", label: "Tezgâhın sınırını gör" },
        def: "Kart seçmek laboratuvar tarifi değildir. Isı, katalizör, yan ürün yok. Soygazlar birleşmez; kararsız stoikiometri açıklanır ve kart açılmaz.",
      },
      {
        term: "Formülü kur",
        mark: "NaCl",
        try: { to: "/lab/formula", label: "Oyunu aç" },
        def: "Adı verilen kaydın atom sayılarını basarsın. Skor keşif defterine karışmaz. Tuzda formül birimi, suda molekül.",
      },
      {
        term: "Element dedektifi",
        mark: "Fe?",
        try: { to: "/lab/detective", label: "Pas rengini dene" },
        def: "İpucu ipucu element bul. Havuz ilk 36 element; skor yine ayrı. Pas rengi bir ipucu demire götürebilir — kesin teşhis değil.",
      },
      {
        term: "Rota",
        mark: "6",
        try: { to: "/collection", label: "Altı rotaya bak" },
        def: "Koleksiyondaki kısa öğrenme yolu. Altı tane. Günlük maddeler hâlâ su, karbondioksit, amonyak ister. Soru, keşiflerden sonra açılır.",
      },
      {
        term: "İzomer",
        mark: "C₆H₁₂O₆",
        try: { to: "/compound/c6h12o6", label: "Glikoz kaydını aç" },
        def: "Aynı atomlar, farklı düzen. Glikoz ile fruktoz burada tek anahtara düşer. Bilerek kaba; ayırt etmek ayrı iş.",
      },
    ],
  },
  {
    id: "kablo",
    title: "Katalog ve kablo",
    items: [
      {
        term: "Atlas",
        mark: "118",
        try: { to: "/periodic", label: "118 hücre" },
        def: "Türkçe anlatım + lisanslı fotoğraf veya şema + kaynaklı sayı. Sayı PubChem/RSC/NIST’ten; hikâye editöryel. Fotoğrafı olmayan hücre şemaya düşer — boşluk çoğu zaman bilinçli.",
      },
      {
        term: "slug",
        mark: "h2o",
        try: { to: "/compound/h2o", label: "h2o kaydı" },
        def: "Bileşiğin URL adı: h2o, nacl, aspirin. API’de slug veya PubChem CID (aspirin = 2244) aynı kaydı açar.",
      },
      {
        term: "fields / view",
        mark: "fields",
        try: { to: "/docs", label: "API tezgâhında kes" },
        def: "fields = “şunları ver”. view=summary kısa, full uzun. fields varsa öteki ikisini ezer. Saçma bir alan adı 400 döner.",
      },
      {
        term: "ETag",
        mark: "304",
        try: { to: "/docs", label: "Aynı ETag ile sor" },
        def: "Kaydın parmak izi. Aynı izle sorarsan sunucu 304 der, JSON göndermez. Farklı fields farklı iz. API sayfasında “Aynı ETag ile sor” bunu dener.",
      },
      {
        term: "null",
        mark: "null",
        try: { to: "/data", label: "Eksik bölümler" },
        def: "Bu sürümde doğrulanmış değer yok. Sıfır değil, “güvenli” değil, “ölçülmedi” de değil — sadece elimizde yok. Ayrıntıda eksik alanları sen açarsın.",
      },
      {
        term: "KREDI",
        mark: "KREDI",
        try: { to: "/demo", label: "Kredi simülasyonunu tanı" },
        def: "Ekrandaki sanal para. Bankadan çekilmez. JSON’da hâlâ balanceElx, avgCostElx, reason INSUFFICIENT_ELX görünebilir; değer kredidir. Legacy isim, kırıcı rename yok.",
      },
      {
        term: "API anahtarı",
        mark: "X-API-Key",
        try: { to: "/docs", label: "v2 anahtarsız" },
        def: "Bilimsel v2 için gerekmez. Cüzdan, sipariş, satış v1 uçları X-API-Key ister. Fiyat tablosunu okumak ücretsizdir.",
      },
    ],
  },
  {
    id: "kasa",
    title: "Kredi masası (ayrı demo)",
    items: [
      {
        term: "kredi",
        mark: "10.000",
        try: { to: "/shop", label: "Mağazada Fe gramı" },
        def: "Kayıtta 10.000 gelir. Gerçek para değil. Bilimsel keşif cüzdanı değiştirmez.",
      },
      {
        term: "Alış fiyatı",
        mark: "ask",
        try: { to: "/market", label: "Fiyat tablosu" },
        def: "Gram alırken ödeyeceğin simülasyon fiyatı. Son fiyatın biraz üstü.",
      },
      {
        term: "Satış fiyatı",
        mark: "bid",
        try: { to: "/market", label: "Alış–satış farkı" },
        def: "Gramı geri verince yazılacak fiyat. Alıştan biraz düşük. Spread kasıtlı.",
      },
      {
        term: "Gram",
        mark: "1 g",
        try: { to: "/shop", label: "1 / 10 / 100 g paket" },
        def: "Miktar birimi. Mağaza paketleri 1 / 10 / 100 gram. Eğitim kataloğundaki 214 molekül otomatik satılık ürün olmaz.",
      },
    ],
  },
];

export default function Glossary() {
  const water = compoundBySlug.h2o;
  return (
    <main className="page explainer-page glossary-page void-page void-enter">
      <Seo
        title="Sözlük · ElementAPI"
        description="Formül birimi ile molekül, stoikiometri, VSEPR, keşif, ETag ve KREDI. Tezgâh dilinde, su ve tuz örnekleriyle."
        path="/sozluk"
      />

      <div className="explainer">
        <article className="explainer-prose">
          <p className="void-kicker">Dil</p>
          <h1>Sözlük</h1>
          <p className="lead">
            Sayfada geçen sözler. Su, tuz, pas. Ders kitabı değil; tezgâhın
            kenarına yazılmış not.
          </p>
          <nav className="glossary-jump" aria-label="Sözlük bölümleri">
            {GROUPS.map((group) => (
              <a key={group.id} href={`#${group.id}`}>
                {group.title}
              </a>
            ))}
          </nav>

          {GROUPS.map((group) => (
            <section key={group.title} id={group.id}>
              <h2>{group.title}</h2>
              <dl className="glossary">
                {group.items.map((item) => (
                  <div key={item.term} className="glossary-row">
                    <dt>
                      {item.term}
                      <span className="glossary-mark">{item.mark}</span>
                    </dt>
                    <dd>
                      {item.def}
                      {"geometry" in item && item.geometry && water && (
                        <GeometryFigure compact geometry={geometryOf(water)} />
                      )}
                      {item.try && (
                        <Link className="glossary-try" to={item.try.to}>
                          {item.try.label}
                        </Link>
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </article>

        <aside className="explainer-aside">
          <div className="def-card void-panel">
            <WorkshopMarks beat="water" />
            <h2>Su, tuz, ETag</h2>
            <p>
              Su ve tuzun tarifi <Link to="/nasil">el kitabında</Link>. ETag:
              aynı kaydı ikinci kez istersen sunucu bazen gövde göndermez.
            </p>
            <p>
              <Link to="/lab">Laboratuvar</Link> · <Link to="/docs">API</Link> ·{" "}
              <Link to="/nasil">el kitabı</Link>
            </p>
          </div>
        </aside>
      </div>
    </main>
  );
}
