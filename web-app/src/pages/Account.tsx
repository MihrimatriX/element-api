import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useCommerce, useSelectedElement } from "../App";
import {
  apiError,
  apiKeyService,
  walletService,
  webhookService,
} from "../services/api";
import Seo from "../components/Seo";

const fmt = (n: number) =>
  new Intl.NumberFormat("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);

interface KeyRow {
  id: string;
  description: string;
  maskedKey: string;
  isActive: boolean;
  rateLimitTps: number;
}

interface HookRow {
  id: string;
  url: string;
  events: string[];
}

export default function Account() {
  const { isAuthenticated } = useSelectedElement();
  const { walletElx, refreshWallet } = useCommerce();
  const [keys, setKeys] = useState<KeyRow[]>([]);
  const [hooks, setHooks] = useState<HookRow[]>([]);
  const [holdings, setHoldings] = useState<{ symbol: string; grams: number }[]>(
    [],
  );
  const [newKeyDesc, setNewKeyDesc] = useState("CLI key");
  const [freshKey, setFreshKey] = useState("");
  const [hookUrl, setHookUrl] = useState("");
  const [hookSecret, setHookSecret] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");

  const load = useCallback(
    () =>
      Promise.all([
        apiKeyService.list(),
        webhookService.list(),
        walletService.holdings(),
      ]).then(([k, h, hold]) => {
        setKeys(k || []);
        setHooks(h || []);
        setHoldings(hold || []);
      }),
    [],
  );

  useEffect(() => {
    if (isAuthenticated)
      void load().catch((error) =>
        setActionError(
          apiError(error, "Hesap bilgileri yüklenemedi. Yeniden deneyin."),
        ),
      );
  }, [isAuthenticated, load]);

  const perform = async (action: () => Promise<void>) => {
    setBusy(true);
    setActionError("");
    try {
      await action();
      await load();
    } catch (error) {
      setActionError(
        apiError(error, "İşlem tamamlanamadı. Lütfen yeniden deneyin."),
      );
    } finally {
      setBusy(false);
    }
  };

  const accountSeo = (
    <Seo
      title="Hesap · ElementAPI"
      description="Cüzdan ve API anahtarı."
      path="/account"
    />
  );

  if (!isAuthenticated) {
    return (
      <main className="page">
        {accountSeo}
        <h1>Hesabım · cüzdan, anahtarlar, webhook</h1>
        <p>
          10.000 sanal KREDI kasa (gerçek para değil). Giriş sana bir oturum
          jetonu verir; ilk ticaret anahtarın otomatik üretilir. Bilimsel v2
          anahtar istemez; cüzdan v1 ister. Fe gramı keşif defterine yazılmaz.
        </p>
        <Button asChild variant="default">
          <Link to="/login?returnTo=/account" className="btn primary">
            Giriş
          </Link>
        </Button>
      </main>
    );
  }

  return (
    <main className="page account-page">
      {accountSeo}
      <h1>Hesabım · cüzdan, anahtarlar, webhook</h1>
      <p>
        Kasa kredisi sanal (KREDI) — gerçek para değil. JSON’da balanceElx;
        ekranda KREDI. Su keşfi burayı değiştirmez.
      </p>

      <section className="desk-quotes">
        <article>
          <span>Bakiye</span>
          <strong className="mono">
            {walletElx == null ? "—" : `${fmt(walletElx)} kredi`}
          </strong>
        </article>
        <article>
          <span>Elindeki</span>
          <strong className="mono">
            {holdings.filter((h) => h.grams > 0).length}
          </strong>
        </article>
      </section>

      {actionError && (
        <p role="alert" className="desk-msg">
          {actionError}{" "}
          <Button
            variant="outline"
            type="button"
            className="mini-btn"
            disabled={busy}
            onClick={() => void perform(async () => {})}
          >
            Yeniden dene
          </Button>
        </p>
      )}
      <div className="learning-grid">
        <Card asChild className="gap-0 py-0 shadow-none">
          <section className="learning-card account-card">
            <h2>API anahtarları</h2>
            <div className="fields">
              {freshKey && (
                <p className="desk-msg">
                  Yeni anahtar (bir kez): <code>{freshKey}</code>
                </p>
              )}
              <div className="field">
                <label htmlFor="keyDesc">Açıklama</label>
                <Input
                  id="keyDesc"
                  value={newKeyDesc}
                  onChange={(e) => setNewKeyDesc(e.target.value)}
                />
              </div>
              <Button
                variant="default"
                className="btn primary"
                type="button"
                disabled={busy}
                onClick={() =>
                  void perform(async () => {
                    const res = await apiKeyService.generate(
                      newKeyDesc || "API key",
                      5,
                    );
                    setFreshKey(res.apiKey);
                    if (!localStorage.getItem("apiKey"))
                      localStorage.setItem("apiKey", res.apiKey);
                    refreshWallet();
                  })
                }
              >
                Anahtar üret (1–10 TPS)
              </Button>
              <ul className="account-list">
                {keys.map((k) => (
                  <li key={k.id}>
                    <span>
                      {k.description} · {k.maskedKey} · {k.rateLimitTps} TPS{" "}
                      {k.isActive ? "" : "(iptal)"}
                    </span>
                    {k.isActive && (
                      <Button
                        variant="outline"
                        className="mini-btn"
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          void perform(async () => {
                            await apiKeyService.revoke(k.id);
                            const activeKey = localStorage.getItem("apiKey");
                            if (
                              activeKey &&
                              `${activeKey.slice(0, 13)}...${activeKey.slice(-4)}` ===
                                k.maskedKey
                            ) {
                              localStorage.removeItem("apiKey");
                              refreshWallet();
                            }
                            setFreshKey("");
                          })
                        }
                      >
                        İptal
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </Card>

        <Card asChild className="gap-0 py-0 shadow-none">
          <section className="learning-card account-card">
            <h2>Webhook</h2>
            <div className="fields">
              <p className="muted">
                HTTPS URL. İmza: <code>X-Element-Signature</code> HMAC-SHA256.
              </p>
              <div className="field">
                <label htmlFor="hookUrl">URL</label>
                <Input
                  id="hookUrl"
                  value={hookUrl}
                  onChange={(e) => setHookUrl(e.target.value)}
                  placeholder="https://…"
                />
              </div>
              <div className="field">
                <label htmlFor="hookSecret">Secret</label>
                <Input
                  id="hookSecret"
                  type="password"
                  autoComplete="new-password"
                  value={hookSecret}
                  onChange={(e) => setHookSecret(e.target.value)}
                />
              </div>
              <Button
                variant="outline"
                className="btn"
                type="button"
                disabled={busy}
                onClick={() =>
                  void perform(async () => {
                    await webhookService.create(
                      hookUrl,
                      ["price.updated", "order.updated"],
                      hookSecret,
                    );
                    setMsg("Webhook kaydedildi.");
                    setHookUrl("");
                    setHookSecret("");
                  })
                }
              >
                Kaydet
              </Button>
              {msg && <p className="desk-msg">{msg}</p>}
              <ul className="account-list">
                {hooks.map((h) => (
                  <li key={h.id}>
                    <span>
                      {h.url} · {h.events?.join(", ")}
                    </span>
                    <Button
                      variant="outline"
                      className="mini-btn"
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        void perform(async () => {
                          await webhookService.remove(h.id);
                        })
                      }
                    >
                      Sil
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </Card>
      </div>
    </main>
  );
}
