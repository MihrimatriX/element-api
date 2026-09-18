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
import { ArrowRight, ArrowUpRight, Atom, BookOpenText, FlaskConical, Search, X } from "lucide-react";
import {
  categoryLabels,
  categorySwatches,
  STATIC_ELEMENTS,
} from "../services/elementData";
import { formulaText, knownCompounds } from "../services/chemistry";
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
// ponytail: deterministic daily pick, no API or storage. Same record all day, new one tomorrow.
const dayIndex = (n: number) => {
  const now = new Date();
  return (
    Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 864e5) % n
  );
};
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
  const seed = STATIC_ELEMENTS.find((e) => e.symbol === symbol)!;
  return (
    <div className={`atlas-preview ${compact ? "is-inset" : ""}`}>
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
      {compact && e?.media?.photo && (
        <div className="preview-atom">
          <AtomShell
            symbol={symbol}
            shells={e.atomic_properties.electrons_per_shell}
          />
          <small>Elektron kabukları · şematik</small>
        </div>
      )}
    </div>
  );
}
export default function PeriodicExplorer({ home = false }: { home?: boolean }) {
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
      const stops = ["#56c9dd", "#65caae", "#eac35a", "#fa6d77"];
      const t = Math.min(1, (number ?? 0) / (lens === "mass" ? 300 : 4));
      color = missing ? "#aeb8c8" : stops[Math.min(3, Math.floor(t * 4))];
    } else if (lens === "phase") {
      const phase = r?.thermodynamic_properties.standard_state ?? "unknown";
      color =
        (
          { solid: "#83b6c6", liquid: "#bb9fe3", gas: "#e9b477" } as Record<
            string,
            string
          >
        )[phase] ?? "#aeb8c8";
      value = phaseLabels[phase] ?? "Bilinmiyor";
      missing = phase === "unknown";
    }
    return { color, value, missing };
  }
  return (
    <main className="science-home atlas-home">
      <Seo
        title={
          home ? "ElementAPI · Periyodik tablo" : "Periyodik tablo · ElementAPI"
        }
        description="118 element. PubChem, RSC ve NIST kaynaklı Türkçe kayıtlar."
        path={home ? "/" : "/periodic"}
      />
      {home ? (
        <motion.section
          className="home-welcome"
          aria-label="Atlas tanıtımı"
          initial={reduce ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduce ? 0 : 0.28 }}
        >
          <div className="home-welcome-copy">
            <p className="kicker">ElementAPI Atlas · 118 element, 167 bileşik</p>
            <h1>
              Periyodik tablo, <span>ders kitabı değil tezgâh.</span>
            </h1>
            <p>
              Ara, renklendir, önizle, laboratuvarda kur. Kayıtlar PubChem, RSC
              ve NIST kaynaklı; Türkçe özetler editoryal, formüller denetlenir.
            </p>
            <div className="home-cta">
              <Button asChild>
                <Link to="/nasil">
                  <BookOpenText size={16} />
                  El kitabı: ilk 10 dakika
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/lab?lesson=everyday">
                  <FlaskConical size={16} />
                  Laboratuvar: iki H, bir O
                </Link>
              </Button>
            </div>
          </div>
          <aside className="home-daily" aria-label="Günün kayıtları">
            {(() => {
              const daily = STATIC_ELEMENTS[dayIndex(STATIC_ELEMENTS.length)];
              const record = records.get(daily.symbol);
              const compound = knownCompounds[dayIndex(knownCompounds.length)];
              return (
                <>
                  <Link
                    to={`/element/${daily.symbol.toLowerCase()}`}
                    className="daily-card"
                    style={
                      {
                        "--element-color": categorySwatches[daily.category],
                      } as CSSProperties
                    }
                  >
                    <span className="daily-kicker">
                      Günün elementi · No {daily.atomicNumber}
                    </span>
                    <strong>
                      <span className="daily-mark">{daily.symbol}</span>
                      {record?.names.tr ?? daily.name}
                    </strong>
                    <span className="daily-summary">
                      {record?.editorial?.summary ??
                        "Kaynağını aç, kütleyi ve hâli gör."}
                    </span>
                    <em>
                      {phaseLabels[
                        record?.thermodynamic_properties.standard_state ??
                          "unknown"
                      ] ?? "Bilinmiyor"}{" "}
                      · {formatScience(record?.atomic_properties.atomic_mass, "u")}
                    </em>
                  </Link>
                  <Link
                    to={`/compound/${compound.slug}`}
                    className="daily-card is-compound"
                  >
                    <span className="daily-kicker">Günün bileşiği</span>
                    <strong>
                      <span className="daily-mark is-formula">
                        {formulaText(compound.formula)}
                      </span>
                      {compound.nameTr}
                    </strong>
                    <span className="daily-summary">{compound.summary}</span>
                    <em>{compound.uses.slice(0, 2).join(" · ")}</em>
                  </Link>
                </>
              );
            })()}
          </aside>
        </motion.section>
      ) : (
        <h1 className="explorer-heading">Periyodik tablo</h1>
      )}
      <Tabs
        className="explorer"
        aria-label="Element keşfi"
        value={view}
        onValueChange={(v) => setView(v as "table" | "list")}
      >
        {home && (
          <h2 className="explorer-heading home-table-title">Tabloyu keşfet</h2>
        )}
        <div className="explorer-sticky">
        <div className="explorer-toolbar">
          <label className="explorer-search">
            <Search size={18} />
            <span className="sr-only">Element ara</span>
            <Input
              className="pl-9"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              type="search"
              placeholder="Ad, sembol veya atom numarası…"
            />
          </label>
          <span className="explorer-count" role="status">
            {count} / 118
          </span>
          <TabsList aria-label="Görünüm">
            <TabsTrigger value="table">Tablo</TabsTrigger>
            <TabsTrigger value="list">Kartlar</TabsTrigger>
          </TabsList>
          <Button asChild size="sm" className="explorer-play">
            <Link to="/lab?lesson=everyday">Laboratuvar</Link>
          </Button>
        </div>
        <div className="atlas-lenses">
          <span>Tabloyu renklendir</span>
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
                ? "u · 4 renk basamağı, kırmızı yüksek değer"
                : lens === "electronegativity"
                  ? "Pauling · 4 renk basamağı, kırmızı yüksek değer"
                  : "Kaynağın bildirdiği hâl"}{" "}
              · Taralı: veri yok
            </small>
          )}
        </div>
        <div className="explorer-legend" aria-label="Element kategorileri">
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
          <div className="home-empty" role="status">
            <p className="kicker">Sonuç yok</p>
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
        <TabsContent
          value={view}
          className={
            view === "table" ? "explorer-scroll" : "explorer-list-wrap"
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
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduce ? 0 : 0.2 }}
            >
          <div
            className={
              view === "table" ? "explorer-grid" : "atlas-element-grid"
            }
            ref={gridRef}
          >
            {view === "table" && (
              <>
                {Array.from({ length: 18 }, (_, i) => (
                  <span
                    className="explorer-group"
                    style={{ gridColumn: i + 1, gridRow: 1 }}
                    key={i}
                  >
                    {i + 1}
                  </span>
                ))}
                <div
                  className="explorer-inset"
                  style={
                    {
                      "--element-color": appearance(
                        STATIC_ELEMENTS.find((e) => e.symbol === selected) ??
                          STATIC_ELEMENTS[0],
                      ).color,
                    } as CSSProperties
                  }
                >
                  <ElementPreview symbol={selected} compact />
                </div>
                <span
                  className="explorer-series"
                  style={{ gridRow: 7, gridColumn: 3 }}
                >
                  57–71<small>Lantanitler</small>
                </span>
                <span
                  className="explorer-series"
                  style={{ gridRow: 8, gridColumn: 3 }}
                >
                  89–103<small>Aktinitler</small>
                </span>
                <span
                  className="explorer-series-label"
                  style={{ gridRow: 9, gridColumn: "1 / 3" }}
                >
                  Lantanitler <ArrowRight size={13} />
                </span>
                <span
                  className="explorer-series-label"
                  style={{ gridRow: 10, gridColumn: "1 / 3" }}
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
                  className={`science-tile gap-0 ${match ? "" : "is-dimmed"} ${selected === el.symbol ? "is-selected" : ""} ${a.missing ? "has-missing-value" : ""}`}
                  style={
                    {
                      gridColumn: view === "table" ? el.col : undefined,
                      gridRow: view === "table" ? el.row + 1 : undefined,
                      "--element-color": a.color,
                    } as CSSProperties
                  }
                  aria-label={`${el.name}, ${el.symbol}, atom numarası ${el.atomicNumber}; önizle`}
                  onFocus={() => setSelected(el.symbol)}
                  onPointerEnter={(e) => {
                    if (e.pointerType === "mouse") setSelected(el.symbol);
                  }}
                  onKeyDown={(e) => navigate(e, el)}
                  onClick={(e) => {
                    returnFocus.current = e.currentTarget;
                    setSelected(el.symbol);
                    setPreview(el.symbol);
                  }}
                >
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
                  initial={reduce ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: reduce ? 0 : 0.2 }}
                >
                  {tile}
                </motion.div>
              ) : (
                tile
              );
            })}
          </div>
            </motion.div>
          </AnimatePresence>
        </TabsContent>
        <div className="explorer-footnote">
          <span>
            <Atom size={14} /> Kaynaklar: PubChem, RSC, NIST
          </span>
          <span className="desktop-hint">
            Ok tuşlarıyla gezin · Enter ile ayrıntıyı açın
          </span>
          <span className="mobile-hint">
            Bir karta dokun, elementi yakından gör
          </span>
        </div>
      </Tabs>
      <Dialog
        open={!!preview}
        onOpenChange={(open) => {
          if (!open) setPreview(null);
        }}
      >
        <DialogContent
          closeLabel="Önizlemeyi kapat"
          className="sm:max-w-2xl"
          onCloseAutoFocus={(e) => {
            e.preventDefault();
            returnFocus.current?.focus();
          }}
        >
          <DialogTitle>Element önizlemesi</DialogTitle>
          <DialogDescription>Kütle, faz ve kaynaklı özet.</DialogDescription>
          {preview && (
            <motion.div
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
