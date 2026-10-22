import { Loader2, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CodeBlock } from "@/components/ui/code-block";
import { publicApiUrl } from "@/config";
import { jsonSource } from "@/lib/highlightJson";
import { requestSnippets } from "@/services/apiDocs";
import { track } from "@/services/diagnostics";
import { MethodBadge } from "./MethodBadge";
import { ResponsePanel } from "./ResponsePanel";
import { useApiRequest } from "./useApiRequest";

const SAMPLE_PATH = "/api/v2/elements/fe?fields=symbol,names,classification";

/** Shown when the API cannot be reached, so the page still shows the response shape. */
const OFFLINE_SAMPLE = jsonSource({
  symbol: "Fe",
  names: { tr: "Demir", en: "Iron" },
  classification: { category: "transition_metal", block: "d" },
});

/**
 * Hero console of /developers: the iron request as curl, JavaScript and
 * Python, and its live response (status, ETag, JSON). Loads once on mount;
 * "Çalıştır" sends it again.
 */
export function LiveRequest() {
  const { response, error, pending, send } = useApiRequest(SAMPLE_PATH);
  const url = publicApiUrl(SAMPLE_PATH);

  function run() {
    track("api_example_run");
    send(SAMPLE_PATH);
  }

  let caption = "";
  if (error) caption = "Çevrimdışı yedek örnek; gateway ayaktaysa canlı JSON yüklenir.";
  else if (response) caption = "Yanıt şu an API’den geldi.";

  return (
    <section aria-label="Canlı örnek" className="grid min-w-0 grid-cols-1 gap-3">
      <div className="flex items-center gap-3 rounded-lg border border-line-strong bg-surface py-1.5 pr-1.5 pl-3 shadow-sm">
        <MethodBadge method="GET" />
        <code className="min-w-0 flex-1 truncate font-mono text-[13px] text-ink">
          {SAMPLE_PATH}
        </code>
        <Button size="sm" onClick={run} disabled={pending}>
          {pending ? (
            <Loader2 aria-hidden="true" strokeWidth={1.75} className="animate-spin" />
          ) : (
            <Play aria-hidden="true" strokeWidth={1.75} />
          )}
          Çalıştır
        </Button>
      </div>
      <CodeBlock samples={requestSnippets(url)} />
      <ResponsePanel
        response={response}
        error={error}
        pending={pending}
        onRetry={run}
        maxHeight={300}
        fallback={
          <CodeBlock title="Örnek yanıt · çevrimdışı" language="json" code={OFFLINE_SAMPLE} />
        }
      />
      <p className="min-h-5 text-[13px] text-ink-3">{caption}</p>
    </section>
  );
}
