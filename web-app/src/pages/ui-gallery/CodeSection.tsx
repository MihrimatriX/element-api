import { CodeBlock } from "@/components/ui/code-block";
import { CopyButton } from "@/components/ui/copy-button";
import { ExternalLink } from "@/components/ui/external-link";
import { Section } from "@/components/ui/section";
import { jsonSource } from "@/lib/highlightJson";
import { Specimen } from "./Specimen";

const IRON_RESPONSE = jsonSource({
  symbol: "Fe",
  name: "Demir",
  atomicNumber: 26,
  atomicMass: 55.845,
  category: "transition",
  radioactive: false,
  electronConfiguration: "[Ar] 3d6 4s2",
  sources: [{ name: "PubChem", cid: 23925 }],
});

const ENDPOINT = "https://elementapi.example/api/v2/elements/fe";

const SAMPLES = [
  { label: "curl", code: `curl -s ${ENDPOINT}` },
  {
    label: "JavaScript",
    code: `const response = await fetch("${ENDPOINT}");\nconst iron = await response.json();\nconsole.log(iron.atomicMass); // 55.845`,
  },
  {
    label: "Python",
    code: `import requests\n\niron = requests.get("${ENDPOINT}").json()\nprint(iron["atomicMass"])  # 55.845`,
  },
];

/** Code blocks with JSON colouring, language tabs, copy buttons and external links. */
export function CodeSection() {
  return (
    <Section
      id="kod"
      eyebrow="07"
      title="Kod ve bağlantılar"
      description="JSON renklendirmesi sözdizimi jetonlarını kullanır. Uzun içerik panelin içinde kayar."
    >
      <div className="grid gap-5 lg:grid-cols-2">
        <Specimen title="JSON yanıtı" note="CodeBlock language=json">
          <CodeBlock title="GET /api/v2/elements/fe" language="json" code={IRON_RESPONSE} maxHeight={320} />
        </Specimen>
        <div className="grid content-start gap-5">
          <Specimen title="Dil sekmeleri" note="CodeBlock samples">
            <CodeBlock samples={SAMPLES} />
          </Specimen>
          <Specimen title="Bağlantılar ve kopyalama" note="ExternalLink · CopyButton">
            <p className="max-w-prose text-[15px] leading-7 text-ink-2">
              Bileşik verileri{" "}
              <ExternalLink href="https://pubchem.ncbi.nlm.nih.gov/">PubChem</ExternalLink>{" "}
              kaynaklıdır; fotoğraflar{" "}
              <ExternalLink href="https://commons.wikimedia.org/">Wikimedia Commons</ExternalLink>{" "}
              lisanslarıyla kullanılır.
            </p>
            <div className="mt-5 flex items-center justify-between gap-3 rounded-lg border border-line bg-canvas-2 py-1.5 pr-1.5 pl-3">
              <code className="truncate font-mono text-[13px] text-ink-2">{ENDPOINT}</code>
              <CopyButton value={ENDPOINT} label="Adresi kopyala" showLabel />
            </div>
          </Specimen>
        </div>
      </div>
    </Section>
  );
}
