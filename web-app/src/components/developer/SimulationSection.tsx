import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { CodeBlock } from "@/components/ui/code-block";
import {
  Disclosure,
  DisclosureContent,
  DisclosureTrigger,
} from "@/components/ui/disclosure";
import { Section } from "@/components/ui/section";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { publicApiUrl } from "@/config";
import coverage from "@/data/coverage.json";
import { postSnippet } from "@/services/apiDocs";
import { SIMULATION_ROUTES } from "./endpoints";
import { InlineCode } from "./InlineCode";
import { MethodBadge } from "./MethodBadge";

const RULES = [
  "Alış son fiyatın %0,8 üstünde, satış %0,8 altında. Fiyatlar gerçek piyasa verisi değil, kredi simülasyonudur.",
  "Alış fiyatı yükseltir, satış düşürür. Tek seferde en fazla %3.",
  <>
    Kayıt olunca hesaba 10.000 kredi yüklenir. Sipariş = alış × gram; 402 =
    yetersiz bakiye (reason <InlineCode>INSUFFICIENT_ELX</InlineCode> olabilir).
  </>,
  <>
    Ekranda para birimi <InlineCode>KREDI</InlineCode>. JSON alan adları
    uyumluluk için <InlineCode>balanceElx</InlineCode>,{" "}
    <InlineCode>avgCostElx</InlineCode>, <InlineCode>proceedsElx</InlineCode>{" "}
    kalır; değerler kredidir. Elrond token’ı değildir.
  </>,
  <>
    Bileşik fiyatı = ana element alış fiyatı × ürün çarpanı × gram. Her ürün
    kasada ayrı tutulur; satışta aynı <InlineCode>compoundSlug</InlineCode>{" "}
    gönderilir. {coverage.compounds} eğitim bileşiği kendiliğinden mağaza ürünü
    olmaz.
  </>,
  <>
    Tekrar denemelerde aynı UUID değerini <InlineCode>Idempotency-Key</InlineCode>{" "}
    başlığıyla gönder. Aynı sipariş tekrar oluşturulmaz.
  </>,
  "Miktar pozitif bir JSON sayısıdır; en fazla 4 ondalık basamak. 409 = stok yetersiz veya istek anahtarı başka bir siparişte kullanılmış.",
];

interface SimulationSectionProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * The v1 credit simulation, collapsed by default: pricing rules, the keyed
 * route table and POST examples. `/docs#simulation` opens it.
 */
export function SimulationSection({ open, onOpenChange }: SimulationSectionProps) {
  return (
    <Section
      id="simulation"
      title="Simülasyon ve hesap · v1"
      description={
        <>
          Bu ayrı teknik demo tam servis kurulumu gerektirir ve bilimsel v2 ile
          karışmaz.{" "}
          <Link to="/demo" className="text-link">
            Demo akışını incele
          </Link>
          .
        </>
      }
    >
      <Disclosure
        open={open}
        onOpenChange={onOpenChange}
        className="rounded-xl border border-line bg-surface px-5 shadow-xs sm:px-6"
      >
        <DisclosureTrigger className="py-4">
          Kurallar, uç tablosu ve POST örnekleri
        </DisclosureTrigger>
        <DisclosureContent>
          <div className="grid gap-8 border-t border-line pt-6 pb-6">
            <ul className="grid max-w-prose list-disc gap-2 pl-5 text-[15px] leading-7 text-ink-2 marker:text-ink-4">
              {RULES.map((rule, index) => (
                <li key={index}>{rule}</li>
              ))}
            </ul>

            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Yol</TableHead>
                  <TableHead>Anahtar</TableHead>
                  <TableHead>Ne yapar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {SIMULATION_ROUTES.map((route) => (
                  <TableRow key={`${route.method} ${route.path}`}>
                    <TableCell>
                      <span className="flex items-center gap-3">
                        <MethodBadge method={route.method} />
                        <code className="font-mono text-[13px] whitespace-nowrap text-ink">
                          {route.path}
                        </code>
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={route.keyed ? "warning" : "secondary"}>
                        {route.keyed ? "Var" : "Yok"}
                      </Badge>
                    </TableCell>
                    <TableCell className="min-w-56">{route.purpose}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div>
              <h3 className="font-sans text-base font-semibold tracking-normal text-ink">
                POST örnekleri
              </h3>
              <div className="mt-4 grid gap-3">
                <CodeBlock
                  title="Sipariş ver"
                  code={postSnippet(publicApiUrl("/api/v1/orders"), {
                    elementSymbol: "Au",
                    quantity: 1,
                  })}
                />
                <CodeBlock
                  title="Kasadan sat"
                  code={postSnippet(publicApiUrl("/api/v1/desk/sell"), {
                    symbol: "Au",
                    grams: 1,
                  })}
                />
              </div>
            </div>
          </div>
        </DisclosureContent>
      </Disclosure>
    </Section>
  );
}
