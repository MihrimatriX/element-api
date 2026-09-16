import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../config";
import { useSelectedElement } from "../App";
import { clearSession, readStorage, tokenUser } from "../services/session";
import { forgetLearning } from "../services/useLearning";
import Seo from "../components/Seo";
interface Profile {
  email: string;
  firstName: string;
  lastName: string;
  emailConfirmed: boolean;
  createdAt: string;
}
export default function Settings() {
  const { isAuthenticated } = useSelectedElement();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [mailEnabled, setMailEnabled] = useState(false);
  const [password, setPassword] = useState("");
  const [current, setCurrent] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  useEffect(() => {
    if (!isAuthenticated) return;
    const controller = new AbortController();
    void Promise.all([
      fetch(`${API_BASE_URL}/auth/profile`, {
        headers: { Authorization: `Bearer ${readStorage("token")}` },
        signal: controller.signal,
      }).then((r) => {
        if (r.status === 401) clearSession();
        if (!r.ok) throw Error();
        return r.json();
      }),
      fetch(`${API_BASE_URL}/auth/capabilities`, {
        signal: controller.signal,
      }).then((r) => r.json()),
    ])
      .then(([p, c]) => {
        setProfile(p);
        setMailEnabled(c.emailVerification);
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setMessage("Hesap bilgileri yüklenemedi.");
      });
    return () => controller.abort();
  }, [isAuthenticated]);
  async function action(path: string, body = {}) {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(API_BASE_URL + path, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${readStorage("token")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(15000),
      });
      const data = await response.json();
      setMessage(data.message ?? "İşlem tamamlanamadı.");
      if (response.status === 401) clearSession();
      if (response.ok && path.endsWith("/delete")) {
        const user = tokenUser();
        if (user) forgetLearning(user);
        clearSession();
        navigate("/");
      }
      if (response.ok && path.endsWith("/change")) {
        clearSession();
        navigate("/login");
      }
    } catch {
      setMessage("Bağlantı kurulamadı. Yeniden deneyebilirsin.");
    } finally {
      setBusy(false);
    }
  }
  async function exportAccount() {
    setBusy(true);
    try {
      const response = await fetch(API_BASE_URL + "/auth/export", {
        headers: { Authorization: "Bearer " + readStorage("token") },
        signal: AbortSignal.timeout(10000),
      });
      if (response.status === 401) clearSession();
      if (!response.ok) throw Error();
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(await response.json(), null, 2)], {
          type: "application/json",
        }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = "elementapi-hesabim.json";
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setMessage("Veriler indirilemedi. Yeniden deneyebilirsin.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="science-detail">
      <Seo
        title="Hesap ayarları · ElementAPI"
        description="Hesap ve güvenlik ayarların."
        path="/settings"
        noIndex
      />
      <h1>Hesap ayarları</h1>
      {!isAuthenticated ? (
        <p>
          <Link to="/login?returnTo=/settings">
            Ayarlarını görmek için giriş yap
          </Link>
        </p>
      ) : (
        <>
          <p>
            <Link to="/collection">Koleksiyonum</Link> ·{" "}
            <Link to="/account">API anahtarları ve simülasyon kasası</Link>
          </p>
          <div className="learning-grid">
            <Card asChild className="gap-0 py-5 max-md:py-3 shadow-none">
              <article className="learning-card">
                <h2>Profil</h2>
                {profile ? (
                  <>
                    <p>
                      {profile.firstName} {profile.lastName}
                    </p>
                    <p>{profile.email}</p>
                    <p>
                      {profile.emailConfirmed
                        ? "E-posta doğrulandı."
                        : "E-posta henüz doğrulanmadı."}
                    </p>
                    {!profile.emailConfirmed &&
                      (mailEnabled ? (
                        <Button
                          variant="outline"
                          className="btn"
                          disabled={busy}
                          onClick={() =>
                            void action("/auth/email/send-verification")
                          }
                        >
                          Doğrulama bağlantısı gönder
                        </Button>
                      ) : (
                        <p>E-posta gönderimi bu kurulumda kapalı.</p>
                      ))}
                  </>
                ) : (
                  <p>Profil yükleniyor…</p>
                )}
              </article>
            </Card>
            <Card asChild className="gap-0 py-5 max-md:py-3 shadow-none">
              <article className="learning-card">
                <h2>Şifreni değiştir</h2>
                <form
                  className="fields"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void action("/auth/password/change", {
                      currentPassword: current,
                      password,
                    });
                  }}
                >
                  <label className="field">
                    Mevcut şifre
                    <Input
                      required
                      type="password"
                      autoComplete="current-password"
                      value={current}
                      onChange={(e) => setCurrent(e.target.value)}
                    />
                  </label>
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
                    <small>
                      En az 10 karakter. Değişiklikten sonra tüm cihazlarda
                      yeniden giriş gerekir.
                    </small>
                  </label>
                  <Button
                    variant="default"
                    className="btn primary"
                    disabled={busy}
                  >
                    Şifreyi değiştir
                  </Button>
                </form>
              </article>
            </Card>
            <Card asChild className="gap-0 py-5 max-md:py-3 shadow-none">
              <article className="learning-card">
                <h2>Verilerin</h2>
                <p>
                  Keşif kaydını koleksiyonundan indirebilirsin. Misafir
                  kayıtları yalnız bu cihazda tutulur; hesap kayıtları
                  cihazların arasında eşitlenir.
                </p>
                <Button
                  variant="outline"
                  className="btn"
                  disabled={busy}
                  onClick={() => void exportAccount()}
                >
                  Hesap ve öğrenme verilerimi indir
                </Button>
                <p>
                  Bu dosya profilini, öğrenme kayıtlarını, maskeli API
                  anahtarlarını ve webhook adreslerini kapsar. Simülasyon
                  işlemleri dahil değildir.
                </p>
                <Link to="/collection">Keşif kaydımı aç</Link>
              </article>
            </Card>
            <Card asChild className="gap-0 py-5 max-md:py-3 shadow-none">
              <article className="learning-card">
                <h2>Hesabını sil</h2>
                <p>
                  Profilin, öğrenme kayıtların, API anahtarların ve webhook
                  aboneliklerin kalıcı olarak silinir. Tüm oturumların kapanır.
                  Simülasyon siparişleri ve teknik günlükler otomatik silinmez;
                  bunlar kullanıcı numarasıyla kalabilir.
                </p>
                <form
                  className="fields"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void action("/auth/delete", {
                      password: deletePassword,
                      confirmation,
                    });
                  }}
                >
                  <label className="field">
                    Şifren
                    <Input
                      type="password"
                      autoComplete="current-password"
                      required
                      value={deletePassword}
                      onChange={(e) => setDeletePassword(e.target.value)}
                    />
                  </label>
                  <label className="field">
                    Onay için HESABIMI SİL yaz
                    <Input
                      required
                      value={confirmation}
                      onChange={(e) => setConfirmation(e.target.value)}
                    />
                  </label>
                  <Button
                    variant="outline"
                    className="btn"
                    disabled={busy || confirmation !== "HESABIMI SİL"}
                  >
                    Hesabımı ve öğrenme kayıtlarımı sil
                  </Button>
                </form>
              </article>
            </Card>
          </div>
        </>
      )}
      {message && <p role="status">{message}</p>}
    </main>
  );
}
