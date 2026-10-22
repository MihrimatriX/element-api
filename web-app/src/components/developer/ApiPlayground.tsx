import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CodeBlock } from "@/components/ui/code-block";
import { Field } from "@/components/ui/field";
import {
  NativeSelect,
  NativeSelectOptGroup,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Section } from "@/components/ui/section";
import { ACCOUNTS_ENABLED, publicApiUrl } from "@/config";
import { readStorage } from "@/lib/storage";
import { API_KEY_ENV, requestSnippets } from "@/services/apiDocs";
import { track } from "@/services/diagnostics";
import {
  IRON_PATH,
  SCIENCE_ENDPOINTS,
  SIMULATION_ENDPOINTS,
  WATER_PATH,
  findEndpoint,
  isSciencePath,
} from "./endpoints";
import { InlineCode } from "./InlineCode";
import { ResponsePanel } from "./ResponsePanel";
import { useApiRequest } from "./useApiRequest";

/** Explains whether the selected request needs a key and where it comes from. */
function keyHint(path: string, keyed: boolean, hasKey: boolean): ReactNode {
  if (isSciencePath(path)) return "Bilimsel API açıktır; anahtar veya hesap gerekmez.";
  if (!keyed) return "Bu v1 ucu anahtar istemez.";
  if (hasKey) return "Bu oturumun API anahtarı kullanılıyor.";
  return (
    <>
      Bu uç için{" "}
      <Link to="/account" className="text-link">
        hesap sayfasından
      </Link>{" "}
      API anahtarı oluştur.
    </>
  );
}

/**
 * Interactive request bench of /docs: pick a request, read it as curl,
 * JavaScript or Python, send it and inspect status, ETag and JSON. Revalidates
 * with If-None-Match to show a 304. Every manual send is tracked as
 * `api_example_run`.
 */
export function ApiPlayground() {
  const [path, setPath] = useState(IRON_PATH);
  const [apiKey] = useState(() => readStorage("apiKey"));
  const { response, error, pending, send } = useApiRequest(IRON_PATH);
  const keyed = findEndpoint(path)?.keyed ?? false;
  const canRevalidate = !pending && response?.path === path && Boolean(response.etag);

  function run(target: string, extraHeaders: Record<string, string> = {}) {
    track("api_example_run");
    const keyHeader: Record<string, string> =
      apiKey && !isSciencePath(target) ? { "X-API-Key": apiKey } : {};
    send(target, { ...keyHeader, ...extraHeaders });
  }

  function runPreset(target: string) {
    setPath(target);
    run(target);
  }

  return (
    <Section
      id="playground"
      title="Canlı istek"
      description="Fe veya H₂O ile başla. İstek seç, dili seç, yanıtı gör."
    >
      <div className="panel grid gap-5 p-4 sm:p-5">
        <Field label="GET isteği" hint={keyHint(path, keyed, Boolean(apiKey))}>
          <NativeSelect value={path} onChange={(event) => setPath(event.target.value)}>
            <NativeSelectOptGroup label="v2 bilimsel">
              {SCIENCE_ENDPOINTS.map((endpoint) => (
                <NativeSelectOption key={endpoint.path} value={endpoint.path}>
                  {endpoint.label}
                </NativeSelectOption>
              ))}
            </NativeSelectOptGroup>
            {ACCOUNTS_ENABLED && (
              <NativeSelectOptGroup label="v1 kredi simülasyonu">
                {SIMULATION_ENDPOINTS.map((endpoint) => (
                  <NativeSelectOption key={endpoint.path} value={endpoint.path}>
                    {endpoint.keyed ? `${endpoint.label} (anahtar)` : endpoint.label}
                  </NativeSelectOption>
                ))}
              </NativeSelectOptGroup>
            )}
          </NativeSelect>
        </Field>
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 text-[13px] text-ink-3">Hızlı örnek</span>
          <Button size="sm" variant="secondary" onClick={() => runPreset(IRON_PATH)}>
            Demir
          </Button>
          <Button size="sm" variant="secondary" onClick={() => runPreset(WATER_PATH)}>
            Su
          </Button>
          <div className="mt-2 flex w-full flex-wrap gap-2 sm:mt-0 sm:ml-auto sm:w-auto">
            <Button
              variant="outline"
              disabled={!canRevalidate}
              onClick={() => run(path, { "If-None-Match": response?.etag ?? "" })}
            >
              Aynı ETag ile sor
            </Button>
            <Button onClick={() => run(path)} disabled={pending}>
              {pending ? (
                <Loader2 aria-hidden="true" strokeWidth={1.75} className="animate-spin" />
              ) : (
                <Send aria-hidden="true" strokeWidth={1.75} />
              )}
              İsteği gönder
            </Button>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-4">
        <CodeBlock samples={requestSnippets(publicApiUrl(path), keyed)} />
        {keyed && (
          <p className="text-[13px] leading-5 text-ink-3">
            Anahtarı koda yazma: örnekler onu <InlineCode>{API_KEY_ENV}</InlineCode>{" "}
            ortam değişkeninden okur. Tezgâh bu oturumdaki anahtarı kendisi ekler.
          </p>
        )}
        <ResponsePanel
          response={response}
          error={error}
          pending={pending}
          onRetry={() => run(path)}
        />
      </div>
    </Section>
  );
}
