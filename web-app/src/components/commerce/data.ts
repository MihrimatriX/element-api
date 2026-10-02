import { useCallback, useEffect, useState } from "react";
import { usePolling } from "../../hooks/usePolling";
import {
  compoundService,
  elementService,
  orderService,
  walletService,
  type CompoundSku,
  type Holding,
  type OrderRow,
  type Ticker,
} from "../../services/api";
import { isElementalSlug } from "./model";

const TICKER_POLL_MS = 12_000;

/**
 * Live ticker of one symbol: fetched when the symbol changes and every 12 s while
 * the tab is visible. `ticker` is `null` until data for *this* symbol arrives, so a
 * slow answer for the previous symbol is never shown under the new name.
 */
export function useTicker(symbol: string) {
  const [ticker, setTicker] = useState<Ticker | null>(null);
  const reload = useCallback(
    () =>
      elementService.getTicker(symbol).then(setTicker, () => undefined),
    [symbol],
  );

  usePolling(reload, TICKER_POLL_MS);
  useEffect(() => {
    void reload();
  }, [reload]);

  const current = ticker?.symbol.toUpperCase() === symbol ? ticker : null;
  return { ticker: current, reload };
}

/** A holding with the price multiplier of its product (1 for the pure element, `null` if unknown). */
export interface HoldingRow extends Holding {
  multiplier: number | null;
}

/** Holdings request state. */
export type HoldingsState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; rows: HoldingRow[] };

async function fetchHoldings(): Promise<HoldingRow[]> {
  const holdings = ((await walletService.holdings()) ?? []).filter(
    (holding) => holding.grams > 0,
  );
  const slugs = [
    ...new Set(
      holdings
        .map((holding) => holding.compoundSlug)
        .filter((slug) => !isElementalSlug(slug)),
    ),
  ];
  const multipliers = new Map(
    await Promise.all(
      slugs.map(async (slug) => {
        const multiplier = await compoundService.get(slug).then(
          (sku) => sku.priceMult,
          () => null,
        );
        return [slug, multiplier] as const;
      }),
    ),
  );
  return holdings.map((holding) => ({
    ...holding,
    multiplier: isElementalSlug(holding.compoundSlug)
      ? 1
      : (multipliers.get(holding.compoundSlug) ?? null),
  }));
}

/**
 * The signed-in user's holdings (zero-gram rows dropped) with each product's
 * multiplier, so sale previews and portfolio value use the same price as the desk.
 */
export function useHoldings(enabled: boolean) {
  const [state, setState] = useState<HoldingsState>({ status: "loading" });

  const reload = useCallback(
    () =>
      fetchHoldings().then(
        (rows) => setState({ status: "ready", rows }),
        () => setState({ status: "error" }),
      ),
    [],
  );

  useEffect(() => {
    if (enabled) void reload();
  }, [enabled, reload]);

  /** Shows the skeleton again, then reloads (for "Yeniden dene"). */
  const retry = useCallback(() => {
    setState({ status: "loading" });
    void reload();
  }, [reload]);

  return { state, reload, retry };
}

/** Orders request state. */
export type OrdersState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; rows: OrderRow[] };

/**
 * The signed-in user's orders, polled every `pollMs` while the tab is visible so saga
 * steps show up as they happen. `onUpdate` runs after each successful poll (the shop
 * refreshes the wallet there). A failed poll keeps the last good list.
 */
export function useOrders(
  enabled: boolean,
  pollMs: number,
  onUpdate?: () => void,
) {
  const [state, setState] = useState<OrdersState>({ status: "loading" });

  const reload = () =>
    orderService.list().then(
      (rows) => {
        setState({ status: "ready", rows: rows ?? [] });
        onUpdate?.();
      },
      () =>
        setState((current) =>
          current.status === "ready" ? current : { status: "error" },
        ),
    );
  usePolling(reload, pollMs, { enabled });

  /** Puts a just-submitted order at the top without waiting for the next poll. */
  const upsert = (order: OrderRow) =>
    setState((current) => ({
      status: "ready",
      rows: [
        order,
        ...(current.status === "ready" ? current.rows : []).filter(
          (row) => row.id !== order.id,
        ),
      ],
    }));

  return { state, reload, upsert };
}

/** Answer to one catalogue request, tagged with the request it belongs to. */
interface CatalogResult {
  requestKey: string;
  /** `null` when the request failed. */
  skus: CompoundSku[] | null;
}

/**
 * Shop products of one element (or all with `null`). `status` stays "loading" until the
 * answer for the *current* filter arrives, so switching elements never shows the old grid.
 * `requestKey` changes with every new request; `retry` asks again after an error.
 */
export function useCatalog(elementSymbol: string | null) {
  const [attempt, setAttempt] = useState(0);
  const requestKey = `${elementSymbol ?? "all"}#${attempt}`;
  const [result, setResult] = useState<CatalogResult>({ requestKey: "", skus: null });

  useEffect(() => {
    let active = true;
    compoundService.all({ element: elementSymbol ?? undefined }).then(
      (skus) => {
        if (active) setResult({ requestKey, skus });
      },
      () => {
        if (active) setResult({ requestKey, skus: null });
      },
    );
    return () => {
      active = false;
    };
  }, [elementSymbol, requestKey]);

  let status: "loading" | "error" | "ready" = "ready";
  if (result.requestKey !== requestKey) status = "loading";
  else if (result.skus === null) status = "error";

  return {
    status,
    skus: status === "ready" ? (result.skus ?? []) : [],
    requestKey,
    retry: () => setAttempt((count) => count + 1),
  };
}
