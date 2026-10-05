import { useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { LoaderCircle } from "lucide-react";
import Seo from "../components/Seo";
import { AuthLayout } from "../components/auth/AuthLayout";
import { AuthStatus } from "../components/auth/AuthStatus";
import { PasswordInput } from "../components/auth/PasswordInput";
import { useAccountAction } from "../components/auth/accountApi";
import { Button } from "../components/ui/button";
import { Field } from "../components/ui/field";
import { Input } from "../components/ui/input";
import { Notice } from "../components/ui/notice";
import { Skeleton } from "../components/ui/skeleton";
import { useAuthCapabilities } from "../hooks/useAuthCapabilities";
import { clearSession } from "../services/session";

/** verify: confirm an address from a mailed link · reset: set a new password from a mailed link · request: ask for that link. */
type Mode = "verify" | "reset" | "request";

const MODES: Record<
  Mode,
  { title: string; lead: string; submit: string; done: string; path: string }
> = {
  verify: {
    title: "E-posta adresini doğrula",
    lead: "Doğrulama bağlantısındaki adresi onayla; hesabın sana ait olduğu kayda geçsin.",
    submit: "Adresimi doğrula",
    done: "Adresin doğrulandı",
    path: "/auth/email/verify",
  },
  reset: {
    title: "Yeni şifreni belirle",
    lead: "Yeni şifre tüm cihazlardaki oturumları kapatır. Keşif defterin olduğu yerde kalır.",
    submit: "Şifreyi yenile",
    done: "Şifren yenilendi",
    path: "/auth/password/reset",
  },
  request: {
    title: "Şifreni yenile",
    lead: "Hesabının e-posta adresini yaz; yenileme bağlantısı oraya gider. Keşif defterin olduğu yerde kalır.",
    submit: "Yenileme bağlantısı gönder",
    done: "İsteğin alındı",
    path: "/auth/password/forgot",
  },
};

function modeFor(verify: boolean, token: string | null): Mode {
  if (verify) return "verify";
  return token ? "reset" : "request";
}

/** Link parameters arrive in the hash (`#token=…&email=…`) so they stay out of server logs; the query string also works. */
function readLinkParams(query: URLSearchParams): URLSearchParams {
  return new URLSearchParams(window.location.hash.slice(1) || query.toString());
}

/**
 * Password recovery and e-mail verification, driven by the link the user followed:
 * `/reset-password` (with or without a token) and `/verify-email` (with a token).
 */
export default function Recovery({ verify = false }: { verify?: boolean }) {
  const [searchParams] = useSearchParams();
  const [linkParams] = useState(() => readLinkParams(searchParams));
  const token = linkParams.get("token");
  const mode = modeFor(verify, token);
  const copy = MODES[mode];
  const { loading, capabilities } = useAuthCapabilities({
    enabled: mode === "request",
  });
  const { busy, result, run } = useAccountAction();
  const [email, setEmail] = useState(linkParams.get("email") ?? "");
  const [password, setPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const [mismatch, setMismatch] = useState(false);
  const [done, setDone] = useState(false);
  // Mailed links carry the token; asking for a link needs the server to send mail.
  const formAvailable =
    mode === "request" ? capabilities.passwordRecovery : token !== null;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (mode === "reset" && password !== repeat) {
      setMismatch(true);
      return;
    }
    const body: Record<string, string | null> = { email };
    if (mode !== "request") body.token = token;
    if (mode === "reset") body.password = password;
    const response = await run(copy.path, body, {
      auth: false,
      fallback: "İşlem tamamlanamadı. Bağlantıyı kontrol edip yeniden dene.",
    });
    if (!response?.ok) return;
    window.history.replaceState(null, "", window.location.pathname);
    setDone(true);
    if (mode === "reset") clearSession();
  }

  return (
    <>
      <Seo
        title={`${copy.title} · ElementAPI`}
        description={copy.title}
        path={verify ? "/verify-email" : "/reset-password"}
        noIndex
      />
      <AuthLayout
        title={copy.title}
        lead={copy.lead}
        footer={
          <p>
            <Link to="/login" className="text-link">
              Girişe dön
            </Link>
          </p>
        }
      >
        {mode === "verify" && !token && (
          <AuthStatus tone="warning" title="Doğrulama bağlantısı eksik">
            E-postandaki bağlantıyı yeniden aç ya da{" "}
            <Link to="/settings" className="text-link">
              ayarlardan
            </Link>{" "}
            yeni bağlantı iste.
          </AuthStatus>
        )}
        {mode === "request" && loading && <FormSkeleton />}
        {mode === "request" && !loading && !capabilities.passwordRecovery && (
          <AuthStatus tone="info" title="E-postasız beta">
            E-posta ile şifre kurtarma henüz yok. Şifreni unuttuysan{" "}
            <Link to="/register" className="text-link">
              yeni hesap açabilir
            </Link>{" "}
            veya giriş yapabildiğin bir oturumda hesap ayarlarından şifreyi
            değiştirebilirsin.
          </AuthStatus>
        )}
        {done && result && (
          <AuthStatus tone="success" title={copy.done}>
            {result.message}
          </AuthStatus>
        )}
        {!done && formAvailable && (
          <form className="grid gap-5" onSubmit={submit}>
            {result && <Notice tone="danger">{result.message}</Notice>}
            <Field label="E-posta">
              <Input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="sen@ornek.com"
              />
            </Field>
            {mode === "reset" && (
              <>
                <Field label="Yeni şifre" hint="En az 10 karakter.">
                  <PasswordInput
                    autoComplete="new-password"
                    minLength={10}
                    required
                    value={password}
                    onChange={(event) => {
                      setPassword(event.target.value);
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
                    value={repeat}
                    onChange={(event) => {
                      setRepeat(event.target.value);
                      setMismatch(false);
                    }}
                  />
                </Field>
              </>
            )}
            <Button type="submit" size="lg" className="w-full" disabled={busy}>
              {busy && (
                <LoaderCircle className="animate-spin" strokeWidth={1.75} />
              )}
              {busy ? "İşleniyor…" : copy.submit}
            </Button>
          </form>
        )}
      </AuthLayout>
    </>
  );
}

/** Stands in for the e-mail form while the server's recovery capability is checked. */
function FormSkeleton() {
  return (
    <div className="grid gap-5" aria-busy="true">
      <span className="sr-only" role="status">
        Kurtarma seçenekleri kontrol ediliyor…
      </span>
      <div className="grid gap-2">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-10 w-full" />
      </div>
      <Skeleton className="h-11 w-full" />
    </div>
  );
}
