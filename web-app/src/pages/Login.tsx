import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { authService, apiError } from "../services/api";
import { useSelectedElement } from "../App";
import { safeReturnTo } from "../services/session";
import { API_BASE_URL } from "../config";
import Seo from "../components/Seo";
import CaptchaWidget from "../components/CaptchaWidget";
import { isCaptchaConfigured } from "../lib/captcha";

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setIsAuthenticated } = useSelectedElement();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [recoveryOn, setRecoveryOn] = useState<boolean | null>(null);
  const [serverCaptcha, setServerCaptcha] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${API_BASE_URL}/auth/capabilities`, { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        setRecoveryOn(Boolean(data.passwordRecovery));
        setServerCaptcha(Boolean(data.captcha));
      })
      .catch(() => {
        if (!controller.signal.aborted) setRecoveryOn(false);
      });
    return () => controller.abort();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (isCaptchaConfigured() && !captchaToken) {
      setError("Robot olmadığını doğrula (captcha).");
      return;
    }
    setLoading(true);

    try {
      const response = await authService.login({
        email,
        password,
        ...(captchaToken ? { captchaToken } : {}),
      });
      if (response.token) {
        setIsAuthenticated(true);
        const returnTo = searchParams.get("returnTo");
        navigate(safeReturnTo(returnTo));
      }
    } catch (err: unknown) {
      setError(apiError(err, "Giriş bilgileri geçersiz."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <Seo
        title="Giriş · ElementAPI"
        description="Hesabına giriş. Keşiflerine kaldığın yerden devam et."
        path="/login"
      />
      <div className="auth-sheet">
        <p className="auth-kicker">Hesap</p>
        <h1>Giriş yap</h1>
        <p className="auth-lead">
          Defterine, API anahtarına ve siparişlerine kaldığın yerden devam et.
          Misafirken kayıtlar yalnız bu tarayıcıda durur.
        </p>
        {error && (
          <p className="auth-error" role="alert">
            {error}
          </p>
        )}
        {serverCaptcha && !isCaptchaConfigured() && (
          <p className="auth-error" role="alert">
            Sunucu captcha istiyor ama bu derlemede site anahtarı yok. Web
            imajını VITE_CAPTCHA_SITE_KEY ile yeniden derle.
          </p>
        )}
        <form onSubmit={handleSubmit} className="fields">
          <div className="field">
            <label htmlFor="email">E-posta</label>
            <Input
              id="email"
              type="email"
              name="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="sen@ornek.com"
            />
          </div>
          <div className="field">
            <label htmlFor="password">Şifre</label>
            <Input
              id="password"
              type="password"
              name="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <CaptchaWidget onToken={setCaptchaToken} />
          <Button
            variant="default"
            type="submit"
            className="btn primary"
            disabled={loading}
          >
            {loading ? "Giriş yapılıyor…" : "Giriş yap"}
          </Button>
        </form>
        {recoveryOn === true && (
          <p className="auth-meta">
            <Link to="/reset-password">Şifremi unuttum</Link>
          </p>
        )}
        {recoveryOn === false && (
          <p className="auth-meta" role="note">
            E-postasız beta: şifre kurtarma e-postası henüz yok. Unuttuysan{" "}
            <Link to="/register">yeni hesap</Link> açabilirsin.
          </p>
        )}
        <p className="auth-switch">
          Hesabın yok mu? <Link to="/register">Hesap aç</Link>
        </p>
      </div>
    </div>
  );
}
