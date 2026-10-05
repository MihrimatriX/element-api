import { useState } from "react";
import { Link } from "react-router-dom";
import { FlaskConical, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Formula } from "@/components/ui/formula";
import { Notice } from "@/components/ui/notice";
import { Section } from "@/components/ui/section";
import { Skeleton } from "@/components/ui/skeleton";
import { useScience, type ScientificCompound } from "@/services/science";

/** Compounds shown before "Tümünü göster"; hydrogen and oxygen appear in well over a hundred. */
const PREVIEW_COUNT = 12;

const gridClass = "grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4";

/** Element-only section listing catalogue compounds whose formula contains the element. */
export function RelatedCompounds({ symbol, name }: { symbol: string; name: string }) {
  const { data, error, retry } = useScience<ScientificCompound[]>("compounds");
  const [expanded, setExpanded] = useState(false);
  const related = data?.filter((compound) =>
    compound.composition?.some((part) => part.symbol === symbol),
  );
  const shown = expanded ? related : related?.slice(0, PREVIEW_COUNT);
  const lowerName = name.toLocaleLowerCase("tr-TR");

  return (
    <Section
      id="compounds"
      title="Bu elementin bileşikleri"
      description={
        related?.length
          ? `Katalogdaki ${related.length} bileşiğin formülünde ${lowerName} var.`
          : undefined
      }
    >
      {error && !data && (
        <Notice
          tone="danger"
          title="Bileşik listesi yüklenemedi"
          action={
            <Button variant="outline" size="sm" onClick={retry}>
              <RotateCw strokeWidth={1.75} />
              Yeniden dene
            </Button>
          }
        >
          {error}
        </Notice>
      )}
      {!data && !error && (
        <div className={gridClass} role="status" aria-label="Bileşikler yükleniyor">
          {Array.from({ length: 8 }, (_, index) => (
            <Skeleton key={index} className="h-[4.25rem] rounded-lg" />
          ))}
        </div>
      )}
      {related && !related.length && (
        <EmptyState icon={FlaskConical} title="İlişkili bileşik yok">
          Bu katalogda henüz {lowerName} içeren bir bileşik bulunmuyor.
        </EmptyState>
      )}
      {shown && shown.length > 0 && (
        <>
          <ul className={gridClass}>
            {shown.map((compound) => (
              <li key={compound.slug}>
                <Link
                  to={`/compound/${compound.slug}`}
                  className="focus-ring group flex h-full flex-col gap-1 rounded-lg border border-line bg-surface px-3.5 py-3 transition-[background-color,border-color,transform] duration-150 hover:border-line-strong hover:bg-surface-2 active:scale-[0.98]"
                >
                  <Formula value={compound.display_formula} className="text-[15px] text-ink" />
                  <span className="truncate text-[13px] text-ink-3 transition-colors group-hover:text-ink-2">
                    {compound.names.tr}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          {related && related.length > PREVIEW_COUNT && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setExpanded((current) => !current)}
              aria-expanded={expanded}
              className="mt-4"
            >
              {expanded ? "Daha az göster" : `Tümünü göster (${related.length})`}
            </Button>
          )}
        </>
      )}
    </Section>
  );
}
