import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { Formula } from "@/components/ui/formula";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { CompoundGroup } from "../services/chemistry";
import { formatScience, type ScientificCompound } from "../services/science";
import {
  measureStructure,
  type StructureFit,
} from "./reference/structure-fit";

/** Family hue that tints the formula plate of each catalogue group. */
const GROUP_HUE: Record<CompoundGroup, string> = {
  gunluk: "var(--color-family-nonmetal)",
  organik: "var(--color-family-alkaline)",
  tuz: "var(--color-family-transition)",
  oksit: "var(--color-family-alkali)",
  asit: "var(--color-family-metalloid)",
  malzeme: "var(--color-family-post)",
  cevre: "var(--color-family-halogen)",
};

const NEUTRAL_HUE = "var(--color-family-unknown)";

interface CompoundCardProps {
  compound: ScientificCompound;
  /** First catalogue group; tints the formula plate shown when there is no structure image. */
  group?: CompoundGroup;
  /** Media is still loading: the plate shows a skeleton instead of the formula fallback. */
  mediaPending?: boolean;
}

interface PlateProps {
  formula: string;
  structureUrl?: string;
  hue: string;
  mediaPending: boolean;
}

/** Top of the card: PubChem structure on a light plate, or the formula on a group-tinted plate. */
function CompoundPlate({ formula, structureUrl, hue, mediaPending }: PlateProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const [fit, setFit] = useState<StructureFit | null>(null);

  if (mediaPending) return <Skeleton className="aspect-[4/3] rounded-lg" />;

  if (structureUrl && !imageFailed)
    return (
      <div
        className={cn(
          "relative aspect-[4/3] overflow-hidden rounded-lg transition-colors duration-300",
          fit ? "bg-ink" : "animate-pulse bg-surface-2",
        )}
      >
        {/* Square image as wide as the plate, centred; darken blending hides its off-white canvas. */}
        <img
          src={structureUrl}
          alt=""
          loading="lazy"
          decoding="async"
          onLoad={(event) => setFit(measureStructure(event.currentTarget))}
          onError={() => setImageFailed(true)}
          style={{
            "--fit-scale": fit?.scale ?? 1,
            "--fit-x": `${fit?.x ?? 0}%`,
            "--fit-y": `${fit?.y ?? 0}%`,
          }}
          className={cn(
            "absolute inset-x-0 top-1/2 -mt-[50%] aspect-square w-full mix-blend-darken transition-opacity duration-300 [transform:translate(var(--fit-x),var(--fit-y))_scale(var(--fit-scale))]",
            fit ? "opacity-100" : "opacity-0",
          )}
        />
      </div>
    );

  return (
    <div
      style={{ "--tint": hue }}
      className="grid aspect-[4/3] place-items-center rounded-lg border border-line bg-[color-mix(in_oklch,var(--tint)_14%,var(--color-surface-2))] transition-colors group-hover:bg-[color-mix(in_oklch,var(--tint)_22%,var(--color-surface-2))]"
    >
      <Formula value={formula} className="px-3 text-2xl text-ink" />
    </div>
  );
}

/**
 * Catalogue card for one compound: structure (or formula) plate, formula, Turkish name,
 * short summary and molar mass. The whole card links to `/compound/{slug}`.
 */
export default function CompoundCard({
  compound,
  group,
  mediaPending = false,
}: CompoundCardProps) {
  const formula =
    compound.display_formula ?? compound.molecular_properties.molecular_formula;

  return (
    <Link
      to={`/compound/${compound.slug}`}
      aria-label={`${compound.names.tr} (${formula})`}
      className="focus-ring group flex h-full flex-col rounded-xl border border-line bg-surface p-1.5 shadow-xs transition-[background-color,border-color,transform] duration-200 hover:border-line-strong hover:bg-surface-2 active:scale-[0.99]"
    >
      <CompoundPlate
        formula={formula}
        structureUrl={compound.media?.structure?.url}
        hue={group ? GROUP_HUE[group] : NEUTRAL_HUE}
        mediaPending={mediaPending}
      />
      <div className="flex flex-1 flex-col px-2.5 pt-3.5 pb-2.5">
        <Formula
          value={formula}
          className="block truncate text-lg leading-tight text-ink"
        />
        <h2 className="mt-1.5 font-sans text-[15px] leading-snug font-semibold tracking-normal text-ink">
          {compound.names.tr}
        </h2>
        <p className="mt-1.5 line-clamp-2 text-[13px] leading-5 text-ink-2">
          {compound.editorial?.summary ?? compound.names.en}
        </p>
        <div className="mt-auto flex items-center justify-between gap-2 pt-4">
          <span className="font-mono text-xs text-ink-3 tabular">
            {formatScience(
              compound.molecular_properties.molecular_weight_g_mol,
              "g/mol",
            )}
          </span>
          <ArrowUpRight
            aria-hidden="true"
            strokeWidth={1.75}
            className="size-4 text-ink-3 transition-[color,transform] duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-ink"
          />
        </div>
      </div>
    </Link>
  );
}
