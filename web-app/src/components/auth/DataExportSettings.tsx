import { useState } from "react";
import { Link } from "react-router-dom";
import { Download, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { toast } from "@/components/ui/toast";
import { downloadJson } from "../notebook/downloadJson";
import { accountRequest } from "./accountApi";
import { SettingsSection } from "./SettingsSection";

const EXPORT_TIMEOUT_MS = 10_000;

/** Downloads everything the account holds (`GET /auth/export`) as `elementapi-hesabim.json`. */
export function DataExportSettings() {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function exportAccount() {
    setBusy(true);
    setFailed(false);
    try {
      const response = await accountRequest("/auth/export", {
        timeoutMs: EXPORT_TIMEOUT_MS,
      });
      if (!response.ok || !response.data)
        throw new Error(`HTTP ${response.status}`);
      downloadJson("elementapi-hesabim.json", response.data);
      toast("Hesap verilerin indirildi.", { tone: "success" });
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <SettingsSection
      title="Verilerin"
      description="Misafir kayıtları yalnız bu cihazda tutulur; hesap kayıtları cihazların arasında eşitlenir."
    >
      <div className="panel p-5 sm:p-6">
        <p className="text-sm leading-6 text-ink-2">
          Dosya profilini, öğrenme kayıtlarını, maskeli API anahtarlarını ve
          webhook adreslerini kapsar. Simülasyon işlemleri dahil değildir.
          Yalnız keşif kaydı için{" "}
          <Link to="/collection" className="text-link">
            defterini aç
          </Link>
          .
        </p>
        <Button
          variant="outline"
          className="mt-5"
          disabled={busy}
          onClick={() => void exportAccount()}
        >
          {busy ? (
            <LoaderCircle className="animate-spin" strokeWidth={1.75} />
          ) : (
            <Download strokeWidth={1.75} />
          )}
          Hesap verilerimi indir
        </Button>
        {failed && (
          <Notice tone="danger" className="mt-4">
            Veriler indirilemedi. Yeniden deneyebilirsin.
          </Notice>
        )}
      </div>
    </SettingsSection>
  );
}
