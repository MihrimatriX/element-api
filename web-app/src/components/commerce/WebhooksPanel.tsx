import { useCallback, useEffect, useId, useState, type FormEvent } from "react";
import { Webhook } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Notice } from "@/components/ui/notice";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { apiError, webhookService, type WebhookRow } from "../../services/api";
import { webhookUrlProblem } from "./model";

type HooksState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; hooks: WebhookRow[] };

/** Every webhook gets both event types. */
const EVENTS = ["price.updated", "order.updated"];

/**
 * Webhooks of the account: register an HTTPS URL with an HMAC secret for price and order
 * events, list them, and delete one after a confirmation.
 */
export function WebhooksPanel() {
  const headingId = useId();
  const [state, setState] = useState<HooksState>({ status: "loading" });
  const [url, setUrl] = useState("");
  const [secret, setSecret] = useState("");
  const [urlError, setUrlError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const reload = useCallback(
    () =>
      webhookService.list().then(
        (hooks) => setState({ status: "ready", hooks: hooks ?? [] }),
        () => setState({ status: "error" }),
      ),
    [],
  );
  useEffect(() => {
    void reload();
  }, [reload]);

  async function register(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const problem = webhookUrlProblem(url);
    setUrlError(problem);
    if (problem) return;

    setBusy(true);
    setFailure(null);
    try {
      await webhookService.create(url.trim(), EVENTS, secret);
      toast("Webhook kaydedildi", { tone: "success" });
      setUrl("");
      setSecret("");
      await reload();
    } catch (error) {
      setFailure(apiError(error, "İşlem tamamlanamadı. Lütfen yeniden deneyin."));
    } finally {
      setBusy(false);
    }
  }

  async function remove(hook: WebhookRow) {
    try {
      await webhookService.remove(hook.id);
    } catch (error) {
      toast("Webhook silinemedi", {
        tone: "danger",
        description: apiError(error, "Lütfen yeniden deneyin."),
      });
      throw error;
    }
    toast("Webhook silindi", { tone: "success" });
    await reload();
  }

  return (
    <section aria-labelledby={headingId} className="panel flex flex-col">
      <header className="border-b border-line px-5 py-4">
        <h3 id={headingId} className="text-base font-semibold text-ink">
          Webhook
        </h3>
        <p className="mt-1 text-[13px] leading-5 text-ink-3">
          HTTPS URL. İmza: <code className="font-mono text-ink-2">X-Element-Signature</code>{" "}
          HMAC-SHA256.
        </p>
      </header>

      <div className="grid gap-5 p-5">
        <form onSubmit={register} noValidate className="grid gap-4">
          <Field label="URL" error={urlError}>
            <Input
              type="url"
              inputMode="url"
              placeholder="https://…"
              value={url}
              onChange={(event) => {
                setUrl(event.target.value);
                setUrlError(null);
              }}
            />
          </Field>
          <Field label="Gizli anahtar" hint="İmzayı doğrulamak için sunucunda aynı değeri kullan.">
            <Input
              type="password"
              autoComplete="new-password"
              value={secret}
              onChange={(event) => setSecret(event.target.value)}
            />
          </Field>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="flex flex-wrap gap-1.5">
              {EVENTS.map((name) => (
                <Badge key={name} variant="outline" className="font-mono">
                  {name}
                </Badge>
              ))}
            </p>
            <Button type="submit" variant="outline" disabled={busy} aria-busy={busy || undefined}>
              Kaydet
            </Button>
          </div>
        </form>

        {failure && <Notice tone="danger">{failure}</Notice>}
        <HookList state={state} onRetry={() => void reload()} onRemove={remove} />
      </div>
    </section>
  );
}

interface HookListProps {
  state: HooksState;
  onRetry: () => void;
  onRemove: (hook: WebhookRow) => Promise<void>;
}

/** Registered webhooks with their events; each can be deleted after a confirmation. */
function HookList({ state, onRetry, onRemove }: HookListProps) {
  if (state.status === "loading")
    return <Skeleton className="h-12" aria-hidden="true" />;
  if (state.status === "error")
    return (
      <Notice
        tone="danger"
        action={
          <Button variant="outline" size="sm" onClick={onRetry}>
            Yeniden dene
          </Button>
        }
      >
        Webhook listesi yüklenemedi.
      </Notice>
    );
  if (state.hooks.length === 0)
    return (
      <p className="flex items-center gap-2 text-sm text-ink-3">
        <Webhook aria-hidden="true" strokeWidth={1.75} className="size-4" />
        Kayıtlı webhook yok.
      </p>
    );

  return (
    <ul className="divide-y divide-line border-y border-line">
      {state.hooks.map((hook) => (
        <li key={hook.id} className="flex items-center justify-between gap-3 py-3">
          <div className="min-w-0">
            <p className="font-mono text-[13px] break-all text-ink">{hook.url}</p>
            <p className="mt-0.5 font-mono text-xs text-ink-3">{hook.events?.join(", ")}</p>
          </div>
          <ConfirmDialog
            title="Webhook silinsin mi?"
            description={`${hook.url} adresine artık bildirim gönderilmez.`}
            confirmLabel="Sil"
            onConfirm={() => onRemove(hook)}
            trigger={
              <Button variant="ghost" size="xs">
                Sil
              </Button>
            }
          />
        </li>
      ))}
    </ul>
  );
}
