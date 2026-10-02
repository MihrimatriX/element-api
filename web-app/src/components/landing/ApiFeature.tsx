import { Fragment } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check, Code2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CodeBlock } from "@/components/ui/code-block";
import { CopyButton } from "@/components/ui/copy-button";
import { publicApiUrl } from "@/config";
import { API_SAMPLE_PATH, API_SAMPLE_RESPONSE } from "./apiSample";
import { FeatureSection } from "./FeatureSection";

const FACTS = ["Anahtar gerekmez", "Alan seçimi", "ETag ile önbellek", "Türkçe adlar"];

/** Open API feature: what the v2 API offers and a real request/response pair. */
export function ApiFeature() {
  return (
    <FeatureSection
      mediaFirst
      eyebrow="Açık API"
      title="Aynı kayıtlar, JSON olarak"
      media={
        <div className="grid gap-2">
          <div className="flex items-start gap-3 rounded-lg border border-line bg-canvas-2 py-2 pr-1.5 pl-4 shadow-xs">
            <span className="mt-1.5 rounded-xs bg-success-soft px-1.5 font-mono text-2xs font-medium text-success">
              GET
            </span>
            <code className="min-w-0 flex-1 py-1 font-mono text-[13px] leading-6 break-words text-ink">
              {/* Allow line breaks after "?" and "," only, so field names stay whole. */}
              {API_SAMPLE_PATH.split(/(?<=[?,])/).map((part) => (
                <Fragment key={part}>
                  {part}
                  <wbr />
                </Fragment>
              ))}
            </code>
            <CopyButton value={publicApiUrl(API_SAMPLE_PATH)} label="Adresi kopyala" />
          </div>
          <CodeBlock
            title="200 OK · application/json"
            language="json"
            code={JSON.stringify(API_SAMPLE_RESPONSE, null, 2)}
            className="shadow-lg"
          />
        </div>
      }
      actions={
        <>
          <Button asChild size="lg">
            <Link to="/developers">
              <Code2 strokeWidth={1.75} />
              API’yi incele
            </Link>
          </Button>
          <Button asChild variant="link">
            <Link to="/docs">
              Dokümanlar
              <ArrowRight strokeWidth={1.75} />
            </Link>
          </Button>
        </>
      }
    >
      <p>
        Tablodaki her kayıt bilimsel v2 uçlarından okunur. İhtiyacın olan
        alanları <code className="font-mono text-[13px] text-ink">fields</code>{" "}
        ile seç, yanıtı ETag ile önbelleğe al.
      </p>
      <ul className="grid grid-cols-2 gap-x-6 gap-y-2">
        {FACTS.map((fact) => (
          <li key={fact} className="flex items-center gap-2 text-sm text-ink-2">
            <Check aria-hidden="true" strokeWidth={1.75} className="size-4 text-success" />
            {fact}
          </li>
        ))}
      </ul>
    </FeatureSection>
  );
}
