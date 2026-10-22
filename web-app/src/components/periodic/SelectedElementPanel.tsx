import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { categoryLabels, familyColor, familyOf, type ElementItem } from "@/services/elementData";
import { formatScience, useScience, type ScientificElement } from "@/services/science";
import { ElementSpecimen } from "./ElementSpecimen";
import { phaseLabel } from "./lenses";

interface SelectedElementPanelProps {
  element: ElementItem;
  className?: string;
}

/**
 * Preview of the selected (hovered or focused) element, drawn in the empty block above the
 * transition metals: specimen cell, names, family, three key facts and a link to the full record.
 */
export function SelectedElementPanel({ element, className }: SelectedElementPanelProps) {
  const { data: record, error, retry } = useScience<ScientificElement>(
    "elements",
    element.symbol.toLowerCase(),
  );
  const atomicMass = record?.atomic_properties.atomic_mass;
  const group = record?.classification.group;

  return (
    <aside
      aria-label="Seçili element önizlemesi"
      style={{ "--family": familyColor(familyOf(element.category)) }}
      className={cn(
        "flex gap-4 overflow-hidden rounded-xl border border-line bg-canvas-2 p-3 shadow-sm contain-size",
        className,
      )}
    >
      <ElementSpecimen
        element={element}
        mass={record && formatScience(atomicMass)}
        className="h-full shrink-0"
      />
      <motion.div
        key={element.symbol}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.15 }}
        className="flex min-w-0 flex-1 flex-col py-0.5"
      >
        <div className="flex items-baseline gap-3">
          <h2 className="min-w-0 truncate font-sans text-lg leading-tight font-semibold tracking-tight">
            {record?.names.tr ?? element.name}
          </h2>
          <span className="min-w-0 truncate text-[13px] text-ink-3">
            {record?.names.en}
          </span>
          <Link
            to={`/element/${element.symbol.toLowerCase()}`}
            className="focus-ring ml-auto inline-flex shrink-0 items-center gap-1 rounded-sm text-[13px] font-medium text-brand-ink transition-colors hover:text-ink"
          >
            Tam kayıt
            <ArrowRight aria-hidden="true" className="size-3.5" strokeWidth={1.75} />
          </Link>
        </div>
        <p className="mt-1 flex items-center gap-2 truncate text-[13px] text-ink-3">
          <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-(--family)" />
          {categoryLabels[element.category]} · Periyot {element.period}
          {group ? ` · Grup ${group}` : ""}
        </p>

        {error && !record ? (
          <p className="mt-auto text-[13px] leading-5 text-ink-2">
            Ayrıntı yüklenemedi. Temel tabloyu kullanmaya devam edebilirsin.{" "}
            <button type="button" onClick={retry} className="focus-ring rounded-sm text-link">
              Yeniden dene
            </button>
          </p>
        ) : (
          <>
            <dl className="mt-auto grid grid-cols-3 gap-3 pt-2">
              <Fact label="Atom kütlesi" loading={!record}>
                {formatScience(atomicMass, "u")}
              </Fact>
              <Fact label="Hâl" loading={!record}>
                {phaseLabel(record?.thermodynamic_properties.standard_state)}
              </Fact>
              <Fact label="Elektronegatiflik" loading={!record}>
                {formatScience(record?.atomic_properties.electronegativity.pauling)}
              </Fact>
            </dl>
            {record ? (
              <p className="mt-2.5 hidden text-[13px] leading-5 text-ink-2 xl:line-clamp-2">
                {record.editorial.summary}
              </p>
            ) : (
              <Skeleton className="mt-3 hidden h-3.5 w-11/12 xl:block" />
            )}
          </>
        )}
      </motion.div>
    </aside>
  );
}

/** One label/value pair of the panel; a skeleton stands in for the value while loading. */
function Fact({ label, loading, children }: { label: string; loading: boolean; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="truncate text-[11px] leading-4 text-ink-3">{label}</dt>
      <dd className="mt-1 truncate font-mono text-[15px] leading-5 text-ink tabular">
        {loading ? <Skeleton className="mt-0.5 h-4 w-14" /> : children}
      </dd>
    </div>
  );
}
