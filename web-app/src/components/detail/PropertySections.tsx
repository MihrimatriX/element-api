import { useEffect, useEffectEvent, useState } from "react";
import { useLocation } from "react-router-dom";
import { ChevronsDownUp, ChevronsUpDown, SearchX } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Disclosure, DisclosureContent, DisclosureTrigger } from "@/components/ui/disclosure";
import { EmptyState } from "@/components/ui/empty-state";
import { Notice } from "@/components/ui/notice";
import { SearchField } from "@/components/ui/search-field";
import { Section } from "@/components/ui/section";
import type { ScientificRecord } from "@/services/science";
import {
  SECTION_NOTES,
  propertySections,
  sectionCount,
  sectionMatches,
  type PropertySection,
} from "./properties";
import { PropertyValue } from "./PropertyValue";

function PropertyDisclosure({
  section,
  open,
  onOpenChange,
  showMissing,
}: {
  section: PropertySection;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  showMissing: boolean;
}) {
  const count = sectionCount(section.value);
  const note = SECTION_NOTES[section.key];
  return (
    <Disclosure id={section.key} open={open} onOpenChange={onOpenChange} className="scroll-mt-24">
      <h3 className="font-sans text-[15px] font-medium tracking-normal">
        <DisclosureTrigger className="rounded-none px-4 py-3.5 hover:bg-surface-2/60 sm:px-5">
          <span className="min-w-0">{section.label}</span>
          <Badge variant={count ? "secondary" : "outline"} className="font-mono tabular">
            {count ?? "Veri yok"}
          </Badge>
        </DisclosureTrigger>
      </h3>
      <DisclosureContent>
        <div className="px-4 pb-5 sm:px-5">
          {note && (
            <Notice tone="neutral" className="mb-3 text-[13px] leading-5">
              {note}
            </Notice>
          )}
          <PropertyValue value={section.value} fieldKey={section.key} showMissing={showMissing} />
        </div>
      </DisclosureContent>
    </Disclosure>
  );
}

/** Target of a plain click on an in-page link (`#isotopes` → "isotopes"), else null. */
function clickedAnchor(event: MouseEvent): string | null {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
    return null;
  const link = event.target instanceof Element ? event.target.closest("a[href^='#']") : null;
  const href = link?.getAttribute("href");
  return href ? decodeURIComponent(href.slice(1)) : null;
}

/**
 * "Bilimsel özellikler": every labelled section of the record as a collapsible
 * group with a size badge, a filter over section and field names, a switch for
 * fields without data and expand/collapse all. Linking to `#<section key>`
 * (side index, deep link) clears the filter and opens that section, also when
 * the URL already ends in that hash.
 */
export function PropertySections({ record }: { record: ScientificRecord }) {
  const { hash } = useLocation();
  const target = decodeURIComponent(hash.slice(1));
  const [filter, setFilter] = useState("");
  const [showMissing, setShowMissing] = useState(false);
  const [openKeys, setOpenKeys] = useState(() => new Set(target in record ? [target] : []));
  const [handledHash, setHandledHash] = useState(hash);

  const sections = propertySections(record, showMissing);
  const visible = sections.filter((section) => sectionMatches(section, filter));
  const filtering = filter.trim() !== "";
  const allOpen = visible.length > 0 && visible.every((section) => openKeys.has(section.key));

  /** Clears the filter and opens `key`. */
  function reveal(key: string) {
    // Sections the filter held open stay open: one collapsing above the target would scroll it away.
    const heldOpen = filtering ? visible.map((section) => section.key) : [];
    setOpenKeys((current) => new Set([...current, ...heldOpen, key]));
    setFilter("");
  }

  if (hash !== handledHash) {
    setHandledHash(hash);
    if (target in record) reveal(target);
  }

  // A link to the hash the URL already has leaves `hash` unchanged, so the click reveals too.
  // React renders the section before the browser scrolls to it.
  const onDocumentClick = useEffectEvent((event: MouseEvent) => {
    const key = clickedAnchor(event);
    if (key !== null && key in record) reveal(key);
  });
  useEffect(() => {
    const listener = (event: MouseEvent) => onDocumentClick(event);
    document.addEventListener("click", listener);
    return () => document.removeEventListener("click", listener);
  }, []);

  function setOpen(key: string, open: boolean) {
    setOpenKeys((current) => {
      const next = new Set(current);
      if (open) next.add(key);
      else next.delete(key);
      return next;
    });
  }

  return (
    <Section
      id="properties"
      title="Bilimsel özellikler"
      description="“Veri yok”, kaynak sürümünde doğrulanmış değer bulunmadığını belirtir; sıfır anlamına gelmez. Ölçüm koşulları ve belirsizlikler korunur."
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-5">
        <SearchField
          value={filter}
          onValueChange={setFilter}
          label="Bilimsel bölüm ara"
          placeholder="Bölüm veya alan ara…"
          resultCount={visible.length}
          formatCount={(count) => `${count} bölüm`}
          className="sm:max-w-sm"
        />
        <div className="flex flex-1 items-center justify-between gap-3">
          <label className="inline-flex h-10 cursor-pointer items-center gap-2.5 text-sm text-ink-2 select-none">
            <input
              type="checkbox"
              checked={showMissing}
              onChange={(event) => setShowMissing(event.target.checked)}
              className="size-4 cursor-pointer accent-brand"
            />
            Eksik alanları göster
          </label>
          <Button
            variant="ghost"
            size="sm"
            disabled={filtering || !visible.length}
            onClick={() =>
              setOpenKeys(allOpen ? new Set() : new Set(visible.map((section) => section.key)))
            }
          >
            {allOpen ? <ChevronsDownUp strokeWidth={1.75} /> : <ChevronsUpDown strokeWidth={1.75} />}
            {allOpen ? "Tümünü kapat" : "Tümünü aç"}
          </Button>
        </div>
      </div>

      {visible.length ? (
        <div className="mt-5 divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface shadow-xs">
          {visible.map((section) => (
            <PropertyDisclosure
              key={section.key}
              section={section}
              open={filtering || openKeys.has(section.key)}
              onOpenChange={(open) => setOpen(section.key, open)}
              showMissing={showMissing}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={SearchX}
          title={filtering ? "Eşleşen bölüm bulunamadı" : "Doğrulanmış özellik verisi yok"}
          className="mt-5"
          actions={
            filtering && (
              <Button variant="outline" size="sm" onClick={() => setFilter("")}>
                Aramayı temizle
              </Button>
            )
          }
        >
          {filtering
            ? "Bölüm adlarında ve alan adlarında arandı. Daha kısa bir sözcük dene."
            : "Bu kayıt için kaynakta doğrulanmış özellik değeri bulunmuyor."}
        </EmptyState>
      )}
    </Section>
  );
}
