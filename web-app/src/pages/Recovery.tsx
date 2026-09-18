import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { API_BASE_URL } from "../config";
import Seo from "../components/Seo";
import { clearSession } from "../services/session";

export default function Recovery({ verify = false }: { verify?: boolean }) {
  const [params] = useSearchParams();
  const [linkParams] = useState(
    () =>
      new URLSearchParams(window.location.hash.slice(1) || params.toString()),
  );
  const token = linkParams.get("token");
  const [email, setEmail] = useState(linkParams.get("email") ?? "");
  const [password, setPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [enabled, setEnabled] = useState<boolean | null>(token ? true : null);
  useEffect(() => {
    if (token) return;
    const controller = new AbortController();
    fetch(`${API_BASE_URL}/auth/capabilities`, { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => setEnabled(data.passwordRecovery))
      .catch(() => {
        if (!controller.signal.aborted) setEnabled(false);
      });
    return () => controller.abort();
  }, [token]);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setMessage("");
    if (!verify && token && password !== repeat) {
      setMessage("Şifreler eşleşmiyor.");
      return;
    }
    setBusy(true);
    try {
      const path = verify
        ? "/auth/email/verify"
        : token
          ? "/auth/password/reset"
          : "/auth/password/forgot";
      const response = await fetch(API_BASE_URL + path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          ...(token ? (verify ? { token } : { token, password }) : {}),
        }),
        signal: AbortSignal.timeout(15000),
      });
      const data = await response.json();
      setMessage(
        data.message ??
          "İşlem tamamlanamadı. Bağlantıyı kontrol edip yeniden dene.",
      );
      if (response.ok) {
        window.history.replaceState(null, "", window.location.pathname);
        setDone(true);
        if (token && !verify) clearSession();
      }
    } catch {
      setMessage("Servise ulaşılamadı. Biraz sonra yeniden deneyebilirsin.");
    } finally {
      setBusy(false);
    }
  }
  const title = verify
    ? "E-posta adresini doğrula"
    : token
      ? "Yeni şifreni belirle"
      : "Şifreni yenile";
  return (
    <div className="auth-container">
      <Seo
        title={`${title} · ElementAPI`}
        description={title}
        path={verify ? "/verify-email" : "/reset-password"}
        noIndex
      />
      <div className="auth-sheet">
        <h1>{title}</h1>
        <p className="auth-lead">
          Keşif defteri tarayıcıda durur. Şifre, hesabın kablosunu yeniler —
          suyu yeniden kurmana gerek yok.
        </p>
        {enabled === null && (
          <p role="status">Kurtarma seçenekleri kontrol ediliyor…</p>
        )}
        {enabled === false && (
          <p role="status">
            Bu kurulumda e-posta ile şifre kurtarma kullanılamıyor. Giriş
            yapabildiğin bir oturum varsa hesap ayarlarından şifreni
            değiştirebilirsin.
          </p>
        )}
        {!done && enabled && (
          <form className="fields" onSubmit={submit}>
            <label className="field">
              E-posta
              <Input
                required
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            {!verify && token && (
              <>
                <label className="field">
                  Yeni şifre
                  <Input
                    required
                    minLength={10}
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <small>En az 10 karakter.</small>
                </label>
                <label className="field">
                  Yeni şifre tekrar
                  <Input
                    required
                    minLength={10}
                    type="password"
                    autoComplete="new-password"
                    value={repeat}
                    onChange={(e) => setRepeat(e.target.value)}
                  />
                </label>
              </>
            )}
            <Button variant="default" className="btn primary" disabled={busy}>
              {busy
                ? "İşleniyor…"
                : verify
                  ? "Adresimi doğrula"
                  : token
                    ? "Şifreyi yenile"
                    : "Yenileme bağlantısı gönder"}
            </Button>
          </form>
        )}
        {message && <p role="status">{message}</p>}
        <p className="auth-switch">
          <Link to="/login">Girişe dön</Link>
        </p>
      </div>
    </div>
  );
}
