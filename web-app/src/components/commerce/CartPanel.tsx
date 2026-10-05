import { useId, type ReactNode } from "react";
import { Minus, Plus, ShoppingCart, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Formula } from "@/components/ui/formula";
import { Notice } from "@/components/ui/notice";
import { formatGrams, formatKredi } from "../../lib/format";
import { cartLineKey, type CartItem } from "../../services/api";
import type { CartLine } from "./model";

interface CartPanelProps {
  lines: readonly CartLine[];
  subtotal: number;
  /** Wallet balance; `null` for guests or while unknown. */
  walletElx: number | null;
  isAuthenticated: boolean;
  overStock: boolean;
  walletShort: boolean;
  submitting: boolean;
  /** Progress or error text after a checkout attempt. */
  checkoutNote: ReactNode;
  onStep: (item: CartItem, delta: number) => void;
  onRemove: (item: CartItem) => void;
  onClear: () => void;
  onCheckout: () => void;
}

/** Checkout button text for the current state. */
function checkoutLabel(submitting: boolean, isAuthenticated: boolean): string {
  if (submitting) return "İletiliyor…";
  return isAuthenticated ? "Sipariş ver" : "Giriş yap ve sipariş ver";
}

/**
 * The gram cart: lines with a quantity stepper, total against the wallet, stock and
 * balance warnings, and the checkout button. Every control locks while orders are sent.
 */
export function CartPanel({
  lines,
  subtotal,
  walletElx,
  isAuthenticated,
  overStock,
  walletShort,
  submitting,
  checkoutNote,
  onStep,
  onRemove,
  onClear,
  onCheckout,
}: CartPanelProps) {
  const headingId = useId();
  const totalGrams = lines.reduce((sum, line) => sum + line.item.qty, 0);
  const showWallet = isAuthenticated && walletElx != null;

  return (
    <section id="sepet" aria-labelledby={headingId} className="panel scroll-mt-2">
      <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-3.5">
        <h2 id={headingId} className="flex items-center gap-2 text-base font-semibold text-ink">
          <ShoppingCart aria-hidden="true" strokeWidth={1.75} className="size-4 text-ink-3" />
          Sepet
          {lines.length > 0 && (
            <span className="font-mono text-[13px] font-normal text-ink-3 tabular">
              {formatGrams(totalGrams, 2)}
            </span>
          )}
        </h2>
        <Button
          variant="ghost"
          size="xs"
          disabled={submitting || lines.length === 0}
          onClick={onClear}
        >
          Temizle
        </Button>
      </header>

      {lines.length === 0 ? (
        <p className="px-4 py-10 text-center text-sm text-ink-3">
          Sepet boş. Üründen gram ekle.
        </p>
      ) : (
        <ul className="max-h-[min(26rem,45dvh)] divide-y divide-line overflow-y-auto px-4">
          {lines.map((line) => (
            <CartLineRow
              key={cartLineKey(line.item.symbol, line.item.slug)}
              line={line}
              disabled={submitting}
              onStep={onStep}
              onRemove={onRemove}
            />
          ))}
        </ul>
      )}

      <footer className="grid gap-3 border-t border-line px-4 py-4">
        <dl className="grid gap-1.5 text-sm">
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-ink-2">Toplam</dt>
            <dd className="font-mono text-lg text-ink tabular">{formatKredi(subtotal)}</dd>
          </div>
          {showWallet && (
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-[13px] text-ink-3">Cüzdan</dt>
              <dd className="font-mono text-[13px] text-ink-2 tabular">
                {formatKredi(walletElx)}
              </dd>
            </div>
          )}
        </dl>
        {walletShort && <Notice tone="danger">Cüzdanda yeterli kredi yok.</Notice>}
        {overStock && <Notice tone="warning">Sepette stoktan fazla gram var.</Notice>}
        <Button
          size="lg"
          className="w-full"
          onClick={onCheckout}
          disabled={lines.length === 0 || submitting || overStock || walletShort}
          aria-busy={submitting || undefined}
        >
          {checkoutLabel(submitting, isAuthenticated)}
        </Button>
        <p role="status" className="text-[13px] leading-5 text-ink-2 empty:hidden">
          {checkoutNote}
        </p>
      </footer>
    </section>
  );
}

interface CartLineRowProps {
  line: CartLine;
  disabled: boolean;
  onStep: (item: CartItem, delta: number) => void;
  onRemove: (item: CartItem) => void;
}

/** One cart line: product, unit price, line total, a ±1 g stepper and remove. */
function CartLineRow({ line, disabled, onStep, onRemove }: CartLineRowProps) {
  const { item } = line;
  return (
    <li className="py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Formula value={item.formula} className="font-semibold text-ink" />
          <p className="truncate text-[13px] text-ink-3">
            {item.label} · {formatKredi(line.unitAsk, 4)} / g
          </p>
        </div>
        <p className="font-mono text-sm text-ink tabular">{formatKredi(line.lineTotal)}</p>
      </div>
      <div className="mt-2 flex items-center justify-between gap-3">
        <div
          role="group"
          aria-label={`${item.formula} miktarı`}
          className="inline-flex items-center rounded-md border border-line-strong bg-canvas-2"
        >
          <Button
            variant="ghost"
            size="icon-xs"
            disabled={disabled}
            onClick={() => onStep(item, -1)}
            aria-label={`${item.formula} miktarını azalt`}
          >
            <Minus aria-hidden="true" strokeWidth={1.75} />
          </Button>
          <span className="min-w-14 text-center font-mono text-[13px] text-ink tabular">
            {formatGrams(item.qty, 2)}
          </span>
          <Button
            variant="ghost"
            size="icon-xs"
            disabled={disabled || item.qty >= line.stock}
            onClick={() => onStep(item, 1)}
            aria-label={`${item.formula} miktarını artır`}
          >
            <Plus aria-hidden="true" strokeWidth={1.75} />
          </Button>
        </div>
        <Button variant="ghost" size="xs" disabled={disabled} onClick={() => onRemove(item)}>
          <X aria-hidden="true" strokeWidth={1.75} />
          Kaldır
        </Button>
      </div>
    </li>
  );
}
