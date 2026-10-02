import { Link } from "react-router-dom";
import { FileJson, SquareTerminal } from "lucide-react";
import Seo from "@/components/Seo";
import { ApiFacts } from "@/components/developer/ApiFacts";
import { InlineCode } from "@/components/developer/InlineCode";
import { LiveRequest } from "@/components/developer/LiveRequest";
import { MethodBadge } from "@/components/developer/MethodBadge";
import { NextSteps } from "@/components/developer/NextSteps";
import { SCIENCE_ROUTES } from "@/components/developer/endpoints";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "@/components/ui/external-link";
import { PageHeader } from "@/components/ui/page-header";
import { Section } from "@/components/ui/section";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import coverage from "@/data/coverage.json";

const TERMS_URL =
  "https://github.com/MihrimatriX/element-api/blob/main/docs/API-TERMS.md";
const CHANGELOG_URL =
  "https://github.com/MihrimatriX/element-api/blob/main/docs/API-CHANGELOG.md";

const AUDIENCE = [
  "Uygulama, bot veya eklentiye element ve bileşik verisi çekenler",
  "Ders materyaline kaynaklı sayı ve Türkçe anlatım taşıyanlar",
  "Sözleşme, hız sınırı ve hata gövdelerini inceleyenler",
];

const TERMS = [
  "Toplu çekmede sayfala, ETag ile 304 kullan, yanıtı bir saat önbelleğe al.",
  "Uygulamada görünür kaynak göster: “Veri: ElementAPI” ve bağlantı.",
  "v1 cüzdan ve sipariş uçları kredi simülasyonudur; gerçek para gibi sunma.",
];

const cardTitleClass = "font-sans text-base font-semibold tracking-normal text-ink";

/** /developers: product page of the open v2 API with a live request, key facts, routes and terms. */
export default function Developers() {
  return (
    <main className="container-page pb-24 pt-10 lg:pt-14">
      <Seo
        title="API · ElementAPI"
        description={`${coverage.elements} element + ${coverage.compounds} bileşik, anahtarsız bilimsel API. Alan seçimi, ETag, Türkçe kayıt. Deneme tezgâhı /docs.`}
        path="/developers"
      />

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-center lg:gap-14">
        <PageHeader
          eyebrow="ElementAPI · v2"
          title="Açık bilimsel API"
          lead={`${coverage.elements} element ve ${coverage.compounds} bileşik kaydı JSON olarak. Sayılar PubChem, RSC ve NIST kaynaklı, anlatım Türkçe. Hesap yok, anahtar yok.`}
          actions={
            <>
              <Button asChild size="lg">
                <Link to="/docs">
                  <SquareTerminal strokeWidth={1.75} />
                  Deneme tezgâhı
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <a href="/openapi.json">
                  <FileJson strokeWidth={1.75} />
                  OpenAPI
                </a>
              </Button>
            </>
          }
        />
        <LiveRequest />
      </div>

      <Section
        title="Bilmen gerekenler"
        description="Bir istemci yazmadan önce bu altı kural yeter."
      >
        <ApiFacts />
      </Section>

      <Section
        title="Uçlar"
        description={
          <>
            Hepsi GET. <InlineCode>view</InlineCode>,{" "}
            <InlineCode>include</InlineCode> ve <InlineCode>fields</InlineCode>{" "}
            her uçta çalışır.
          </>
        }
        actions={
          <Button asChild variant="link">
            <Link to="/docs#parameters">Bütün parametreler</Link>
          </Button>
        }
      >
        <div className="panel px-5 py-2 sm:px-6">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Yol</TableHead>
                <TableHead>Döner</TableHead>
                <TableHead>Kabul eder</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {SCIENCE_ROUTES.map((route) => (
                <TableRow key={route.path}>
                  <TableCell>
                    <span className="flex items-center gap-3">
                      <MethodBadge method="GET" />
                      <code className="font-mono text-[13px] whitespace-nowrap text-ink">
                        {route.path}
                      </code>
                    </span>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{route.returns}</TableCell>
                  <TableCell className="min-w-56 font-mono text-[13px] text-ink-3">
                    {route.accepts}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Section>

      <Section title="Kim kullanır, hangi şartla">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
          <div className="panel p-6">
            <h3 className={cardTitleClass}>Kim kullanır</h3>
            <ul className="mt-4 grid gap-3 text-[15px] leading-7 text-ink-2">
              {AUDIENCE.map((item) => (
                <li key={item} className="flex gap-3">
                  <span
                    aria-hidden="true"
                    className="mt-[11px] size-1.5 shrink-0 rounded-full bg-ink-4"
                  />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="panel p-6">
            <h3 className={cardTitleClass}>Şartlar (özet)</h3>
            <ol className="mt-4 grid gap-3 text-[15px] leading-7 text-ink-2">
              {TERMS.map((term, index) => (
                <li key={term} className="flex gap-3">
                  <span className="mt-px font-mono text-[13px] text-ink-3 tabular">
                    0{index + 1}
                  </span>
                  {term}
                </li>
              ))}
            </ol>
            <p className="mt-5 flex flex-wrap gap-x-5 gap-y-2 border-t border-line pt-4 text-sm">
              <ExternalLink href={TERMS_URL}>Tam metin: API-TERMS.md</ExternalLink>
              <ExternalLink href={CHANGELOG_URL}>Değişiklik kaydı</ExternalLink>
            </p>
          </div>
        </div>
      </Section>

      <Section title="Sonraki adım">
        <NextSteps />
      </Section>
    </main>
  );
}
