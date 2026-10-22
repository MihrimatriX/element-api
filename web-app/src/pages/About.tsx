import { Link } from "react-router-dom";
import {
  BookMarked,
  BookOpen,
  Code2,
  Coins,
  Compass,
  FlaskConical,
  Grid2X2,
  HardDrive,
  Library,
  type LucideIcon,
  SearchSlash,
} from "lucide-react";
import Seo from "../components/Seo";
import { Button } from "../components/ui/button";
import { ElementTile } from "../components/ui/element-tile";
import { Formula } from "../components/ui/formula";
import { KeyValue, type KeyValueItem } from "../components/ui/key-value";
import { LinkCard } from "../components/ui/link-card";
import { PageHeader } from "../components/ui/page-header";
import { Section } from "../components/ui/section";
import coverage from "../data/coverage.json";

const AREAS = [
  {
    to: "/periodic",
    icon: Grid2X2,
    title: "Periyodik tablo",
    description: `${coverage.elements} hücre; her biri kaynaklı bir element kaydına açılır.`,
  },
  {
    to: "/lab",
    icon: FlaskConical,
    title: "Laboratuvar",
    description: `${coverage.compounds} bileşik kaydı ve elementleri oranlarıyla birleştirdiğin bir tezgâh.`,
  },
  {
    to: "/collection",
    icon: BookMarked,
    title: "Defter ve rotalar",
    description: "Bulduğun moleküller deftere yazılır; rotalar konudan konuya götürür.",
  },
  {
    to: "/developers",
    icon: Code2,
    title: "API ürün özeti",
    description: "Aynı kayıtlar /api/v2/elements/fe ve /api/v2/compounds/h2o ile JSON olarak okunur.",
  },
];

/** Data value in mono with aligned digits, never broken across lines. */
function figure(text: string | number) {
  return <span className="font-mono whitespace-nowrap tabular">{text}</span>;
}

const SOURCE_FACTS: KeyValueItem[] = [
  { label: "Element", value: figure(coverage.elements) },
  { label: "Bileşik", value: figure(coverage.compounds) },
  { label: "Türkçe anlatım", value: <>{figure(coverage.editorial)} kayıt</> },
  { label: "Element fotoğrafı", value: figure(`${coverage.photos} / ${coverage.elements}`) },
  { label: "Bileşik yapı görseli", value: figure(`${coverage.structures} / ${coverage.compounds}`) },
  {
    label: "Veri alım tarihleri",
    value: (
      <span className="flex flex-wrap gap-x-3">
        {coverage.retrievedAt.split(" / ").map((date) => (
          <span key={date}>{figure(date)}</span>
        ))}
      </span>
    ),
  },
];

const LIMITS: { icon: LucideIcon; title: string; text: string }[] = [
  {
    icon: FlaskConical,
    title: "Laboratuvar bir simülasyon",
    text: "Tezgâh oranları ve katalogdaki bilinen molekülleri denetler. Gerçek deney tarifi vermez, tepkime koşullarını hesaplamaz.",
  },
  {
    icon: Coins,
    title: "Kredi gerçek para değil",
    text: "Piyasa, mağaza ve siparişler sanal KREDI ile çalışan bir demodur: ödeme alınmaz, ürün gönderilmez. JSON’da *Elx adlı alanlar görürsün; değer KREDI’dir.",
  },
  {
    icon: SearchSlash,
    title: "Eksik veri boş kalır",
    text: `Doğrulanmış değer yoksa alan null döner; sıfır yazılmaz, tahmin edilmez. Bu sürümde ${coverage.unavailableElementSections.length} element bölümü tamamen boş.`,
  },
  {
    icon: HardDrive,
    title: "Misafir defteri bu tarayıcıda",
    text: "Hesapsız keşifler yalnız bu tarayıcıda durur. Tarayıcı verisini silersen ve JSON yedeğin yoksa gider.",
  },
];

const STACK: KeyValueItem[] = [
  { label: "Ön yüz", value: "React 19, TypeScript, Vite, Tailwind CSS 4, Radix" },
  { label: "API kapısı", value: ".NET 10 ve YARP", hint: "Yönlendirme, API anahtarı, hız sınırı" },
  {
    label: "Bilimsel katalog",
    value: ".NET 10 catalog ve compound servisleri",
    hint: "Yalnız atlas sürümünde tek bir science-service, veritabanı olmadan",
  },
  { label: "Hesap ve defter", value: ".NET 10 identity-service, PostgreSQL" },
  {
    label: "Kredi simülasyonu",
    value: "Sipariş Node.js 22, cüzdan ve stok Java 21 Spring, kargo ve bildirim .NET 10",
    hint: "Servisler olayları RabbitMQ üzerinden paylaşır",
  },
  { label: "Veri", value: "Servis başına ayrı PostgreSQL veritabanı; Redis yalnız kapıda" },
];

