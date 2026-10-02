import { useMemo } from "react";
import { Link } from "react-router-dom";
import { BookOpen, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CodeBlock } from "@/components/ui/code-block";
import { Disclosure, DisclosureContent, DisclosureTrigger } from "@/components/ui/disclosure";
import { ExternalLink } from "@/components/ui/external-link";
import { Section } from "@/components/ui/section";
import { jsonSource } from "@/lib/highlightJson";
import { scienceUrl, type ScientificRecord } from "@/services/science";

/**
 * "Bu veriyi projende kullan": JSON download, the public API record, the docs
 * link and the full record as highlighted JSON behind a disclosure.
 */
export function DeveloperPanel({
  kind,
  id,
  record,
  onDownload,
}: {
  kind: "elements" | "compounds";
  id: string;
  record: ScientificRecord;
  onDownload: () => void;
}) {
  const json = useMemo(() => jsonSource(record), [record]);
  const apiPath = `${kind}/${id}`;
  return (
    <Section
      id="developer"
      title="Bu veriyi projende kullan"
      description="Bilimsel kayıt herkese açık. Alan seçimi, özet yanıt ve önbellek desteğiyle."
    >
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="outline" onClick={onDownload}>
          <Download strokeWidth={1.75} />
          JSON indir
        </Button>
        <Button asChild variant="outline">
          <ExternalLink variant="plain" href={scienceUrl(apiPath)}>
            API kaydı
          </ExternalLink>
        </Button>
        <Button asChild variant="ghost">
          <Link to="/docs">
            <BookOpen strokeWidth={1.75} />
            Dokümantasyon
          </Link>
        </Button>
      </div>
      <Disclosure className="mt-6 rounded-xl border border-line bg-surface shadow-xs">
        <DisclosureTrigger className="rounded-xl px-4 py-3.5 sm:px-5">
          JSON kaydını görüntüle
          <span className="font-mono text-xs font-normal text-ink-3">GET /api/v2/{apiPath}</span>
        </DisclosureTrigger>
        <DisclosureContent>
          <div className="px-3 pb-3 sm:px-4 sm:pb-4">
            <CodeBlock code={json} language="json" title={`${id}.json`} maxHeight={520} />
          </div>
        </DisclosureContent>
      </Disclosure>
    </Section>
  );
}
