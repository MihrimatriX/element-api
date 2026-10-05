import { useId, type KeyboardEvent, type Ref } from "react";
import { Link } from "react-router-dom";
import { SearchX } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { formatNumber } from "@/lib/format";
import type { GuideSearchEntry } from "./guide-model";

interface GuideSearchResultsProps {
  query: string;
  total: number;
  results: readonly GuideSearchEntry[];
  /** Called when a result is chosen (the page clears the query). */
  onSelect: () => void;
  /** The result list, so the search field can move focus into it with ArrowDown. */
  listRef: Ref<HTMLOListElement>;
}

/** ArrowUp / ArrowDown move between result links. */
function moveFocus(event: KeyboardEvent<HTMLOListElement>) {
  if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
  const links = Array.from(event.currentTarget.querySelectorAll("a"));
  const index = links.findIndex((link) => link === document.activeElement);
  const next = links[index + (event.key === "ArrowDown" ? 1 : -1)];
  if (!next) return;
  event.preventDefault();
  next.focus();
}

/**
 * Search results across every guide page: function or file name, where it
 * lives and what it does. Each result deep-links to the row and opens its file.
 */
export function GuideSearchResults({ query, total, results, onSelect, listRef }: GuideSearchResultsProps) {
  const headingId = useId();
  if (total === 0) {
    return (
      <EmptyState icon={SearchX} title="Sonuç yok" titleAs="h1">
        “{query}” hiçbir fonksiyonda, dosyada, uç noktada ya da ayarda geçmiyor. Daha kısa bir
        kelime ya da fonksiyonun adını dene.
      </EmptyState>
    );
  }

  return (
    <section aria-labelledby={headingId}>
      <h1
        id={headingId}
        className="font-display text-2xl font-semibold tracking-tight text-ink md:text-3xl"
      >
        Arama sonuçları
      </h1>
      <p className="mt-2 text-[15px] text-ink-2">
        “{query}” için <span className="font-mono tabular">{formatNumber(total)}</span> sonuç
        {total > results.length && `; ilk ${results.length} tanesi gösteriliyor`}.
      </p>
      <ol
        ref={listRef}
        onKeyDown={moveFocus}
        className="mt-6 divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface shadow-xs"
      >
        {results.map((entry) => (
          <li key={entry.href}>
            <Link
              to={entry.href}
              onClick={onSelect}
              className="focus-ring block px-4 py-3.5 transition-colors hover:bg-surface-2 focus-visible:bg-surface-2 focus-visible:outline-offset-[-2px] sm:px-5"
            >
              <span className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <span className="min-w-0 font-mono text-[13.5px] text-ink [overflow-wrap:anywhere]">
                  {entry.name}
                </span>
                <span className="text-xs text-ink-3">{entry.location}</span>
              </span>
              {entry.description && (
                <span className="mt-1 line-clamp-2 block text-[14px] leading-6 text-ink-2">
                  {entry.description}
                </span>
              )}
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
