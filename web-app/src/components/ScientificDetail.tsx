import { useEffect } from "react";
import { useLocation, useParams } from "react-router-dom";
import Seo from "./Seo";
import { CompoundStructure } from "./detail/CompoundStructure";
import { DetailToc, type TocItem } from "./detail/DetailToc";
import { DeveloperPanel } from "./detail/DeveloperPanel";
import { propertySections } from "./detail/properties";
import { PropertySections } from "./detail/PropertySections";
import { downloadRecord, recordSources, type DetailSubject } from "./detail/record";
import { RecordHero } from "./detail/RecordHero";
import { RecordOverview } from "./detail/RecordOverview";
import { RecordSources } from "./detail/RecordSources";
import { RecordError, RecordNotFound, RecordSkeleton } from "./detail/RecordStates";
import { RelatedCompounds } from "./detail/RelatedCompounds";
import { formulaText, geometryOf } from "../services/chemistry";
import { compoundBySlug } from "../services/lab";
import {
  useScience,
  type AtlasFields,
  type ScientificCompound,
  type ScientificElement,
  type ScientificRecord,
} from "../services/science";

type Kind = "elements" | "compounds";

/** Scrolls to `location.hash` once the record has rendered (the router does not for late anchors). */
function useScrollToHash(ready: boolean) {
  const { hash } = useLocation();
  useEffect(() => {
    if (!ready || !hash) return;
    const frame = requestAnimationFrame(() =>
      document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView({ block: "start" }),
    );
    return () => cancelAnimationFrame(frame);
  }, [ready, hash]);
}

function RecordPage({ kind, id, record }: { kind: Kind; id: string; record: ScientificRecord }) {
  const atlas = record as unknown as AtlasFields;
  const subject: DetailSubject =
    kind === "elements"
      ? { kind, element: record as unknown as ScientificElement }
      : { kind, compound: record as unknown as ScientificCompound };
  const element = subject.kind === "elements" ? subject.element : null;
  const compound = subject.kind === "compounds" ? subject.compound : null;
  const labCompound = compound ? compoundBySlug[compound.slug] : undefined;
  const geometry = labCompound ? geometryOf(labCompound) : undefined;
  const names = record.names as { tr: string };
  const mark = element?.symbol ?? formulaText(compound?.display_formula ?? "");
  const download = () => downloadRecord(record);

  const toc: TocItem[] = [
    { id: "overview", label: "Kullanım" },
    ...(geometry ? [{ id: "geometry", label: "Molekül geometrisi" }] : []),
    ...(compound ? [{ id: "composition", label: "İçindeki elementler" }] : []),
    {
      id: "properties",
      label: "Bilimsel özellikler",
      children: propertySections(record, false).map(({ key, label }) => ({ id: key, label })),
    },
    ...(element ? [{ id: "compounds", label: "Bileşikleri" }] : []),
    { id: "sources", label: "Kaynaklar" },
    { id: "developer", label: "API ve JSON" },
  ];

  return (
    <main className="container-page pb-24 pt-10 lg:pt-14">
      <Seo
        title={`${names.tr} (${mark}) · ElementAPI`}
        description={atlas.editorial?.summary ?? `${names.tr}: kaynaklı bilimsel özellikler.`}
        path={`/${element ? "element" : "compound"}/${id}`}
      />
      <RecordHero id={id} subject={subject} atlas={atlas} geometry={geometry} onDownload={download} />
      <div className="mt-14 grid gap-x-14 gap-y-10 border-t border-line pt-10 lg:mt-20 lg:grid-cols-[minmax(0,1fr)_12rem] lg:pt-14">
        <DetailToc items={toc} className="lg:order-last" />
        <div className="min-w-0">
          <RecordOverview editorial={atlas.editorial} />
          {compound && <CompoundStructure compound={compound} geometry={geometry} />}
          <PropertySections key={id} record={record} />
          {element && <RelatedCompounds symbol={element.symbol} name={element.names.tr} />}
          <RecordSources
            sources={recordSources(record, atlas)}
            retrievedAt={(record.provenance as { retrieved_at?: string } | null)?.retrieved_at}
          />
          <DeveloperPanel kind={kind} id={id} record={record} onDownload={download} />
        </div>
      </div>
    </main>
  );
}

/**
 * Element (`/element/:symbol`) or compound (`/compound/:slug`) record page.
 * Shows a hero-shaped skeleton while loading, a 404 with suggestions for unknown
 * ids and a retry notice when the science API is unreachable with nothing cached.
 */
export default function ScientificDetail({ kind }: { kind: Kind }) {
  const params = useParams();
  const id = (params.symbol ?? params.slug ?? "").toLowerCase();
  const { data, error, notFound, retry } = useScience<ScientificRecord>(kind, id);
  const path = `/${kind === "elements" ? "element" : "compound"}/${id}`;
  useScrollToHash(Boolean(data));

  if (data) return <RecordPage kind={kind} id={id} record={data} />;
  if (notFound) return <RecordNotFound kind={kind} id={id} path={path} />;
  if (error) return <RecordError kind={kind} message={error} path={path} onRetry={retry} />;
  return <RecordSkeleton kind={kind} path={path} />;
}
