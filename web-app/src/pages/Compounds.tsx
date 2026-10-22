import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, FlaskConical, Grid2X2, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChipGroup, type ChipOption } from "@/components/ui/chip-group";
import { EmptyState } from "@/components/ui/empty-state";
import { Notice } from "@/components/ui/notice";
import { PageHeader } from "@/components/ui/page-header";
import { SearchField } from "@/components/ui/search-field";
import { formatNumber } from "@/lib/format";
import CompoundCard from "../components/CompoundCard";
import { filterCompounds } from "../components/reference/compound-filter";
import Seo from "../components/Seo";
import {
  asScienceCompound,
  COMPOUND_GROUP_LABELS,
  compoundGroups,
  knownCompounds,
  type CompoundGroup,
} from "../services/chemistry";
import { useScience, type ScientificCompound } from "../services/science";

type GroupFilter = CompoundGroup | "all";

/** Catalogue groups per compound; computed once because parsing formulas is not free. */
const groupsBySlug = new Map(
  knownCompounds.map((compound) => [compound.slug, compoundGroups(compound)]),
);

const groupOptions: ChipOption<GroupFilter>[] = [
  { value: "all", label: "Tümü", count: knownCompounds.length },
  ...(Object.keys(COMPOUND_GROUP_LABELS) as CompoundGroup[]).map((group) => ({
    value: group,
    label: COMPOUND_GROUP_LABELS[group],
    count: knownCompounds.filter((compound) =>
      groupsBySlug.get(compound.slug)?.includes(group),
    ).length,
  })),
];

/**
 * /compounds: the 214 known compounds as a searchable, group-filterable card grid.
 * Local catalogue rows paint at once; API rows (structure images, summaries) replace them.
 */
export default function Compounds() {
  const { data, error, retry } = useScience<ScientificCompound[]>("compounds");
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState<CompoundGroup | null>(null);

  const records = useMemo(() => {
    const remote = new Map((data ?? []).map((record) => [record.slug, record]));
    return knownCompounds.map(
      (compound) =>
        remote.get(compound.slug) ??
        (asScienceCompound(compound) as ScientificCompound),
    );
  }, [data]);

  const results = filterCompounds(records, query, group, groupsBySlug);
  const mediaPending = data === undefined && !error;

  function clearFilters() {
    setQuery("");
    setGroup(null);
  }

  return (
    <main className="container-page pb-24 pt-10 lg:pt-14">
      <Seo
        title="Bileşikler · ElementAPI"
        description="Su, tuz, pas, sirke: 214 bilinen kayıt. Formül birimi ile molekül karışmaz."
        path="/compounds"
      />
      <PageHeader
        eyebrow="Katalog"
        title="Bileşikler"
        lead="Su, tuz, pas: 214 kayıt. Formül birimi ile molekül karışmaz; ad, formül veya grupla süz."
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <Link to="/periodic">
                <Grid2X2 strokeWidth={1.75} aria-hidden="true" />
                Periyodik tablo
              </Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link to="/lab/formula">
                <FlaskConical strokeWidth={1.75} aria-hidden="true" />
                Formülü kur
              </Link>
            </Button>
          </>
        }
      />

      <div className="mt-10 grid gap-4 border-y border-line py-5 lg:mt-12">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <SearchField
            label="Bileşik ara"
            placeholder="Ad, formül veya PubChem CID…"
            value={query}
            onValueChange={setQuery}
            className="sm:max-w-sm"
          />
          <p
            role="status"
            className="shrink-0 font-mono text-[13px] text-ink-3 tabular"
          >
            <span className="text-ink">{formatNumber(results.length)}</span>{" "}
            bileşik
          </p>
        </div>
        <ChipGroup
          type="single"
          label="Bileşik grupları"
          options={groupOptions}
          value={group ?? "all"}
          onValueChange={(next) => setGroup(next === "all" ? null : next)}
        />
      </div>

      {error && (
        <Notice
          tone="warning"
          title="Yapı görselleri ve özetler yüklenemedi"
          action={
            <Button size="sm" variant="outline" onClick={retry}>
              Yeniden dene
            </Button>
          }
          className="mt-6"
        >
          Gömülü katalog gösteriliyor; ad, formül ve molar kütle yine doğru.
        </Notice>
      )}

      {results.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title="Bu süzgeçte kayıt yok"
          actions={
            <>
              <Button size="sm" variant="outline" onClick={clearFilters}>
                Süzgeci temizle
              </Button>
              <Button asChild size="sm" variant="ghost">
                <Link to="/lab">
                  Laboratuvarda dene
                  <ArrowRight strokeWidth={1.75} aria-hidden="true" />
                </Link>
              </Button>
            </>
          }
          className="mt-8"
        >
          Su hâlâ H₂O, tuz hâlâ NaCl. Türkçe adı, formülü ya da PubChem
          numarasını dene.
        </EmptyState>
      ) : (
        <ul className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 lg:gap-4">
          {results.map((compound) => (
            <li key={compound.slug} className="min-w-0">
              <CompoundCard
                compound={compound}
                group={groupsBySlug.get(compound.slug)?.[0]}
                mediaPending={mediaPending}
              />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
