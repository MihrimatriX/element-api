import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChipGroup, type ChipOption } from "@/components/ui/chip-group";
import { PageHeader } from "@/components/ui/page-header";
import { WorkshopMarks } from "../components/AtlasVisual";
import { GlossaryEntry } from "../components/reference/GlossaryEntry";
import { GlossaryIndex } from "../components/reference/GlossaryIndex";
import {
  GLOSSARY_GROUPS,
  glossaryTerms,
  letterAnchor,
  termsByLetter,
  type GlossaryGroupId,
} from "../components/reference/glossary-terms";
import Seo from "../components/Seo";
import { ACCOUNTS_ENABLED } from "../config";

type GroupFilter = GlossaryGroupId | "all";

const terms = glossaryTerms(ACCOUNTS_ENABLED);

const groupShort = Object.fromEntries(
  GLOSSARY_GROUPS.map((group) => [group.id, group.short]),
) as Record<GlossaryGroupId, string>;

const groupOptions: ChipOption<GroupFilter>[] = [
  { value: "all", label: "Tümü", count: terms.length },
  ...GLOSSARY_GROUPS.map((group) => ({
    value: group.id,
    label: group.title,
    count: terms.filter((term) => term.group === group.id).length,
  })),
];

/** Side note in the header: where water, salt and ETag are explained in full. */
function GlossaryAside() {
  return (
    <div className="panel w-full p-5 lg:w-80">
      <WorkshopMarks beat="water" className="mb-4" />
      <h2 className="font-sans text-sm font-semibold tracking-normal text-ink">
        Su, tuz, ETag
      </h2>
      <p className="mt-2 text-sm leading-6 text-ink-2">
        Su ve tuzun tarifi{" "}
        <Link to="/nasil" className="text-link">
          el kitabında
        </Link>
        . ETag: aynı kaydı ikinci kez istersen sunucu bazen gövde göndermez.
      </p>
      <p className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm">
        <Link to="/lab" className="text-link">
          Laboratuvar
        </Link>
        <Link to="/docs" className="text-link">
          API
        </Link>
        <Link to="/nasil" className="text-link">
          El kitabı
        </Link>
      </p>
    </div>
  );
}

/** /sozluk: the product's vocabulary, A–Z, filterable by group, each term with a link to try it. */
export default function Glossary() {
  const [group, setGroup] = useState<GlossaryGroupId | null>(null);

  const letters = useMemo(
    () =>
      termsByLetter(group ? terms.filter((term) => term.group === group) : terms),
    [group],
  );

  return (
    <main className="container-page pb-24 pt-10 lg:pt-14">
      <Seo
        title="Sözlük · ElementAPI"
        description="Formül birimi ile molekül, stoikiometri, VSEPR, keşif, ETag ve KREDI. Tezgâh dilinde, su ve tuz örnekleriyle."
        path="/sozluk"
      />
      <PageHeader
        eyebrow="Dil"
        title="Sözlük"
        lead="Sayfada geçen sözler. Su, tuz, pas. Ders kitabı değil; tezgâhın kenarına yazılmış not."
        aside={<GlossaryAside />}
      />

      <ChipGroup
        type="single"
        label="Sözlük bölümleri"
        options={groupOptions}
        value={group ?? "all"}
        onValueChange={(next) => setGroup(next === "all" ? null : next)}
        className="mt-10 lg:mt-12"
      />

      <GlossaryIndex activeLetters={new Set(letters.keys())} />

      {[...letters].map(([letter, letterTerms]) => (
        <section
          key={letter}
          id={letterAnchor(letter)}
          className="grid scroll-mt-28 border-b border-line md:grid-cols-[4rem_minmax(0,1fr)]"
        >
          <h2 className="pt-6 text-3xl text-ink-3 md:sticky md:top-28 md:self-start">
            {letter}
          </h2>
          <dl className="divide-y divide-line">
            {letterTerms.map((term) => (
              <GlossaryEntry
                key={term.id}
                term={term}
                groupLabel={groupShort[term.group]}
              />
            ))}
          </dl>
        </section>
      ))}
    </main>
  );
}
