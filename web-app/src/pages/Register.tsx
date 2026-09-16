import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { authService, apiError } from "../services/api";
import { useSelectedElement } from "../App";
import { safeReturnTo } from "../services/session";
import Seo from "../components/Seo";

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

    setLoading(true);
    try {
      await authService.register({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        password: formData.password,
      });
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
      <Card asChild className="gap-0 py-0 shadow-none">
        <div className="panel auth-panel">
          <div
            className="panel-header"
            style={{
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
              gap: "6px",
            }}
          >
            <p className="kicker">Kayıt</p>
            <h2 style={{ margin: 0 }}>Kayıt Ol</h2>
            <p
              style={{
                margin: 0,
                fontSize: "13px",
                color: "var(--muted-foreground)",
              }}
            >
              Keşiflerini ve öğrenme rotalarını farklı cihazlarda sürdür.
            </p>
          </div>

          <div className="panel-body">
            {error && (
              <div
                className="status-badge status-danger"
                style={{
                  display: "flex",
                  width: "100%",
                  marginBottom: "18px",
                  borderRadius: "var(--radius-sm)",
                }}
              >
                {error}
              </div>
            )}

            {success && (
              <div
                className="status-badge status-success"
                style={{
                  display: "flex",
                  width: "100%",
                  marginBottom: "18px",
                  borderRadius: "var(--radius-sm)",
                }}
              >
                {success}
              </div>
            )}

            <form onSubmit={handleSubmit} className="fields">
              <div style={{ display: "flex", gap: "10px" }}>
                <div className="field" style={{ flex: 1 }}>
                  <label htmlFor="firstName">Ad</label>
                  <Input
                    id="firstName"
                    type="text"
                    name="firstName"
                    required
                    value={formData.firstName}
                    onChange={handleChange}
                  />
                </div>
                <div className="field" style={{ flex: 1 }}>
                  <label htmlFor="lastName">Soyad</label>
                  <Input
                    id="lastName"
                    type="text"
                    name="lastName"
                    required
                    value={formData.lastName}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="field">
                <label htmlFor="email">E-posta Adresi</label>
                <Input
                  id="email"
                  type="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="john@example.com"
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
                <label htmlFor="confirmPassword">Şifre Tekrar</label>
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

              <Button
                variant="default"
                type="submit"
                className="btn primary"
                style={{ width: "100%", marginTop: "10px" }}
                disabled={loading}
              >
                {loading ? "Hesap Oluşturuluyor..." : "Kayıt Ol"}
              </Button>
            </form>

            <div
              style={{
                marginTop: "22px",
                textAlign: "center",
                fontSize: "13px",
                color: "var(--muted-foreground)",
              }}
            >
              Zaten hesabınız var mı?{" "}
              <Link
                to="/login"
                style={{ color: "var(--brand)", fontWeight: 650 }}
              >
                Giriş yapın
              </Link>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
