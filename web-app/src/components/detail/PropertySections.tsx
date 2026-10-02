import { useState } from "react";
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

/**
 * "Bilimsel özellikler": every labelled section of the record as a collapsible
 * group with a size badge, a filter over section and field names, a switch for
 * fields without data and expand/collapse all. Linking to `#<section key>`
 * (side index, deep link) clears the filter and opens that section.
 */
export function PropertySections({ record }: { record: ScientificRecord }) {
  const { hash } = useLocation();
  const target = decodeURIComponent(hash.slice(1));
  const [filter, setFilter] = useState("");
  const [showMissing, setShowMissing] = useState(false);
  const [openKeys, setOpenKeys] = useState(() => new Set(target in record ? [target] : []));
  const [handledHash, setHandledHash] = useState(hash);

  if (hash !== handledHash) {
    setHandledHash(hash);
    if (target in record) {
      setFilter("");
      setOpenKeys((current) => new Set(current).add(target));
    }
  }

  const sections = propertySections(record, showMissing);
  const visible = sections.filter((section) => sectionMatches(section, filter));
  const filtering = filter.trim() !== "";
  const allOpen = visible.length > 0 && visible.every((section) => openKeys.has(section.key));

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
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <SearchField
          value={filter}
          onValueChange={setFilter}
          label="Bilimsel bölüm ara"
          placeholder="Bölüm veya alan ara…"
          resultCount={visible.length}
          formatCount={(count) => `${count} bölüm`}
          className="sm:max-w-sm"
        />
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
          onClick={() => setOpenKeys(allOpen ? new Set() : new Set(visible.map((section) => section.key)))}
          className="self-start sm:ml-auto sm:self-center"
        >
          {allOpen ? <ChevronsDownUp strokeWidth={1.75} /> : <ChevronsUpDown strokeWidth={1.75} />}
          {allOpen ? "Tümünü kapat" : "Tümünü aç"}
        </Button>
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
