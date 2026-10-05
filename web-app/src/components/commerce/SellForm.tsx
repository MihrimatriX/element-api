import { useRef, useState, type FormEvent } from "react";
import { flushSync } from "react-dom";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Notice } from "@/components/ui/notice";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { formatFixed, formatGrams, formatKredi } from "../../lib/format";
import { apiError, walletService } from "../../services/api";
import type { ElementItem } from "../../services/elementData";
import type { HoldingRow } from "./data";
import { describeProduct, saleProblem } from "./model";

/** The sell form's editable values; kept by the page so "Satış için seç" can fill them. */
export interface SaleDraft {
  slug: string;
  grams: string;
}

interface SellFormProps {
  symbol: string;
  elementName: string;
  elements: readonly ElementItem[];
  /** Holdings of this element; `null` while they load. */
  holdings: readonly HoldingRow[] | null;
  /** Current bid of the element (kredi per gram of the pure element). */
  bid: number | undefined;
  draft: SaleDraft;
  onDraftChange: (draft: SaleDraft) => void;
  /** Called after a sale so the page refreshes holdings, wallet and ticker. */
  onSold: () => void;
}

/**
 * Sell part of a holding back to the desk: product select, grams with a "Tümü" shortcut,
 * a live proceeds preview (bid × product multiplier × grams) and clear errors.
 */
export function SellForm({
  symbol,
  elementName,
  elements,
  holdings,
  bid,
  draft,
  onDraftChange,
  onSold,
}: SellFormProps) {
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const gramsRef = useRef<HTMLInputElement>(null);

  if (holdings === null)
    return (
      <div className="grid gap-3" aria-hidden="true">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-10" />
        <Skeleton className="h-10" />
      </div>
    );

  if (holdings.length === 0)
    return (
      <div>
        <h3 className="text-sm font-semibold text-ink">Sat</h3>
        <p className="mt-1.5 text-sm leading-6 text-ink-2">
          Kasanda {elementName} yok. Satmak için önce{" "}
          <Link to={`/shop?symbol=${symbol}`} className="text-link">
            mağazadan al
          </Link>
          .
        </p>
      </div>
    );

  const holding =
    holdings.find((row) => row.compoundSlug === draft.slug) ?? holdings[0];
  const productLabel = (row: HoldingRow) => {
    const info = describeProduct(elements, row);
    return info.elemental ? "Saf element" : info.formula;
  };
  const grams = Number(draft.grams);
  const unitBid =
    bid != null && holding.multiplier != null ? bid * holding.multiplier : null;
  const proceeds =
    unitBid != null && saleProblem(grams, holding) === null ? unitBid * grams : null;

  const edit = (next: Partial<SaleDraft>) => {
    setProblem(null);
    onDraftChange({ slug: holding.compoundSlug, grams: draft.grams, ...next });
  };

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const blocker =
      saleProblem(grams, holding) ??
      (unitBid == null ? "Satış fiyatı henüz gelmedi; birkaç saniye sonra deneyin." : null);
    if (blocker) {
      // Render the error first so the focused field already describes it to screen readers.
      flushSync(() => setProblem(blocker));
      gramsRef.current?.focus();
      return;
    }

    setProblem(null);
    setBusy(true);
    setFailure(null);
    try {
      const result = await walletService.sell(symbol, grams, holding.compoundSlug);
      const { formula } = describeProduct(elements, holding);
      toast(
        `${formatFixed(grams, 2)} g ${formula} satıldı · ${formatKredi(result.proceedsElx)}`,
        { tone: "success" },
      );
      onSold();
    } catch (error) {
      setFailure(apiError(error, "Satış yapılamadı."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="grid gap-4">
      <h3 className="text-sm font-semibold text-ink">Sat</h3>
      <Field label="Ürün">
        <NativeSelect
          value={holding.compoundSlug}
          onChange={(event) => edit({ slug: event.target.value })}
        >
          {holdings.map((row) => (
            <NativeSelectOption key={row.compoundSlug} value={row.compoundSlug}>
              {productLabel(row)} · {formatGrams(row.grams, 4)}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </Field>
      <Field
        label="Gram"
        hint={`Kasada ${formatGrams(holding.grams, 4)}`}
        error={problem}
        labelAction={
          <button
            type="button"
            className="text-link"
            onClick={() => edit({ grams: String(holding.grams) })}
          >
            Tümü
          </button>
        }
      >
        <Input
          ref={gramsRef}
          type="number"
          inputMode="decimal"
          min="0.01"
          step="0.01"
          placeholder="0"
          value={draft.grams}
          onChange={(event) => edit({ grams: event.target.value })}
          className="font-mono tabular"
        />
      </Field>
      <div className="flex items-baseline justify-between gap-3 rounded-md bg-canvas-2 px-3 py-2.5">
        <span className="text-[13px] text-ink-3">Tahmini tutar</span>
        <span className="font-mono text-sm text-ink tabular">
          {formatKredi(proceeds)}
        </span>
      </div>
      {failure && <Notice tone="danger">{failure}</Notice>}
      <Button type="submit" variant="outline" disabled={busy} aria-busy={busy || undefined}>
        {busy ? "Satılıyor…" : "Sat"}
      </Button>
    </form>
  );
}
