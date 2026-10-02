import type { ReactNode } from "react";
import { ExternalLink } from "@/components/ui/external-link";
import type { JsonValue } from "@/services/science";
import { formatPropertyNumber, isPopulated, propertyLabel } from "./properties";

type Scalar = string | number | boolean;
type JsonObject = { [key: string]: JsonValue };

interface ValueProps {
  value: JsonValue;
  /** Record key of this value; picks the number format and nested labels. */
  fieldKey?: string;
  /** Also list fields that have no verified value. */
  showMissing: boolean;
}

function Missing({ children = "Veri yok" }: { children?: ReactNode }) {
  return <span className="text-[13px] text-ink-3">{children}</span>;
}

/** A number kept as text to preserve source notation, e.g. "53.93960899(53)" with its uncertainty. */
const REPORTED_NUMBER = /^[-+−~]?\d[\d.,]*(\(\d+\))?$/;

function ScalarValue({ value, fieldKey }: { value: Scalar; fieldKey?: string }) {
  if (typeof value === "number")
    return (
      <span className="font-mono tabular">{formatPropertyNumber(value, fieldKey)}</span>
    );
  if (typeof value === "boolean") return <>{value ? "Evet" : "Hayır"}</>;
  if (/^https?:\/\//.test(value))
    return <ExternalLink href={value}>Kaynağı incele</ExternalLink>;
  if (REPORTED_NUMBER.test(value)) return <span className="font-mono tabular">{value}</span>;
  return <>{value}</>;
}

const isScalarList = (items: JsonValue[]): items is (Scalar | null)[] =>
  items.every((item) => item === null || typeof item !== "object");

function ValueList({
  items,
  fieldKey,
  showMissing,
}: Omit<ValueProps, "value"> & { items: JsonValue[] }) {
  if (!items.length) return <Missing>Bu kayıtta veri bulunmuyor</Missing>;
  if (isScalarList(items))
    return (
      <ul className="flex flex-wrap gap-1.5">
        {items.map((item, index) => (
          <li
            key={index}
            className="rounded-sm border border-line bg-surface-2 px-2 py-0.5 text-[13px] text-ink"
          >
            {item === null ? "—" : <ScalarValue value={item} fieldKey={fieldKey} />}
          </li>
        ))}
      </ul>
    );
  return (
    <ul className="grid gap-3 md:grid-cols-2">
      {items.map((item, index) => (
        <li key={index} className="min-w-0 rounded-lg border border-line bg-canvas-2/60 px-4 py-1">
          <PropertyValue value={item} showMissing={showMissing} />
        </li>
      ))}
    </ul>
  );
}

function FieldList({
  record,
  fieldKey,
  showMissing,
}: Omit<ValueProps, "value"> & { record: JsonObject }) {
  const entries = Object.entries(record).filter(
    ([, child]) => showMissing || isPopulated(child),
  );
  if (!entries.length)
    return <Missing>Bu bölüm için doğrulanmış veri henüz eklenmedi.</Missing>;
  return (
    <dl className="divide-y divide-line">
      {entries.map(([key, child]) => {
        const label = propertyLabel(key, fieldKey);
        const isGroup =
          child !== null &&
          typeof child === "object" &&
          !(Array.isArray(child) && isScalarList(child));
        if (isGroup)
          return (
            <div key={key} className="py-3">
              <dt className="text-[13px] font-medium text-ink-2">{label}</dt>
              <dd className="mt-2 min-w-0 border-l border-line-strong pl-4">
                <PropertyValue value={child} fieldKey={key} showMissing={showMissing} />
              </dd>
            </div>
          );
        return (
          <div
            key={key}
            className="grid gap-x-6 gap-y-1 py-2.5 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]"
          >
            <dt className="text-[13px] text-ink-3 sm:pt-0.5">{label}</dt>
            <dd className="min-w-0 text-[15px] break-words text-ink">
              <PropertyValue value={child} fieldKey={key} showMissing={showMissing} />
            </dd>
          </div>
        );
      })}
    </dl>
  );
}

/**
 * Renders one scientific value of any JSON shape: a number or text, a chip list,
 * a grid of sub-records (isotopes, reports) or a nested definition list.
 * Null reads "Veri yok": missing, not zero.
 */
export function PropertyValue({ value, fieldKey, showMissing }: ValueProps) {
  if (value === null) return <Missing />;
  if (Array.isArray(value))
    return <ValueList items={value} fieldKey={fieldKey} showMissing={showMissing} />;
  if (typeof value === "object")
    return <FieldList record={value} fieldKey={fieldKey} showMissing={showMissing} />;
  return <ScalarValue value={value} fieldKey={fieldKey} />;
}
