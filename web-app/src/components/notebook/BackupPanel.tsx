import { useRef, useState } from "react";
import { Download, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import type { LearningProgress } from "../../services/lessons";
import {
  BACKUP_FILE_NAME,
  MAX_BACKUP_BYTES,
  backupData,
  parseBackup,
} from "./backup";
import { downloadJson } from "./downloadJson";

const INVALID_FILE =
  "Bu dosya geçerli bir koleksiyon kaydı değil. ElementAPI’den indirdiğin JSON dosyasını seç.";

interface BackupPanelProps {
  progress: LearningProgress;
  /** Receives the validated progress from a backup file; the caller merges it. */
  onRestore: (incoming: LearningProgress) => void;
}

/** Downloads the notebook as a JSON file, or adds the discoveries from such a file back in. */
export function BackupPanel({ progress, onRestore }: BackupPanelProps) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(
    null,
  );
  const isEmpty = progress.discoveries.length === 0;

  async function restore(file: File | undefined) {
    if (!file) return;
    let incoming: LearningProgress | null = null;
    try {
      if (file.size <= MAX_BACKUP_BYTES)
        incoming = parseBackup(await file.text());
    } catch {
      incoming = null;
    }
    if (!incoming) {
      setResult({ ok: false, text: INVALID_FILE });
      return;
    }
    onRestore(incoming);
    setResult({
      ok: true,
      text: "Dosyadaki geçerli keşifler mevcut koleksiyonuna eklendi.",
    });
  }

  return (
    <div className="panel grid divide-y divide-line md:grid-cols-2 md:divide-x md:divide-y-0">
      <div className="flex flex-col p-5 sm:p-6">
        <h3 className="font-sans text-base font-semibold tracking-normal text-ink">
          Kaydını indir
        </h3>
        <p className="mt-1.5 text-sm leading-6 text-ink-2">
          Keşiflerin ve tamamladığın rotalar tek bir JSON dosyasına yazılır.
          Dosya yalnız senin cihazına iner.
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            disabled={isEmpty}
            onClick={() => downloadJson(BACKUP_FILE_NAME, backupData(progress))}
          >
            <Download strokeWidth={1.75} /> Kaydımı indir
          </Button>
          {isEmpty && (
            <span className="text-[13px] text-ink-3">
              İlk keşiften sonra açılır.
            </span>
          )}
        </div>
      </div>
      <div className="flex flex-col p-5 sm:p-6">
        <h3 className="font-sans text-base font-semibold tracking-normal text-ink">
          Koleksiyon dosyası aktar
        </h3>
        <p className="mt-1.5 text-sm leading-6 text-ink-2">
          İndirdiğin JSON dosyasındaki keşifler mevcut ilerlemene eklenir;
          hiçbir kayıt silinmez.
        </p>
        <input
          ref={fileInput}
          type="file"
          accept=".json,application/json"
          aria-label="İndirdiğin koleksiyonu geri yükle"
          hidden
          onChange={(event) => {
            void restore(event.target.files?.[0]);
            event.target.value = "";
          }}
        />
        <div className="mt-5">
          <Button variant="outline" onClick={() => fileInput.current?.click()}>
            <Upload strokeWidth={1.75} /> JSON dosyası seç
          </Button>
        </div>
        {result && (
          <Notice tone={result.ok ? "success" : "danger"} className="mt-4">
            {result.text}
          </Notice>
        )}
      </div>
    </div>
  );
}
