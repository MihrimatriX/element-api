import { useEffect, useState } from "react";
import {
  cartLineKey,
  readCart,
  writeCart,
  type CartItem,
  type CompoundSku,
} from "../../services/api";

/** Most lines the cart keeps; a new line past it pushes out the oldest. */
const MAX_CART_LINES = 12;

/**
 * `cart` with `grams` more of `sku`, capped at `maxGrams`. A new line goes first, the cart
 * keeps at most 12 lines and a line left at 0 g is dropped. Works only on the given cart,
 * never on storage, so a blocked or full localStorage cannot undo earlier changes.
 */
function withAdded(
  cart: readonly CartItem[],
  sku: CompoundSku,
  grams: number,
  maxGrams: number,
): CartItem[] {
  const key = cartLineKey(sku.elementSymbol, sku.slug);
  const isSameLine = (item: CartItem) => cartLineKey(item.symbol, item.slug) === key;
  const existing = cart.find(isSameLine);
  const line: CartItem = {
    // A changed quantity is a new request: the old idempotency key must not be replayed.
    requestId: crypto.randomUUID(),
    symbol: sku.elementSymbol,
    slug: sku.slug.toLowerCase(),
    qty: Math.min(maxGrams, Math.max(0, (existing?.qty ?? 0) + grams)),
    formula: sku.formula || existing?.formula || sku.elementSymbol,
    label: sku.nameTr || sku.name || existing?.label || sku.formula,
    priceMult: sku.priceMult > 0 ? sku.priceMult : (existing?.priceMult ?? 1),
  };
  const next = existing
    ? cart.map((item) => (isSameLine(item) ? line : item))
    : [line, ...cart].slice(0, MAX_CART_LINES);
  return next.filter((item) => item.qty > 0);
}

/**
 * The shop's gram cart. React state is the source of truth; the effect below is the one
 * place that saves it to localStorage (`elementapi:elementalCart`), so without storage the
 * cart still works for this page. Quantities are capped at the element's stock (`stockOf`).
 */
export function useCart(stockOf: (symbol: string) => number) {
  const [cart, setCart] = useState<CartItem[]>(readCart);

  useEffect(() => {
    writeCart(cart);
  }, [cart]);

  /** Adds `grams` of a product (merged into its line). */
  const add = (sku: CompoundSku, grams: number) => {
    const stock = stockOf(sku.elementSymbol);
    setCart((current) => withAdded(current, sku, grams, stock));
  };

  /** Changes a line by `delta` grams; a line that reaches 0 g is dropped. */
  const step = (item: CartItem, delta: number) => {
    const key = cartLineKey(item.symbol, item.slug);
    const stock = stockOf(item.symbol);
    setCart((current) =>
      current
        .map((line) =>
          cartLineKey(line.symbol, line.slug) === key
            ? {
                ...line,
                // A changed quantity is a new request: the old idempotency key must not be replayed.
                requestId: crypto.randomUUID(),
                qty: Math.min(stock, Math.max(0, line.qty + delta)),
              }
            : line,
        )
        .filter((line) => line.qty > 0),
    );
  };

  /** Removes one line. */
  const remove = (item: CartItem) => {
    const key = cartLineKey(item.symbol, item.slug);
    setCart((current) => current.filter((line) => cartLineKey(line.symbol, line.slug) !== key));
  };

  /** Grams of a product already in the cart (0 when none). */
  const gramsOf = (sku: CompoundSku) =>
    cart.find(
      (item) => cartLineKey(item.symbol, item.slug) === cartLineKey(sku.elementSymbol, sku.slug),
    )?.qty ?? 0;

  return { cart, setCart, add, step, remove, gramsOf };
}
