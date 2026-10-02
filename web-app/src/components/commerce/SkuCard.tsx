import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Disclosure,
  DisclosureContent,
  DisclosureTrigger,
} from "@/components/ui/disclosure";
import { ExternalLink } from "@/components/ui/external-link";
import { Formula } from "@/components/ui/formula";
import { KeyValue } from "@/components/ui/key-value";
import { cn } from "@/lib/utils";
import { formatFixed, formatNumber } from "../../lib/format";
import type { CompoundSku } from "../../services/api";

/** Turkish name of each SKU kind. */
const KIND_LABEL: Record<string, string> = {
  allotrope: "başka biçim",
  compound: "bileşik",
  preparation: "preparat",
};

interface SkuCardProps {
  sku: CompoundSku;
  /** Turkish name of the parent element. */
  elementName: string;
  /** Price per gram (parent ask × multiplier); `null` while there is no live quote. */
  unitPrice: number | null;
  stock: number;
  /** Grams of this SKU already in the cart (0 when none). */
  inCart: number;
  /** Pack size the add button adds. */
  pack: number;
  disabled: boolean;
  onAdd: () => void;
  /** Filters the catalogue to the parent element. */
  onShowElement: () => void;
}

/**
 * One product: formula, kind, Turkish name, parent element, optional PubChem facts,
 * price per gram, stock or cart grams, and a "+pack" button.
 */
export function SkuCard({
  sku,
  elementName,
  unitPrice,
  stock,
  inCart,
  pack,
  disabled,
  onAdd,
  onShowElement,
}: SkuCardProps) {
  const properties = sku.properties;
  return (
    <article
      className={cn(
        "panel flex flex-col p-4 transition-colors duration-150",
        inCart > 0 && "border-brand-line",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="min-w-0">
          <Formula value={sku.formula} className="text-xl font-semibold text-ink" />
        </h3>
        <Badge variant="secondary">{KIND_LABEL[sku.kind] ?? sku.kind}</Badge>
      </div>
      <p className="mt-1 text-sm text-ink-2">{sku.nameTr || sku.name}</p>
      <p className="mt-1 text-[13px] text-ink-3">
        <span className="font-mono">{sku.elementSymbol}</span> ·{" "}
        <button type="button" onClick={onShowElement} className="focus-ring text-link rounded-sm">
          {elementName}
        </button>
      </p>

      {properties && (
        <Disclosure className="mt-3 border-y border-line">
          <DisclosureTrigger className="py-2 text-[13px] text-ink-2">
            Kimyasal özellikler
          </DisclosureTrigger>
          <DisclosureContent>
            <KeyValue
              className="border-t-0"
              items={[
                {
                  label: "Molar kütle",
                  value: (
                    <span className="font-mono tabular">
                      {formatFixed(properties.molecularWeight, 3)} g/mol
                    </span>
                  ),
                },
                { label: "IUPAC adı", value: properties.iupacName },
              ]}
            />
            <p className="py-3 text-[13px]">
              <ExternalLink href={properties.sourceUrl}>PubChem kaynağı</ExternalLink>
            </p>
          </DisclosureContent>
        </Disclosure>
      )}

      <div className="mt-auto flex items-end justify-between gap-3 pt-4">
        <div className="min-w-0">
          <p className="font-mono text-lg leading-tight text-ink tabular">
            {unitPrice == null ? "—" : formatFixed(unitPrice, 4)}
            <span className="ml-1 text-[13px] text-ink-3">kredi / g</span>
          </p>
          <p
            className={cn(
              "mt-0.5 text-[13px]",
              inCart > 0 ? "font-medium text-brand-ink" : "text-ink-3",
            )}
          >
            {inCart > 0
              ? `Sepette ${formatNumber(inCart)} g`
              : `${formatNumber(stock, { maximumFractionDigits: 0 })} g stok`}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={onAdd}
          aria-label={`${sku.formula}: sepete ${pack} g ekle`}
        >
          <Plus aria-hidden="true" strokeWidth={1.75} />
          {pack} g
        </Button>
      </div>
    </article>
  );
}
