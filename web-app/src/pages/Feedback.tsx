import { useEffect, useId, useState } from "react";
import { Download, RefreshCw } from "lucide-react";
import Seo from "../components/Seo";
import { downloadJson } from "../components/notebook/downloadJson";
import { Button } from "../components/ui/button";
import { Field } from "../components/ui/field";
import { Notice } from "../components/ui/notice";
import { PageHeader } from "../components/ui/page-header";
import { Stat, StatGrid } from "../components/ui/stat";
import { Textarea } from "../components/ui/textarea";
import { readStorage } from "../lib/storage";
import {
  DIAGNOSTICS_CONSENT,
  diagnosticEvents,
  setDiagnostics,
  type ProductEvent,
} from "../services/diagnostics";

const NOTES_MAX_LENGTH = 4000;
const EXPORT_FILE_NAME = "elementapi-deneyim-notlari.json";
const EXPORT_SCOPE =
  "Bu tarayıcıda izin verildikten sonraki en son 200 olay; genel kullanıcı istatistiği değildir.";

const panelTitleClass =
  "font-sans text-base font-semibold tracking-normal text-ink";

/**
 * Local-only feedback: an opt-in diagnostics log with counters, and a note that is
 * downloaded together with the log as JSON. Nothing is sent to a server.
 */
export default function Feedback() {
  const notesTitleId = useId();
  const diagnosticsTitleId = useId();
  const [enabled, setEnabled] = useState(
    () => readStorage(DIAGNOSTICS_CONSENT) === "true",
  );
  const [events, setEvents] = useState(diagnosticEvents);
  const [notes, setNotes] = useState("");
  const [storageBlocked, setStorageBlocked] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  // Notes live only in memory: ask before a reload or tab close throws them away.
  useEffect(() => {
    if (!notes) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [notes]);

  const countOf = (event: ProductEvent) =>
    events.filter((entry) => entry.event === event).length;

  function toggleDiagnostics(next: boolean) {
    if (!setDiagnostics(next)) {
      setStorageBlocked(true);
      return;
    }
    setStorageBlocked(false);
    setEnabled(next);
    setEvents(diagnosticEvents());
  }

  function download() {
    downloadJson(EXPORT_FILE_NAME, {
      scope: EXPORT_SCOPE,
      exportedAt: new Date().toISOString(),
      notes,
      events: diagnosticEvents(),
    });
    setDownloaded(true);
  }

  return (
    <main className="container-page pb-24 pt-10 lg:pt-14">
      <Seo
        title="Geri bildirim · ElementAPI"
        description="Yerel not ve isteğe bağlı deneme kaydı. Sunucuya otomatik gitmez."
        path="/feedback"
        noIndex
      />
      <PageHeader
        eyebrow="Defter"
        title="Geri bildirim"
        lead="Su kurulmadı mı, tuz formül birimi karıştı mı? Notu buraya yaz; kimseye otomatik gitmez."
      />

      <div className="mt-12 grid gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <section aria-labelledby={notesTitleId} className="panel p-5 sm:p-6">
          <h2 id={notesTitleId} className={panelTitleClass}>
            Gözlemlerin
          </h2>
          <Field
            label="Deneyim notu"
            labelAction={
              <span className="font-mono text-ink-3 tabular">
                {notes.length} / {NOTES_MAX_LENGTH}
              </span>
            }
            hint="Not, bu sayfa açıkken bellekte tutulur. İndirdiğin dosyayı inceleyip istediğin kişiyle kendin paylaşabilirsin."
            className="mt-5"
          >
            <Textarea
              rows={6}
              maxLength={NOTES_MAX_LENGTH}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Zorlandığın adımı ve beklediğin davranışı anlat. Kişisel bilgi veya şifre ekleme."
              className="min-h-40"
            />
          </Field>
          <Button onClick={download} className="mt-6">
            <Download strokeWidth={1.75} /> Notları ve deneme kaydını indir
          </Button>
          {downloaded && (
            <Notice tone="success" className="mt-4">
              Dosya hazırlandı. Otomatik olarak kimseye gönderilmedi.
            </Notice>
          )}
        </section>

        <section
          aria-labelledby={diagnosticsTitleId}
          className="panel p-5 sm:p-6"
        >
          <h2 id={diagnosticsTitleId} className={panelTitleClass}>
            İsteğe bağlı deneme kaydı
          </h2>
          <p className="mt-1.5 text-sm leading-6 text-ink-2">
            Açarsan bu tarayıcıda son 200 keşif, rota, kayıt açma ve hata olayı
            zamanlarıyla tutulur. E-posta, şifre, anahtar veya hata metni
            kaydedilmez. Veriler sunucuya gönderilmez. Kapatmak mevcut olayları
            siler.
          </p>
          <label className="mt-5 flex cursor-pointer items-center gap-3 rounded-lg border border-line-strong bg-canvas-2 px-4 py-3 text-sm text-ink transition-colors hover:border-ink-4">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(event) => toggleDiagnostics(event.target.checked)}
              className="size-4 shrink-0 accent-brand"
            />
            Bu cihazda deneme olaylarını kaydet
          </label>
          {storageBlocked && (
            <Notice tone="warning" className="mt-3">
              Tarayıcı depolaması kapalı; kayıt etkinleştirilemedi.
            </Notice>
          )}
          <StatGrid columns={3} className="mt-5 grid-cols-3">
            <Stat label="Kayıt" value={events.length} />
            <Stat label="Keşif" value={countOf("discovery_completed")} />
            <Stat label="Rota" value={countOf("lesson_completed")} />
          </StatGrid>
          <Button
            variant="ghost"
            size="sm"
            className="mt-3 -ml-2"
            onClick={() => setEvents(diagnosticEvents())}
          >
            <RefreshCw strokeWidth={1.75} /> Sayıları yenile
          </Button>
        </section>
      </div>
    </main>
  );
}
