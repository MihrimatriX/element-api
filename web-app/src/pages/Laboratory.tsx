import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  FlaskConical,
  Lightbulb,
  Minus,
  Plus,
  RotateCcw,
  Search,
  X,
} from "lucide-react";
import Seo from "../components/Seo";
import AtlasVisual from "../components/AtlasVisual";
import GeometryFigure from "../components/GeometryFigure";
import LabModes from "../components/LabModes";
import { useScience, type ScientificCompound } from "../services/science";
import {
  catalogSize,
  compoundBySlug,
  discover,
  elementMaterials,
  formCompound,
  formulaText,
  geometryOf,
  hint,
  knownCompounds,
  materialById,
  bagFormula,
  type KnownCompound,
} from "../services/lab";
import { parseFormula, prune, type Counts } from "../services/chemistry";
import { recordKindQuestion } from "../services/games";
import { useLearning } from "../services/useLearning";
import { track } from "../services/diagnostics";
import { lessons } from "../services/lessons";
import { categorySwatches, STATIC_ELEMENTS } from "../services/elementData";

const elementCategory = Object.fromEntries(
  STATIC_ELEMENTS.map((e) => [e.symbol, e.category]),
);

function ResultVisual({ compound }: { compound: KnownCompound }) {
  const { data } = useScience<ScientificCompound>("compounds", compound.slug);
  return (
    <AtlasVisual
      compact
      formula={formulaText(compound.formula)}
      structure={data?.media?.structure}
    />
  );
}

