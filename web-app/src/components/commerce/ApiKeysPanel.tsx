import { useCallback, useEffect, useId, useState, type FormEvent } from "react";
import { Eye, EyeOff, KeyRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { CopyButton } from "@/components/ui/copy-button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Notice } from "@/components/ui/notice";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { readStorage, removeStorage, writeStorage } from "../../lib/storage";
import { apiError, apiKeyService, type ApiKeyRow } from "../../services/api";
import { DASHBOARD_KEY_DESCRIPTION, maskApiKey } from "./model";

type KeysState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; keys: ApiKeyRow[] };

/** localStorage key holding the key this browser uses for the wallet and orders. */
const DASHBOARD_KEY_STORAGE = "apiKey";
const NEW_KEY_TPS = 5;

interface ApiKeysPanelProps {
  /** Called when the browser's own dashboard key is set or revoked (the page refreshes the wallet). */
  onDashboardKeyChange: () => void;
}

/**
 * API keys of the account: generate one (shown once, masked until revealed, with copy),
 * list keys with their limit and state, and revoke after a confirmation.
 */
export function ApiKeysPanel({ onDashboardKeyChange }: ApiKeysPanelProps) {
  const headingId = useId();
  const [state, setState] = useState<KeysState>({ status: "loading" });
  const [description, setDescription] = useState("CLI key");
  const [freshKey, setFreshKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const reload = useCallback(
    () =>
      apiKeyService.list().then(
        (keys) => setState({ status: "ready", keys: keys ?? [] }),
        () => setState({ status: "error" }),
      ),
    [],
  );
  useEffect(() => {
    void reload();
  }, [reload]);

  async function generate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setFailure(null);
    try {
      const { apiKey } = await apiKeyService.generate(
        description.trim() || "API key",
        NEW_KEY_TPS,
      );
      setFreshKey(apiKey);
      // The first key becomes this browser's dashboard key when it has none.
      if (!readStorage(DASHBOARD_KEY_STORAGE)) {
        writeStorage(DASHBOARD_KEY_STORAGE, apiKey);
        onDashboardKeyChange();
      }
      await reload();
    } catch (error) {
      setFailure(apiError(error, "İşlem tamamlanamadı. Lütfen yeniden deneyin."));
    } finally {
      setBusy(false);
    }
  }

  async function revoke(key: ApiKeyRow) {
    try {
      await apiKeyService.revoke(key.id);
    } catch (error) {
      toast("Anahtar iptal edilemedi", {
        tone: "danger",
        description: apiError(error, "Lütfen yeniden deneyin."),
      });
      throw error;
    }
    const stored = readStorage(DASHBOARD_KEY_STORAGE);
    if (stored && maskApiKey(stored) === key.maskedKey) {
      removeStorage(DASHBOARD_KEY_STORAGE);
      onDashboardKeyChange();
    }
    setFreshKey("");
    toast("Anahtar iptal edildi", { tone: "success" });
    await reload();
  }

  return (
    <section aria-labelledby={headingId} className="panel flex flex-col">
      <header className="border-b border-line px-5 py-4">
        <h3 id={headingId} className="text-base font-semibold text-ink">
          API anahtarları
        </h3>
        <p className="mt-1 text-[13px] leading-5 text-ink-3">
          Cüzdan ve sipariş uçları (v1) anahtar ister; bilimsel v2 istemez.
        </p>
      </header>

      <div className="grid gap-5 p-5">
        <form onSubmit={generate} className="grid gap-2">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <Field label="Açıklama" className="flex-1">
              <Input
                value={description}
                maxLength={100}
                onChange={(event) => setDescription(event.target.value)}
              />
            </Field>
            <Button type="submit" disabled={busy} aria-busy={busy || undefined}>
              <KeyRound aria-hidden="true" strokeWidth={1.75} />
              Anahtar üret
            </Button>
          </div>
          <p className="text-[13px] text-ink-3">
            Yeni anahtar saniyede {NEW_KEY_TPS} isteğe kadar izin verir.
          </p>
        </form>

        {/* Keyed by the key itself so every new key starts masked again. */}
        {freshKey && <FreshKey key={freshKey} value={freshKey} />}
        {failure && <Notice tone="danger">{failure}</Notice>}
        <KeyList state={state} onRetry={() => void reload()} onRevoke={revoke} />
      </div>
    </section>
  );
}

/** The just-created key: masked until revealed, copyable, with a "shown once" warning. */
function FreshKey({ value }: { value: string }) {
  const [revealed, setRevealed] = useState(false);
  const ToggleIcon = revealed ? EyeOff : Eye;
  return (
    <div role="status" className="rounded-lg border border-success/30 bg-success-soft p-4">
      <p className="text-sm font-medium text-ink">Yeni anahtar hazır</p>
      <p className="mt-0.5 text-[13px] leading-5 text-ink-2">
        Yalnız şimdi gösterilir. Kopyala ve güvenli bir yerde sakla.
      </p>
      <div className="mt-3 flex items-center gap-1 rounded-md border border-line-strong bg-canvas-2 py-1 pr-1 pl-3">
        <code className="min-w-0 flex-1 font-mono text-[13px] break-all text-ink">
          {revealed ? value : `${value.slice(0, 8)}${"•".repeat(20)}`}
        </code>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-pressed={revealed}
          onClick={() => setRevealed((current) => !current)}
        >
          <ToggleIcon aria-hidden="true" strokeWidth={1.75} />
          <span className="sr-only">Anahtarı göster</span>
        </Button>
        <CopyButton value={value} label="Anahtarı kopyala" />
      </div>
    </div>
  );
}

interface KeyListProps {
  state: KeysState;
  onRetry: () => void;
  onRevoke: (key: ApiKeyRow) => Promise<void>;
}

/** Existing keys with description, mask, limit and state; active ones can be revoked. */
function KeyList({ state, onRetry, onRevoke }: KeyListProps) {
  if (state.status === "loading")
    return (
      <div className="grid gap-3" aria-hidden="true">
        <Skeleton className="h-12" />
        <Skeleton className="h-12" />
      </div>
    );
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
        Anahtarlar yüklenemedi.
      </Notice>
    );
  if (state.keys.length === 0)
    return <p className="text-sm text-ink-3">Henüz anahtar yok.</p>;

  return (
    <ul className="divide-y divide-line border-y border-line">
      {state.keys.map((key) => (
        <li key={key.id} className="flex items-center justify-between gap-3 py-3">
          <div className="min-w-0">
            <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-ink">
              <span className="truncate">{key.description}</span>
              {key.description === DASHBOARD_KEY_DESCRIPTION && (
                <Badge variant="secondary">Web paneli</Badge>
              )}
              {!key.isActive && <Badge variant="destructive">İptal edildi</Badge>}
            </p>
            <p className="mt-0.5 font-mono text-xs break-all text-ink-3">
              {key.maskedKey} · {key.rateLimitTps} TPS
            </p>
          </div>
          {key.isActive && (
            <ConfirmDialog
              title="Anahtar iptal edilsin mi?"
              description={`${key.maskedKey} artık çalışmaz; bu anahtarı kullanan istemciler 401 alır. Bu işlem geri alınamaz.`}
              confirmLabel="İptal et"
              onConfirm={() => onRevoke(key)}
              trigger={
                <Button variant="ghost" size="xs">
                  İptal et
                </Button>
              }
            />
          )}
        </li>
      ))}
    </ul>
  );
}
