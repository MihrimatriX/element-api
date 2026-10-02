import { LayoutGrid, Rows3, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChipGroup, type ChipOption } from "@/components/ui/chip-group";
import type { ElementFamily } from "@/components/ui/element-tile";
import { SearchField } from "@/components/ui/search-field";
import { Segmented } from "@/components/ui/segmented";
import { categoryLabels, STATIC_ELEMENTS } from "@/services/elementData";
import { LENS_OPTIONS, type Lens } from "./lenses";
import { FAMILIES, type ExplorerView } from "./model";

const FAMILY_OPTIONS: ChipOption<ElementFamily>[] = FAMILIES.map((family) => ({
  value: family,
  label: categoryLabels[family],
  color: `var(--color-family-${family})`,
}));

const VIEW_OPTIONS = [
  { value: "table", label: "Tablo", icon: LayoutGrid },
  { value: "cards", label: "Kartlar", icon: Rows3 },
] as const;

/* Chip rows scroll sideways on phones instead of wrapping into a tall block. */
const chipRowClass =
  "max-sm:-mx-3 max-sm:flex-nowrap max-sm:overflow-x-auto max-sm:px-3 max-sm:py-1 max-sm:[&>*]:shrink-0";

interface ExplorerToolbarProps {
  query: string;
  onQueryChange: (query: string) => void;
  /** Enter in the search box: open the best match. */
  onSearchSubmit: () => void;
  matchCount: number;
  lens: Lens;
  onLensChange: (lens: Lens) => void;
  view: ExplorerView;
  onViewChange: (view: ExplorerView) => void;
  families: ElementFamily[];
  onFamiliesChange: (families: ElementFamily[]) => void;
  onClear: () => void;
}

/**
 * Explorer controls: search with a live count, colour lens, table/cards switch, and the family
 * legend that doubles as a multi-select filter. Floats under the site header from `lg`.
 */
export function ExplorerToolbar({
  query,
  onQueryChange,
  onSearchSubmit,
  matchCount,
  lens,
  onLensChange,
  view,
  onViewChange,
  families,
  onFamiliesChange,
  onClear,
}: ExplorerToolbarProps) {
  const filtered = query.trim() !== "" || families.length > 0;

  return (
    <div className="z-20 rounded-xl border border-line bg-surface p-3 shadow-md lg:sticky lg:top-[4.25rem]">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <SearchField
          label="Element ara"
          placeholder="Ad, sembol veya atom numarası…"
          value={query}
          onValueChange={onQueryChange}
          onKeyDown={(event) => {
            if (event.key !== "Enter") return;
            event.preventDefault();
            onSearchSubmit();
          }}
          resultCount={matchCount}
          formatCount={(count) => `${count} / ${STATIC_ELEMENTS.length}`}
          className="sm:w-80"
        />
        <ChipGroup
          type="single"
          label="Renk lensi"
          options={LENS_OPTIONS}
          value={lens}
          onValueChange={(next) => onLensChange(next ?? "category")}
          className={chipRowClass}
        />
        <Segmented
          label="Görünüm"
          options={VIEW_OPTIONS}
          value={view}
          onValueChange={onViewChange}
          className="lg:ml-auto"
        />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-line pt-3">
        <ChipGroup
          type="multiple"
          label="Element aileleri"
          options={FAMILY_OPTIONS}
          value={families}
          onValueChange={onFamiliesChange}
          className={chipRowClass}
        />
        {filtered && (
          <div className="flex items-center gap-2">
            <p className="text-[13px] text-ink-3">
              <span className="font-mono text-ink-2 tabular">{matchCount}</span> element
            </p>
            <Button variant="ghost" size="sm" onClick={onClear}>
              <X aria-hidden="true" strokeWidth={1.75} />
              Temizle
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
