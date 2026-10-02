import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Notice } from "@/components/ui/notice";
import { toast } from "@/components/ui/toast";
import { clearSession, tokenUser } from "../../services/session";
import { forgetLearning } from "../../services/useLearning";
import { useAccountAction } from "./accountApi";
import { PasswordInput } from "./PasswordInput";
import { SettingsSection } from "./SettingsSection";

/** The server accepts the deletion only with exactly this phrase. */
const DELETE_PHRASE = "HESABIMI SİL";

const CONSEQUENCES =
  "Profilin, öğrenme kayıtların, API anahtarların ve webhook aboneliklerin kalıcı olarak silinir. Tüm oturumların kapanır.";

/**
 * Account deletion behind a danger confirmation that asks for the password and the typed
 * phrase. Success also removes this device's notebook for the account and signs out.
 */
export function DeleteAccountSettings() {
  const navigate = useNavigate();
  const { result, run, clear } = useAccountAction();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  // Typing "hesabımı sil" counts too: compare in Turkish upper case.
  const phraseMatches =
    confirmation.trim().toLocaleUpperCase("tr-TR") === DELETE_PHRASE;

  async function deleteAccount() {
    const user = tokenUser();
    const response = await run("/auth/delete", {
      password,
      confirmation: DELETE_PHRASE,
    });
    // A rejection keeps the dialog open with the error inside it.
    if (!response?.ok) throw new Error("Account was not deleted");
    if (user) forgetLearning(user);
    toast(response.message ?? "Hesabın silindi.", { tone: "success" });
    clearSession();
    navigate("/");
  }

  function resetOnClose(open: boolean) {
    if (open) return;
    setPassword("");
    setConfirmation("");
    clear();
  }

  return (
    <SettingsSection title="Hesabı sil" description="Bu işlem geri alınamaz.">
      <div className="rounded-xl border border-danger/30 bg-danger-soft p-5 sm:p-6">
        <p className="text-sm leading-6 text-ink-2">
          {CONSEQUENCES} Simülasyon siparişleri ve teknik günlükler otomatik
          silinmez; bunlar kullanıcı numarasıyla kalabilir.
        </p>
        <ConfirmDialog
          trigger={
            <Button variant="destructive" className="mt-5">
              <Trash2 strokeWidth={1.75} /> Hesabımı sil
            </Button>
          }
          title="Hesabın silinsin mi?"
          description={CONSEQUENCES}
          confirmLabel="Hesabımı ve öğrenme kayıtlarımı sil"
          confirmDisabled={!password || !phraseMatches}
          onConfirm={deleteAccount}
          onOpenChange={resetOnClose}
        >
          <div className="grid gap-4">
            <Field label="Şifren">
              <PasswordInput
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </Field>
            <Field
              label={
                <>
                  Onay için <span className="font-mono">{DELETE_PHRASE}</span>{" "}
                  yaz
                </>
              }
            >
              <Input
                autoComplete="off"
                spellCheck={false}
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
              />
            </Field>
            {result && !result.ok && (
              <Notice tone="danger">{result.message}</Notice>
            )}
          </div>
        </ConfirmDialog>
      </div>
    </SettingsSection>
  );
}
