import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowRight, Lightbulb, RotateCcw } from "lucide-react";
import Seo from "../components/Seo";
import LabModes from "../components/LabModes";
import {
  detectivePool,
  gradeDetective,
  loadGames,
  pickDetective,
  rememberGame,
} from "../services/games";
import { categorySwatches } from "../services/elementData";
import type { CSSProperties } from "react";

export default function LabDetective() {
  const [params] = useSearchParams();
  const [solved, setSolved] = useState(() => {
    try {
      return loadGames(localStorage).detective;
    } catch {
      return [];
    }
  });
  const [item, setItem] = useState(() =>
    pickDetective(solved, params.get("element")?.toUpperCase()),
  );
  const [open, setOpen] = useState(1);
  const [guess, setGuess] = useState("");
  const [message, setMessage] = useState("");
  const [done, setDone] = useState(false);
  const pool = useMemo(() => detectivePool(), []);
  const nextCase = (progress = solved) => {
    setItem(pickDetective(progress));
    setOpen(1);
    setGuess("");
    setMessage("");
    setDone(false);
  };
  const submit = (value: string) => {
    const result = gradeDetective(item.element.symbol, value);
    setMessage(result.message);
    if (!result.ok) return;
    const next = rememberGame("detective", item.element.symbol).detective;
    setSolved(next);
    setDone(true);
  };
  return (
    <main className="science-detail lab-page">
      <Seo
        title="Element dedektifi · ElementAPI"
        description="İpucu ipucu element bul. Pas rengi demire götürebilir. Skor keşif defterine yazılmaz."
        path="/lab/detective"
      />
      <header className="lab-heading">
        <div>
          <p className="science-eyebrow">Oyun</p>
          <h1>Element dedektifi</h1>
          <p>
            Bir ipucu yetmezse öbürünü aç. Adı yaz veya şıktan seç. Null
            alanlardan tuzak soru çıkmaz.
          </p>
        </div>
        <div className="lab-progress">
          <strong>
            {solved.length}
            <span> / {pool.length}</span>
          </strong>
          <span>doğru teşhis · bu tarayıcıda</span>
        </div>
      </header>
      <LabModes />
      <Card asChild className="gap-0 py-5 max-md:py-3 shadow-none">
        <section className="lab-bench" aria-label="Element bulmaca">
          <div className="lab-bench-top">
            <p className="science-eyebrow">İpuçları</p>
            <Button
              variant="plain"
              size="none"
              className="lab-clear"
              onClick={() => nextCase()}
            >
              <RotateCcw size={14} /> Pas geç
            </Button>
          </div>
          <ol className="lab-clues">
            {item.clues.slice(0, open).map((clue) => (
              <li key={clue}>{clue}</li>
            ))}
          </ol>
          {open < item.clues.length && !done && (
            <Button
              variant="outline"
              className="lab-hint"
              onClick={() => setOpen((n) => Math.min(item.clues.length, n + 1))}
            >
              <Lightbulb size={17} /> Başka ipucu ({open}/{item.clues.length})
            </Button>
          )}
          <form
            className="lab-guess"
            onSubmit={(e) => {
              e.preventDefault();
              submit(guess);
            }}
          >
            <label>
              Element adı veya sembol
              <Input
                value={guess}
                onChange={(e) => setGuess(e.target.value)}
                autoComplete="off"
                disabled={done}
                aria-label="Element adı veya sembol"
              />
            </label>
            <Button type="submit" disabled={done || !guess.trim()}>
              Tahmin et
            </Button>
          </form>
          <div className="lab-choices" role="group" aria-label="Aday elementler">
            {item.choices.map((choice) => (
              <Button
                key={choice.symbol}
                variant="outline"
                disabled={done}
                style={
                  {
                    "--element-color":
                      categorySwatches[choice.category] ?? "#92b7db",
                  } as CSSProperties
                }
                onClick={() => {
                  setGuess(choice.symbol);
                  submit(choice.symbol);
                }}
              >
                {choice.name}{" "}
                <strong>{choice.symbol}</strong>
              </Button>
            ))}
          </div>
          <p className="lab-announcement" role="status" aria-live="polite">
            {message || "İlk ipucuyla başla. Yetmezse öbürünü aç."}
          </p>
          {done && (
            <div className="lab-result-actions">
              <Link to={`/element/${item.element.symbol.toLowerCase()}`}>
                Element kaydını aç
              </Link>
              <Button
                variant="plain"
                size="none"
                onClick={() => nextCase(solved)}
              >
                Sonraki <ArrowRight size={15} />
              </Button>
            </div>
          )}
          <p className="lab-science-note">
            Havuz ilk 36 element. İpucu sembolü ağzından kaçırmaz. Skor deftere
            yazılmaz.
          </p>
        </section>
      </Card>
    </main>
  );
}
