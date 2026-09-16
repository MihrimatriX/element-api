import { Progress } from "@/components/ui/progress";
import {
  Disclosure,
  DisclosureTrigger,
  DisclosureContent,
} from "@/components/ui/disclosure";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  FlaskConical,
  Lightbulb,
  LockKeyhole,
  Plus,
  RotateCcw,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import Seo from "../components/Seo";
import AtlasVisual from "../components/AtlasVisual";
import { useScience, type ScientificCompound } from "../services/science";
import {
  availableMaterials,
  combine,
  discover,
  equationText,
  formulaText,
  hint,
  materials,
  materialById,
  recipes,
  stages,
  unlockedElements,
  type LabRecipe,
} from "../services/lab";

import { useLearning } from "../services/useLearning";
import { track } from "../services/diagnostics";
import { lessons } from "../services/lessons";
function ResultVisual({ id }: { id: string }) {
  const { data } = useScience<ScientificCompound>("compounds", id);
  return (
    <AtlasVisual
      compact
      formula={formulaText(materialById[id].formula)}
      structure={data?.media?.structure}
    />
  );
}
const pathFor = (id: string) =>
  `/${materialById[id].kind === "element" ? "element" : "compound"}/${id.toLowerCase()}`;
export default function Laboratory() {
  useEffect(() => {
    track("lab_started");
  }, []);
  const [params] = useSearchParams();
  const requested = params.get("material");
  const learning = useLearning();
  const found = learning.progress.discoveries;
  const lesson = lessons.find((l) => l.id === params.get("lesson"));
  const [slots, setSlots] = useState<(string | null)[]>(() =>
    requested && availableMaterials(found).includes(requested)
      ? [requested, null]
      : [null, null],
  );
  const [result, setResult] = useState<LabRecipe | null>(null);
  const [message, setMessage] = useState("");
  const [tip, setTip] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "element" | "compound">("all");
  const [resetConfirm, setResetConfirm] = useState(false);
  const available = availableMaterials(found);
  const unlocked = unlockedElements(found);
  const nextStage = stages.find((s) => s.at > found.length);
  const fold = (s: string) =>
    s
      .toLocaleLowerCase("tr")
      .replace(/ı/g, "i")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  const shown = materials.filter(
    (m) =>
      available.includes(m.id) &&
      (filter === "all" || m.kind === filter) &&
      fold(`${m.name} ${m.formula}`).includes(fold(query)),
  );
  const setProgress = (next: string[]) =>
    learning.save({ ...learning.progress, discoveries: next });
  const choose = (id: string, index?: number) => {
    if (!available.includes(id)) return;
    setSlots((current) => {
      const next = [...current];
      next[index ?? (current[0] === null ? 0 : 1)] = id;
      return next;
    });
    setMessage("");
    setTip("");
  };
  const mix = () => {
    if (!slots[0] || !slots[1]) return;
    const match = combine(slots[0], slots[1], found);
    setTip("");
    setResult(match ?? null);
    if (!match) {
      setMessage("Bu eşleşme için oyunda bir keşif yok. Başka iki kart dene.");
      return;
    }
    const wasKnown = found.includes(match.result);
    const next = discover(found, match.result);
    const added = unlockedElements(next).filter((id) => !unlocked.includes(id));
    if (!wasKnown) track("discovery_completed", match.result);
    setProgress(next);
    setMessage(
      `${wasKnown ? "Bunu daha önce keşfettin" : "Yeni keşif"}: ${materialById[match.result].name}.${added.length ? ` Yeni elementler açıldı: ${added.map((id) => materialById[id].name).join(", ")}.` : ""}`,
    );
  };
  return (
    <main className="science-detail lab-page">
      <Seo
        title="Laboratuvar · ElementAPI"
        description="Altı elementle başlayarak 18 gerçek bileşiği keşfet. Kartları birleştir, yeni elementler aç ve bilimsel bağlantıları öğren."
        path="/lab"
      />
      <header className="lab-heading">
        <div>
          <p className="science-eyebrow">
            <FlaskConical size={15} /> KEŞİF LABORATUVARI
          </p>
          <h1>Laboratuvar</h1>
          <p>
            İki madde kartı seç. Yeni bileşikler buldukça laboratuvarın büyüsün.
          </p>
        </div>
        <div className="lab-progress">
          <strong>
            {found.length}
            <span> / {recipes.length}</span>
          </strong>
          <span>bileşik keşfedildi</span>
          <Progress
            value={found.length}
            max={recipes.length}
            className="h-1.5"
            aria-label="Keşif ilerlemesi"
          />
        </div>
      </header>
      {lesson && (
        <div className="lesson-active">
          <BookOpen size={18} />
          <div>
            <strong>{lesson.title}</strong>
            <p>
              {lesson.discoveries
                .filter((id) => !found.includes(id))
                .map((id) => materialById[id].name)
                .join(" · ") ||
                "Keşifler hazır. Koleksiyonundaki kısa soruyla rotayı tamamla."}
            </p>
          </div>
          <Link to="/collection">Rotaya dön</Link>
        </div>
      )}
      <div className="lab-stage-path" aria-label="Element açılma aşamaları">
        {stages.map((stage, i) => (
          <div
            key={stage.at}
            className={found.length >= stage.at ? "is-unlocked" : ""}
          >
            {found.length >= stage.at ? (
              <Check size={15} />
            ) : (
              <LockKeyhole size={14} />
            )}
            <span>{i === 0 ? "Başlangıç" : `${stage.at} keşif`}</span>
            <strong>{stage.elements.join(" · ")}</strong>
          </div>
        ))}
      </div>
      {requested &&
        materialById[requested] &&
        !available.includes(requested) && (
          <p className="science-notice">
            {materialById[requested].name} henüz açılmadı. Keşiflere devam
            ederek bu karta ulaşabilirsin.
          </p>
        )}

      <div className="lab-layout">
        <Card asChild className="gap-0 py-5 max-md:py-3 shadow-none">
          <section className="lab-inventory" aria-label="Madde kartları">
            <header>
              <h2>Malzemelerin</h2>
              <span>{available.length} kart</span>
            </header>
            <label className="lab-search">
              <Search size={16} />
              <Input
                className="pl-8"
                type="search"
                placeholder="Malzeme ara…"
                aria-label="Malzeme ara"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
            <div className="lab-filters">
              {(
                [
                  ["all", "Tümü"],
                  ["element", "Elementler"],
                  ["compound", "Bileşikler"],
                ] as const
              ).map(([id, label]) => (
                <Button
                  variant="plain"
                  size="none"
                  key={id}
                  aria-pressed={filter === id}
                  onClick={() => setFilter(id)}
                >
                  {label}
                </Button>
              ))}
            </div>
            <div className="lab-materials">
              {shown.map((m) => (
                <Button
                  variant="plain"
                  size="none"
                  key={m.id}
                  className={`lab-material gap-1 is-${m.kind} ${slots.includes(m.id) ? "is-picked" : ""}`}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData("text/plain", m.id);
                    e.dataTransfer.effectAllowed = "copy";
                  }}
                  onClick={() => choose(m.id)}
                  aria-label={`${m.name} kartını seç`}
                >
                  <strong>{formulaText(m.formula)}</strong>
                  <span>{m.name}</span>
                  <small>
                    {m.kind === "element" ? "Element" : "Keşfedildi"}
                  </small>
                </Button>
              ))}
            </div>
            {!shown.length && (
              <p className="science-data-note">
                Bu filtrede malzeme yok. Farklı bir arama dene.
              </p>
            )}
            <p className="lab-inventory-note">
              Kartları seç veya deney alanına sürükle. Malzemeler tükenmez.
            </p>
          </section>
        </Card>
        <Card asChild className="gap-0 py-5 max-md:py-3 shadow-none">
          <section className="lab-bench" aria-label="Deney alanı">
            <div className="lab-bench-top">
              <p className="science-eyebrow">DENEY ALANI</p>
              <Button
                variant="plain"
                size="none"
                className="lab-clear"
                onClick={() => {
                  setSlots([null, null]);
                  setResult(null);
                  setMessage("");
                  setTip("");
                }}
              >
                <RotateCcw size={14} /> Alanı temizle
              </Button>
            </div>
            <div className="lab-slots">
              {slots.map((id, index) => (
                <div className="lab-slot-wrap" key={index}>
                  {index === 1 && <Plus className="lab-plus" size={22} />}
                  <Button
                    variant="plain"
                    size="none"
                    className={`lab-slot ${id ? "is-filled" : ""}`}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = "copy";
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      choose(e.dataTransfer.getData("text/plain"), index);
                    }}
                    onClick={() => {
                      setSlots((current) =>
                        current.map((v, i) => (i === index ? null : v)),
                      );
                    }}
                    aria-label={`${index + 1}. seçim yuvası${id ? `: ${materialById[id].name}, seçimi kaldır` : ": boş"}`}
                  >
                    {id ? (
                      <>
                        <strong>{formulaText(materialById[id].formula)}</strong>
                        <span>{materialById[id].name}</span>
                        <small>
                          <X size={12} /> Kaldır
                        </small>
                      </>
                    ) : (
                      <>
                        <Plus size={25} />
                        <span>{index + 1}. maddeyi seç</span>
                        <small>Kartı buraya bırakabilirsin</small>
                      </>
                    )}
                  </Button>
                </div>
              ))}
            </div>
            <div className="lab-bench-actions">
              <Button
                variant="default"
                className="lab-combine"
                disabled={!slots[0] || !slots[1]}
                onClick={mix}
              >
                <FlaskConical size={18} /> Birleştir <ArrowRight size={17} />
              </Button>
              <Button
                variant="outline"
                className="lab-hint"
                onClick={() => {
                  const recipe = hint(found);
                  setTip(
                    recipe
                      ? `${materialById[recipe.inputs[0]].name} ile ${materialById[recipe.inputs[1]].name} arasında bir bağlantı var.`
                      : "Bütün keşifleri tamamladın.",
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
                "İlk bağlantın için hidrojen ve oksijeni seçebilirsin."}
            </p>
            {result ? (
              <article className="lab-result" key={result.result}>
                <div className="lab-result-heading">
                  <div>
                    <p className="science-eyebrow">
                      <Sparkles size={14} /> KEŞİF KAYDI
                    </p>
                    <h2>{materialById[result.result].name}</h2>
                    <strong>
                      {formulaText(materialById[result.result].formula)}
                    </strong>
                  </div>
                  <ResultVisual id={result.result} />
                </div>
                <span
                  className={`lab-rule-label ${result.reaction ? "is-reaction" : ""}`}
                >
                  {result.reaction ? "Kaynaklı tepkime" : "Keşif eşleştirmesi"}
                </span>
                <p>{result.explanation}</p>
                {result.reaction && (
                  <Disclosure className="lab-reaction">
                    <DisclosureTrigger>
                      Denklem ve bilimsel açıklama
                    </DisclosureTrigger>
                    <DisclosureContent>
                      <p className="lab-equation">
                        {equationText(result.reaction.equation)}
                      </p>
                      <p>{result.reaction.conditions}</p>
                      <p>
                        Yan ürünler:{" "}
                        {result.reaction.byproducts.length
                          ? result.reaction.byproducts.join(", ")
                          : "Bu denklemde başka kimyasal ürün gösterilmiyor."}
                      </p>
                      <a
                        href={result.reaction.source}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Tepkime kaynağı <ArrowUpRight size={13} />
                      </a>
                    </DisclosureContent>
                  </Disclosure>
                )}
                <div className="lab-result-actions">
                  <Link to={`/compound/${result.result}`}>
                    Bilimsel kaydı aç <ArrowUpRight size={15} />
                  </Link>
                  <Button
                    variant="plain"
                    size="none"
                    onClick={() => {
                      setSlots([result.result, null]);
                      setMessage("Yeni bileşiğinin yanına başka bir kart seç.");
                    }}
                  >
                    Bu kartla devam et <ArrowRight size={15} />
                  </Button>
                </div>
              </article>
            ) : (
              <div className="lab-empty-result">
                <div aria-hidden="true">
                  H<span>—</span>O<span>—</span>H
                </div>
                <h2>İlk keşfin için hazır</h2>
                <p>
                  Keşif kartlarında maddenin formülünü, özelliklerini ve
                  kaynaklarını bulacaksın.
                </p>
              </div>
            )}
            <p className="lab-science-note">
              Kartlar madde türlerini temsil eder; miktar veya deney tarifi
              değildir. “Kaynaklı tepkime” ve “keşif eşleştirmesi” farklı bilgi
              türleridir.
            </p>
          </section>
        </Card>
      </div>
      <section className="lab-notebook">
        <header>
          <div>
            <p className="science-eyebrow">
              <BookOpen size={15} /> KEŞİF DEFTERİN
            </p>
            <h2>
              {found.length === 18
                ? "Laboratuvar tamamlandı!"
                : "Keşif defteri"}
            </h2>
            <p>
              {found.length === 18
                ? "18 bileşiği keşfettin. Artık her birinin bilimsel hikâyesini inceleyebilirsin."
                : nextStage
                  ? `${nextStage.at - found.length} yeni keşifle ${nextStage.elements.join(", ")} açılacak.`
                  : "Bütün elementler açık. Son bileşikleri bulmaya devam et."}
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
          {recipes.map((r) => {
            const known = found.includes(r.result);
            return known ? (
              <Link key={r.result} to={pathFor(r.result)}>
                <Check size={14} />
                <strong>{formulaText(materialById[r.result].formula)}</strong>
                <span>{materialById[r.result].name}</span>
              </Link>
            ) : (
              <div key={r.result} className="is-locked">
                <LockKeyhole size={14} />
                <strong>?</strong>
                <span>Keşfedilmeyi bekliyor</span>
              </div>
            );
          })}
        </div>
        <p className="science-data-note">
          {learning.status}{" "}
          <Link to="/collection">Koleksiyonum ve öğrenme rotaları</Link>
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
                setSlots([null, null]);
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
