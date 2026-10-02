import { Link } from "react-router-dom";
import { RotateCw, SearchX } from "lucide-react";
import Seo from "../Seo";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { ElementTile } from "@/components/ui/element-tile";
import { EmptyState } from "@/components/ui/empty-state";
import { Notice } from "@/components/ui/notice";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { STATIC_ELEMENTS } from "@/services/elementData";
import { foldTurkish } from "@/lib/text";
import { familyOf } from "./record";

type Kind = "elements" | "compounds";

const pageClass = "container-page pb-24 pt-10 lg:pt-14";

const backLink = (kind: Kind) =>
  kind === "elements"
    ? { label: "Periyodik tablo", to: "/periodic" }
    : { label: "Bileşikler", to: "/compounds" };

/** Loading view shaped like the hero: breadcrumb, mark and title, lead, facts and media. */
export function RecordSkeleton({ kind, path }: { kind: Kind; path: string }) {
  return (
    <main aria-busy="true" className={pageClass}>
      <Seo
        title="Bilimsel kayıt · ElementAPI"
        description="Kaynaklı bilimsel özellikler yükleniyor."
        path={path}
      />
      <p role="status" className="sr-only">
        Bilimsel kayıt yükleniyor…
      </p>
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] lg:gap-14 xl:grid-cols-[minmax(0,1fr)_minmax(0,27rem)]">
        <div>
          <Breadcrumb items={[backLink(kind), { label: "Yükleniyor" }]} />
          <Skeleton className="mt-6 h-3 w-32" />
          <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-6">
            <Skeleton className="h-28 w-24 shrink-0 sm:h-32 sm:w-28" />
            <Skeleton className="h-11 w-[min(20rem,80%)]" />
          </div>
          <Skeleton className="mt-6 h-5 w-[min(36rem,95%)]" />
          <Skeleton className="mt-2.5 h-5 w-[min(28rem,75%)]" />
          <div className="mt-7 flex gap-3">
            <Skeleton className="h-10 w-40" />
            <Skeleton className="h-10 w-28" />
          </div>
          <div className="mt-10 grid gap-x-10 border-t border-line md:grid-cols-2">
            {Array.from({ length: 6 }, (_, index) => (
              <div key={index} className="flex justify-between gap-4 border-b border-line py-4">
                <Skeleton className="h-3.5 w-24" />
                <Skeleton className="h-3.5 w-20" />
              </div>
            ))}
          </div>
        </div>
        <Skeleton className="aspect-[5/4] w-full rounded-2xl lg:mt-11" />
      </div>
    </main>
  );
}

/** Elements whose Turkish name or symbol starts like the unknown id ("/element/demir" → Fe). */
function suggestionsFor(id: string) {
  const query = foldTurkish(id);
  if (!query) return [];
  return STATIC_ELEMENTS.filter(
    (element) =>
      foldTurkish(element.name).startsWith(query) || element.symbol.toLowerCase() === query,
  ).slice(0, 6);
}

/** 404 for an unknown symbol or slug: explains, suggests close element names and links back. */
export function RecordNotFound({ kind, id, path }: { kind: Kind; id: string; path: string }) {
  const suggestions = kind === "elements" ? suggestionsFor(id) : [];
  return (
    <main className={pageClass}>
      <Seo
        title="Kayıt bulunamadı · ElementAPI"
        description="Bu adreste bir element ya da bileşik kaydı yok."
        path={path}
        noIndex
      />
      <EmptyState
        icon={SearchX}
        title="Kayıt bulunamadı"
        titleAs="h1"
        size="page"
        actions={
          <>
            <Button asChild>
              <Link to="/periodic">Periyodik tablo</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/compounds">Bileşikler</Link>
            </Button>
          </>
        }
      >
        <p>
          <span className="font-mono text-ink">{id}</span> için bir{" "}
          {kind === "elements" ? "element" : "bileşik"} kaydı yok.{" "}
          {kind === "elements"
            ? "Element adresleri sembolle yazılır:"
            : "Bileşik adresleri kısa adla yazılır:"}{" "}
          <span className="font-mono text-ink">
            {kind === "elements" ? "/element/fe" : "/compound/h2o"}
          </span>
        </p>
      </EmptyState>
      {suggestions.length > 0 && (
        <section aria-labelledby="record-suggestions" className="mt-10">
          <h2 id="record-suggestions" className="eyebrow text-center">
            Bunu mu arıyordun?
          </h2>
          <ul className="mx-auto mt-4 grid max-w-md grid-cols-[repeat(auto-fit,minmax(5.5rem,6.5rem))] justify-center gap-2">
            {suggestions.map((element) => (
              <li key={element.symbol}>
                <ElementTile
                  symbol={element.symbol}
                  atomicNumber={element.atomicNumber}
                  name={element.name}
                  family={familyOf(element.category)}
                  to={`/element/${element.symbol.toLowerCase()}`}
                />
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}

/** Network or server failure with nothing cached: the message and a retry. */
export function RecordError({
  kind,
  message,
  path,
  onRetry,
}: {
  kind: Kind;
  message: string;
  path: string;
  onRetry: () => void;
}) {
  return (
    <main className={pageClass}>
      <Seo
        title="Kayıt yüklenemedi · ElementAPI"
        description="Bilimsel veri servisine şu an ulaşılamıyor."
        path={path}
        noIndex
      />
      <PageHeader
        breadcrumb={<Breadcrumb items={[backLink(kind), { label: "Kayıt yüklenemedi" }]} />}
        title="Kayıt yüklenemedi"
      />
      <Notice
        tone="danger"
        className="mt-8 max-w-2xl"
        action={
          <Button variant="outline" size="sm" onClick={onRetry}>
            <RotateCw strokeWidth={1.75} />
            Yeniden dene
          </Button>
        }
      >
        {message} Bağlantı geri geldiğinde yeniden dene.
      </Notice>
    </main>
  );
}
