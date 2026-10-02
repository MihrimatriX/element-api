import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Vault } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Formula } from "@/components/ui/formula";
import { Notice } from "@/components/ui/notice";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { formatFixed, formatGrams } from "../../lib/format";
import type { ElementItem } from "../../services/elementData";
import { panelTableClass } from "./classes";
import type { HoldingRow, HoldingsState } from "./data";
import { describeProduct, holdingValue } from "./model";

/** Kredi amount for a table cell whose header names the unit; "—" when unknown. */
function formatValue(value: number | null): string {
  return value == null ? "—" : formatFixed(value, 2);
}

interface HoldingsTableProps {
  state: HoldingsState;
  elements: readonly ElementItem[];
  /** Current bid per symbol (any case); unknown symbols show "—" as value. */
  bidOf: (symbol: string) => number | undefined;
  onRetry: () => void;
  /** Optional trailing cell per row (e.g. "Satış için seç"). */
  action?: (row: HoldingRow) => ReactNode;
}

/**
 * The vault: one row per product with grams, average cost and today's value at the bid.
 * Handles its own loading, error and empty states.
 */
export function HoldingsTable({
  state,
  elements,
  bidOf,
  onRetry,
  action,
}: HoldingsTableProps) {
  if (state.status === "loading")
    return (
      <div className="panel divide-y divide-line px-4" aria-hidden="true">
        {[0, 1, 2].map((index) => (
          <div key={index} className="flex items-center gap-4 py-3.5">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="ml-auto h-4 w-16" />
            <Skeleton className="h-4 w-24" />
          </div>
        ))}
      </div>
    );

  if (state.status === "error")
    return (
      <Notice
        tone="danger"
        action={
          <Button variant="outline" size="sm" onClick={onRetry}>
            Yeniden dene
          </Button>
        }
      >
        Kasadaki ürünler yüklenemedi.
      </Notice>
    );

  if (state.rows.length === 0)
    return (
      <EmptyState
        icon={Vault}
        title="Kasada ürün yok"
        actions={
          <Button asChild variant="outline" size="sm">
            <Link to="/shop?symbol=FE">Mağazadan 1 g Fe dene</Link>
          </Button>
        }
      >
        Aldığın gramlar teslim edilince burada görünür.
      </EmptyState>
    );

  return (
    <div className={cn("panel overflow-hidden", panelTableClass)}>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Ürün</TableHead>
            <TableHead className="text-right">Miktar</TableHead>
            <TableHead className="hidden text-right md:table-cell">
              Ort. maliyet, kredi / g
            </TableHead>
            <TableHead className="text-right">Değer, kredi</TableHead>
            {action && (
              <TableHead>
                <span className="sr-only">İşlem</span>
              </TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {state.rows.map((row) => {
            const info = describeProduct(elements, row);
            return (
              <TableRow key={`${row.symbol}:${row.compoundSlug}`}>
                <TableCell>
                  <Formula value={info.formula} className="font-semibold text-ink" />
                  <span className="ml-2 hidden text-[13px] text-ink-3 sm:inline">{info.elementName}</span>
                </TableCell>
                <TableCell className="text-right font-mono text-ink tabular">
                  {formatGrams(row.grams, 4)}
                </TableCell>
                <TableCell className="hidden text-right font-mono tabular md:table-cell">
                  {formatFixed(row.avgCostElx, 4)}
                </TableCell>
                <TableCell className="text-right font-mono text-ink tabular">
                  {formatValue(holdingValue(row, bidOf(row.symbol)))}
                </TableCell>
                {action && <TableCell className="text-right">{action(row)}</TableCell>}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
