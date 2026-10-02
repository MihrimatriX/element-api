import { Link } from "react-router-dom";
import { CodeBlock } from "@/components/ui/code-block";
import { KeyValue } from "@/components/ui/key-value";
import { Notice } from "@/components/ui/notice";
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
import { proseClass } from "./docText";
import { IRON_PATH, QUERY_PARAMETERS, WATER_PATH } from "./endpoints";
import { InlineCode } from "./InlineCode";

const SEARCH_PATH = "/api/v2/elements?q=demir&block=d&pageSize=5";
const ETAG_PATH = "/api/v2/elements/fe?fields=symbol,names";

/** Contracts, identifier rules and the coverage-endpoint caveat. */
export function ReferenceSection() {
  return (
    <Section
      id="reference"
      title="v2 referans"
      description="Makine sözleşmeleri, kimlik kuralları ve kapsam ucu."
    >
      <div className="grid gap-6">
        <p className={proseClass}>
          Tam kayıt şemaları:{" "}
          <a href="/schema/elements.schema.json" className="text-link">
            Element JSON Schema
          </a>
          ,{" "}
          <a href="/schema/compounds.schema.json" className="text-link">
            Bileşik JSON Schema
          </a>{" "}
          ve{" "}
          <a href="/openapi.json" className="text-link">
            v2 OpenAPI
          </a>
          . Alan seçimi bazı anahtarları düşürür; şema “her özet yanıt bunu
          içerir” demez. Eksik değer <InlineCode>null</InlineCode> kalır, sıfır
          yapılmaz. Ayrıca:{" "}
          <Link to="/data" className="text-link">
            veri kapsamı
          </Link>{" "}
          ve{" "}
          <Link to="/developers" className="text-link">
            API ürün özeti
          </Link>
          .
        </p>
        <KeyValue
          items={[
            {
              label: "Element kimliği",
              value: (
                <>
                  <InlineCode>fe</InlineCode>, <InlineCode>26</InlineCode> veya{" "}
                  <InlineCode>fe-26</InlineCode>
                </>
              ),
            },
            {
              label: "Bileşik kimliği",
              value: (
                <>
                  Slug (<InlineCode>h2o</InlineCode>, <InlineCode>nacl</InlineCode>,{" "}
                  <InlineCode>aspirin</InlineCode>) veya PubChem CID (
                  <InlineCode>2244</InlineCode> aspirin)
                </>
              ),
            },
            {
              label: "v1 mağaza SKU’su",
              value: "Bilimsel katalog değildir; v2 kimliği yerine kullanma.",
            },
          ]}
        />
        <Notice tone="info" title="Kapsam ucu yalnız atlas ana bilgisayarında">
          <InlineCode>GET /api/v2/coverage</InlineCode> bağımsız atlas ana
          bilgisayarında (<InlineCode>:5080</InlineCode>) vardır; kapı (
          <InlineCode>:5000</InlineCode>) bu ucu geçirmez. Kapıdayken liste
          uçlarının <InlineCode>info.count</InlineCode> alanını oku.
        </Notice>
      </div>
    </Section>
  );
}

/** Three ready-to-run curl requests: a full record, a field selection and a search. */
export function ExamplesSection() {
  const examples = [
    { title: "Demir · tam kayıt", path: IRON_PATH },
    { title: "Su · seçili alanlar", path: WATER_PATH },
    { title: "Elementler · q ve blok", path: SEARCH_PATH },
  ];
  return (
    <Section
      id="examples"
      title="Kopyala, yapıştır"
      description="Terminalde olduğu gibi çalışır; anahtar gerekmez."
    >
      <div className="grid gap-3">
        {examples.map((example) => (
          <CodeBlock
            key={example.path}
            title={example.title}
            code={`curl -s "${publicApiUrl(example.path)}"`}
          />
        ))}
      </div>
    </Section>
  );
}

/** Weak ETags, the one-hour cache and conditional requests answered with 304. */
export function EtagSection() {
  const url = publicApiUrl(ETAG_PATH);
  return (
    <Section id="etag" title="ETag ve 304">
      <p className={proseClass}>
        Başarılı v2 yanıtı zayıf ETag ve{" "}
        <InlineCode>Cache-Control: public, max-age=3600</InlineCode> taşır. Aynı
        gövdenin parmak izini <InlineCode>If-None-Match</InlineCode> ile geri
        gönderirsen 304 gelir; JSON yok. Farklı <InlineCode>fields</InlineCode>{" "}
        farklı ETag üretir. CORS: GET ve OPTIONS, her origin;{" "}
        <InlineCode>ETag</InlineCode> başlığı tarayıcıdan okunabilir.
      </p>
      <CodeBlock
        className="mt-5"
        title="Önce başlığı al, sonra aynı ETag ile sor"
        code={`curl -sI "${url}"\ncurl -s -D - -H 'If-None-Match: W/"…"' "${url}"`}
      />
    </Section>
  );
}

/** Query parameters of the v2 API and where each applies. */
export function ParametersSection() {
  return (
    <Section
      id="parameters"
      title="Parametreler"
      description="Aynı parametreler element ve bileşik uçlarında çalışır; filtreler yalnız element listesinde."
    >
      <div className="panel px-5 py-2 sm:px-6">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Parametre</TableHead>
              <TableHead>Nerede</TableHead>
              <TableHead>Ne işe yarar</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {QUERY_PARAMETERS.map((parameter) => (
              <TableRow key={parameter.name}>
                <TableCell className="align-top">
                  <code className="font-mono text-[13px] whitespace-nowrap text-ink">
                    {parameter.name}
                  </code>
                </TableCell>
                <TableCell className="align-top whitespace-nowrap">
                  {parameter.scope}
                </TableCell>
                <TableCell className="min-w-72 align-top leading-6">
                  {parameter.meaning}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Section>
  );
}
