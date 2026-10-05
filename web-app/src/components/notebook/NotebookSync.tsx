import { Link } from "react-router-dom";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Tone } from "@/components/ui/classes";
import { Notice } from "@/components/ui/notice";
import { ACCOUNTS_ENABLED } from "../../config";
import type { Learning, LearningSyncState } from "../../services/useLearning";

const SYNC_TONE: Record<LearningSyncState, Tone> = {
  local: "neutral",
  memoryOnly: "warning",
  syncing: "info",
  synced: "success",
  failed: "warning",
  timedOut: "warning",
};

/**
 * Where the notebook is stored (this browser or the account) with the matching next step,
 * plus an offer to move guest discoveries into the account after signing in.
 */
export function NotebookSync({ learning }: { learning: Learning }) {
  const { user, syncState, status, progress, guest } = learning;
  const guestOnly = user
    ? guest.discoveries.filter((id) => !progress.discoveries.includes(id))
    : [];

  return (
    <div className="mt-10 grid gap-3">
      <Notice
        tone={SYNC_TONE[syncState]}
        action={
          user ? (
            <Button
              variant="outline"
              size="sm"
              onClick={learning.retry}
              disabled={syncState === "syncing"}
            >
              <RefreshCw strokeWidth={1.75} /> Yeniden eşitle
            </Button>
          ) : (
            ACCOUNTS_ENABLED && (
              <Button asChild variant="outline" size="sm">
                <Link to="/register?returnTo=/collection">Hesap aç</Link>
              </Button>
            )
          )
        }
      >
        {status}
        {!user &&
          (ACCOUNTS_ENABLED
            ? " İlerlemeyi cihazlar arasında sürdürmek için hesap açabilirsin."
            : " Bu kurulumda hesap eşitleme kapalı.")}
      </Notice>
      {guestOnly.length > 0 && (
        <Notice
          tone="info"
          title={`Bu cihazda ${guestOnly.length} misafir keşfi duruyor.`}
          action={
            <Button variant="outline" size="sm" onClick={learning.importGuest}>
              Misafir keşiflerimi hesabıma ekle
            </Button>
          }
        >
          Sana aitse tek tıkla hesabına taşı; taşımazsan bu cihazda kalır,
          silinmez.
        </Notice>
      )}
    </div>
  );
}
