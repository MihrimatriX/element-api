import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowRight, Check, Minus, Plus, RotateCcw } from "lucide-react";
import Seo from "../components/Seo";
import LabModes from "../components/LabModes";
import GeometryFigure from "../components/GeometryFigure";
import { geometryOf, parseFormula, prune, type Counts } from "../services/chemistry";
import { materialById } from "../services/lab";
import {
  formulaPool,
  gradeFormula,
  pickFormula,
  rememberGame,
  unlockedFormulaTier,
  loadGames,
} from "../services/games";

export default function LabFormula() {
  const [params] = useSearchParams();
  const [solved, setSolved] = useState(() => {
    try {
      return loadGames(localStorage).formula;
    } catch {
      return [];
    }
  });
  const [target, setTarget] = useState(() =>
    pickFormula(solved, params.get("compound")),
  );
  const expected = useMemo(
    () => parseFormula(target.formula),
    [target.formula],
  );
  const [bag, setBag] = useState<Counts>({});
  const [message, setMessage] = useState("");
  const [done, setDone] = useState(false);
  const counts = prune(bag);
  const tier = unlockedFormulaTier(solved.length);
  const setCount = (id: string, delta: number) => {
    setBag((current) => prune({ ...current, [id]: (current[id] ?? 0) + delta }));
    setMessage("");
    setDone(false);
  };
  const nextPuzzle = (progress = solved) => {
    setTarget(pickFormula(progress));
    setBag({});
    setMessage("");
    setDone(false);
  };
  const check = () => {
    const result = gradeFormula(target.slug, counts);
    setMessage(result.message);
    if (!result.ok) return;
    const next = rememberGame("formula", target.slug).formula;
    setSolved(next);
    setDone(true);
  };
  const unit = geometryOf(target);
  const ionic = unit.id === "ionic_lattice" || unit.id === "network";
  return (
    <main className="science-detail lab-page">
      <Seo
        title="Formülü kur · ElementAPI"
        description="Suda molekül, tuzda formül birimi. Adı oku, artı eksiyle atom sayısını bas. Keşif defterine yazılmaz."
        path="/lab/formula"
      />
      <header className="lab-heading">
        <div>
          <p className="science-eyebrow">Oyun</p>
          <h1>Formülü kur</h1>
          <p>
            Adı verilen kaydı sayılarla kur. Tuz NaCl bir birimdir, su H₂O bir
            molekül. Sürükleme yok; artı eksi yeter.
          </p>
        </div>
        <div className="lab-progress">
          <strong>
            {solved.length}
            <span> / {formulaPool(3).length}</span>
          </strong>
          <span>
            doğru formül · seviye {tier}
          </span>
        </div>
      </header>
      <LabModes />
      <Card asChild className="gap-0 py-5 max-md:py-3 shadow-none">
        <section className="lab-bench" aria-label="Formül kurma">
          <div className="lab-bench-top">
            <p className="science-eyebrow">Kurulacak kayıt</p>
            <Button
              variant="plain"
              size="none"
              className="lab-clear"
              onClick={() => nextPuzzle()}
            >
              <RotateCcw size={14} /> Başka kayıt
            </Button>
          </div>
          <h2>{target.nameTr}</h2>
          <p>{target.summary}</p>
          <p className="science-data-note">
            {ionic
              ? "Bu bir formül birimidir; ayrı molekül arama."
              : "Bu bir molekül formülüdür."}{" "}
            {unit.nameTr}.
          </p>
          <GeometryFigure compact geometry={unit} />
          <div className="lab-bag" aria-label="Atom sayıları">
            {Object.keys(expected).map((id) => (
              <div className="lab-chip" key={id}>
                <strong>{id}</strong>
                <span>{materialById[id]?.name ?? id}</span>
                <div className="lab-chip-count">
                  <Button
                    variant="plain"
                    size="none"
                    aria-label={`${materialById[id]?.name ?? id} azalt`}
                    onClick={() => setCount(id, -1)}
                  >
                    <Minus size={14} />
                  </Button>
                  <em>{counts[id] ?? 0}</em>
                  <Button
                    variant="plain"
                    size="none"
                    aria-label={`${materialById[id]?.name ?? id} artır`}
                    onClick={() => setCount(id, 1)}
                  >
                    <Plus size={14} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <div className="lab-bench-actions">
            <Button
              variant="default"
              className="lab-combine"
              disabled={!Object.keys(counts).length}
              onClick={check}
            >
              Kontrol et <ArrowRight size={17} />
            </Button>
          </div>
          <p className="lab-announcement" role="status" aria-live="polite">
            {message || "Adı oku, sayıları bas. Fazla oksijen suyu bozar."}
          </p>
          {done && (
            <div className="lab-result-actions">
              <Link to={`/compound/${target.slug}`}>
                Bilimsel kaydı aç
              </Link>
              <Button variant="plain" size="none" onClick={() => nextPuzzle(solved)}>
                Sonraki <ArrowRight size={15} />
              </Button>
            </div>
          )}
          {solved.includes(target.slug) && !done && (
            <p>
              <Check size={14} /> Bu kaydı daha önce doğru kurdun.
            </p>
          )}
          <p className="lab-science-note">
            Skor bu tarayıcıda; keşif defterine karışmaz. Seviye 2 üç, seviye 3
            sekiz doğru formülden sonra açılır.
          </p>
        </section>
      </Card>
    </main>
  );
}
