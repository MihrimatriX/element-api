import { Badge } from "@/components/ui/badge";
import { CodeBlock } from "@/components/ui/code-block";
import { KeyValue } from "@/components/ui/key-value";
import { Section } from "@/components/ui/section";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SCIENCE_BASE_URL, publicApiUrl } from "@/config";
import { statusTone } from "@/services/apiDocs";
import { proseClass } from "./docText";
import { InlineCode } from "./InlineCode";

/** What `view=summary` returns for elements, compounds and list bodies. */
export function SummarySection() {
  return (
    <Section
      id="summary"
      title="Özet ne içerir"
      description={
        <>
          Liste <InlineCode>view=summary</InlineCode> ile gelir; tek kayıtta
          varsayılan <InlineCode>full</InlineCode>’dur.
        </>
      }
    >
      <KeyValue
        items={[
          {
            label: "Element özeti",
            value:
              "Kimlik, sınıflama, yerleşim, atom kütlesi, kısa elektron dizilimi, elektronegatiflik, hâl, erime ve kaynama noktası, yoğunluk, keşif yılı.",
          },
          {
            label: "Bileşik özeti",
            value: (
              <>
                Slug, adlar, CID, molekül formülü, ağırlık,{" "}
                <InlineCode>display_formula</InlineCode>,{" "}
                <InlineCode>composition</InlineCode>, kısa anlatım ve medya.
              </>
            ),
          },
          {
            label: "Liste gövdesi",
            value: (
              <>
                <InlineCode>{"{ info, results }"}</InlineCode>.{" "}
                <InlineCode>info.count</InlineCode> eşleşen kayıt sayısıdır;{" "}
                <InlineCode>page_size</InlineCode> bu sayfanın boyudur.
              </>
            ),
          },
        ]}
      />
    </Section>
  );
}

/** Error statuses, their problem+json titles and when they happen. */
export function ErrorsSection() {
  const atlasProfile = SCIENCE_BASE_URL.startsWith("/");
  const errors = [
    {
      status: 400,
      title: "Invalid scientific query",
      when: (
        <>
          Bilinmeyen alan, <InlineCode>view=everything</InlineCode>,{" "}
          <InlineCode>pageSize=101</InlineCode>, bileşikte{" "}
          <InlineCode>block=</InlineCode>.
        </>
      ),
    },
    {
      status: 404,
      title: "Scientific record not found",
      when: (
        <>
          <InlineCode>detail</InlineCode> sorulan kimliktir.
        </>
      ),
    },
    { status: 304, title: "—", when: "Gövde yok; ETag tuttu." },
    {
      status: 429,
      title: "—",
      when: `Hız sınırı ana bilgisayara göre: atlas (:5080) dakikada 300, kapı (:5000) 10 saniyede 60 istek. Bu tezgâh şu an ${atlasProfile ? "atlas" : "kapı"} profilinden okuyor.`,
    },
  ];

  return (
    <Section
      id="errors"
      title="Hatalar"
      description={
        <>
          Hata gövdesi <InlineCode>application/problem+json</InlineCode>:{" "}
          <InlineCode>title</InlineCode>, <InlineCode>status</InlineCode>,{" "}
          <InlineCode>detail</InlineCode>.
        </>
      }
    >
      <div className="panel px-5 py-2 sm:px-6">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Kod</TableHead>
              <TableHead>Başlık</TableHead>
              <TableHead>Ne zaman</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {errors.map((row) => (
              <TableRow key={row.status}>
                <TableCell className="align-top">
                  <Badge variant={statusTone(row.status)} className="font-mono">
                    {row.status}
                  </Badge>
                </TableCell>
                <TableCell className="align-top font-mono text-[13px] whitespace-nowrap text-ink">
                  {row.title}
                </TableCell>
                <TableCell className="min-w-64 align-top leading-6">{row.when}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <CodeBlock
        className="mt-4"
        title="400 ve 404 gövdelerini gör"
        code={`curl -s "${publicApiUrl("/api/v2/elements?fields=not_a_field")}"\ncurl -s "${publicApiUrl("/api/v2/compounds/yok")}"`}
      />
    </Section>
  );
}

/** Short English overview for non-Turkish readers; its heading and text carry `lang="en"`. */
export function EnglishSection() {
  return (
    <Section id="english" title={<span lang="en">English summary</span>}>
      <p lang="en" className={proseClass}>
        Open scientific REST: <InlineCode>GET /api/v2/elements/fe</InlineCode>{" "}
        and <InlineCode>/api/v2/compounds/h2o</InlineCode>. No account or key.
        Shape responses with <InlineCode>view</InlineCode>,{" "}
        <InlineCode>include</InlineCode> and <InlineCode>fields</InlineCode>,
        search lists with <InlineCode>q</InlineCode>, follow{" "}
        <InlineCode>info.next</InlineCode>. Weak ETags (
        <InlineCode>If-None-Match</InlineCode> → 304), one-hour cache, missing
        values are <InlineCode>null</InlineCode>. Rate limits are per host:
        300/min on the atlas host (<InlineCode>:5080</InlineCode>), 60/10 s
        behind the gateway (<InlineCode>:5000</InlineCode>). Machine contract:{" "}
        <a href="/openapi.json" className="text-link">
          /openapi.json
        </a>
        . Wallet, orders and webhooks are the separate keyed v1 simulation
        below.
      </p>
    </Section>
  );
}
