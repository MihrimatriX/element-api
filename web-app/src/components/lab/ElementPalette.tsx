import { useId, useState, type PointerEvent } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, GripVertical, SearchX } from "lucide-react";
import { ElementTile } from "@/components/ui/element-tile";
import { EmptyState } from "@/components/ui/empty-state";
import { SearchField } from "@/components/ui/search-field";
import { matchesSearch } from "@/lib/text";
import { elementMaterials, type LabMaterial } from "@/services/lab";
import type { Counts } from "@/services/chemistry";
import { elementInfo } from "./elementInfo";

/** Frequent starter atoms shown in their own group while the search is empty. */
const PINNED = new Set(["H", "O", "C", "N", "Na", "Cl", "Fe", "S", "K", "Ca"]);

/**
 * Starts dragging a palette element. `addOnTap` adds one atom when the press
 * ends without moving (the drag handle has no click of its own).
 */
export type PaletteDragStart = (
  event: PointerEvent<HTMLElement>,
  id: string,
  addOnTap: boolean,
) => void;

interface ElementPaletteProps {
  /** Atom counts on the bench; elements on it are highlighted with their count. */
  counts: Counts;
  onAdd: (id: string) => void;
  onDragStart: PaletteDragStart;
  /** Symbol being dragged from the palette, shown faded in place. */
  draggingId?: string;
}

/**
 * Searchable element palette. Click, tap, Enter or Space adds one atom to the
 * bench. Mouse users can drag the whole tile; touch users drag by the handle,
 * so the rest of the tile still scrolls the palette.
 */
export function ElementPalette({
  counts,
  onAdd,
  onDragStart,
  draggingId,
}: ElementPaletteProps) {
  const headingId = useId();
  const [query, setQuery] = useState("");
  const searching = query.trim() !== "";
  const matches = elementMaterials.filter((material) => matchesSearch(query, material.name, material.id));
  const groups = searching
    ? [{ title: "Sonuçlar", items: matches }]
    : [
        { title: "Sık kullanılanlar", items: elementMaterials.filter((material) => PINNED.has(material.id)) },
        { title: "Tüm elementler", items: elementMaterials.filter((material) => !PINNED.has(material.id)) },
      ];

  return (
    <section
      aria-labelledby={headingId}
      className="panel flex min-h-0 min-w-0 flex-col p-4 lg:sticky lg:top-20 lg:h-[min(calc(100dvh-6rem),52rem)]"
    >
      <div className="flex items-baseline justify-between gap-3">
        <h2 id={headingId} className="font-sans text-base font-semibold tracking-normal text-ink">
          Palet
        </h2>
        <span className="font-mono text-xs text-ink-3 tabular">
          {elementMaterials.length} element
        </span>
      </div>
      <SearchField
        className="mt-3"
        label="Element ara"
        placeholder="Element ara…"
        value={query}
        onValueChange={setQuery}
        resultCount={matches.length}
        formatCount={(count) => `${count} element`}
      />

      <div className="-mx-1 mt-3 min-h-0 flex-1 overflow-y-auto overscroll-contain px-1 py-1 select-none max-lg:max-h-80">
        {matches.length === 0 ? (
          <EmptyState icon={SearchX} title="Bu aramada element yok" className="py-8">
            Farklı bir ad veya sembol dene.
          </EmptyState>
        ) : (
          groups.map((group) => (
            <div key={group.title} className="mt-4 first:mt-0">
              <h3 className="eyebrow mb-2">{group.title}</h3>
              <ul className="grid grid-cols-5 gap-1.5 sm:grid-cols-8 lg:grid-cols-4">
                {group.items.map((material) => (
                  <PaletteItem
                    key={material.id}
                    material={material}
                    count={counts[material.id] ?? 0}
                    dragging={draggingId === material.id}
                    onAdd={onAdd}
                    onDragStart={onDragStart}
                  />
                ))}
              </ul>
            </div>
          ))
        )}
      </div>

      <p className="mt-3 border-t border-line pt-3 text-[13px] leading-5 text-ink-3">
        Tıkla veya Enter’a bas: tezgâha bir atom eklenir. Tutamaçtan sürükleyip de bırakabilirsin.{" "}
        <Link to="/periodic" className="text-link inline-flex items-center gap-0.5">
          Tabloda incele
          <ArrowUpRight aria-hidden="true" strokeWidth={1.75} className="size-3.5" />
        </Link>
      </p>
    </section>
  );
}

interface PaletteItemProps {
  material: LabMaterial;
  count: number;
  dragging: boolean;
  onAdd: (id: string) => void;
  onDragStart: PaletteDragStart;
}

/** One palette element: an ElementTile under a full-size add button, a count badge and a drag handle. */
function PaletteItem({ material, count, dragging, onAdd, onDragStart }: PaletteItemProps) {
  const { name, atomicNumber, family } = elementInfo(material.id);
  return (
    <li className="group/item relative">
      <ElementTile
        symbol={material.id}
        atomicNumber={atomicNumber}
        name={name}
        family={family}
        selected={count > 0}
        dimmed={dragging}
        className="transition-transform group-hover/item:border-line-strong group-hover/item:bg-[color-mix(in_oklch,var(--family)_28%,var(--color-surface))] group-active/item:scale-[0.97]"
      />
      <button
        type="button"
        aria-label={count > 0 ? `${name} tezgâha ekle, tezgâhta ${count}` : `${name} tezgâha ekle`}
        onClick={() => onAdd(material.id)}
        onPointerDown={(event) => {
          if (event.pointerType === "mouse") onDragStart(event, material.id, false);
        }}
        className="focus-ring absolute inset-0 z-20 cursor-grab rounded-md active:cursor-grabbing"
      />
      {count > 0 && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute top-1 right-1 z-30 rounded-sm bg-brand px-1 font-mono text-[10px] leading-4 text-primary-foreground tabular"
        >
          ×{count}
        </span>
      )}
      <span
        aria-hidden="true"
        onPointerDown={(event) => onDragStart(event, material.id, true)}
        className="absolute top-1/2 right-0 z-30 grid h-9 w-5 -translate-y-1/2 cursor-grab touch-none place-items-center text-ink-3 opacity-0 transition-opacity group-hover/item:opacity-100 active:cursor-grabbing [@media(hover:none)]:opacity-100"
      >
        <GripVertical className="size-3.5" strokeWidth={1.75} />
      </span>
    </li>
  );
}
