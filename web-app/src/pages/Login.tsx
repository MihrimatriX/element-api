import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { LoaderCircle } from "lucide-react";
import CaptchaWidget from "../components/CaptchaWidget";
import Seo from "../components/Seo";
import { AuthLayout } from "../components/auth/AuthLayout";
import { PasswordInput } from "../components/auth/PasswordInput";
import { Button } from "../components/ui/button";
import { Field } from "../components/ui/field";
import { Input } from "../components/ui/input";
import { Notice } from "../components/ui/notice";
import { useSelectedElement } from "../context/selection";
import { useAuthCapabilities } from "../hooks/useAuthCapabilities";
import { isCaptchaConfigured } from "../lib/captcha";
import { ApiHttpError, apiError, authService } from "../services/api";
import { safeReturnTo } from "../services/session";

/** The identity service answers 401 and 429 in English; say it in Turkish. */
function loginError(error: unknown): string {
  if (error instanceof ApiHttpError && error.status === 401)
    return "E-posta veya şifre yanlış.";
  if (error instanceof ApiHttpError && error.status === 429)
    return "Çok fazla hatalı deneme. Yaklaşık 15 dakika sonra yeniden dene.";
  return apiError(error, "Giriş bilgileri geçersiz.");
}

/** E-mail and password sign-in; returns to `?returnTo` (same-origin only) or the notebook. */
export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get("returnTo");
  const { setIsAuthenticated } = useSelectedElement();
  const { loading: capabilitiesLoading, capabilities } = useAuthCapabilities();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const registerLink = returnTo
    ? `/register?returnTo=${encodeURIComponent(returnTo)}`
    : "/register";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (isCaptchaConfigured() && !captchaToken) {
      setError("Robot olmadığını doğrula (captcha).");
      return;
    }
    setSubmitting(true);
    try {
      const response = await authService.login({
        email,
        password,
        ...(captchaToken ? { captchaToken } : {}),
      });
      if (response.token) {
        setIsAuthenticated(true);
        navigate(safeReturnTo(returnTo));
      }
    } catch (caught) {
      setError(loginError(caught));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Seo
        title="Giriş · ElementAPI"
        description="E-posta ve şifre ile giriş. Defter, anahtar ve sipariş hesabına bağlıdır."
        path="/login"
        noIndex
      />
      <AuthLayout
        title="Giriş yap"
        lead="Defter, API anahtarı ve sipariş geçmişi hesaba bağlıdır. Misafirken kayıtlar yalnız bu tarayıcıda durur."
        footer={
          <>
            <p>
              Hesabın yok mu?{" "}
              <Link to={registerLink} className="text-link">
                Hesap aç
              </Link>
            </p>
            {!capabilitiesLoading && !capabilities.passwordRecovery && (
              <p className="text-[13px]">
                E-postasız beta: şifre kurtarma e-postası henüz yok. Unuttuysan{" "}
                <Link to={registerLink} className="text-link">
                  yeni hesap
                </Link>{" "}
                açabilirsin.
              </p>
            )}
          </>
        }
      >
        <form className="grid gap-5" onSubmit={handleSubmit}>
          {error && <Notice tone="danger">{error}</Notice>}
          <Field label="E-posta">
            <Input
              type="email"
              name="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="sen@ornek.com"
            />
          </Field>
          <Field
            label="Şifre"
            labelAction={
              capabilities.passwordRecovery && (
                <Link to="/reset-password" className="text-link">
                  Şifremi unuttum
                </Link>
              )
            }
          >
            <PasswordInput
              name="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
            />
          </Field>
          <CaptchaWidget
            onToken={setCaptchaToken}
            serverRequiresCaptcha={capabilities.captcha}
          />
          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={submitting}
          >
            {submitting && (
              <LoaderCircle className="animate-spin" strokeWidth={1.75} />
            )}
            {submitting ? "Giriş yapılıyor…" : "Giriş yap"}
          </Button>
        </form>
      </AuthLayout>
    </>
  );
}
