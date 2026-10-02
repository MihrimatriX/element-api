import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Download, FlaskConical } from "lucide-react";
import AtlasVisual from "../AtlasVisual";
import { phaseLabel } from "@/components/periodic/lenses";
import { Badge } from "@/components/ui/badge";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { ElementTile } from "@/components/ui/element-tile";
import { ExternalLink } from "@/components/ui/external-link";
import { Formula } from "@/components/ui/formula";
import { KeyValue, type KeyValueItem } from "@/components/ui/key-value";
import { PageHeader } from "@/components/ui/page-header";
import { formulaText, type Geometry } from "@/services/chemistry";
import { categoryLabels, familyColor, familyOf } from "@/services/elementData";
import {
  formatScience,
  type AtlasFields,
  type ScientificCompound,
  type ScientificElement,
} from "@/services/science";
import { labHref, type DetailSubject } from "./record";

/** "[Ar]4s2 3d6" with the orbital occupancies raised: [Ar]4s² 3d⁶. Superheavy entries are marked predicted. */
function ElectronConfiguration({ value }: { value: string }) {
  const parts = value.replace("(predicted)", "(öngörülen)").split(/(?<=[spdf])(\d+)/);
  return (
    <span className="font-mono">
      {parts.map((part, index) =>
        index % 2 ? <sup key={index}>{part}</sup> : <span key={index}>{part}</span>,
      )}
    </span>
  );
}

const mono = (value: ReactNode) => <span className="font-mono tabular">{value}</span>;

function elementFacts(element: ScientificElement): KeyValueItem[] {
  const { atomic_properties: atomic, classification } = element;
  const configuration = atomic.electron_configuration.short;
  return [
    { label: "İngilizce adı", value: <span lang="en">{element.names.en}</span> },
    { label: "Atom kütlesi", value: mono(formatScience(atomic.atomic_mass, "u")) },
    {
      label: "Fiziksel hâl",
      value: phaseLabel(element.thermodynamic_properties.standard_state),
      hint: "Standart koşullarda",
    },
    {
      label: "Elektron dizilimi",
      value: configuration ? <ElectronConfiguration value={configuration} /> : "—",
    },
    {
      label: "Elektronegatiflik",
      value: mono(formatScience(atomic.electronegativity.pauling)),
      hint: "Pauling ölçeği",
    },
    {
      label: "Periyot · grup · blok",
      value: mono(
        [classification.period, classification.group ?? "—", classification.block ?? "—"].join(" · "),
      ),
    },
  ];
}

function compoundFacts(compound: ScientificCompound, geometry?: Geometry): KeyValueItem[] {
  const cid = compound.identifiers.pubchem_cid;
  const elementCount = compound.composition?.length;
  const facts: KeyValueItem[] = [
    {
      label: "Formül",
      value: <Formula value={compound.display_formula} />,
      hint: elementCount ? `${elementCount} farklı element` : undefined,
    },
    {
      label: "Molar kütle",
      value: mono(formatScience(compound.molecular_properties.molecular_weight_g_mol, "g/mol")),
    },
    { label: "İngilizce adı", value: <span lang="en">{compound.names.en}</span> },
    { label: "IUPAC adı", value: <span className="break-words">{compound.names.iupac}</span> },
    { label: "PubChem CID", value: mono(cid ? String(cid) : "—") },
  ];
  if (geometry) facts.push({ label: "Geometri", value: geometry.nameTr });
  return facts;
}

/** Periodic cell for an element, formula plate for a compound; sits beside the title. */
function RecordMark({ subject }: { subject: DetailSubject }) {
  if (subject.kind === "elements") {
    const { element } = subject;
    return (
      <ElementTile
        symbol={element.symbol}
        atomicNumber={element.atomic_number}
        name={element.names.tr}
        family={familyOf(element.classification.category)}
        value={formatScience(element.atomic_properties.atomic_mass)}
        className="w-24 shrink-0 shadow-md sm:w-28"
      />
    );
  }
  return (
    <span className="grid h-24 min-w-24 shrink-0 place-items-center rounded-md border border-line-strong bg-surface-2 px-5 shadow-md sm:h-28">
      <Formula
        value={subject.compound.display_formula}
        className="text-2xl font-semibold text-ink sm:text-3xl"
      />
    </span>
  );
}

