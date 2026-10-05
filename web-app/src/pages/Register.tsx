import { useState, type ChangeEvent, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Check, LoaderCircle } from "lucide-react";
import CaptchaWidget from "../components/CaptchaWidget";
import Seo from "../components/Seo";
import { loginError } from "../components/auth/accountApi";
import { AuthLayout } from "../components/auth/AuthLayout";
import { PasswordInput } from "../components/auth/PasswordInput";
import { Button } from "../components/ui/button";
import { Field } from "../components/ui/field";
import { Input } from "../components/ui/input";
import { Notice } from "../components/ui/notice";
import { useSelectedElement } from "../context/selection";
import { useAuthCapabilities } from "../hooks/useAuthCapabilities";
import { isCaptchaConfigured } from "../lib/captcha";
import { apiError, authService } from "../services/api";
import { safeReturnTo } from "../services/session";

const PERKS = [
  "Keşif defteri her cihazda aynı",
  "10.000 sanal kredi + ticaret anahtarı",
  "Sipariş geçmişi kaybolmaz",
];

const LOGIN_REDIRECT_MS = 1200;

const EMPTY_FORM = {
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  confirmPassword: "",
};

/**
 * Account sign-up. Without a captcha it signs straight in and returns to `?returnTo`
 * (when that sign-in fails it says why and links to the sign-in page); with one
 * (Turnstile tokens are single-use) it sends the user to the sign-in page.
 */
export default function Register() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get("returnTo");
  const { setIsAuthenticated } = useSelectedElement();
  const { capabilities } = useAuthCapabilities();
  const [form, setForm] = useState(EMPTY_FORM);
  const [captchaToken, setCaptchaToken] = useState("");
  const [mismatch, setMismatch] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [signInProblem, setSignInProblem] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const loginLink = returnTo
    ? `/login?returnTo=${encodeURIComponent(returnTo)}`
    : "/login";

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const { name, value } = event.target;
    setForm({ ...form, [name]: value });
    if (name === "password" || name === "confirmPassword") setMismatch(false);
  }

  function goToLogin() {
    setSuccess("Hesap oluştu. Giriş sayfasına yönlendiriliyorsun…");
    setTimeout(() => navigate(loginLink), LOGIN_REDIRECT_MS);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    if (form.password !== form.confirmPassword) {
      setMismatch(true);
      return;
    }
    if (isCaptchaConfigured() && !captchaToken) {
      setError("Robot olmadığını doğrula (captcha).");
      return;
    }

    setSubmitting(true);
    try {
      await authService.register({
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        password: form.password,
        ...(captchaToken ? { captchaToken } : {}),
      });
      if (isCaptchaConfigured()) {
        goToLogin();
        return;
      }
      let token: string | undefined;
      try {
        ({ token } = await authService.login({ email: form.email, password: form.password }));
      } catch (caught) {
        // The account exists; only the automatic sign-in failed. Say why here: blocked
        // storage would fail on the sign-in page just the same.
        setSignInProblem(loginError(caught));
        return;
      }
      if (token) {
        setIsAuthenticated(true);
        navigate(safeReturnTo(returnTo));
        return;
      }
      goToLogin();
    } catch (caught) {
      setError(apiError(caught, "Hesap oluşturulamadı."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Seo
        title="Kayıt · ElementAPI"
        description="Defteri cihazlar arasında eşitle. 10.000 sanal kredi ve ticaret anahtarı."
        path="/register"
        noIndex
      />
      <AuthLayout
        title="Hesap aç"
        lead="Defterin cihazlar arasında eşitlenir; ticaret demosunu sanal krediyle denersin."
        footer={
          <p>
            Zaten hesabın var mı?{" "}
            <Link to={loginLink} className="text-link">
              Giriş yap
            </Link>
          </p>
        }
      >
        <ul className="mb-6 grid gap-2 rounded-lg border border-line bg-canvas-2 p-4">
          {PERKS.map((perk) => (
            <li
              key={perk}
              className="flex gap-2.5 text-sm leading-6 text-ink-2"
            >
              <Check
                aria-hidden="true"
                strokeWidth={2}
                className="mt-1 size-4 shrink-0 text-success"
              />
              {perk}
            </li>
          ))}
        </ul>
        <form className="grid gap-5" onSubmit={handleSubmit}>
          {error && <Notice tone="danger">{error}</Notice>}
          {success && <Notice tone="success">{success}</Notice>}
          {signInProblem && (
            <Notice
              tone="warning"
              title="Hesap oluştu, oturum açılamadı"
              action={
                <Button asChild variant="outline" size="sm">
                  <Link to={loginLink}>Giriş yap</Link>
                </Button>
              }
            >
              {signInProblem}
            </Notice>
          )}
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Ad">
              <Input
                type="text"
                name="firstName"
                autoComplete="given-name"
                required
                value={form.firstName}
                onChange={handleChange}
              />
            </Field>
            <Field label="Soyad">
              <Input
                type="text"
                name="lastName"
                autoComplete="family-name"
                required
                value={form.lastName}
                onChange={handleChange}
              />
            </Field>
          </div>
          <Field label="E-posta">
            <Input
              type="email"
              name="email"
              autoComplete="email"
              required
              value={form.email}
              onChange={handleChange}
              placeholder="sen@ornek.com"
            />
          </Field>
          <Field label="Şifre" hint="En az 10 karakter.">
            <PasswordInput
              name="password"
              minLength={10}
              autoComplete="new-password"
              required
              value={form.password}
              onChange={handleChange}
            />
          </Field>
          <Field
            label="Şifre tekrar"
            error={mismatch ? "Şifreler eşleşmiyor." : undefined}
          >
            <PasswordInput
              name="confirmPassword"
              minLength={10}
              autoComplete="new-password"
              required
              value={form.confirmPassword}
              onChange={handleChange}
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
            // The account exists once either message shows; a second submit would only collide.
            disabled={submitting || Boolean(success || signInProblem)}
          >
            {submitting && (
              <LoaderCircle className="animate-spin" strokeWidth={1.75} />
            )}
            {submitting ? "Hesap oluşturuluyor…" : "Hesap aç"}
          </Button>
        </form>
      </AuthLayout>
    </>
  );
}
