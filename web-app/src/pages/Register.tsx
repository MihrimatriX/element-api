import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { authService, apiError } from "../services/api";
import { useSelectedElement } from "../App";
import { safeReturnTo } from "../services/session";
import Seo from "../components/Seo";
import CaptchaWidget from "../components/CaptchaWidget";
import { isCaptchaConfigured } from "../lib/captcha";

export default function Register() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { setIsAuthenticated } = useSelectedElement();
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [captchaToken, setCaptchaToken] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (formData.password !== formData.confirmPassword) {
      return setError("Şifreler eşleşmiyor.");
    }
    if (isCaptchaConfigured() && !captchaToken) {
      return setError("Robot olmadığını doğrula (captcha).");
    }

    setLoading(true);
    try {
      await authService.register({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        password: formData.password,
        ...(captchaToken ? { captchaToken } : {}),
      });
      // Turnstile tokens are single-use — skip auto-login when captcha is on.
      if (isCaptchaConfigured()) {
        setSuccess("Hesap oluştu. Giriş sayfasına…");
        setTimeout(() => navigate("/login"), 1200);
        return;
      }
      try {
        const login = await authService.login({
          email: formData.email,
          password: formData.password,
        });
        if (login.token) {
          setIsAuthenticated(true);
          navigate(safeReturnTo(params.get("returnTo")));
          return;
        }
      } catch (keyErr) {
        console.warn("Could not sign in after registration.", keyErr);
      }
      setSuccess("Hesap oluştu. Giriş sayfasına…");
      setTimeout(() => navigate("/login"), 1200);
    } catch (err: unknown) {
      setError(apiError(err, "Hesap oluşturulamadı."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <Seo
        title="Kayıt · ElementAPI"
        description="Keşiflerini ve öğrenme rotalarını farklı cihazlarda sürdür."
        path="/register"
      />
      <div className="auth-sheet">
        <p className="auth-kicker">Hesap</p>
        <h1>Hesap aç</h1>
        <p className="auth-lead">
          Defterin cihazlar arası eşitlensin. 10.000 kredi, API anahtarı ve
          sipariş geçmişi hesabına bağlanır.
        </p>
        <ul className="auth-perks">
          <li>Keşif defteri her cihazda aynı</li>
          <li>10.000 sanal kredi + ticaret anahtarı</li>
          <li>Sipariş geçmişi kaybolmaz</li>
        </ul>
        {error && (
          <p className="auth-error" role="alert">
            {error}
          </p>
        )}
        {success && (
          <p className="auth-ok" role="status">
            {success}
          </p>
        )}
        <form onSubmit={handleSubmit} className="fields">
          <div className="auth-name-row">
            <div className="field">
              <label htmlFor="firstName">Ad</label>
              <Input
                id="firstName"
                type="text"
                name="firstName"
                autoComplete="given-name"
                required
                value={formData.firstName}
                onChange={handleChange}
              />
            </div>
            <div className="field">
              <label htmlFor="lastName">Soyad</label>
              <Input
                id="lastName"
                type="text"
                name="lastName"
                autoComplete="family-name"
                required
                value={formData.lastName}
                onChange={handleChange}
              />
            </div>
          </div>
          <div className="field">
            <label htmlFor="email">E-posta</label>
            <Input
              id="email"
              type="email"
              name="email"
              autoComplete="email"
              required
              value={formData.email}
              onChange={handleChange}
              placeholder="sen@ornek.com"
            />
          </div>
          <div className="field">
            <label htmlFor="password">Şifre</label>
            <Input
              id="password"
              type="password"
              name="password"
              minLength={10}
              autoComplete="new-password"
              required
              value={formData.password}
              onChange={handleChange}
              placeholder="En az 10 karakter"
            />
          </div>
          <div className="field">
            <label htmlFor="confirmPassword">Şifre tekrar</label>
            <Input
              id="confirmPassword"
              type="password"
              name="confirmPassword"
              minLength={10}
              autoComplete="new-password"
              required
              value={formData.confirmPassword}
              onChange={handleChange}
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
            {loading ? "Hesap oluşturuluyor…" : "Hesap aç"}
          </Button>
        </form>
        <p className="auth-switch">
          Zaten hesabın var mı? <Link to="/login">Giriş yap</Link>
        </p>
      </div>
    </div>
  );
}
