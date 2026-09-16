import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import Seo from "../components/Seo";
import {
  DIAGNOSTICS_CONSENT,
  diagnosticEvents,
  setDiagnostics,
} from "../services/diagnostics";
import { readStorage } from "../services/session";

export default function Feedback() {
  const [enabled, setEnabled] = useState(
    readStorage(DIAGNOSTICS_CONSENT) === "true",
  );
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");
  const [events, setEvents] = useState(diagnosticEvents());
  function refresh() {
    setEvents(diagnosticEvents());
  }
  function download() {
    const data = {
      scope:
        "Bu tarayıcıda izin verildikten sonraki en son 200 olay; genel kullanıcı istatistiği değildir.",
      exportedAt: new Date().toISOString(),
      notes,
      events: diagnosticEvents(),
    };
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "elementapi-deneyim-notlari.json";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMessage("Dosya hazırlandı. Otomatik olarak kimseye gönderilmedi.");
  }
  return (
    <main className="science-detail">
      <Seo
        title="Deneyim notları · ElementAPI"
        description="Yerel deneme sırasında öğrendiklerini ve karşılaştığın sorunları kaydet."
        path="/feedback"
        noIndex
      />
      <p className="science-eyebrow">ÜRÜNÜ BİRLİKTE GELİŞTİRELİM</p>
      <h1>Deneyim notların</h1>
      <p className="lead">
        İlk keşifte nerede zorlandın? Formüller hakkında yeni ne öğrendin? Bir
        sonraki kullanımda ne görmek istersin?
      </p>
      <div className="learning-grid">
        <Card asChild className="gap-0 py-5 max-md:py-3 shadow-none">
          <section className="learning-card">
            <h2>İsteğe bağlı deneme kaydı</h2>
            <p>
              Açarsan bu tarayıcıda son 200 keşif, rota, kayıt açma ve hata
              olayı zamanlarıyla tutulur. E-posta, şifre, anahtar veya hata
              metni kaydedilmez. Veriler sunucuya gönderilmez. Kapatmak mevcut
              olayları siler.
            </p>
            <label>
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => {
                  const value = e.target.checked;
                  if (setDiagnostics(value)) {
                    setEnabled(value);
                    refresh();
                  } else
                    setMessage(
                      "Tarayıcı depolaması kapalı; kayıt etkinleştirilemedi.",
                    );
                }}
              />{" "}
              Bu cihazda deneme olaylarını kaydet
            </label>
            <p>
              {events.length} kayıt ·{" "}
              {events.filter((e) => e.event === "discovery_completed").length}{" "}
              keşif ·{" "}
              {events.filter((e) => e.event === "lesson_completed").length} rota
              tamamlaması
            </p>
            <Button variant="outline" className="btn" onClick={refresh}>
              Sayıları yenile
            </Button>
          </section>
        </Card>
        <Card asChild className="gap-0 py-5 max-md:py-3 shadow-none">
          <section className="learning-card">
            <h2>Gözlemlerin</h2>
            <label className="field">
              Deneyim notu
              <Textarea
                rows={6}
                maxLength={4000}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Zorlandığın adımı ve beklediğin davranışı anlat. Kişisel bilgi veya şifre ekleme."
              />
            </label>
            <p>
              Not, bu sayfa açıkken bellekte tutulur. İndirdiğin dosyayı
              inceleyip istediğin kişiyle kendin paylaşabilirsin.
            </p>
            <Button
              variant="default"
              className="btn primary"
              onClick={download}
            >
              Notları ve deneme kaydını indir
            </Button>
          </section>
        </Card>
      </div>
      {message && <p role="status">{message}</p>}
    </main>
  );
}
