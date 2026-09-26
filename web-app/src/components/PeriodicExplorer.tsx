import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, ArrowUpRight, Atom, X } from "lucide-react";
import {
  categoryLabels,
  categorySwatches,
  STATIC_ELEMENTS,
  tileInk,
} from "../services/elementData";
import {
  formatScience,
  phaseLabels,
  useScience,
  type ScientificElement,
} from "../services/science";
import Seo from "./Seo";
import AtlasVisual, { AtomShell } from "./AtlasVisual";

const fold = (s: string) =>
  s
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

// museum-grid rows: 1=groups, 2–8=periods, 9=spacer, 10–11=f-block
const tableGridRow = (row: number) => (row >= 8 ? row + 2 : row + 1);

type Lens = "category" | "mass" | "electronegativity" | "phase";

function ElementPreview({
  symbol,
  compact = false,
}: {
  symbol: string;
  compact?: boolean;
}) {
  const { data: e, error } = useScience<ScientificElement>(
    "elements",
    symbol.toLowerCase(),
  );
  const seed = STATIC_ELEMENTS.find((el) => el.symbol === symbol)!;
  return (
    <div
      className={`atlas-preview museum-preview-body ${compact ? "is-panel" : ""}`}
      style={
        {
          "--element-color": categorySwatches[seed.category],
          "--tile-ink": tileInk(categorySwatches[seed.category]),
        } as CSSProperties
      }
    >
      <AtlasVisual
        key={symbol}
        compact={compact}
        symbol={symbol}
        shells={e?.atomic_properties.electrons_per_shell}
        photo={e?.media?.photo}
      />
      <div className="atlas-preview-copy">
        <h2>
          {e?.names.tr ?? seed.name} <span>{symbol}</span>
        </h2>
        <p>
          {e?.editorial?.summary ??
            (error
              ? "Ayrıntı yüklenemedi. Temel tabloyu kullanmaya devam edebilirsin."
              : "Kayıt yükleniyor…")}
        </p>
        <div className="preview-facts">
          <span>
            {phaseLabels[
              e?.thermodynamic_properties.standard_state ?? "unknown"
            ] ?? "Bilinmiyor"}
          </span>
          <span>{formatScience(e?.atomic_properties.atomic_mass, "u")}</span>
        </div>
        <Link
          to={`/element/${symbol.toLowerCase()}`}
          className="science-text-link"
        >
          Tam kayıt <ArrowUpRight size={15} />
        </Link>
      </div>
      {compact && (
        <div className="preview-atom">
          <AtomShell
            symbol={symbol}
            shells={e?.atomic_properties.electrons_per_shell}
          />
          <small>Elektron kabukları · şematik</small>
        </div>
      )}
    </div>
  );
}