export default function Laboratory() {
  useEffect(() => {
    track("lab_started");
  }, []);
  const [params] = useSearchParams();
  const requested = params.get("material");
  const learning = useLearning();
  const found = learning.progress.discoveries;
  const lesson = lessons.find((l) => l.id === params.get("lesson"));
  const [bag, setBag] = useState<Counts>(() =>
    requested && materialById[requested]?.kind === "element"
      ? { [requested]: 1 }
      : {},
  );
  const [result, setResult] = useState<KnownCompound | null>(null);
  const [message, setMessage] = useState("");
  const [tip, setTip] = useState("");
  const [query, setQuery] = useState("");
  const [resetConfirm, setResetConfirm] = useState(false);
  const [kindQuiz, setKindQuiz] = useState<ReturnType<
    typeof recordKindQuestion
  > | null>(null);
  const [kindPick, setKindPick] = useState<number | null>(null);
  const [nextHint, setNextHint] = useState("");
  const reduce = useReducedMotion();
  const counts = prune(bag);
  const fold = (s: string) =>
    s
      .toLocaleLowerCase("tr")
      .replace(/ı/g, "i")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  const shown = elementMaterials.filter((m) =>
    fold(`${m.name} ${m.formula}`).includes(fold(query)),
  );
  const preview = bagFormula(counts);
  const setProgress = (next: string[]) =>
    learning.save({ ...learning.progress, discoveries: next });
  const add = (id: string, delta = 1) => {
    if (materialById[id]?.kind !== "element") return;
    setBag((current) => prune({ ...current, [id]: (current[id] ?? 0) + delta }));
    setMessage("");
    setTip("");
    setKindQuiz(null);
    setKindPick(null);
    setNextHint("");
  };
  const mix = () => {
    const formed = formCompound(counts);
    setTip("");
    if (!formed.ok) {
      setResult(null);
      setMessage(formed.message);
      return;
    }
    const wasKnown = found.includes(formed.compound.slug);
    const next = discover(found, formed.compound.slug);
    if (!wasKnown) track("discovery_completed", formed.compound.slug);
    setProgress(next);
    setResult(formed.compound);
    const upcoming = lesson
      ? lesson.discoveries
          .filter((id) => !next.includes(id))
          .map((id) => compoundBySlug[id])[0]
      : hint(next);
    setNextHint(upcoming ? `Sıradaki hedef: ${upcoming.nameTr}.` : "");
    setKindQuiz(wasKnown ? null : recordKindQuestion(formed.compound));
    setKindPick(null);
    setMessage(
      `${wasKnown ? "Bunu daha önce keşfettin" : "Yeni keşif"}: ${formed.compound.nameTr}.`,
    );
  };
  const notebook = useMemo(
    () => knownCompounds.filter((c) => found.includes(c.slug)),
    [found],
  );
  return (
    <main className="science-detail lab-page">
      <Seo
        title="Laboratuvar · ElementAPI"
        description="İki H bir O su, bir Na bir Cl tuz. Yanlış oran kart açmaz. Gerçek deney tarifi değil."
        path="/lab"
      />
      <header className="lab-heading">
        <div>
          <p className="science-eyebrow">
            <FlaskConical size={15} /> Birleştir
          </p>
          <h1>Laboratuvar</h1>
          <p>
            Atom sayısını sen basarsın. HO su değildir; soygaz birleşmez.
            Tuz bir formül birimi, kuvars bir ağ. Cam tüp yok.
          </p>
        </div>
        <div className="lab-progress">
          <strong>
            {found.length}
            <span> / {catalogSize}</span>
          </strong>
          <span>bileşik keşfedildi</span>
          <Progress
            value={found.length}
            max={catalogSize}
            className="h-1.5"
            aria-label="Keşif ilerlemesi"
          />
        </div>
      </header>
      <LabModes />
      {lesson && (
        <div className="lesson-active">
          <BookOpen size={18} />
          <div>
            <strong>{lesson.title}</strong>
            <p>
              {lesson.discoveries
                .filter((id) => !found.includes(id))
                .map((id) => compoundBySlug[id].nameTr)
                .join(" · ") ||
                "Keşifler hazır. Koleksiyonundaki kısa soruyla rotayı tamamla."}
            </p>
          </div>
          <Link to="/collection">Rotaya dön</Link>
        </div>
      )}

      <div className="lab-layout">
        <Card asChild className="gap-0 py-5 max-md:py-3 shadow-none">
          <section className="lab-inventory" aria-label="Element kartları">
            <header>
              <h2>Elementler</h2>
              <span>{elementMaterials.length} kart</span>
            </header>
            <label className="lab-search">
              <Search size={16} />
              <Input
                className="pl-8"
                type="search"
                placeholder="Element ara…"
                aria-label="Element ara"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
            <div className="lab-materials">
              {shown.map((m) => (
                <Button
                  variant="plain"
                  size="none"
                  key={m.id}
                  className={`lab-material gap-1 is-element ${counts[m.id] ? "is-picked" : ""}`}
                  style={
                    {
                      "--element-color":
                        categorySwatches[elementCategory[m.id]] ?? "#92b7db",
                    } as CSSProperties
                  }
                  onClick={() => add(m.id, 1)}
                  aria-label={`${m.name} kartını seç`}
                >
                  <strong>{m.formula}</strong>
                  <span>{m.name}</span>
                  <small>{counts[m.id] ? `×${counts[m.id]}` : "Ekle"}</small>
                </Button>
              ))}
            </div>
            {!shown.length && (
              <p className="science-data-note">
                Bu aramada element yok. Farklı bir ad dene.
              </p>
            )}
            <p className="lab-inventory-note">
              Her tık bir atom. Su: hidrojen, hidrojen, oksijen. Tuz: sodyum,
              klor.
            </p>
          </section>
        </Card>
        <Card asChild className="gap-0 py-5 max-md:py-3 shadow-none">
          <section className="lab-bench" aria-label="Deney alanı">
            <div className="lab-bench-top">
              <p className="science-eyebrow">Deney alanı</p>
              <Button
                variant="plain"
                size="none"
                className="lab-clear"
                onClick={() => {
                  setBag({});
                  setResult(null);
                  setMessage("");
                  setTip("");
                  setKindQuiz(null);
                  setKindPick(null);
                  setNextHint("");
                }}
              >
                <RotateCcw size={14} /> Alanı temizle
              </Button>
            </div>
            <div className="lab-bag" aria-label="Seçilen atomlar">
              {Object.keys(counts).length ? (
                Object.entries(counts).map(([id, n]) => (
                  <div className="lab-chip" key={id}>
                    <strong>{id}</strong>
                    <span>{materialById[id].name}</span>
                    <div className="lab-chip-count">
                      <Button
                        variant="plain"
                        size="none"
                        aria-label={`${materialById[id].name} azalt`}
                        onClick={() => add(id, -1)}
                      >
                        <Minus size={14} />
                      </Button>
                      <em>{n}</em>
                      <Button
                        variant="plain"
                        size="none"
                        aria-label={`${materialById[id].name} artır`}
                        onClick={() => add(id, 1)}
                      >
                        <Plus size={14} />
                      </Button>
                    </div>
                    <Button
                      variant="plain"
                      size="none"
                      className="lab-chip-remove"
                      aria-label={`${materialById[id].name} kaldır`}
                      onClick={() =>
                        setBag((current) => {
                          const next = { ...current };
                          delete next[id];
                          return next;
                        })
                      }
                    >
                      <X size={14} />
                    </Button>
                  </div>
                ))
              ) : (
                <p className="lab-bag-empty">Soldan kart seç. Su iki H, bir O.</p>
              )}
            </div>
            <p className="lab-preview" aria-live="polite">
              {preview ? formulaText(preview) : "—"}
            </p>
            <div className="lab-bench-actions">
              <Button
                variant="default"
                className="lab-combine"
                disabled={!Object.keys(counts).length}
                onClick={mix}
              >
                <FlaskConical size={18} /> Birleştir <ArrowRight size={17} />
              </Button>
              <Button
                variant="outline"
                className="lab-hint"
                onClick={() => {
                  const next = hint(found);
                  if (!next) {
                    setTip("Katalogdaki bütün bileşikleri keşfettin.");
                    return;
                  }
                  const parts = Object.entries(parseFormula(next.formula)).map(
                    ([symbol, n]) =>
                      `${n} ${(materialById[symbol]?.name ?? symbol).toLocaleLowerCase("tr")}`,
                  );
                  setTip(
                    parts.length
                      ? `${next.nameTr} (${formulaText(next.formula)}) için ${parts.join(" ve ")} dene.`
                      : `${next.nameTr} formülü ${formulaText(next.formula)}.`,
                  );
                }}
              >
                <Lightbulb size={17} /> İpucu
              </Button>
            </div>
            <p
              className="lab-announcement"
              role="status"
              aria-label="Keşif sonucu"
              aria-live="polite"
            >
              {tip ||
                message ||
                "İlk iş: 2 hidrojen, 1 oksijen. İkinci iş: Na ve Cl."}
            </p>
            {result ? (
              <motion.article
                className="lab-result"
                key={result.slug}
                initial={reduce ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 320, damping: 30 }}
              >
                <div className="lab-result-heading">
                  <div>
                    <p className="science-eyebrow">
                      <FlaskConical size={14} /> Keşif kaydı
                    </p>
                    <h2>{result.nameTr}</h2>
                    <strong>{formulaText(result.formula)}</strong>
                  </div>
                  <ResultVisual compound={result} />
                </div>
                <p>{result.summary}</p>
                <GeometryFigure compact geometry={geometryOf(result)} />
                {!!result.uses.length && (
                  <ul className="lab-uses">
                    {result.uses.map((use) => (
                      <li key={use}>{use}</li>
                    ))}
                  </ul>
                )}
                <div className="lab-result-actions">
                  <Link to={`/compound/${result.slug}`}>
                    Bilimsel kaydı aç <ArrowUpRight size={15} />
                  </Link>
                  <Link to={`/lab/formula?compound=${result.slug}`}>
                    Formülü kur <ArrowUpRight size={15} />
                  </Link>
                  <Button
                    variant="plain"
                    size="none"
                    onClick={() => {
                      setBag({});
                      setMessage("Yeni bir formül dene.");
                      setKindQuiz(null);
                      setKindPick(null);
                    }}
                  >
                    Yeni deneme <ArrowRight size={15} />
                  </Button>
                </div>
                {nextHint && <p className="science-data-note">{nextHint}</p>}
                {kindQuiz && (
                  <fieldset className="lesson-question">
                    <legend>{kindQuiz.question}</legend>
                    {kindQuiz.choices.map((choice, i) => (
                      <Button
                        variant="plain"
                        size="none"
                        key={choice}
                        type="button"
                        aria-pressed={kindPick === i}
                        onClick={() => setKindPick(i)}
                      >
                        {choice}
                      </Button>
                    ))}
                    {kindPick !== null && (
                      <p role="status">
                        {kindPick === kindQuiz.answer
                          ? kindQuiz.explanation
                          : "Bir daha düşün. Formül birimi ile molekül aynı şey değildir."}
                      </p>
                    )}
                  </fieldset>
                )}
              </motion.article>
            ) : (
              <div className="lab-empty-result">
                <div aria-hidden="true">
                  H<span>—</span>O<span>—</span>H
                </div>
                <h2>Su veya tuz</h2>
                <p>
                  Kart türü seçer, sayı oranı belirler. HO su değildir; bir Na
                  bir Cl tuzdur.
                </p>
              </div>
            )}
            <p className="lab-science-note">
              Katalogdaki 167 kayıt. Kuantum motoru yok; oran tutmazsa kart
              açılmaz. Tehlikeli madde tarifi verilmez.
            </p>
          </section>
        </Card>
      </div>
      <section className="lab-notebook">
        <header>
          <div>
            <p className="science-eyebrow">
              <BookOpen size={15} /> Keşif defterin
            </p>
            <h2>
              {found.length === catalogSize
                ? "Katalog tamamlandı"
                : "Keşif defteri"}
            </h2>
            <p>
              {found.length
                ? `${found.length} bileşik kaydı açıldı.`
                : "Defter boş. Soldan iki H bir O; su kartı burada belirir."}
            </p>
          </div>
          <Button
            variant="plain"
            size="none"
            className="lab-reset"
            hidden={!!learning.user}
            onClick={() => setResetConfirm(true)}
          >
            İlerlemeyi sıfırla
          </Button>
        </header>
        <div className="lab-notebook-grid">
          {notebook.length
            ? notebook.map((c) => (
                <Link key={c.slug} to={`/compound/${c.slug}`}>
                  <Check size={14} />
                  <strong>{formulaText(c.formula)}</strong>
                  <span>{c.nameTr}</span>
                </Link>
              ))
            : knownCompounds.slice(0, 12).map((c) => (
                <Link key={c.slug} to="/lab" className="is-locked">
                  <strong>?</strong>
                  <span>Laboratuvarda aç</span>
                </Link>
              ))}
        </div>
        <p className="science-data-note">
          {learning.status}{" "}
          <Link to="/collection">Defterim ve öğrenme rotaları</Link>
        </p>
        {resetConfirm && (
          <div className="lab-reset-confirm" role="alert">
            <p>
              Bu tarayıcıdaki keşif defteri silinecek. Baştan başlamak istiyor
              musun?
            </p>
            <Button
              variant="plain"
              size="none"
              onClick={() => {
                setProgress([]);
                setBag({});
                setResult(null);
                setMessage("Yeni keşif defteri açıldı.");
                setResetConfirm(false);
              }}
            >
              Evet, sıfırla
            </Button>
            <Button
              variant="plain"
              size="none"
              onClick={() => setResetConfirm(false)}
            >
              Vazgeç
            </Button>
          </div>
        )}
      </section>
    </main>
  );
}
