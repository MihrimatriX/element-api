import type { ReactNode } from "react";
import { PackageOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
import { orderStatusLabel, type OrderRow } from "../../services/api";
import type { ElementItem } from "../../services/elementData";
import { panelTableClass } from "./classes";
import type { OrdersState } from "./data";
import {
  ORDER_FLOW,
  describeProduct,
  isOrderCancelled,
  orderProgress,
  orderTone,
} from "./model";

interface OrdersTableProps {
  state: OrdersState;
  elements: readonly ElementItem[];
  onRetry: () => void;
  /** Shown inside the empty state ("İlk deneme: 1 g Fe."). */
  emptyHint: ReactNode;
}

/**
 * Orders with product, grams, total, a status badge and the four saga steps
 * (hazırlanıyor → ödeme → kargo → teslim) as a progress bar. Handles its own states.
 */
export function OrdersTable({ state, elements, onRetry, emptyHint }: OrdersTableProps) {
  if (state.status === "loading")
    return (
      <div className="panel divide-y divide-line px-4" aria-hidden="true">
        {[0, 1, 2].map((index) => (
          <div key={index} className="flex items-center gap-4 py-3.5">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-5 w-24" />
            <Skeleton className="ml-auto h-4 w-20" />
            <Skeleton className="h-5 w-32" />
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
        Siparişler yüklenemedi.
      </Notice>
    );

  if (state.rows.length === 0)
    return (
      <EmptyState icon={PackageOpen} title="Henüz sipariş yok">
        {emptyHint}
      </EmptyState>
    );

  return (
    <div className={cn("panel overflow-hidden", panelTableClass)}>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Ürün</TableHead>
            <TableHead className="text-right">Miktar</TableHead>
            <TableHead className="hidden text-right sm:table-cell">Tutar, kredi</TableHead>
            <TableHead className="w-28 sm:w-48 md:w-64">Durum</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {state.rows.map((order) => (
            <OrderRowView key={order.id} order={order} elements={elements} />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

/** One order: product with short id and tracking number, grams, total and status. */
function OrderRowView({
  order,
  elements,
}: {
  order: OrderRow;
  elements: readonly ElementItem[];
}) {
  const info = describeProduct(elements, {
    symbol: order.elementSymbol,
    compoundFormula: order.compoundFormula,
  });
  return (
    <TableRow>
      <TableCell>
        <div className="flex items-baseline gap-2">
          <Formula value={info.formula} className="font-semibold text-ink" />
          <span className="truncate text-[13px] text-ink-3">{info.elementName}</span>
        </div>
        <p className="mt-0.5 font-mono text-xs break-all text-ink-3">
          #{order.id.slice(0, 8)}
          {order.trackingNumber && (
            <span className="block sm:inline">
              <span className="hidden sm:inline"> · Kargo </span>
              {order.trackingNumber}
            </span>
          )}
        </p>
      </TableCell>
      <TableCell className="text-right font-mono text-ink tabular">
        {formatGrams(order.quantity, 4)}
      </TableCell>
      <TableCell className="hidden text-right font-mono tabular sm:table-cell">
        {formatFixed(order.totalPrice, 2)}
      </TableCell>
      <TableCell>
        <Badge variant={orderTone(order.status)}>
          {orderStatusLabel[order.status] ?? order.status}
        </Badge>
        <OrderSteps status={order.status} />
      </TableCell>
    </TableRow>
  );
}

/** Colour of a filled saga step: green once delivered, red when rolled back, blue in between. */
function stepFill(status: string): string {
  if (isOrderCancelled(status)) return "bg-danger/60";
  return status === "Completed" ? "bg-success" : "bg-info";
}

/** Four thin segments, one per saga step; the steps already reached are filled. */
function OrderSteps({ status }: { status: string }) {
  const cancelled = isOrderCancelled(status);
  const current = cancelled ? 0 : orderProgress(status);
  const reached = cancelled ? ORDER_FLOW.length : current;
  return (
    <ol aria-label="Sipariş adımları" className="mt-2 grid grid-cols-4 gap-1">
      {ORDER_FLOW.map((step, index) => (
        <li
          key={step}
          aria-current={index + 1 === current ? "step" : undefined}
          title={orderStatusLabel[step]}
          className={cn(
            "h-1 rounded-full",
            index < reached ? stepFill(status) : "bg-surface-3",
          )}
        >
          <span className="sr-only">{orderStatusLabel[step]}</span>
        </li>
      ))}
    </ol>
  );
}
