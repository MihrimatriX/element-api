import { Badge } from "@/components/ui/badge";
import {
  Disclosure,
  DisclosureTrigger,
  DisclosureContent,
} from "@/components/ui/disclosure";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { track } from "../services/diagnostics";
import { useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, Check, Download, FlaskConical } from "lucide-react";
import { ACCOUNTS_ENABLED } from "../config";
import Seo from "../components/Seo";
import { recipes, materialById, formulaText } from "../services/lab";
import {
  lessons,
  mergeLearning,
  normalizeLearning,
  type LearningProgress,
} from "../services/lessons";
import { useLearning } from "../services/useLearning";

function Lesson({
  lesson,
  progress,
  save,
}: {
  lesson: (typeof lessons)[number];
  progress: LearningProgress;
  save: (p: LearningProgress) => void;
}) {
  const [answer, setAnswer] = useState<number | null>(null);
  const completed = progress.lessons.includes(lesson.id);
  const count = lesson.discoveries.filter((id) =>
    progress.discoveries.includes(id),
  ).length;
  const ready = count === lesson.discoveries.length;
  return (
    <Card asChild className="gap-0 py-5 max-md:py-3 shadow-none">
      <article className="learning-card">
        <div className="learning-card-heading">
          <BookOpen size={21} />
          <Badge variant="secondary">
            {completed
              ? "Tamamlandı"
              : `${count} / ${lesson.discoveries.length} keşif`}
          </Badge>
        </div>
        <h2>{lesson.title}</h2>
        <p>{lesson.description}</p>
        <div className="lesson-materials">
          {lesson.discoveries.map((id) => (
            <Link
              key={id}
              to={`/compound/${id}`}
              className={progress.discoveries.includes(id) ? "found" : ""}
            >
              {formulaText(materialById[id].formula)}
              {progress.discoveries.includes(id) && <Check size={14} />}
            </Link>
          ))}
        </div>
        {!ready ? (
          <Button asChild variant="outline">
            <Link to={`/lab?lesson=${lesson.id}`}>Keşiflere devam et</Link>
          </Button>
        ) : completed ? (
          <p className="learning-success">
            <Check size={18} /> {lesson.explanation}
          </p>
        ) : (
          <fieldset className="lesson-question">
            <legend>{lesson.question}</legend>
            {lesson.choices.map((choice, i) => (
              <Button
                variant="plain"
                size="none"
                key={choice}
                type="button"
                aria-pressed={answer === i}
                onClick={() => {
                  setAnswer(i);
                  if (i === lesson.answer) {
                    track("lesson_completed", lesson.id);
                    save({
                      ...progress,
                      lessons: [...progress.lessons, lesson.id],
                    });
                  }
                }}
              >
                {choice}
              </Button>
            ))}
            {answer !== null && answer !== lesson.answer && (
              <p role="status">
                Bir daha düşün. İlgili bilimsel kayıtlardaki formül
                açıklamalarından yararlanabilirsin.
              </p>
            )}
          </fieldset>
        )}
      </article>
    </Card>
  );
}

