import { labElements } from "@/services/chemistry";
import { compoundBySlug } from "@/services/lab";
import type {
  AtlasFields,
  ScientificCompound,
  ScientificElement,
  ScientificRecord,
} from "@/services/science";

/** The record a detail page shows, typed by its kind. */
export type DetailSubject =
  | { kind: "elements"; element: ScientificElement }
  | { kind: "compounds"; compound: ScientificCompound };

/** Lab entry point for the record, or undefined when the lab does not know it. */
export function labHref(subject: DetailSubject): string | undefined {
  if (subject.kind === "elements")
    return labElements.includes(subject.element.symbol)
      ? `/lab?material=${encodeURIComponent(subject.element.symbol)}`
      : undefined;
  return compoundBySlug[subject.compound.slug]
    ? `/lab/formula?compound=${encodeURIComponent(subject.compound.slug)}`
    : undefined;
}

/** Saves the full record as `{id}.json` in the browser. */
export function downloadRecord(record: ScientificRecord): void {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(record, null, 2)], { type: "application/json" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = `${String(record.id)}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** One cited source. */
export interface SourceLink {
  name: string;
  url: string;
}

/** Data sources from provenance plus editorial sources, without duplicate URLs. */
export function recordSources(record: ScientificRecord, atlas: AtlasFields): SourceLink[] {
  const provenance = record.provenance as { sources?: SourceLink[] } | null;
  const all = [...(provenance?.sources ?? []), ...(atlas.editorial?.sources ?? [])];
  return all
    .filter(
      (source, index) =>
        source.url && all.findIndex((other) => other.url === source.url) === index,
    )
    .map(({ name, url }) => ({ name, url }));
}

/** "5 Eylül 2026" for an ISO date; null for anything else (the offline catalogue says "catalog"). */
export function formatRetrievedAt(value: unknown): string | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}/.test(value)) return null;
  return new Intl.DateTimeFormat("tr-TR", { dateStyle: "long", timeZone: "UTC" }).format(new Date(value));
}