function FamilyBadge({ category }: { category: string }) {
  return (
    <Badge
      variant="secondary"
      style={{ "--family": familyColor(familyOf(category)) }}
      className="font-sans tracking-normal normal-case"
    >
      <span aria-hidden="true" className="size-1.5 rounded-full bg-(--family)" />
      {categoryLabels[category] ?? "Element"}
    </Badge>
  );
}

interface RecordHeroProps {
  /** Lower-case route id; resets the media switch when the record changes. */
  id: string;
  subject: DetailSubject;
  atlas: AtlasFields;
  /** Lab geometry class, for compounds in the lab catalogue. */
  geometry?: Geometry;
  onDownload: () => void;
}

/**
 * Top of a scientific record: breadcrumb, symbol cell or formula plate with the
 * name, family, summary, key facts, actions (lab, Wikipedia, PubChem, JSON) and
 * the media figure.
 */
export function RecordHero({ id, subject, atlas, geometry, onDownload }: RecordHeroProps) {
  const isElement = subject.kind === "elements";
  const name = isElement ? subject.element.names.tr : subject.compound.names.tr;
  const cid = isElement ? 0 : subject.compound.identifiers.pubchem_cid;
  const wikipedia = atlas.external_links?.wikipedia;
  const pubchem = atlas.external_links?.pubchem;
  const lab = labHref(subject);

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] lg:gap-14 xl:grid-cols-[minmax(0,1fr)_minmax(0,27rem)]">
      <div className="min-w-0">
        <PageHeader
          breadcrumb={
            <Breadcrumb
              items={[
                isElement
                  ? { label: "Periyodik tablo", to: "/periodic" }
                  : { label: "Bileşikler", to: "/compounds" },
                { label: name },
              ]}
            />
          }
          eyebrow={
            isElement ? (
              <>
                Element {subject.element.atomic_number}
                <FamilyBadge category={subject.element.classification.category} />
              </>
            ) : (
              `Bileşik${cid ? ` · PubChem ${cid}` : ""}`
            )
          }
          title={
            <span className="flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:gap-6">
              <span aria-hidden="true">
                <RecordMark subject={subject} />
              </span>
              <span className="min-w-0">
                {name}
                {/* The tile is decorative; the heading still names the symbol or formula. */}
                <span className="sr-only">
                  {` (${isElement ? subject.element.symbol : formulaText(subject.compound.display_formula)})`}
                </span>
              </span>
            </span>
          }
          lead={atlas.editorial?.summary}
          actions={
            <>
              {lab && (
                <Button asChild>
                  <Link to={lab}>
                    <FlaskConical strokeWidth={1.75} />
                    {isElement ? "Laboratuvarda dene" : "Formülü kur"}
                  </Link>
                </Button>
              )}
              {wikipedia && (
                <Button asChild variant="outline">
                  <ExternalLink variant="plain" href={wikipedia.url}>
                    Wikipedia{wikipedia.language === "en" ? " (EN)" : ""}
                  </ExternalLink>
                </Button>
              )}
              {pubchem && (
                <Button asChild variant="outline">
                  <ExternalLink variant="plain" href={pubchem}>
                    PubChem
                  </ExternalLink>
                </Button>
              )}
              <Button variant="ghost" onClick={onDownload}>
                <Download strokeWidth={1.75} />
                JSON indir
              </Button>
            </>
          }
        />
        <KeyValue
          items={isElement ? elementFacts(subject.element) : compoundFacts(subject.compound, geometry)}
          columns={2}
          className="mt-10"
        />
      </div>
      <AtlasVisual
        key={id}
        symbol={isElement ? subject.element.symbol : undefined}
        formula={isElement ? undefined : formulaText(subject.compound.display_formula)}
        shells={isElement ? subject.element.atomic_properties.electrons_per_shell : undefined}
        photo={atlas.media?.photo}
        structure={atlas.media?.structure}
        className="lg:mt-11"
      />
    </div>
  );
}
