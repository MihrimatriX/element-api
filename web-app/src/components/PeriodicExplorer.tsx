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
import {
  ArrowRight,
  ArrowUpRight,
  Atom,
  Braces,
  FlaskConical,
  Search,
  X,
} from "lucide-react";
import { categoryLabels, STATIC_ELEMENTS } from "../services/elementData";
import {
  formatScience,
  phaseLabels,
  useScience,
  type ScientificElement,
  type ScientificCompound,
} from "../services/science";
import Seo from "./Seo";
import AtlasVisual, { AtomShell } from "./AtlasVisual";
import CompoundCard from "./CompoundCard";

const colors: Record<string, string> = {
  alkali: "#fa6d77",
  alkaline: "#eac35a",
  transition: "#56c9dd",
  post: "#50adb8",
  metalloid: "#ac91e8",
  nonmetal: "#e5a0db",
  halogen: "#94bfee",
  noble: "#eccb68",
  lanthanide: "#65caae",
  actinide: "#81d3d3",
};
const fold = (s: string) =>
  s
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
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
        <p className="science-eyebrow">
          ELEMENTE YAKINDAN BAK · {seed.atomicNumber}
        </p>
        <h2>
          {e?.names.tr ?? seed.name} <span>{symbol}</span>
        </h2>
        <p>
          {e?.editorial?.summary ??
            (error
              ? "Ayrıntı yüklenemedi. Temel tabloyu keşfetmeye devam edebilirsin."
              : "Bilimsel kayıt yükleniyor…")}
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
          Elementi keşfet <ArrowUpRight size={15} />
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
function EverydayCompounds() {
  const { data } = useScience<ScientificCompound[]>("compounds");
  const chosen = ["h2o", "nacl", "sio2", "caco3"];
  return (
    <section className="everyday">
      <header>
        <div>
          <p className="science-eyebrow">BİLEŞİK KÜTÜPHANESİ</p>
          <h2>Günlük hayattan dört bileşik</h2>
        </div>
        <Link to="/compounds" className="science-text-link">
          Bütün bileşikler <ArrowRight size={16} />
        </Link>
      </header>
      <div className="everyday-grid">
        {chosen
          .map((id) => data?.find((c) => c.slug === id))
          .filter((c): c is ScientificCompound => Boolean(c))
          .map((c) => (
            <CompoundCard key={c.slug} compound={c} />
          ))}
      </div>
    </section>
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
    let color = colors[e.category],
      value = formatScience(r?.atomic_properties.atomic_mass),
      missing = false;
    if (lens === "mass" || lens === "electronegativity") {
      const number =
        lens === "mass"
          ? r?.atomic_properties.atomic_mass
          : r?.atomic_properties.electronegativity.pauling;
      missing = number == null;
      value = formatScience(number);
      color = missing
        ? "#aeb8c8"
        : `hsl(${215 - ((number ?? 0) / (lens === "mass" ? 300 : 4)) * 75} 58% 64%)`;
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
          home
            ? "ElementAPI · Maddenin alfabesi"
            : "Periyodik tablo · ElementAPI"
        }
        description="118 elementi görselleri, atom şemaları ve kaynaklı bilimsel verileriyle keşfet. Bileşikleri tanı, laboratuvarda yeni bağlantılar bul."
        path={home ? "/" : "/periodic"}
      />
      <section className="explorer-heading">
        <div>
          <p className="science-eyebrow">PERİYODİK TABLO</p>
          <h1>Element atlası</h1>
          <p>
            118 element. Özelliklerini karşılaştır, kaynaklarını incele,
            aralarındaki bağlantıları keşfet.
          </p>
        </div>
        <Button asChild size="sm">
          <Link to="/lab?lesson=everyday">
            <FlaskConical size={16} /> İlk keşfini yap <ArrowRight size={15} />
          </Link>
        </Button>
      </section>
      <Tabs
        className="explorer"
        aria-label="Element keşfi"
        value={view}
        onValueChange={(v) => setView(v as "table" | "list")}
      >
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
                ? "u · açık maviden yeşile artar"
                : lens === "electronegativity"
                  ? "Pauling · açık maviden yeşile artar"
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
              <i style={{ background: colors[key] }} />
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
        {error && (
          <p className="science-notice" role="status">
            Temel tablo gösteriliyor. Ayrıntılı verilere ulaşılamıyor.{" "}
            <Button variant="plain" size="none" onClick={retry}>
              Yeniden dene
            </Button>
          </p>
        )}
        {count === 0 && (
          <p className="science-notice" role="status">
            Eşleşen element yok. Farklı bir ad veya kategori deneyin.
          </p>
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
                <div className="explorer-inset">
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
              return (
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
            })}
          </div>
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
      {home && (
        <>
          <EverydayCompounds />
          <section className="atlas-api-note">
            <Braces />
            <div>
              <h2>Açık bilimsel API</h2>
              <p>
                Kaynaklı bilimsel veriye açık API ile ulaş; yalnız ihtiyacın
                olan alanları al.
              </p>
            </div>
            <Link to="/docs" className="science-text-link">
              API’yi incele <ArrowUpRight size={16} />
            </Link>
          </section>
        </>
      )}
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
          <DialogDescription>
            Özelliklerini incelemek için bilimsel kaydı aç.
          </DialogDescription>
          {preview && <ElementPreview symbol={preview} />}
        </DialogContent>
      </Dialog>
    </main>
  );
}
