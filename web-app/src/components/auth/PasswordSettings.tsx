import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { toast } from "@/components/ui/toast";
import { clearSession } from "../../services/session";
import { useAccountAction } from "./accountApi";
import { PasswordInput } from "./PasswordInput";
import { SettingsSection } from "./SettingsSection";

/** Password change. Success signs out everywhere, so it ends on the sign-in page. */
export function PasswordSettings() {
  const navigate = useNavigate();
  const { busy, result, run } = useAccountAction();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [mismatch, setMismatch] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (newPassword !== repeatPassword) {
      setMismatch(true);
      return;
    }
    const response = await run("/auth/password/change", {
      currentPassword,
      password: newPassword,
    });
    if (!response?.ok) return;
    toast(response.message ?? "Şifren değişti.", { tone: "success" });
    clearSession();
    navigate("/login");
  }

  return (
    <SettingsSection
      title="Şifre"
      description="Değişiklikten sonra tüm cihazlarda yeniden giriş gerekir; API anahtarların da kapanır."
    >
      <form className="panel grid gap-5 p-5 sm:p-6" onSubmit={submit}>
        <Field label="Mevcut şifre">
          <PasswordInput
            autoComplete="current-password"
            required
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
          />
        </Field>
        <div className="grid items-start gap-5 sm:grid-cols-2">
          <Field label="Yeni şifre" hint="En az 10 karakter.">
            <PasswordInput
              autoComplete="new-password"
              minLength={10}
              required
              value={newPassword}
              onChange={(event) => {
                setNewPassword(event.target.value);
                setMismatch(false);
              }}
            />
          </Field>
          <Field
            label="Yeni şifre tekrar"
            error={mismatch ? "Şifreler eşleşmiyor." : undefined}
          >
            <PasswordInput
              autoComplete="new-password"
              minLength={10}
              required
              value={repeatPassword}
              onChange={(event) => {
                setRepeatPassword(event.target.value);
                setMismatch(false);
              }}
            />
          </Field>
        </div>
        {result && (
          <Notice tone={result.ok ? "success" : "danger"}>
            {result.message}
          </Notice>
        )}
        <div>
          <Button type="submit" disabled={busy}>
            {busy ? "Değiştiriliyor…" : "Şifreyi değiştir"}
          </Button>
        </div>
      </form>
    </SettingsSection>
  );
}
