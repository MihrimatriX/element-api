import { useEffect, useState } from "react";
import {
  addToCart,
  cartLineKey,
  readCart,
  writeCart,
  type CartItem,
  type CompoundSku,
} from "../../services/api";

/**
 * The shop's gram cart, persisted in localStorage (`elementapi:elementalCart`) through the
 * api.ts cart helpers. Quantities are capped at the element's stock (`stockOf`).
 */
export function useCart(stockOf: (symbol: string) => number) {
  const [cart, setCart] = useState<CartItem[]>(readCart);

  useEffect(() => {
    writeCart(cart);
  }, [cart]);

  /** Adds `grams` of a product (merged into its line). */
  const add = (sku: CompoundSku, grams: number) => {
    const next = addToCart(sku.elementSymbol, grams, stockOf(sku.elementSymbol), {
      slug: sku.slug,
      formula: sku.formula,
      label: sku.nameTr || sku.name,
      priceMult: sku.priceMult,
    });
    setCart(next.filter((item) => item.qty > 0));
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