export default function Collection() {
  const learning = useLearning();
  const { progress } = learning;
  const [imported, setImported] = useState(false);
  const [importMessage, setImportMessage] = useState("");
  async function restore(file?: File) {
    if (!file) return;
    try {
      if (file.size > 32768) throw Error();
      const parsed = JSON.parse(await file.text());
      if (
        parsed.version !== 1 ||
        !Array.isArray(parsed.discoveries) ||
        !Array.isArray(parsed.lessons)
      )
        throw Error();
      const incoming = normalizeLearning(parsed);
      learning.save(mergeLearning(progress, incoming));
      setImportMessage(
        "Dosyadaki geçerli keşifler mevcut koleksiyonuna eklendi.",
      );
    } catch {
      setImportMessage(
        "Bu dosya geçerli bir koleksiyon kaydı değil. ElementAPI’den indirdiğin JSON dosyasını seç.",
      );
    }
  }
  function download() {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify({ version: 1, ...progress }, null, 2)], {
        type: "application/json",
      }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "elementapi-koleksiyon.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <main className="science-detail collection-page">
      <Seo
        title="Koleksiyonum · ElementAPI"
        description="Keşiflerin, öğrenme rotaların ve kaldığın yer."
        path="/collection"
        noIndex
      />
      <header className="collection-header">
        <div>
          <p className="science-eyebrow">KEŞFETTİKÇE BİRİKİR</p>
          <h1>Koleksiyonum</h1>
          <p>
            {progress.discoveries.length} / {recipes.length} bileşik ·{" "}
            {progress.lessons.length} / {lessons.length} rota tamamlandı
          </p>
        </div>
        <Button asChild variant="default">
          <Link className="btn primary" to="/lab">
            <FlaskConical size={18} /> Laboratuvarı aç
          </Link>
        </Button>
      </header>
      <div className="learning-storage">
        <p role="status">{learning.status}</p>
        {learning.user ? (
          <Button variant="outline" className="btn" onClick={learning.retry}>
            Yeniden eşitle
          </Button>
        ) : ACCOUNTS_ENABLED ? (
          <Link to="/register?returnTo=/collection">
            İlerlemeyi cihazlar arasında sürdürmek için hesap aç
          </Link>
        ) : (
          <span>Bu kurulumda hesap eşitleme kapalı.</span>
        )}
      </div>
      {learning.user && learning.guest.discoveries.length > 0 && !imported && (
        <div className="science-notice">
          <p>
            Bu cihazda {learning.guest.discoveries.length} misafir keşfi var.
            Sana aitse hesabına ekleyebilirsin.
          </p>
          <Button
            variant="outline"
            className="btn"
            onClick={() => {
              learning.importGuest();
              setImported(true);
            }}
          >
            Misafir keşiflerimi hesabıma ekle
          </Button>
        </div>
      )}
      <section aria-label="Öğrenme rotaları">
        <h2 className="section-title">Öğrenme rotaları</h2>
        <p>
          Her rotanın bileşiklerini keşfet, ardından kısa soruyla öğrendiklerini
          kontrol et. Yeni kartlar toplam keşif sayınla açılır.
        </p>
        <div className="learning-grid">
          {lessons.map((lesson) => (
            <Lesson
              key={lesson.id}
              lesson={lesson}
              progress={progress}
              save={learning.save}
            />
          ))}
        </div>
      </section>
      <section className="collection-discoveries">
        <header>
          <h2>Keşif defterin</h2>
          {progress.discoveries.length > 0 && (
            <Button variant="outline" className="btn" onClick={download}>
              <Download size={16} /> Kaydımı indir
            </Button>
          )}
        </header>
        {!progress.discoveries.length ? (
          <div className="learning-empty">
            <FlaskConical size={30} />
            <h3>Henüz keşif kaydın yok.</h3>
            <p>
              Laboratuvarda hidrojen ve oksijeni seç. İlk keşfin burada
              görünecek.
            </p>
            <Button asChild variant="default">
              <Link className="btn primary" to="/lab">
                İlk keşfimi yap
              </Link>
            </Button>
          </div>
        ) : (
          <div className="lab-notebook-grid">
            {progress.discoveries.map((id) => (
              <Link key={id} to={`/compound/${id}`}>
                <strong>{formulaText(materialById[id].formula)}</strong>
                <span>{materialById[id].name}</span>
              </Link>
            ))}
          </div>
        )}
      </section>
      <Disclosure className="collection-transfer">
        <DisclosureTrigger>Koleksiyon dosyası aktar</DisclosureTrigger>
        <DisclosureContent>
          <p>
            İndirdiğin JSON dosyasındaki keşifler mevcut ilerlemene eklenir.
          </p>
          <label className="btn file-input">
            JSON dosyası seç
            <input
              className="sr-only"
              aria-label="İndirdiğin koleksiyonu geri yükle"
              type="file"
              accept=".json,application/json"
              onChange={(e) => {
                void restore(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </label>
          {importMessage && <p role="status">{importMessage}</p>}
        </DisclosureContent>
      </Disclosure>
    </main>
  );
}
