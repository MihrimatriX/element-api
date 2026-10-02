import { useState, type ReactNode } from "react";
import { Atom, Image as ImageIcon, Shapes, Sigma } from "lucide-react";
import { ExternalLink } from "@/components/ui/external-link";
import { Segmented, type SegmentOption } from "@/components/ui/segmented";
import { cn } from "@/lib/utils";
import type { AtlasMedia } from "../services/science";

const BEATS = {
  water: ["H₂", "+", "O", "→", "H₂O"],
  salt: ["Na", "+", "Cl", "→", "NaCl"],
  rust: ["Fe", "+", "O₂", "→", "pas"],
  quartz: ["Si", "+", "O₂", "→", "SiO₂"],
} as const;

/** Reaction shown by `WorkshopMarks`. */
export type WorkshopBeat = keyof typeof BEATS;

const OPERATORS = new Set(["+", "→"]);

/** Decorative "A + B → AB" chip row that illustrates a page about building compounds. */
export function WorkshopMarks({
  beat = "water",
  className,
}: {
  beat?: WorkshopBeat;
  className?: string;
}) {
  return (
    <div aria-hidden="true" className={cn("flex flex-wrap items-center gap-2", className)}>
      {BEATS[beat].map((text, index) =>
        OPERATORS.has(text) ? (
          <span key={index} className="font-mono text-sm text-ink-3">
            {text}
          </span>
        ) : (
          <span
            key={index}
            className="rounded-sm border border-line-strong bg-surface-2 px-2 py-0.5 font-mono text-[13px] text-ink"
          >
            {text}
          </span>
        ),
      )}
    </div>
  );
}

/**
 * Bohr-style electron shell schematic: nucleus with the symbol and one orbit per
 * shell with its electrons spaced evenly. Not to scale; the label reads the counts.
 */
export function AtomShell({
  symbol,
  shells = [],
  className,
}: {
  symbol: string;
  shells?: number[];
  className?: string;
}) {
  const orbitStep = 58 / Math.max(1, shells.length - 1);
  return (
    <svg
      viewBox="0 0 220 220"
      role="img"
      aria-label={`${symbol}, şematik elektron kabukları: ${shells.join(", ") || "veri yok"}`}
      className={cn("size-full", className)}
    >
      {shells.map((electrons, shell) => {
        const radius = 38 + shell * orbitStep;
        return (
          <g key={shell}>
            <circle cx="110" cy="110" r={radius} fill="none" strokeWidth="1" className="stroke-line-strong" />
            {Array.from({ length: electrons }, (_, index) => {
              const angle = (index / electrons) * Math.PI * 2 + shell * 0.4;
              return (
                <circle
                  key={index}
                  cx={110 + radius * Math.cos(angle)}
                  cy={110 + radius * Math.sin(angle)}
                  r={electrons > 20 ? 2 : 2.8}
                  className="fill-brand-ink"
                />
              );
            })}
          </g>
        );
      })}
      <circle cx="110" cy="110" r="24" strokeWidth="1" className="fill-surface-3 stroke-brand-line" />
      <text
        x="110"
        y="110"
        textAnchor="middle"
        dominantBaseline="central"
        className="fill-ink font-mono text-[17px] font-semibold"
      >
        {symbol}
      </text>
    </svg>
  );
}

type View = "photo" | "structure" | "schematic";

/** Photo or structure image; on a load error shows the schematic with a short note instead. */
function MediaImage({
  media,
  plate,
  eager,
  fallback,
}: {
  media: AtlasMedia;
  plate: boolean;
  /** Above the fold (detail hero): load right away instead of lazily. */
  eager: boolean;
  fallback: ReactNode;
}) {
  const [failed, setFailed] = useState(false);
  if (failed)
    return (
      <div className="relative size-full bg-canvas-2">
        {fallback}
        <p className="absolute inset-x-0 bottom-3 text-center text-[13px] text-ink-3">
          Görsel yüklenemedi. Şematik gösterim.
        </p>
      </div>
    );
  return (
    <img
      src={media.url}
      alt={media.caption}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      onError={() => setFailed(true)}
      className={cn(
        "size-full",
        // PubChem depictions are dark-on-white: a light plate keeps them readable.
        plate ? "object-contain p-3 mix-blend-darken" : "object-cover",
      )}
    />
  );
}