export default function PeriodicExplorer() {
  const { data, error, retry } = useScience<ScientificElement[]>("elements");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [selected, setSelected] = useState("Fe");
  const [view, setView] = useState<"table" | "list">(() =>
    window.matchMedia("(max-width: 767px)").matches ? "list" : "table",
  );
  const [lens, setLens] = useState<Lens>("category");
  const [preview, setPreview] = useState<string | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const reduce = useReducedMotion();
  const records = new Map((data ?? []).map((e) => [e.symbol, e]));
  const matches = (e: (typeof STATIC_ELEMENTS)[number]) =>
    (category === "all" || e.category === category) &&
    (!query.trim() ||
      fold(
        `${e.symbol} ${e.name} ${e.atomicNumber} ${records.get(e.symbol)?.names.en ?? ""}`,
      ).includes(fold(query.trim())));
  const count = STATIC_ELEMENTS.filter(matches).length;

  function navigate(
    event: KeyboardEvent<HTMLButtonElement>,
    el: (typeof STATIC_ELEMENTS)[number],
  ) {
    const h =
      event.key === "ArrowLeft" ? -1 : event.key === "ArrowRight" ? 1 : 0;
    const v = event.key === "ArrowUp" ? -1 : event.key === "ArrowDown" ? 1 : 0;
    if (event.key === "Enter") {
      event.preventDefault();
      window.location.assign(`/element/${el.symbol.toLowerCase()}`);
      return;
    }
    if (!h && !v) return;
    event.preventDefault();
    const candidates = STATIC_ELEMENTS.filter(
      (e) =>
        matches(e) &&
        (view === "list"
          ? (e.atomicNumber - el.atomicNumber) * (h || v) > 0
          : h
            ? e.row === el.row && (e.col - el.col) * h > 0
            : e.col === el.col && (e.row - el.row) * v > 0),
    );
    candidates.sort((a, b) =>
      view === "list"
        ? Math.abs(a.atomicNumber - el.atomicNumber) -
          Math.abs(b.atomicNumber - el.atomicNumber)
        : h
          ? Math.abs(a.col - el.col) - Math.abs(b.col - el.col)
          : Math.abs(a.row - el.row) - Math.abs(b.row - el.row),
    );
    if (candidates[0])
      gridRef.current
        ?.querySelector<HTMLButtonElement>(
          `[data-symbol="${candidates[0].symbol}"]`,
        )
        ?.focus();
  }

  function appearance(e: (typeof STATIC_ELEMENTS)[number]) {
    const r = records.get(e.symbol);
    let color = categorySwatches[e.category],
      value = formatScience(r?.atomic_properties.atomic_mass),
      missing = false;
    if (lens === "mass" || lens === "electronegativity") {
      const number =
        lens === "mass"
          ? r?.atomic_properties.atomic_mass
          : r?.atomic_properties.electronegativity.pauling;
      missing = number == null;
      value = formatScience(number);
      const stops = ["#3d6a78", "#2d6a4f", "#c45c1a", "#c41e3a"];
      const t = Math.min(1, (number ?? 0) / (lens === "mass" ? 300 : 4));
      color = missing ? "#8a9199" : stops[Math.min(3, Math.floor(t * 4))];
    } else if (lens === "phase") {
      const phase = r?.thermodynamic_properties.standard_state ?? "unknown";
      color =
        (
          { solid: "#2d6a4f", liquid: "#1d5fa8", gas: "#c45c1a" } as Record<
            string,
            string
          >
        )[phase] ?? "#8a9199";
      value = phaseLabels[phase] ?? "Bilinmiyor";
      missing = phase === "unknown";
    }
    return { color, value, missing, ink: tileInk(color) };
  }

  const previewStrip = (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={selected}
        className="museum-preview-swap"
        initial={reduce ? false : { opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={reduce ? undefined : { opacity: 0, y: -4 }}
        transition={{ duration: reduce ? 0 : 0.22, ease: [0.22, 1, 0.36, 1] }}
      >
        <ElementPreview symbol={selected} compact />
      </motion.div>
    </AnimatePresence>
  );

  return (
    <main className="science-home museum-chart" data-light-lab="v2">
      <Seo
        title="Periyodik tablo · ElementAPI"
        description="118 element. PubChem, RSC ve NIST kaynaklı Türkçe kayıtlar."
        path="/periodic"
      />
      <header className="museum-mast">
        <div>
          <p className="museum-mast-meta">118 hücre · kaynaklı atlas</p>
          <h1>Periyodik tablo</h1>
          <p>Bir elemente dokun; kütle, hâl ve kaynaklı özeti gör.</p>
        </div>
        <Link to="/lab" className="museum-mast-cta">
          Laboratuvar <ArrowUpRight size={15} />
        </Link>
      </header>

      <Tabs
        className="explorer museum-explorer"
        aria-label="Element keşfi"
        value={view}
        onValueChange={(v) => setView(v as "table" | "list")}
      >
        <div className="museum-tools">
          <label className="museum-search">
            <span className="sr-only">Element ara</span>
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              type="search"
              placeholder="Ad, sembol veya atom numarası…"
            />
          </label>
          <span className="museum-count" role="status">
            {count} / 118
          </span>
          <TabsList aria-label="Görünüm" className="museum-view-tabs">
            <TabsTrigger value="table">Tablo</TabsTrigger>
            <TabsTrigger value="list">Kartlar</TabsTrigger>
          </TabsList>
          <div className="museum-lenses" role="group" aria-label="Renk lensi">
            {(
              [
                ["category", "Aileler"],
                ["mass", "Atom kütlesi"],
                ["electronegativity", "Elektronegatiflik"],
                ["phase", "Fiziksel hâl"],
              ] as [Lens, string][]
            ).map(([id, label]) => (
              <Button
                variant="plain"
                size="none"
                key={id}
                aria-pressed={lens === id}
                onClick={() => setLens(id)}
              >
                {label}
              </Button>
            ))}
            {lens !== "category" && (
              <small>
                {lens === "mass"
                  ? "u · 4 basamak"
                  : lens === "electronegativity"
                    ? "Pauling · 4 basamak"
                    : "Standart hâl"}{" "}
                · Taralı: veri yok
              </small>
            )}
          </div>
        </div>

        {error && (
          <p className="science-notice" role="status">
            Temel tablo gösteriliyor. Ayrıntılı verilere ulaşılamıyor.{" "}
            <Button variant="plain" size="none" onClick={retry}>
              Yeniden dene
            </Button>
          </p>
        )}
        {count === 0 && (
          <div className="explorer-empty" role="status">
            <p>
              {query.trim() ? (
                <>
                  <strong>“{query.trim()}”</strong> tabloyla eşleşmedi. Sembol
                  (Fe), Türkçe ad (Demir) ya da atom numarası (26) dene.
                </>
              ) : (
                "Bu kategori filtresiyle eşleşen element yok."
              )}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setCategory("all");
                setQuery("");
              }}
            >
              Filtreyi temizle
            </Button>
          </div>
        )}

        <div className="museum-stage">
          <aside
            className="museum-aside"
            aria-label="Seçili element önizlemesi"
            style={
              {
                "--element-color":
                  categorySwatches[
                    STATIC_ELEMENTS.find((e) => e.symbol === selected)
                      ?.category ?? "transition"
                  ],
              } as CSSProperties
            }
          >
            {previewStrip}
          </aside>

          <TabsContent
            value={view}
            className={
              view === "table" ? "museum-scroll" : "explorer-list-wrap"
            }
            tabIndex={view === "table" ? 0 : undefined}
            aria-label={
              view === "table"
                ? "Periyodik tablo; dar ekranlarda yatay kaydırın"
                : "Element kartları"
            }
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={view}
                initial={reduce ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{
                  duration: reduce ? 0 : 0.24,
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
                <div className={view === "table" ? "museum-plinth" : undefined}>
                  <div
                    className={
                      view === "table" ? "museum-grid" : "atlas-element-grid"
                    }
                    data-lens={lens}
                    ref={gridRef}
                  >
                    {view === "table" && (
                      <>
                        {Array.from({ length: 18 }, (_, i) => (
                          <span
                            className="museum-group"
                            style={{ gridColumn: i + 1, gridRow: 1 }}
                            key={i}
                          >
                            {i + 1}
                          </span>
                        ))}
                        <span
                          className="museum-series"
                          style={{ gridRow: 7, gridColumn: 3 }}
                        >
                          57–71<small>Lantanitler</small>
                        </span>
                        <span
                          className="museum-series"
                          style={{ gridRow: 8, gridColumn: 3 }}
                        >
                          89–103<small>Aktinitler</small>
                        </span>
                        <span
                          className="museum-series-label"
                          style={{ gridRow: 10, gridColumn: "1 / 3" }}
                        >
                          Lantanitler <ArrowRight size={13} />
                        </span>
                        <span
                          className="museum-series-label"
                          style={{ gridRow: 11, gridColumn: "1 / 3" }}
                        >
                          Aktinitler <ArrowRight size={13} />
                        </span>
                      </>
                    )}
                    {STATIC_ELEMENTS.map((el) => {
                      const match = matches(el);
                      if (view === "list" && !match) return null;
                      const a = appearance(el);
                      const tile = (
                        <Button
                          variant="plain"
                          size="none"
                          key={el.symbol}
                          data-symbol={el.symbol}
                          className={`science-tile museum-tile gap-0 ${match ? "" : "is-dimmed"} ${selected === el.symbol ? "is-selected" : ""} ${a.missing ? "has-missing-value" : ""}`}
                          style={
                            {
                              gridColumn: view === "table" ? el.col : undefined,
                              gridRow:
                                view === "table"
                                  ? tableGridRow(el.row)
                                  : undefined,
                              "--element-color": a.color,
                              "--tile-ink": a.ink,
                              "--stagger": Math.min(el.atomicNumber, 48),
                            } as CSSProperties
                          }
                          aria-label={`${el.name}, ${el.symbol}, atom numarası ${el.atomicNumber}; önizle`}
                          onFocus={() => setSelected(el.symbol)}
                          onPointerEnter={(e) => {
                            if (e.pointerType === "mouse")
                              setSelected(el.symbol);
                          }}
                          onKeyDown={(e) => navigate(e, el)}
                          onClick={(e) => {
                            returnFocus.current = e.currentTarget;
                            setSelected(el.symbol);
                            setPreview(el.symbol);
                          }}
                        >
                          <i className="museum-tile-band" aria-hidden />
                          <small>{el.atomicNumber}</small>
                          <strong>{el.symbol}</strong>
                          <span>{el.name}</span>
                          <em>{a.value}</em>
                          {view === "list" && <ArrowUpRight size={14} />}
                        </Button>
                      );
                      return view === "list" ? (
                        <motion.div
                          key={el.symbol}
                          initial={reduce ? false : { opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{
                            duration: reduce ? 0 : 0.22,
                            delay: reduce
                              ? 0
                              : Math.min(el.atomicNumber, 36) * 0.012,
                            ease: [0.22, 1, 0.36, 1],
                          }}
                        >
                          {tile}
                        </motion.div>
                      ) : (
                        tile
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </TabsContent>
        </div>

        <div className="museum-legend" aria-label="Element kategorileri">
          {Object.entries(categoryLabels).map(([key, label]) => (
            <Button
              variant="plain"
              size="none"
              key={key}
              aria-pressed={category === key}
              onClick={() => setCategory(category === key ? "all" : key)}
            >
              <i style={{ background: categorySwatches[key] }} />
              {label}
            </Button>
          ))}
          {(category !== "all" || query) && (
            <Button
              variant="plain"
              size="none"
              className="clear-filter"
              onClick={() => {
                setCategory("all");
                setQuery("");
              }}
            >
              <X size={13} /> Temizle
            </Button>
          )}
        </div>

        <p className="museum-footnote">
          <span>
            <Atom size={13} /> PubChem · RSC · NIST
          </span>
          <span className="desktop-hint">Ok tuşları · Enter ile kayıt</span>
          <span className="mobile-hint">Dokunarak önizle</span>
        </p>
      </Tabs>

      <Dialog
        open={!!preview}
        onOpenChange={(open) => {
          if (!open) setPreview(null);
        }}
      >
        <DialogContent
          closeLabel="Önizlemeyi kapat"
          className="sm:max-w-3xl museum-preview-dialog"
          onCloseAutoFocus={(e) => {
            e.preventDefault();
            returnFocus.current?.focus();
          }}
        >
          <DialogTitle className="museum-preview-dialog-kicker">
            Element önizlemesi
          </DialogTitle>
          <DialogDescription className="museum-preview-dialog-lead">
            Kütle, faz ve kaynaklı özet.
          </DialogDescription>
          {preview && (
            <motion.div
              className="museum-preview-dialog-body"
              initial={reduce ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: reduce ? 0 : 0.28 }}
            >
              <ElementPreview symbol={preview} />
            </motion.div>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}
