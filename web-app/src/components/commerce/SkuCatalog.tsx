import { useState, type ReactNode } from "react";
import { PackageSearch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Notice } from "@/components/ui/notice";
import { Skeleton } from "@/components/ui/skeleton";
import type { CompoundSku } from "../../services/api";

const PAGE_SIZE = 24;
const gridClass = "grid gap-3 sm:grid-cols-2";

interface SkuCatalogProps {
  status: "loading" | "error" | "ready";
  /** Products after search and element filters. */
  skus: readonly CompoundSku[];
  /** Changes whenever the filters change; the list then starts again from the first page. */
  filterKey: string;
  /** Empty-state text for the current filters. */
  emptyText: string;
  onRetry: () => void;
  renderSku: (sku: CompoundSku) => ReactNode;
}

/** Product grid with loading, error and empty states, showing 24 at a time ("Daha fazla göster"). */
export function SkuCatalog({
  status,
  skus,
  filterKey,
  emptyText,
  onRetry,
  renderSku,
}: SkuCatalogProps) {
  const [page, setPage] = useState({ filterKey, count: PAGE_SIZE });
  const shown = page.filterKey === filterKey ? page.count : PAGE_SIZE;

  if (status === "loading")
    return (
      <div className={gridClass} aria-hidden="true">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="panel grid gap-2 p-4">
            <div className="flex justify-between">
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-5 w-16" />
            </div>
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-24" />
            <div className="mt-6 flex items-end justify-between">
              <Skeleton className="h-6 w-28" />
              <Skeleton className="h-8 w-16" />
            </div>
          </div>
        ))}
      </div>
    );

  if (status === "error")
    return (
      <Notice
        tone="danger"
        action={
          <Button variant="outline" size="sm" onClick={onRetry}>
            Yeniden dene
          </Button>
        }
      >
        Ürünler şu anda yüklenemiyor. Biraz sonra yeniden deneyin.
      </Notice>
    );

  if (skus.length === 0)
    return (
      <EmptyState icon={PackageSearch} title="Ürün bulunamadı">
        {emptyText}
      </EmptyState>
    );

  const remaining = skus.length - shown;
  return (
    <>
      <div className={gridClass}>{skus.slice(0, shown).map(renderSku)}</div>
      {remaining > 0 && (
        <div className="mt-5 flex justify-center">
          <Button
            variant="outline"
            onClick={() => setPage({ filterKey, count: shown + PAGE_SIZE })}
          >
            Daha fazla göster
            <span className="font-mono text-ink-3 tabular">{remaining}</span>
          </Button>
        </div>
      )}
    </>
  );
}
