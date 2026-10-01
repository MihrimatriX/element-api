import { BookA, FlaskConical, Grid2X2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Disclosure, DisclosureContent, DisclosureTrigger } from "@/components/ui/disclosure";
import { KeyValue } from "@/components/ui/key-value";
import { LinkCard } from "@/components/ui/link-card";
import { Section } from "@/components/ui/section";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Specimen } from "./Specimen";

const IRON_FACTS = [
  { label: "Atom numarası", value: <span className="font-mono tabular">26</span> },
  { label: "Atom kütlesi", value: <span className="font-mono tabular">55,845 g/mol</span> },
  { label: "Elektron dizilimi", value: <span className="font-mono">[Ar] 3d⁶ 4s²</span> },
  { label: "Yoğunluk", value: <span className="font-mono tabular">7,874 g/cm³</span>, hint: "20 °C'de" },
  { label: "Erime noktası", value: <span className="font-mono tabular">1538 °C</span> },
  { label: "Keşif", value: "Antik çağ" },
];

const ENDPOINTS = [
  { method: "GET", path: "/api/v2/elements", note: "118 elementin listesi", limit: "60/dk" },
  { method: "GET", path: "/api/v2/elements/{symbol}", note: "Tek element, tüm özellikler", limit: "60/dk" },
  { method: "GET", path: "/api/v2/compounds", note: "214 bileşik, sayfalı", limit: "60/dk" },
  { method: "GET", path: "/api/v2/compounds/{slug}", note: "Bileşik, yapı ve kaynaklar", limit: "60/dk" },
];

/** Breadcrumbs, key/value lists, tables, disclosures and link cards. */
export function DataSection() {
  return (
    <Section
      id="veri"
      eyebrow="05"
      title="Veri ve gezinme"
      description="Tanım listeleri, tablolar ve açılır bölümler aynı ince çizgiyi paylaşır."
    >
      <div className="grid gap-5">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <Specimen title="Anahtar–değer" note="Breadcrumb · KeyValue">
            <Breadcrumb
              items={[
                { label: "Tablo", to: "/periodic" },
                { label: "Geçiş metalleri", to: "/periodic" },
                { label: "Demir" },
              ]}
            />
            <KeyValue items={IRON_FACTS} className="mt-5" />
          </Specimen>
          <Specimen title="Açılır bölüm" note="Disclosure">
            <Disclosure defaultOpen className="border-b border-line">
              <DisclosureTrigger>
                Fiziksel özellikler
                <Badge variant="secondary">3</Badge>
              </DisclosureTrigger>
              <DisclosureContent>
                <KeyValue items={IRON_FACTS.slice(3)} className="mb-4" />
              </DisclosureContent>
            </Disclosure>
            <Disclosure className="border-b border-line">
              <DisclosureTrigger>
                Kaynaklar
                <Badge variant="secondary">2</Badge>
              </DisclosureTrigger>
              <DisclosureContent>
                <p className="pb-4 text-sm leading-6 text-ink-2">
                  PubChem CID 23925 · Wikimedia Commons fotoğrafı (CC BY-SA 4.0).
                </p>
              </DisclosureContent>
            </Disclosure>
          </Specimen>
        </div>

        <Specimen title="Tablo" note="Table">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Yöntem</TableHead>
                <TableHead>Yol</TableHead>
                <TableHead>Açıklama</TableHead>
                <TableHead className="text-right">Sınır</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ENDPOINTS.map((endpoint) => (
                <TableRow key={endpoint.path}>
                  <TableCell>
                    <Badge variant="success">{endpoint.method}</Badge>
                  </TableCell>
                  <TableCell className="font-mono text-[13px] text-ink">{endpoint.path}</TableCell>
                  <TableCell>{endpoint.note}</TableCell>
                  <TableCell className="text-right font-mono text-[13px] tabular">{endpoint.limit}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Specimen>

        <Specimen title="Bağlantı kartları" note="LinkCard · iç ve dış">
          <div className="grid gap-3 md:grid-cols-2">
            <LinkCard
              to="/periodic"
              icon={Grid2X2}
              title="Periyodik tablo"
              description="118 element, aile ve özellik mercekleriyle."
              meta="/periodic"
            />
            <LinkCard
              to="/lab"
              icon={FlaskConical}
              title="Laboratuvar"
              description="Elementleri tezgâha sürükle, bileşiği kur."
              meta="/lab"
            />
            <LinkCard
              to="/sozluk"
              icon={BookA}
              title="Sözlük"
              description="Mol, iyon, değerlik: kısa ve örnekli tanımlar."
            />
            <LinkCard
              href="https://pubchem.ncbi.nlm.nih.gov/"
              title="PubChem"
              description="Bileşik verilerinin birincil kaynağı."
              meta="pubchem.ncbi.nlm.nih.gov"
            />
          </div>
        </Specimen>
      </div>
    </Section>
  );
}