function Credits({ media }: { media: AtlasMedia }) {
  return (
    <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[13px] text-ink-3">
      <ExternalLink variant="plain" href={media.source_url} className="transition-colors hover:text-ink">
        {media.creator || "Görsel kaynağı"}
      </ExternalLink>
      {media.license_url ? (
        <ExternalLink variant="plain" href={media.license_url} className="transition-colors hover:text-ink">
          {media.license}
        </ExternalLink>
      ) : (
        <span>{media.license}</span>
      )}
    </p>
  );
}

/**
 * Media figure for an element or compound: a licensed photo, a PubChem structure
 * (on a light plate) or a schematic (electron shells for elements, the formula for
 * compounds), with a view switch and caption with credit and licence.
 * `compact` drops the switch and uses tighter type, for previews and lab results.
 */
export default function AtlasVisual({
  symbol,
  formula,
  shells,
  photo,
  structure,
  compact = false,
  className,
}: {
  symbol?: string;
  formula?: string;
  shells?: number[];
  photo?: AtlasMedia | null;
  structure?: AtlasMedia | null;
  compact?: boolean;
  className?: string;
}) {
  const views: SegmentOption<View>[] = [];
  if (photo) views.push({ value: "photo", label: "Fotoğraf", icon: ImageIcon });
  if (structure) views.push({ value: "structure", label: "Yapı", icon: Shapes });
  if (symbol || !structure)
    views.push({ value: "schematic", label: symbol ? "Atom şeması" : "Formül", icon: symbol ? Atom : Sigma });

  const [chosen, setChosen] = useState<View>(views[0].value);
  const view = views.some((option) => option.value === chosen) ? chosen : views[0].value;
  const media = { photo, structure, schematic: null }[view] ?? null;

  const schematic = symbol ? (
    <AtomShell symbol={symbol} shells={shells} className="p-4" />
  ) : (
    <div className="grid size-full place-content-center gap-2 text-center">
      <span className={cn("font-mono font-semibold text-ink", compact ? "text-3xl" : "text-5xl")}>
        {formula}
      </span>
      <span className="text-[13px] text-ink-3">Formül gösterimi</span>
    </div>
  );

  return (
    <figure className={cn("min-w-0", className)}>
      <div
        className={cn(
          "relative aspect-[5/4] overflow-hidden border border-line bg-canvas-2 shadow-md",
          compact ? "rounded-xl" : "rounded-2xl",
          view === "structure" && "bg-ink/95",
        )}
      >
        {media ? (
          <MediaImage
            key={media.url}
            media={media}
            plate={view === "structure"}
            eager={!compact}
            fallback={schematic}
          />
        ) : (
          schematic
        )}
      </div>
      {!compact && views.length > 1 && (
        <Segmented
          label="Görsel türü"
          size="sm"
          options={views}
          value={view}
          onValueChange={setChosen}
          className="mt-3"
        />
      )}
      <figcaption className={cn(compact ? "mt-2" : "mt-3")}>
        {media ? (
          <>
            <p className="text-[13px] leading-5 text-ink-2">{media.caption}</p>
            {(!compact || view === "photo") && <Credits media={media} />}
          </>
        ) : (
          <p className="text-[13px] text-ink-3">
            {symbol ? "Şematik kabuk modeli · ölçekli değildir" : "Doğrulanmış yapı görseli bulunmuyor"}
          </p>
        )}
      </figcaption>
    </figure>
  );
}