const GUIDES = [
  {
    to: "/kilavuz",
    icon: Compass,
    title: "Sistem kılavuzu",
    description: "Servislerin ne yaptığı ve birbirine nasıl bağlandığı.",
  },
  {
    to: "/docs",
    icon: BookOpen,
    title: "API dokümanları",
    description: "Uçlar, alan seçimi, filtreler, ETag ve hata biçimi.",
  },
  {
    to: "/sozluk",
    icon: Library,
    title: "Sözlük",
    description: "Sitede geçen kimya ve API terimleri.",
  },
];

/** Header aside: the first lab recipe (water), linking to the lab's first route. */
function WaterCard() {
  return (
    <div className="panel w-full p-5 sm:w-72">
      <div className="grid grid-cols-3 gap-2" aria-hidden="true">
        <ElementTile symbol="H" atomicNumber={1} name="Hidrojen" family="nonmetal" />
        <ElementTile symbol="H" atomicNumber={1} name="Hidrojen" family="nonmetal" />
        <ElementTile symbol="O" atomicNumber={8} name="Oksijen" family="nonmetal" />
      </div>
      <h2 className="mt-5 flex items-baseline justify-between gap-3 font-sans text-base font-semibold tracking-normal text-ink">
        İki H, bir O
        <Formula value="H2O" className="text-sm font-normal text-ink-2" />
      </h2>
      <p className="mt-2 text-sm leading-6 text-ink-2">
        Suyun tarifi ve ilk rotan{" "}
        <Link to="/nasil" className="text-link">
          el kitabında
        </Link>
        ; tezgâh bir tık ötede.
      </p>
      <Button asChild className="mt-5 w-full">
        <Link to="/lab?lesson=everyday">
          <FlaskConical strokeWidth={1.75} />
          Laboratuvara git
        </Link>
      </Button>
    </div>
  );
}

/** /hakkinda: what the project is, where the data comes from, its honest limits and the stack. */
export default function About() {
  return (
    <main className="container-page pt-10 pb-24 lg:pt-14">
      <Seo
        title="Hakkında · ElementAPI"
        description={`Türkçe kimya atlası: ${coverage.elements} element, ${coverage.compounds} bileşik, laboratuvarda su ve tuz, altı rota. Açık bilimsel API; kredi masası ayrı demo.`}
        path="/hakkinda"
      />
      <PageHeader
        eyebrow="Proje"
        title="Hakkında"
        lead={
          <>
            ElementAPI Türkçe bir kimya atlası: periyodik tablo, kaynaklı
            element ve bileşik kayıtları, bir laboratuvar ve açık bilimsel API.
            Nasıl başlanacağı{" "}
            <Link to="/nasil" className="text-link">
              el kitabında
            </Link>
            ; burası projenin ne olduğunu ve sınırlarını anlatır.
          </>
        }
        aside={<WaterCard />}
      />

      <Section
        title="Ne var burada"
        description="Atlas, laboratuvar ve bilimsel API herkese açık; başlamak için hesap gerekmez."
      >
        <div className="grid gap-3 md:grid-cols-2">
          {AREAS.map((area) => (
            <LinkCard key={area.to} {...area} />
          ))}
        </div>
      </Section>

      <Section title="Veri nereden geliyor">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-16">
          <div className="max-w-prose space-y-4 text-[15px] leading-7 text-ink-2">
            <p>
              Sayılar PubChem, RSC ve NIST’ten gelir; birimi, belirsizliği ve
              ölçüm koşulu kayıtta durur. Türkçe anlatım editöryeldir.
            </p>
            <p>
              Element fotoğrafları Wikimedia Commons’taki lisanslı örneklerden,
              bileşik yapı görselleri PubChem’den alınır. Fotoğrafı olmayan
              element şemaya düşer; bu çoğu zaman lisans, gaz ya da sentetik
              element demektir, unutulmuş hücre değil.
            </p>
            <p>
              <Link to="/data" className="text-link">
                Veri kapsamını ve kaynakları incele
              </Link>
            </p>
          </div>
          <KeyValue items={SOURCE_FACTS} />
        </div>
      </Section>

      <Section
        title="Sınırlar"
        description="Bu proje bir öğrenme aracıdır. Bilerek yapmadığı şeyler şunlar:"
      >
        <ul className="grid gap-px overflow-hidden rounded-xl border border-line bg-line md:grid-cols-2">
          {LIMITS.map(({ icon: Icon, title, text }) => (
            <li key={title} className="bg-canvas-2 p-5 sm:p-6">
              <Icon aria-hidden="true" strokeWidth={1.75} className="size-5 text-brand-ink" />
              <h3 className="mt-4 font-sans text-base font-semibold tracking-normal text-ink">
                {title}
              </h3>
              <p className="mt-1.5 text-sm leading-6 text-ink-2">{text}</p>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-[13px] text-ink-3">
          Simülasyonu yakından görmek için:{" "}
          <Link to="/demo" className="text-link">
            Kredi simülasyonunu tanı
          </Link>
        </p>
      </Section>

      <Section title="Teknik yapı">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-16">
          <KeyValue items={STACK} />
          <div className="grid content-start gap-3">
            {GUIDES.map((guide) => (
              <LinkCard key={guide.to} {...guide} />
            ))}
          </div>
        </div>
      </Section>
    </main>
  );
}
