import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  CircleHelp,
  FlaskConical,
  GripVertical,
  Lightbulb,
  Minus,
  Plus,
  RotateCcw,
  Search,
  Sparkles,
  Target,
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
  mixOutcome,
  moveChip,
  syncChipOrder,
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

/** Frequent starter atoms pinned above the full palette. */
const PINNED = ["H", "O", "C", "N", "Na", "Cl", "Fe", "S", "K", "Ca"];

const STARTERS: { label: string; bag: Counts; blurb: string }[] = [
  { label: "Su", bag: { H: 2, O: 1 }, blurb: "H₂O" },
  { label: "Tuz", bag: { Na: 1, Cl: 1 }, blurb: "NaCl" },
  { label: "Karbondioksit", bag: { C: 1, O: 2 }, blurb: "CO₂" },
];

const DRAG_THRESHOLD = 6;

type DragKind = "palette" | "chip";

type DragState = {
  kind: DragKind;
  id: string;
  fromIndex: number;
  x: number;
  y: number;
  overBench: boolean;
  overIndex: number | null;
  active: boolean;
};

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

function foldTr(s: string) {
  return s
    .toLocaleLowerCase("tr")
    .replace(/ı/g, "i")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function hitTarget(
  x: number,
  y: number,
): { bench: boolean; chipIndex: number | null } {
  const stack = document.elementsFromPoint(x, y);
  let bench = false;
  let chipIndex: number | null = null;
  for (const el of stack) {
    if (!(el instanceof HTMLElement)) continue;
    if (el.dataset.labDrop != null) bench = true;
    if (el.dataset.labChip != null && chipIndex === null) {
      const n = Number(el.dataset.labChip);
      if (Number.isFinite(n)) chipIndex = n;
    }
  }
  return { bench, chipIndex };
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
  const [order, setOrder] = useState<string[]>(() =>
    requested && materialById[requested]?.kind === "element" ? [requested] : [],
  );
  const [result, setResult] = useState<KnownCompound | null>(null);
  const [fresh, setFresh] = useState(false);
  const [message, setMessage] = useState("");
  const [tone, setTone] = useState<ReturnType<typeof mixOutcome> | null>(null);
  const [cousins, setCousins] = useState<KnownCompound[]>([]);
  const [tip, setTip] = useState("");
  const [query, setQuery] = useState("");
  const [resetConfirm, setResetConfirm] = useState(false);
  const [kindQuiz, setKindQuiz] = useState<ReturnType<
    typeof recordKindQuestion
  > | null>(null);
  const [kindPick, setKindPick] = useState<number | null>(null);
  const [nextHint, setNextHint] = useState("");
  const [drag, setDrag] = useState<DragState | null>(null);
  const [celebrate, setCelebrate] = useState(false);
  const dragRef = useRef<DragState | null>(null);
  const reduce = useReducedMotion();
  const counts = prune(bag);
  const chipIds = useMemo(
    () => syncChipOrder(order, counts),
    [order, counts],
  );
  const hasAtoms = chipIds.length > 0;
  const shown = useMemo(() => {
    const q = foldTr(query);
    const filtered = elementMaterials.filter((m) =>
      foldTr(`${m.name} ${m.formula}`).includes(q),
    );
    if (q) return filtered;
    const pin = new Set(PINNED);
    const head = PINNED.map((id) => materialById[id]).filter(Boolean);
    const rest = filtered.filter((m) => !pin.has(m.id));
    return [...head, ...rest];
  }, [query]);
  const preview = bagFormula(counts);
  const setProgress = (next: string[]) =>
    learning.save({ ...learning.progress, discoveries: next });
  const clearFeedback = () => {
    setMessage("");
    setTip("");
    setTone(null);
    setCousins([]);
    setKindQuiz(null);
    setKindPick(null);
    setNextHint("");
    setFresh(false);
    setCelebrate(false);
  };
  const add = (id: string, delta = 1) => {
    if (materialById[id]?.kind !== "element") return;
    setBag((current) =>
      prune({ ...current, [id]: (current[id] ?? 0) + delta }),
    );
    setResult(null);
    clearFeedback();
  };
  const removeId = (id: string) => {
    setBag((current) => {
      const next = { ...current };
      delete next[id];
      return prune(next);
    });
    setOrder((o) => o.filter((x) => x !== id));
    setResult(null);
    clearFeedback();
  };
  const loadBag = (next: Counts) => {
    const pruned = prune(next);
    setBag(pruned);
    setOrder(Object.keys(pruned));
    setResult(null);
    clearFeedback();
  };
  const mix = (override?: Counts) => {
    const used = prune(override ?? counts);
    if (override) {
      setBag(used);
      setOrder(Object.keys(used));
    }
    const formed = formCompound(used);
    setTip("");
    if (!formed.ok) {
      setResult(null);
      setFresh(false);
      setTone(mixOutcome(formed));
      setMessage(formed.message);
      setCousins(formed.expected ?? []);
      setKindQuiz(null);
      setKindPick(null);
      setNextHint("");
      return;
    }
    const wasKnown = found.includes(formed.compound.slug);
    const next = discover(found, formed.compound.slug);
    if (!wasKnown) track("discovery_completed", formed.compound.slug);
    setProgress(next);
    setResult(formed.compound);
    setFresh(!wasKnown);
    setCelebrate(!wasKnown && !reduce);
    setTone("hit");
    setCousins([]);
    const upcoming = lesson
      ? lesson.discoveries
          .filter((id) => !next.includes(id))
          .map((id) => compoundBySlug[id])[0]
      : hint(next);
    setNextHint(
      upcoming
        ? `Koleksiyonda sıradaki: ${upcoming.nameTr}.`
        : next.length === catalogSize
          ? "Katalog tamam — yan görevlere bakabilirsin."
          : "",
    );
    setKindQuiz(wasKnown ? null : recordKindQuestion(formed.compound));
    setKindPick(null);
    setMessage(
      wasKnown
        ? `Tekrar: ${formed.compound.nameTr}. Oran tuttu — defterde zaten var.`
        : `${formed.compound.nameTr} deftere işlendi. ${next.length} / ${catalogSize}`,
    );
  };

  const finishDrag = (final: DragState | null, didMove: boolean) => {
    dragRef.current = null;
    setDrag(null);
    if (!final) return;
    if (!didMove || !final.active) {
      if (final.kind === "palette") add(final.id, 1);
      return;
    }
    if (final.kind === "palette") {
      if (final.overBench) add(final.id, 1);
      return;
    }
    // chip reorder
    if (final.overIndex != null && final.overIndex !== final.fromIndex) {
      setOrder((o) =>
        moveChip(syncChipOrder(o, counts), final.fromIndex, final.overIndex!),
      );
      clearFeedback();
      setResult(null);
      return;
    }
    if (!final.overBench) {
      removeId(final.id);
    }
  };

  const beginPointerDrag = (
    e: ReactPointerEvent<HTMLElement>,
    kind: DragKind,
    id: string,
    fromIndex: number,
  ) => {
    if (e.button !== 0) return;
    // Don't steal +/- / remove button presses
    if ((e.target as HTMLElement).closest("button:not([data-lab-drag])")) return;
    e.preventDefault();
    const el = e.currentTarget;
    el.setPointerCapture(e.pointerId);
    const startX = e.clientX;
    const startY = e.clientY;
    let didMove = false;
    const initial: DragState = {
      kind,
      id,
      fromIndex,
      x: startX,
      y: startY,
      overBench: kind === "chip",
      overIndex: kind === "chip" ? fromIndex : null,
      active: false,
    };
    dragRef.current = initial;

    const onMove = (ev: PointerEvent) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      if (!didMove && dx * dx + dy * dy < DRAG_THRESHOLD * DRAG_THRESHOLD) return;
      didMove = true;
      const hit = hitTarget(ev.clientX, ev.clientY);
      const next: DragState = {
        kind,
        id,
        fromIndex,
        x: ev.clientX,
        y: ev.clientY,
        overBench: hit.bench,
        overIndex: hit.chipIndex,
        active: true,
      };
      dragRef.current = next;
      setDrag(next);
    };
    const onUp = () => {
      el.releasePointerCapture(e.pointerId);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onUp);
      finishDrag(dragRef.current, didMove);
    };
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onUp);
  };

  const notebook = useMemo(
    () => knownCompounds.filter((c) => found.includes(c.slug)),
    [found],
  );
  const toneLabel =
    tone === "hit"
      ? fresh
        ? "Yeni keşif"
        : "Bunu biliyordun"
      : tone === "almost"
        ? "Neredeyse"
        : tone === "impossible"
          ? "Bu karışmaz"
          : tone === "unknown"
            ? "Katalogda yok"
            : null;
  const ToneIcon =
    tone === "hit"
      ? fresh
        ? Sparkles
        : Check
      : tone === "almost"
        ? Target
        : tone === "impossible"
          ? X
          : tone === "unknown"
            ? CircleHelp
            : null;
  const dragging = !!drag?.active;
  const pct = Math.round((found.length / catalogSize) * 100);

  return (
    <main
      className={`science-detail lab-page lab-sandbox${dragging ? " is-dragging" : ""}${celebrate ? " is-celebrate" : ""}`}
    >
      <Seo
        title="Laboratuvar · ElementAPI"
        description="Element sürükle, karıştır, bak ne çıkar. Bilinen moleküller deftere yazılır; uydurma tepkime yok."
        path="/lab"
      />
      <header className="lab-heading">
        <div>
          <p className="void-kicker">Tezgâh</p>
          <h1>Laboratuvar</h1>
          <p>
            Elementi tezgâha sürükle, oranı ayarla, Dene’ye bas. Katalogdaki
            molekül çıkarsa deftere yazılır — gerçek deney tarifi değil.
          </p>
          <ol className="lab-howto" aria-label="Nasıl oynanır">
            <li>
              <span aria-hidden="true">1</span>
              <strong>Sürükle</strong>
              <em>Soldan tezgâha</em>
            </li>
            <li>
              <span aria-hidden="true">2</span>
              <strong>Ayarla</strong>
              <em>+ / − ile oran</em>
            </li>
            <li>
              <span aria-hidden="true">3</span>
              <strong>Dene</strong>
              <em>Eşleşirse kart açılır</em>
            </li>
          </ol>
          <p className="lab-heading-trail">
            <Link to="/periodic" className="science-text-link">
              Tablodan gel
            </Link>
            {" · "}
            <Link to="/collection" className="science-text-link">
              Deftere bak
            </Link>
          </p>
        </div>
        <div className="lab-progress">
          <strong>
            {found.length}
            <span> / {catalogSize}</span>
          </strong>
          <span>
            {found.length === 0
              ? "Henüz keşif yok — ilk molekülü dene"
              : found.length === catalogSize
                ? "Katalog tamam"
                : `%${pct} · ${catalogSize - found.length} kaldı`}
          </span>
          <Progress
            value={found.length}
            max={catalogSize}
            className="h-1.5"
            aria-label="Keşif ilerlemesi"
          />
        </div>
      </header>
      <LabModes secondary />
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
        <section className="lab-inventory" aria-label="Element paleti">
          <header>
            <h2>Palet</h2>
            <span>{elementMaterials.length}</span>
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
          {!query && (
            <p className="lab-pin-label">Sık kullanılanlar</p>
          )}
          <div className="lab-materials" role="list">
            {shown.map((m) => (
              <Button
                variant="plain"
                size="none"
                key={m.id}
                data-lab-drag
                role="listitem"
                className={`lab-material gap-1 is-element${counts[m.id] ? " is-picked" : ""}${drag?.active && drag.id === m.id && drag.kind === "palette" ? " is-ghost-source" : ""}`}
                style={
                  {
                    "--element-color":
                      categorySwatches[elementCategory[m.id]] ?? "#4a6d8c",
                  } as CSSProperties
                }
                onPointerDown={(e) => beginPointerDrag(e, "palette", m.id, -1)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    add(m.id, 1);
                  }
                }}
                aria-label={`${m.name} tezgâha ekle`}
                title="Sürükle veya tıkla"
              >
                <span className="lab-material-grip" aria-hidden="true">
                  <GripVertical size={14} />
                </span>
                <strong>{m.formula}</strong>
                <span>{m.name}</span>
                <small>
                  {counts[m.id] ? `×${counts[m.id]}` : "Sürükle"}
                </small>
              </Button>
            ))}
          </div>
          {!shown.length && (
            <p className="science-data-note">
              Bu aramada element yok. Farklı bir ad dene.
            </p>
          )}
          <p className="lab-inventory-note">
            Sürükle veya tıkla. Oranı chip’lerden ayarla; dışarı bırakınca silinir.
          </p>
        </section>
        <section className="lab-bench" aria-label="Karışım alanı">
          <div className="lab-bench-top">
            <h2 className="lab-bench-label">Tezgâh</h2>
            <Button
              variant="plain"
              size="none"
              className="lab-clear"
              onClick={() => {
                setBag({});
                setOrder([]);
                setResult(null);
                clearFeedback();
              }}
            >
              <RotateCcw size={14} /> Temizle
            </Button>
          </div>

            <div
              className={`lab-drop${drag?.active && drag.overBench ? " is-hot" : ""}${dragging && !drag?.overBench ? " is-waiting" : ""}${!hasAtoms ? " is-empty" : ""}`}
              data-lab-drop
              aria-label="Element bırakma alanı"
            >
              {dragging && drag?.overBench && (
                <p className="lab-drop-cue" aria-hidden="true">
                  Bırak — tezgâha eklenir
                </p>
              )}
              {!hasAtoms && !result && (
                <div className="lab-invite">
                  <div className="lab-invite-mark" aria-hidden="true">
                    <FlaskConical size={28} />
                  </div>
                  <h2>Tezgâh boş</h2>
                  <p>
                    Soldaki bir elementi buraya sürükle (veya tıkla). Hızlı
                    başlamak için hazır bir karışım seç.
                  </p>
                  <div className="lab-starters">
                    {STARTERS.map((s) => (
                      <Button
                        key={s.label}
                        variant="outline"
                        className="lab-starter"
                        onClick={() => mix(s.bag)}
                      >
                        <Sparkles size={15} />
                        {s.label}
                        <span>{s.blurb}</span>
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              <div className="lab-bag" aria-label="Seçilen atomlar">
                {hasAtoms ? (
                  chipIds.map((id, index) => (
                    <motion.div
                      className={`lab-chip${drag?.active && drag.kind === "chip" && drag.fromIndex === index ? " is-ghost-source" : ""}${drag?.active && drag.kind === "chip" && drag.overIndex === index ? " is-drop-before" : ""}`}
                      key={id}
                      layout={!reduce}
                      initial={reduce ? false : { opacity: 0, scale: 0.92, y: 6 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      transition={{ type: "spring", stiffness: 420, damping: 26 }}
                      data-lab-chip={index}
                      data-lab-drag
                      data-lab-drop
                      onPointerDown={(e) =>
                        beginPointerDrag(e, "chip", id, index)
                      }
                      style={
                        {
                          "--element-color":
                            categorySwatches[elementCategory[id]] ?? "#4a6d8c",
                          touchAction: "none",
                        } as CSSProperties
                      }
                    >
                      <span className="lab-chip-grip" aria-hidden="true">
                        <GripVertical size={14} />
                      </span>
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
                        <em>{counts[id]}</em>
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
                        onClick={() => removeId(id)}
                      >
                        <X size={14} />
                      </Button>
                    </motion.div>
                  ))
                ) : (
                  dragging && (
                    <p className="lab-bag-empty">Bırak — karışıma eklenir.</p>
                  )
                )}
              </div>
            </div>

            <p className="lab-preview" aria-live="polite">
              {preview ? formulaText(preview) : "—"}
            </p>
            <div className="lab-bench-actions">
              <Button
                variant="default"
                className={`lab-combine${hasAtoms && !result && !tone ? " is-ready" : ""}`}
                disabled={!hasAtoms}
                onClick={() => mix()}
              >
                <FlaskConical size={18} /> Dene <ArrowRight size={17} />
              </Button>
              <Button
                variant="outline"
                className="lab-hint"
                onClick={() => {
                  const next = hint(found);
                  if (!next) {
                    setTip("Katalogdaki bütün bileşikleri keşfettin.");
                    setTone(null);
                    return;
                  }
                  const parts = Object.entries(parseFormula(next.formula)).map(
                    ([symbol, n]) =>
                      `${n} ${(materialById[symbol]?.name ?? symbol).toLocaleLowerCase("tr")}`,
                  );
                  setTone(null);
                  setTip(
                    parts.length
                      ? `İpucu: ${next.nameTr} için ${parts.join(" ve ")} dene.`
                      : `İpucu: ${next.nameTr} → ${formulaText(next.formula)}.`,
                  );
                }}
              >
                <Lightbulb size={17} /> İpucu
              </Button>
            </div>

            {(tip || message) && (
              <motion.div
                className={`lab-feedback${tone ? ` is-${tone}` : ""}${fresh ? " is-fresh" : ""}`}
                role="status"
                aria-live="polite"
                key={`${tone}-${message}-${tip}`}
                initial={reduce ? false : { opacity: 0, y: 8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: "spring", stiffness: 380, damping: 28 }}
              >
                {toneLabel && (
                  <strong>
                    {ToneIcon && (
                      <ToneIcon size={15} aria-hidden="true" />
                    )}
                    {toneLabel}
                  </strong>
                )}
                <p>{tip || message}</p>
                {!!cousins.length && (
                  <div className="lab-cousin-row">
                    <span>Doğru oranı yükle:</span>
                    {cousins.slice(0, 4).map((c) => (
                      <Button
                        key={c.slug}
                        variant="outline"
                        size="sm"
                        className="lab-cousin"
                        onClick={() => loadBag(parseFormula(c.formula))}
                      >
                        {formulaText(c.formula)}
                      </Button>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {result ? (
              <motion.article
                className={`lab-result${fresh ? " is-fresh" : ""}`}
                key={result.slug}
                initial={reduce ? false : { opacity: 0, y: 12, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: "spring", stiffness: 320, damping: 28 }}
                onAnimationComplete={() => {
                  if (celebrate) {
                    window.setTimeout(() => setCelebrate(false), 900);
                  }
                }}
              >
                {celebrate && (
                  <span className="lab-celebrate" aria-hidden="true">
                    {Array.from({ length: 8 }, (_, i) => (
                      <i key={i} style={{ "--i": i } as CSSProperties} />
                    ))}
                  </span>
                )}
                <div className="lab-result-heading">
                  <div>
                    <p className="science-meta">
                      <FlaskConical size={14} />{" "}
                      {fresh ? "Deftere eklendi" : "Keşif kaydı"}
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
                      setOrder([]);
                      setResult(null);
                      clearFeedback();
                      setMessage("Yeni bir karışım dene.");
                    }}
                  >
                    Yeniden karıştır <ArrowRight size={15} />
                  </Button>
                </div>
                {nextHint && <p className="science-data-note">{nextHint}</p>}
                {kindQuiz && (
                  <details className="lab-kind-quiz">
                    <summary>İstersen kısa soru</summary>
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
                  </details>
                )}
              </motion.article>
            ) : (
              hasAtoms &&
              !tone &&
              !tip && (
                <div className="lab-empty-result">
                  <div aria-hidden="true">
                    <span>{preview ? formulaText(preview) : "?"}</span>
                    <span className="lab-empty-arrow">→</span>
                    <span>?</span>
                  </div>
                  <h2>Hazır — Dene’ye bas</h2>
                  <p>
                    Oran tutarsa kart açılır. Tutmazsa “neredeyse” veya “bu
                    karışmaz” dersin — uydurma tepkime yok.
                  </p>
                </div>
              )
            )}
          <p className="lab-science-note">
            {catalogSize} bilinen kayıt · stoikiometri + katalog · tehlikeli
            madde tarifi yok.
          </p>
        </section>
      </div>
      <section className="lab-notebook" aria-label="Keşif defteri">
        <header>
          <div>
            <p className="void-kicker">
              <BookOpen size={14} aria-hidden="true" /> Sonuçlar
            </p>
            <h2>
              {found.length === catalogSize
                ? "Katalog tamamlandı"
                : "Keşif defteri"}
            </h2>
            <p>
              {found.length
                ? `${found.length} bileşik kaydı açıldı.`
                : "Defter boş. Yukarıda bir karışım dene — eşleşen molekül burada belirir."}
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
                <div key={c.slug} className="is-locked">
                  <strong>?</strong>
                  <span>Laboratuvarda aç</span>
                </div>
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
                setOrder([]);
                setResult(null);
                clearFeedback();
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

      {drag?.active && (
        <div
          className="lab-drag-ghost"
          style={
            {
              left: drag.x,
              top: drag.y,
              "--element-color":
                categorySwatches[elementCategory[drag.id]] ?? "#4a6d8c",
            } as CSSProperties
          }
          aria-hidden="true"
        >
          <strong>{drag.id}</strong>
          <span>{materialById[drag.id]?.name ?? drag.id}</span>
        </div>
      )}
    </main>
  );
}
