import { useState, type ReactNode } from "react";
import { Atom, Image as ImageIcon, Shapes, Sigma } from "lucide-react";
import { ExternalLink } from "@/components/ui/external-link";
import { Segmented, type SegmentOption } from "@/components/ui/segmented";
import { cn } from "@/lib/utils";
import type { AtlasMedia } from "../services/science";
import { ShellDiagram } from "./periodic/ShellDiagram";
import { measureStructure, type Plate, type StructureFit } from "./reference/structure-fit";

type View = "photo" | "structure" | "schematic";

/** The structure image is a square as tall as the frame: fill 80 % of it, never shrink a drawing. */
const STRUCTURE_PLATE: Plate = { ratio: 1, fill: 0.8, minScale: 1 };

/** Photo or structure image; on a load error shows the schematic with a short note instead. */
function MediaImage({
  media,
  plate,
  eager,
  fallback,
}: {
  media: AtlasMedia;
  /** PubChem structure depiction: zoomed to the drawing and blended into the light plate. */
  plate: boolean;
  /** Above the fold (detail hero): load right away instead of lazily. */
  eager: boolean;
  fallback: ReactNode;
}) {
  const [failed, setFailed] = useState(false);
  // Undefined until a structure is measured, so it never paints as a speck first.
  const [fit, setFit] = useState<StructureFit>();
  if (failed)
    return (
      <div className="relative size-full bg-canvas-2">
        {fallback}
        <p className="absolute inset-x-0 bottom-3 text-center text-[13px] text-ink-3">
          Görsel yüklenemedi. Şematik gösterim.
        </p>
      </div>
    );
  if (!plate)
    return (
      <img
        src={media.url}
        alt={media.caption}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        onError={() => setFailed(true)}
        className="size-full object-cover"
      />
    );
  return (
    <img
      src={media.url}
      alt={media.caption}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      onLoad={(event) => setFit(measureStructure(event.currentTarget, STRUCTURE_PLATE))}
      onError={() => setFailed(true)}
      style={
        fit ? { "--fit-scale": fit.scale, "--fit-x": `${fit.x}%`, "--fit-y": `${fit.y}%` } : undefined
      }
      className={cn(
        // Dark-on-white depiction: darken melts its white square into the plate.
        "mx-auto aspect-square h-full object-contain mix-blend-darken transition-opacity duration-200",
        "[transform:translate(var(--fit-x,0%),var(--fit-y,0%))_scale(var(--fit-scale,1))]",
        fit === undefined && "opacity-0",
      )}
    />
  );
}

/** Author and licence links of a photo or drawing (both open in a new tab). */
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
 * `compact` drops the switch and uses tighter type, for lab results.
 * The shell schematic takes `--family` from an ancestor (the brand accent without one).
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
  shells?: readonly number[];
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

  // The viewer's pick while it is offered, else the first view (the photo once a late record has one).
  const [chosen, setChosen] = useState<View>();
  const view = views.find((option) => option.value === chosen)?.value ?? views[0].value;
  const media = { photo, structure, schematic: null }[view] ?? null;

  const schematic = symbol ? (
    <ShellDiagram symbol={symbol} shells={shells} className="size-full p-4" />
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
