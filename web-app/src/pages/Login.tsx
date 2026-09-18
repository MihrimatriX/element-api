import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { authService, apiError } from "../services/api";
import { useSelectedElement } from "../App";
import { safeReturnTo } from "../services/session";
import Seo from "../components/Seo";

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setIsAuthenticated } = useSelectedElement();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await authService.login({ email, password });
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
        <h1>Giriş</h1>
        <p className="auth-lead">
          Defterin bu tarayıcıda duruyor. Hesap, suyu başka cihazda da açar.
        </p>
        <ul>
          <li>Keşif defterin her cihazda aynı.</li>
          <li>10.000 sanal kredi ve ticaret anahtarı.</li>
          <li>Sipariş geçmişin kaybolmaz.</li>
        </ul>
        {error && (
          <p className="auth-error" role="alert">
            {error}
          </p>
        )}
        <form onSubmit={handleSubmit} className="fields">
          <div className="field">
            <label htmlFor="email">E-posta Adresi</label>
            <Input
              id="email"
              type="email"
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
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <Button
            variant="default"
            type="submit"
            className="btn primary"
            disabled={loading}
          >
            {loading ? "Giriş yapılıyor…" : "Giriş yap"}
          </Button>
        </form>
        <p>
          <Link to="/reset-password">Şifremi unuttum</Link>
        </p>
        <p className="auth-switch">
          Hesabınız yok mu? <Link to="/register">Yeni hesap oluşturun</Link>
        </p>
      </div>
    </div>
  );
}
