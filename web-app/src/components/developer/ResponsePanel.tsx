import type { ReactNode } from "react";
import { RotateCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CodeBlock } from "@/components/ui/code-block";
import { Notice } from "@/components/ui/notice";
import { Skeleton } from "@/components/ui/skeleton";
import { jsonSource } from "@/lib/highlightJson";
import { cn } from "@/lib/utils";
import { statusTone } from "@/services/apiDocs";
import type { ApiResponse } from "./useApiRequest";

interface ResponsePanelProps {
  response: ApiResponse | null;
  error: string | null;
  pending: boolean;
  onRetry: () => void;
  /** Max height of the JSON body in px. */
  maxHeight?: number;
  /** Shown under the error notice (e.g. a static sample response). */
  fallback?: ReactNode;
}

const SKELETON_LINES = ["w-1/3", "w-2/3", "w-1/2", "w-3/4", "w-2/5", "w-3/5", "w-1/4"];

/** Header line of a response: status badge, ETag and round-trip time. */
function ResponseStatus({ response }: { response: ApiResponse }) {
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      <Badge variant={statusTone(response.status)} className="font-mono">
        HTTP {response.status}
      </Badge>
      {response.etag && (
        <span className="truncate" title="ETag">
          {response.etag}
        </span>
      )}
      <span className="shrink-0 tabular">{response.durationMs} ms</span>
    </span>
  );
}

/** Loading placeholder shaped like the JSON code panel, as tall as the panel will be. */
function ResponseSkeleton({ height }: { height: number }) {
  return (
    <div className="rounded-lg border border-line bg-canvas-2 shadow-xs">
      <div className="flex h-11 items-center gap-3 border-b border-line px-4">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-3 w-40" />
      </div>
      <div
        className="grid h-(--skeleton-h) content-start gap-3 overflow-hidden p-4"
        style={{ "--skeleton-h": `${height}px` }}
      >
        {SKELETON_LINES.map((width, index) => (
          <Skeleton key={index} className={cn("h-3", width)} />
        ))}
      </div>
    </div>
  );
}

/**
 * Result of a playground request: a skeleton while the first response loads,
 * the highlighted JSON with status and ETag, or an error notice with retry.
 */
export function ResponsePanel({
  response,
  error,
  pending,
  onRetry,
  maxHeight = 420,
  fallback,
}: ResponsePanelProps) {
  let announcement = "";
  if (pending) announcement = "İstek gönderiliyor";
  else if (response && !error) announcement = `Yanıt geldi: HTTP ${response.status}`;

  let body: ReactNode;
  if (error) {
    body = (
      <div className="grid gap-3">
        <Notice
          tone="warning"
          title="İstek tamamlanmadı"
          action={
            <Button size="sm" variant="outline" onClick={onRetry} disabled={pending}>
              <RotateCw strokeWidth={1.75} />
              Yeniden dene
            </Button>
          }
        >
          {error} Gateway kapalıysa docker compose veya atlas ana bilgisayarını
          aç; sonra yeniden dene.
        </Notice>
        {fallback}
      </div>
    );
  } else if (response) {
    body = (
      <CodeBlock
        language="json"
        title={<ResponseStatus response={response} />}
        code={jsonSource(response.body)}
        maxHeight={maxHeight}
        className={cn("transition-opacity duration-200", pending && "opacity-60")}
      />
    );
  } else {
    body = <ResponseSkeleton height={maxHeight} />;
  }

  return (
    <div aria-busy={pending} className="min-w-0">
      <p role="status" className="sr-only">
        {announcement}
      </p>
      {body}
    </div>
  );
}
