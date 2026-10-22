import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import GeometryFigure from "../GeometryFigure";
import { compoundBySlug, geometryOf } from "../../services/chemistry";
import type { GlossaryTerm } from "./glossary-terms";

const water = compoundBySlug.h2o;

interface GlossaryEntryProps {
  term: GlossaryTerm;
  /** Short name of the term's group, shown as a badge. */
  groupLabel: string;
}

/**
 * One glossary row inside a `<dl>`: term with its specimen mark, then the definition,
 * an optional VSEPR figure and a link to try the idea in the product.
 */
export function GlossaryEntry({ term, groupLabel }: GlossaryEntryProps) {
  return (
    <div
      id={term.id}
      className="grid scroll-mt-18 gap-x-10 gap-y-3 py-6 md:grid-cols-[12rem_minmax(0,1fr)]"
    >
      <dt className="flex flex-wrap items-center gap-2.5 md:flex-col md:items-start">
        <span className="text-base font-semibold text-ink">{term.term}</span>
        <span
          aria-hidden="true"
          className="inline-flex h-6 items-center rounded-sm border border-line bg-surface-2 px-2 font-mono text-xs text-ink-2"
        >
          {term.mark}
        </span>
      </dt>
      <dd className="min-w-0">
        <p className="max-w-prose text-[15px] leading-7 text-ink-2">
          {term.definition}
        </p>
        {term.geometry && water && (
          <div className="mt-4 max-w-xs rounded-lg border border-line bg-surface p-4 text-ink-2">
            <GeometryFigure compact geometry={geometryOf(water)} />
          </div>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
          <Link
            to={term.link.to}
            className="text-link inline-flex items-center gap-1 text-sm font-medium"
          >
            {term.link.label}
            <ArrowRight aria-hidden="true" strokeWidth={1.75} className="size-3.5" />
          </Link>
          <Badge variant="secondary">{groupLabel}</Badge>
        </div>
      </dd>
    </div>
  );
}
